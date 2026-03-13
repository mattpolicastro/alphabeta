# A/B Test & Experiment Analysis Tool — Requirements Document

> **Purpose:** This document defines the product requirements for a statically-generated A/B test and experiment analysis tool. Users upload CSV data directly in the browser; statistical analysis runs in AWS Lambda (Python + `gbstats`); all experiment metadata is persisted client-side in IndexedDB. Intended as a scaffold brief for Claude Code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Data Model](#4-data-model)
5. [Core Modules](#5-core-modules)
6. [Statistics Engine Integration](#6-statistics-engine-integration)
7. [Feature Requirements](#7-feature-requirements)
8. [UI/UX Requirements](#8-uiux-requirements)
9. [API Design (Lambda Function URLs)](#9-api-design-lambda-function-urls)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Out of Scope (v1)](#12-out-of-scope-v1)
13. [Open Questions](#13-open-questions)

---

## 1. Project Overview

### 1.1 Goals

Build a statically-generated web application that allows product, engineering, and data teams to:

- Define and manage A/B experiments and metric definitions locally in the browser
- Upload pre-exported CSV data (exposure + metric data) to analyze experiments
- Send uploaded data to AWS Lambda for statistical analysis via `gbstats`
- Visualize results with rich, interpretable dashboards
- Detect data quality issues automatically (SRM, multiple exposures, guardrail violations)

### 1.2 Key Architectural Decisions

- **No backend server.** The frontend is a fully static Next.js export (`output: 'export'`) hosted on GitHub Pages.
- **No database.** All experiment configs, metric definitions, and result snapshots are persisted in browser IndexedDB. Nothing leaves the browser under either compute path.
- **No auth.** Single-org internal tool; no login required.
- **Data access via CSV upload.** Users export data from their warehouse manually and upload CSVs directly in the UI, bypassing any direct warehouse connectivity. Users are responsible for filtering exports to the experiment date window before uploading — the app does not apply date filtering. Time series analysis and anomaly detection are deferred to v2, where they will require new data formats.
- **Two compute paths (see Section 2).** The stats engine can run either entirely in-browser via Pyodide/WASM (preferred) or in AWS Lambda as a fallback. Both paths share the same request/response contract, making them interchangeable at the call site.

### 1.3 Non-Goals (v1)

- Warehouse connectivity / SQL query execution
- User authentication or access control
- Multi-tenancy or data sharing between users
- SDK-based feature flagging
- Server-side rendering or a persistent backend API

---

## 2. Architecture Overview

The app has two compute paths for the stats engine. They share an identical request/response contract; the choice is made at runtime via a setting, not at build time.

### 2.1 Path A — Pyodide/WASM (Preferred)

The stats engine runs entirely in the browser. No data leaves the user's machine. A Web Worker loads Pyodide, installs `gbstats` and its dependencies via `micropip`, and executes analysis on request. The main thread communicates with the worker via `postMessage`.

```
┌──────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│                                                              │
│  ┌───────────────────────┐    ┌──────────────────────────┐   │
│  │   Next.js Static App  │    │   IndexedDB (Dexie)      │   │
│  │   (GitHub Pages)      │◄──►│   Experiments            │   │
│  │                       │    │   Metrics                │   │
│  │  - Experiment UI      │    │   Results                │   │
│  │  - CSV Upload         │    │   Column Mappings        │   │
│  │  - Results View       │    └──────────────────────────┘   │
│  └──────────┬────────────┘                                   │
│             │ postMessage(AnalysisRequest)                   │
│             ▼                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Web Worker (stats.worker.ts)             │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Pyodide (Python 3.11 WASM runtime)            │  │   │
│  │  │  + numpy + scipy + gbstats (via micropip)      │  │   │
│  │  │                                                │  │   │
│  │  │  - proportion_test / frequentist_test          │  │   │
│  │  │  - check_srm                                   │  │   │
│  │  │  - multiple comparison corrections             │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  Returns: AnalysisResponse via postMessage           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Everything stays in the browser. Zero network calls        │
│  for analysis.                                              │
└──────────────────────────────────────────────────────────────┘
```

**Tradeoffs:**

| | Detail |
|---|---|
| ✅ Fully offline after first load | Service worker caches Pyodide + wheels |
| ✅ No AWS dependency for compute | Static site + CDN is the only infra required |
| ✅ Zero data egress | Sensitive data never leaves the browser |
| ✅ No cold starts | Worker is warm after first analysis in a session |
| ⚠️ Heavy first load | ~35–40 MB (Pyodide ~12 MB + scipy ~20 MB + numpy ~7 MB) |
| ⚠️ Pyodide initialisation | ~3–8s on first use per session; subsequent calls are fast |
| ⚠️ `gbstats` compatibility | Must validate that `gbstats` + `scipy` WASM builds behave correctly — do this early |

**First-load strategy:** Pyodide and its wheels are fetched once and cached by the browser's Cache API (via a Service Worker or explicit `cache.put()`). On subsequent visits the worker loads entirely from cache, making startup near-instant. A loading state ("Warming up stats engine…") is shown on the first analysis of a session while the worker initialises.

### 2.2 Path B — AWS Lambda (Fallback)

If Pyodide/WASM is ruled out (e.g. first-load size is unacceptable on the team's network, or a `gbstats`/scipy WASM compatibility issue is discovered), the same Python code runs in a Lambda function invoked via Function URL. The request/response contract is identical to Path A.

```
┌──────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│                                                              │
│  ┌───────────────────────┐    ┌──────────────────────────┐   │
│  │   Next.js Static App  │◄──►│   IndexedDB (Dexie)      │   │
│  └──────────┬────────────┘    └──────────────────────────┘   │
│             │ fetch(POST, AnalysisRequest)                   │
└─────────────┼────────────────────────────────────────────────┘
              │ HTTPS
              ▼
┌──────────────────────────────────────────────────────────────┐
│                  AWS Lambda (Python 3.12)                    │
│                                                              │
│  - Docker image: gbstats + numpy + scipy                    │
│  - Identical analysis logic to Path A                       │
│  - Invoked via Function URL (no API Gateway)                │
│  - Stateless; no data persisted                             │
└──────────────────────────────────────────────────────────────┘
```

**Tradeoffs:**

| | Detail |
|---|---|
| ✅ No client-side bundle weight | ~35 MB stays off the browser |
| ✅ Proven scipy/gbstats compatibility | Standard CPython — no WASM edge cases |
| ✅ Faster first analysis | No worker initialisation delay |
| ⚠️ AWS dependency | Requires account, Lambda + ECR setup, CORS config |
| ⚠️ Aggregated data leaves browser | Sent to Lambda over HTTPS; Lambda is stateless but it's still egress |
| ⚠️ Cold starts | ~2–5s on infrequent use; mitigated with provisioned concurrency |
| ⚠️ Ongoing cost | Minimal at internal-tool scale, but non-zero |

### 2.3 Shared Contract

Both paths consume and produce the same TypeScript interfaces (`AnalysisRequest` / `AnalysisResponse` — see Section 9). The call site in the frontend is abstracted behind a single `runAnalysis(request)` function:

```typescript
// lib/stats/runAnalysis.ts
export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const engine = getSettings().computeEngine; // 'wasm' | 'lambda'
  if (engine === 'wasm') {
    return runAnalysisInWorker(request);   // postMessage to Web Worker
  } else {
    return runAnalysisInLambda(request);   // fetch() to Lambda Function URL
  }
}
```

The active path is selected in App Settings and stored in IndexedDB. The default is `wasm`; Lambda URL is only required if the user switches to Path B.

### 2.4 Recommended Implementation Order

1. Build the full app with the Lambda path first — it's easier to validate `gbstats` behaviour against known-good CPython output.
2. Once the stats logic is confirmed correct, add the Pyodide Web Worker path.
3. Run both paths against the same fixture CSV and assert identical results before shipping.

---

## 3. Tech Stack

### 3.1 Frontend

| Concern | Technology |
|---|---|
| Framework | Next.js (static export mode — `output: 'export'`) |
| Language | TypeScript |
| Styling | Bootstrap 5 |
| Component library | React Bootstrap |
| Charting | Recharts |
| Client-side DB | Dexie.js (IndexedDB wrapper) |
| CSV parsing | PapaParse |
| State management | Zustand |
| Markdown rendering | react-markdown |
| HTTP client | Native `fetch` (Path B) / `postMessage` (Path A) |

> **Note on Next.js static export:** All pages must be compatible with `next export`. No `getServerSideProps`, no API routes, no middleware. Data fetching happens entirely client-side.

> **Note on Bootstrap + Next.js:** Import Bootstrap CSS globally in `app/layout.tsx` (`import 'bootstrap/dist/css/bootstrap.min.css'`). Bootstrap's JS bundle (for dropdowns, modals, tooltips) must be loaded client-side only — wrap any `bootstrap.js` initialisation in a `useEffect` or use React Bootstrap's built-in component equivalents, which handle this automatically. Do not import Bootstrap JS at the module level as it will break static export due to `window` references.

### 3.2 Path A — WASM / Pyodide Stack

| Concern | Technology |
|---|---|
| Python runtime | Pyodide (Python 3.11 compiled to WASM) |
| Stats engine | `gbstats` loaded via `micropip` inside Pyodide |
| Scientific deps | `numpy`, `scipy` (Pyodide ships pre-built WASM wheels) |
| Threading | Web Worker (`stats.worker.ts`) — keeps WASM off the main thread |
| Caching | Browser Cache API — Pyodide runtime + wheels cached on first load |
| Estimated bundle | ~35–40 MB (fetched once, then served from cache) |

### 3.3 Path B — AWS Lambda Stack (Fallback)

| Concern | Technology |
|---|---|
| Runtime | Python 3.12 |
| Stats engine | `gbstats` (PyPI) |
| Scientific deps | `numpy`, `scipy` |
| Packaging | Docker-based Lambda container image |
| Invocation | Lambda Function URL (HTTPS, no API Gateway, no auth) |
| IaC | AWS SAM or Terraform (TBD — see Open Questions) |

### 3.4 Hosting

| Concern | Technology |
|---|---|
| Static site | GitHub Pages |
| CDN | GitHub's CDN (included with GitHub Pages) |
| SSL | GitHub Pages managed TLS (automatic) |
| Lambda URLs (Path B only) | AWS Lambda with Function URL enabled, CORS set to the GitHub Pages domain |

### 3.5 Project Structure

```
/
├── apps/
│   └── web/                        # Next.js static app
│       ├── app/                    # App router pages
│       │   ├── page.tsx            # Dashboard / experiment list
│       │   ├── experiments/
│       │   │   ├── new/page.tsx    # Experiment creation wizard
│       │   │   └── [id]/
│       │   │       ├── page.tsx    # Experiment detail / results
│       │   │       └── upload/page.tsx  # CSV upload flow
│       │   ├── metrics/page.tsx    # Metric library
│       │   └── settings/page.tsx   # App settings (includes compute engine toggle)
│       ├── components/
│       ├── public/
│       │   └── pyodide-test.html   # Standalone Pyodide/gbstats compatibility test (Path A spike)
│       ├── lib/
│       │   ├── db/                 # Dexie schema + queries
│       │   ├── stats/
│       │   │   ├── runAnalysis.ts  # Unified entry point — routes to worker or Lambda
│       │   │   ├── worker.ts       # Web Worker: Pyodide init + gbstats execution (Path A)
│       │   │   ├── lambda.ts       # fetch() client for Lambda Function URL (Path B)
│       │   │   └── types.ts        # Shared AnalysisRequest / AnalysisResponse interfaces
│       │   └── csv/                # PapaParse helpers + validation
│       └── next.config.ts          # output: 'export'
│
└── infra/
    └── lambda/                     # Path B only — not needed for WASM deployment
        ├── analysis/
        │   ├── handler.py          # Lambda entry point (same logic as worker.ts Python)
        │   ├── requirements.txt    # gbstats, numpy, scipy
        │   └── template.yaml       # SAM definition
        └── Makefile                # Build + deploy helpers
```

---

## 4. Data Model

All entities live in IndexedDB via Dexie.js. No server-side storage.

### 4.1 IndexedDB Schema (Dexie)

```typescript
// lib/db/schema.ts
import Dexie, { Table } from 'dexie';

export interface Experiment {
  id: string;                        // nanoid
  name: string;
  hypothesis: string;
  description?: string;
  status: 'draft' | 'running' | 'stopped' | 'archived';
  createdAt: number;                 // epoch ms
  updatedAt: number;
  variations: Variation[];
  primaryMetricIds: string[];
  guardrailMetricIds: string[];
  activationMetricId?: string;
  statsEngine: 'bayesian' | 'frequentist' | 'sequential';
  multipleComparisonCorrection: 'none' | 'holm-bonferroni' | 'benjamini-hochberg';
  cuped: boolean;
  tags: string[];
}

export interface Variation {
  id: string;
  name: string;
  key: string;
  weight: number;                    // 0–1, all must sum to 1.0
  isControl: boolean;
}

export interface Metric {
  id: string;
  name: string;
  description?: string;
  type: 'binomial' | 'count' | 'revenue';
  // How to interpret the uploaded column value:
  // 'raw_total'       → value is a sum; app divides by `units` to get rate/mean
  // 'pre_normalized'  → value is already a rate or mean; used as-is
  normalization: 'raw_total' | 'pre_normalized';
  higherIsBetter: boolean;          // determines direction of result coloring
  capValue?: number;
  capType?: 'absolute' | 'percentile';
  minSampleSize?: number;
  isGuardrail: boolean;
  tags: string[];
  createdAt: number;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  computedAt: number;
  srmPValue: number;
  srmFlagged: boolean;
  multipleExposureCount: number;
  multipleExposureFlagged: boolean;
  perMetricResults: MetricResult[];
  rawRequest: AnalysisRequest;      // archived for reproducibility
  status: 'pending' | 'complete' | 'error';
  errorMessage?: string;
}

export interface MetricResult {
  metricId: string;
  variationResults: VariationResult[];
}

export interface VariationResult {
  variationId: string;
  users: number;
  mean: number;
  stddev: number;
  chanceToBeatControl?: number;
  expectedLoss?: number;
  credibleIntervalLower?: number;
  credibleIntervalUpper?: number;
  pValue?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
  relativeUplift: number;
  absoluteUplift: number;
  scaledImpact?: number;
  significant: boolean;
  cupedApplied: boolean;
}

export interface ColumnMapping {
  id: string;                        // experimentId + column fingerprint (sorted join)
  experimentId: string;
  columnFingerprint: string;         // sorted, joined column names — used to detect schema changes
  savedAt: number;
  mapping: {
    [columnName: string]: {
      role: 'dimension' | 'metric' | 'ignore';
      metricId?: string;             // set when role === 'metric'
    };
  };
}

export interface Annotation {
  id?: number;
  experimentId: string;
  resultId?: string;        // optional — if set, annotation is pinned to a specific result snapshot
  metricId?: string;        // optional — if set, annotation is pinned to a specific metric row
  body: string;             // free-text, markdown supported
  createdAt: number;
  updatedAt: number;
}

export class AppDB extends Dexie {
  experiments!: Table<Experiment>;
  metrics!: Table<Metric>;
  results!: Table<ExperimentResult>;
  annotations!: Table<Annotation>;

  constructor() {
    super('ab-tool-db');
    this.version(1).stores({
      experiments:     'id, status, createdAt',
      metrics:         'id, type, createdAt',
      results:         'id, experimentId, computedAt',
      columnMappings:  'id, experimentId',   // keyed by experimentId + column fingerprint
      annotations:     '++id, experimentId, resultId, createdAt',
    });
  }
}
```

### 4.2 CSV Format Requirements

Users upload a **single pre-aggregated CSV** per analysis run. Data is already grouped and summed before upload — no row-level user data is required. This approach avoids client-side joining entirely, keeps Lambda payloads small, and fits naturally with how analytics and data teams typically export from warehouses or BI tools.

#### Schema

Each row represents one `experiment_id × variation_id × dimension slice` combination.

| Column group | Columns | Required | Description |
|---|---|---|---|
| **Identifiers** | `experiment_id` | Yes | Must match an experiment defined in the app |
| | `variation_id` | Yes | Must match a variation key on the experiment |
| **Dimensions** | `[any named column]` | No | Named breakout columns (e.g. `device_type`, `browser`, `visitor_type`). Values are strings. Use `"all"` as the sentinel for the overall (unsliced) row. |
| **Units** | `units` | Yes | Denominator — total visits, visitors, or other assignment units for this row |
| **Metrics** | `[any named column]` | Yes (≥1) | Named metric totals (e.g. `purchases`, `clicks`, `revenue`). Values are raw totals; the app divides by `units` to compute rates. |

#### Example

```csv
#schema_version:1
experiment_id,variation_id,device_type,browser,units,purchases,clicks,revenue
exp_001,control,all,all,5000,480,1200,24000.00
exp_001,variant_a,all,all,5100,551,1320,27550.00
exp_001,control,mobile,all,2100,180,480,8400.00
exp_001,variant_a,mobile,all,2200,215,520,10200.00
exp_001,control,desktop,all,2900,300,720,15600.00
exp_001,variant_a,desktop,all,2900,336,800,17350.00
exp_001,control,all,chrome,3200,310,780,15800.00
exp_001,variant_a,all,chrome,3300,358,860,18000.00
```

Key conventions:
- **`#schema_version` header comment:** The first line of every CSV must be `#schema_version:1`. The app reads this before parsing and rejects files with an unknown or missing version with a clear error: _"Unrecognised CSV schema version. Please export a fresh file."_ This enables safe schema evolution in future versions without silent mis-parsing.
- **`"all"` sentinel:** A dimension value of `"all"` means "not sliced by this dimension." The overall result row has `"all"` in every dimension column. Sliced rows have a real value in one dimension and `"all"` in the rest (single-dimension slicing only in v1).
- **Raw totals for metrics:** `purchases = 480` means 480 total purchase events, not a rate. The app computes `480 / 5000 = 9.6%` at analysis time.
- **Normalization flag per metric:** Some metrics may already be rates or averages (e.g. a pre-computed `avg_session_duration`). This is handled via a per-metric config flag — see Section 4.1 `Metric.normalization`.
- **Multiple experiments in one file:** Supported. The app filters rows by `experiment_id` matching the current experiment.

#### Column Mapping (UI-driven, persisted)

Because dimension and metric column names are user-defined, the upload flow includes a column mapping step:

1. After upload, the app detects all columns and auto-classifies them:
   - `experiment_id`, `variation_id`, `units` → reserved; auto-confirmed
   - Remaining columns → user assigns each as **Dimension**, **Metric**, or **Ignore**
2. For metric columns, user selects which pre-defined metric from the library each column maps to (or creates a new metric inline)
3. Mapping is **persisted in IndexedDB**, keyed by `experimentId + sorted column name set`. On re-upload with the same columns, the prior mapping is auto-applied and a banner indicates this: _"Using saved column mapping from [date]. Edit if your columns have changed."_
4. If the column set changes (columns added, removed, or renamed), the persisted mapping is cleared and the user is prompted to re-map, with a diff shown highlighting what changed.

### 4.3 CSV Validation Rules

Before dispatching to the active compute path, the frontend must validate:

- First line is `#schema_version:1` (blocking error if missing or unrecognised)
- `experiment_id`, `variation_id`, and `units` columns are present
- `variation_id` values, after trimming leading/trailing whitespace and lowercasing, match those defined on the experiment. Matching is case-insensitive and whitespace-tolerant; the raw CSV values are normalized before comparison. A UI callout displays the normalized values alongside the originals so the user can confirm the mapping is correct: _"'Control' → matched as 'control'"_. If no match is found after normalization, show a clear error listing the unmatched values and the expected variation keys side-by-side.
- At least one metric column has been mapped
- `units` is a positive integer on every row
- Metric columns contain parseable non-negative numbers (invalid rows flagged and dropped with warning)
- Each `variation_id` has exactly one row with all dimensions = `"all"` (the overall row); warn if missing
- File size does not exceed configured limit (default: 50MB)
- If the number of mapped dimension columns exceeds **5**, display a soft warning: _"You've mapped N dimensions. More than 5 dimensions can make results harder to interpret. Consider reducing to the most important breakouts."_ Upload is not blocked.

---

## 5. Core Modules

### 5.1 Experiment Management

- Create, edit, archive experiments — all persisted in IndexedDB
- Experiment list view — filterable by status and tags
- Status lifecycle: `draft → running → stopped → archived`
- Clone experiment — copy config into a new draft

### 5.1a Demo Mode

On first launch (empty IndexedDB), the app offers a "Load demo experiment" prompt. Demo mode seeds IndexedDB with a pre-built experiment config and a downloadable sample CSV so new users can explore the full analysis flow immediately.

Demo assets committed to the repo under `apps/web/public/demo/`:
- `demo-experiment.json` — pre-configured experiment (2 variations, 3 metrics, 2 dimensions)
- `demo-data.csv` — synthetic pre-aggregated CSV matching the demo experiment schema

**Synthetic data generator (`scripts/generate-demo-data.py`):**

A standalone Python script for generating synthetic pre-aggregated A/B test CSVs with configurable parameters. Used to produce `demo-data.csv` and useful for development testing.

```python
# scripts/generate-demo-data.py
# Usage: python generate-demo-data.py --p-control 0.05 --mde 0.15 --n 10000 --seed 42

import argparse, csv, math, random
import numpy as np

def generate(p_control, mde, n_per_variation, seed, dimensions):
    rng = np.random.default_rng(seed)
    p_treatment = p_control * (1 + mde)
    rows = []

    for variation, p in [("control", p_control), ("variant_a", p_treatment)]:
        # Overall row
        units = n_per_variation
        conversions = rng.binomial(units, p)
        rows.append({"experiment_id": "demo_001", "variation_id": variation,
                     "device_type": "all", "browser": "all",
                     "units": units, "purchases": conversions,
                     "clicks": rng.binomial(units, p * 8)})
        # Dimension slices
        for device, share in [("mobile", 0.45), ("desktop", 0.55)]:
            n_slice = round(units * share)
            rows.append({"experiment_id": "demo_001", "variation_id": variation,
                         "device_type": device, "browser": "all",
                         "units": n_slice, "purchases": rng.binomial(n_slice, p * (0.8 if device=="mobile" else 1.2)),
                         "clicks": rng.binomial(n_slice, p * 8)})
    return rows

# ... write to CSV
```

The script accepts `--p-control`, `--mde` (relative), `--n` (per variation), `--seed`, and `--output` flags. It generates overall rows plus dimension slices matching the demo experiment config.

### 5.2 Metric Library

- Create and manage reusable metric definitions in IndexedDB
- Each metric definition includes a `normalization` flag (`raw_total` or `pre_normalized`) and a `higherIsBetter` direction flag
- Metrics are referenced by experiment config; column-to-metric mapping is done at upload time, not in the metric definition itself

### 5.2a Metric Validation at Upload

After column mapping and before submitting to the stats engine, the app computes lightweight per-metric summary statistics and displays them in a pre-submission validation panel. This surfaces data quality issues before they produce silent errors in analysis.

**Summary stats computed per metric per variation:**

| Stat | Check |
|---|---|
| Total units | Warn if any variation has fewer units than the metric's `minSampleSize` |
| Metric total | Warn if total is 0 across all variations (_"No events recorded — is this the right column?"_) |
| Rate (total / units) | Warn if rate = 0% or rate = 100% (degenerate — no variance, test will be meaningless) |
| Rate balance | Warn if control rate differs from treatment rate by > 5× (_"Very large observed difference — check your data"_) |
| Units balance | Warn if any variation has < 10% of the total units across all variations (likely a mapping error) |

Warnings are non-blocking — the user can proceed past them with acknowledgement. Errors (e.g. zero units in any variation) are blocking.

The panel shows a compact table: one row per metric, one column per variation, displaying rate and units. This doubles as a sanity-check preview before the user commits to running analysis.

### 5.3 CSV Upload & Parsing

- Drag-and-drop or file picker UI
- PapaParse streams large CSV files without blocking the UI thread (`worker: true`)
- After upload, column auto-classification:
  - `experiment_id`, `variation_id`, `units` → reserved; auto-confirmed
  - All other columns → user assigns each as **Dimension**, **Metric**, or **Ignore** via a column mapping UI
- For each column marked as Metric, user selects which metric from the library it maps to (or creates a new one inline)
- Dimension columns marked as such are automatically detected as available slice options in the results view
- **Column mapping persistence:** On save, the mapping is stored in IndexedDB keyed by `experimentId + columnFingerprint` (sorted, joined column names). On re-upload with the same column set, the saved mapping is auto-applied and a non-blocking banner confirms this: _"Using saved column mapping from [date]. Edit below if your columns have changed."_ If the column set differs, the saved mapping is invalidated, a diff is shown, and the user is prompted to re-map only the changed columns.
- Validation errors displayed inline before submission
- Parsed data held in browser memory only for the duration of the analysis session; never written to IndexedDB

### 5.4 Analysis Runner

Orchestrates the full analysis flow:

1. User uploads pre-aggregated CSV on the experiment upload page
2. Frontend parses and validates CSV via PapaParse
3. User completes column mapping (dimensions / metrics / ignore)
4. Frontend filters rows to the current `experiment_id`, validates `variation_id` values
5. Frontend computes rates: for each `raw_total` metric, divides column value by `units` per row
6. Frontend constructs `AnalysisRequest` payload (see Section 9)
7. **Path A (Pyodide):** sends `AnalysisRequest` via `postMessage` to the Web Worker; displays "Warming up stats engine…" if Pyodide is not yet initialised
   **Path B (Lambda):** POSTs `AnalysisRequest` JSON to the Lambda Function URL via `fetch()`
8. Receives `AnalysisResponse` from Worker `postMessage` (Path A) or HTTP response (Path B)
9. Frontend persists result as `ExperimentResult` in IndexedDB
10. User is redirected to the results view

### 5.5 Results Viewer

Reads the most recent `ExperimentResult` from IndexedDB and renders the results dashboard (see Section 7.2).

### 5.6 JSON Export / Import

All app state (experiments, metrics, results, column mappings) can be exported to and imported from a single JSON file. This is the primary mechanism for sharing configs between teammates and for backup/restore.

**Export:** A "Export All Data" action in Settings serializes all IndexedDB tables to a structured JSON file and triggers a browser download:

```json
{
  "exportedAt": "2025-03-13T10:00:00Z",
  "version": 1,
  "experiments": [...],
  "metrics": [...],
  "results": [...],
  "columnMappings": [...],
  "annotations": [...]
}
```

**Import:** User uploads a `.json` file in Settings. The app validates the schema version, previews a summary of what will be imported ("12 experiments, 8 metrics, 34 results"), and prompts to merge (add without overwriting) or replace (wipe and overwrite).

**Selective export:** Individual experiments can also be exported in isolation (experiment config + its results only) from the experiment detail page. This is useful for sharing a single experiment with a stakeholder.

### 5.7 Backup Reminders

To reduce the risk of users losing data through accidental browser storage clears:

- On app load, if it has been more than **30 days** since the last export (tracked in IndexedDB), display a non-blocking banner: _"It's been a while since your last backup. Export your data to keep it safe."_
- On browser `storage` API pressure events (`navigator.storage.estimate()` returning > 80% usage), display an urgent prompt to export immediately.
- The last export timestamp is stored in IndexedDB and updated on every export action.

### 5.8 Annotations

Users can attach free-text notes to experiments, individual result snapshots, or specific metric rows. Annotations are stored in IndexedDB and included in JSON exports.

**Annotation scopes:**
- **Experiment-level** — general notes, hypothesis context, links to related tickets
- **Result-level** — notes tied to a specific analysis run (e.g. _"Re-ran after fixing exposure query bug"_)
- **Metric-level** — notes on a specific metric within a result (e.g. _"Revenue spike likely caused by promo code — treat with caution"_)

**UI surfaces:**
- A "Notes" tab on the experiment detail page lists all annotations for that experiment in reverse chronological order
- An annotation icon (📝) appears on result rows and snapshot headers that have attached notes; clicking opens an inline editor
- Annotations support basic Markdown (bold, italic, links, bullet lists) rendered inline via `react-markdown`
- Character limit: 2,000 characters per annotation
- No deletion — annotations are append-only to preserve audit trail. A "hide" toggle can suppress them from the default view.

---

## 6. Statistics Engine Integration

### 6.1 Supported Engines

| Engine | Description |
|---|---|
| **Bayesian** | Default. Returns probability of being best, expected loss, credible interval, and posterior parameters. Supports configurable priors. |
| **Frequentist** | Two-sample t-test for relative percent change. Returns p-value and 95% confidence interval. |
| **Sequential** | Frequentist with mSPRT adjustment for safe continuous monitoring without inflating false positive rate. |

### 6.2 Statistical Approach: Proportion-Only (v1)

Because the uploaded CSV contains only metric totals and unit counts (no per-user variance), all metrics are treated as **proportions** in v1. Variance is derived as `p(1−p)` where `p = metric_total / units`. This supports binomial and count-rate metrics (conversion rate, click rate, bounce rate) but not continuous metrics like revenue-per-visitor or session duration, which require variance data. Continuous metric support is deferred to v2 (see Section 12).

Both compute paths (Pyodide/WASM and Lambda) receive pre-computed rates from the frontend and use `gbstats` proportion tests throughout. The Python analysis logic is identical between paths; only the execution environment differs.

### 6.3 Analysis Request Payload

The frontend sends a compact, already-aggregated payload to whichever compute path is active — no row-level data:

```json
{
  "engine": "bayesian",
  "correction": "benjamini-hochberg",
  "variations": [
    { "id": "v1", "key": "control",   "weight": 0.5, "isControl": true  },
    { "id": "v2", "key": "variant_a", "weight": 0.5, "isControl": false }
  ],
  "metrics": [
    { "id": "m1", "name": "Purchase Rate", "isGuardrail": false },
    { "id": "m2", "name": "Bounce Rate",   "isGuardrail": true  }
  ],
  "data": {
    "overall": {
      "control":   { "units": 5000, "metrics": { "m1": 480, "m2": 2100 } },
      "variant_a": { "units": 5100, "metrics": { "m1": 551, "m2": 2090 } }
    },
    "slices": {
      "device_type": {
        "mobile":  {
          "control":   { "units": 2100, "metrics": { "m1": 180, "m2": 910 } },
          "variant_a": { "units": 2200, "metrics": { "m1": 215, "m2": 900 } }
        },
        "desktop": {
          "control":   { "units": 2900, "metrics": { "m1": 300, "m2": 1190 } },
          "variant_a": { "units": 2900, "metrics": { "m1": 336, "m2": 1190 } }
        }
      }
    }
  }
}
```

### 6.4 Analysis Response Payload

```json
{
  "srmPValue": 0.42,
  "srmFlagged": false,
  "overall": [
    {
      "metricId": "m1",
      "variationId": "v2",
      "units": 5100,
      "rate": 0.1080,
      "chanceToBeatControl": 0.94,
      "expectedLoss": 0.0012,
      "credibleIntervalLower": 0.005,
      "credibleIntervalUpper": 0.142,
      "relativeUplift": 0.073,
      "absoluteUplift": 0.0074,
      "significant": true
    }
  ],
  "slices": {
    "device_type": {
      "mobile":  [ /* same structure as overall */ ],
      "desktop": [ /* same structure as overall */ ]
    }
  },
  "warnings": []
}
```

### 6.5 Analysis Logic (Shared Python)

The core analysis logic is the same Python code regardless of compute path. For Path B (Lambda) it lives in `infra/lambda/analysis/handler.py`; for Path A (Pyodide) it is loaded into the Web Worker via `micropip`.

```python
# Shared analysis logic
# Path B: infra/lambda/analysis/handler.py (Lambda entry point)
# Path A: loaded via micropip inside stats.worker.ts Web Worker
import json
import numpy as np
from gbstats.bayesian.tests import proportion_test
from gbstats.frequentist.tests import frequentist_test
from gbstats.utils import check_srm

def handler(event, context):
    body = json.loads(event["body"])
    engine     = body["engine"]       # bayesian | frequentist | sequential
    correction = body["correction"]   # none | holm-bonferroni | benjamini-hochberg
    variations = body["variations"]
    metrics    = body["metrics"]
    data       = body["data"]

    control_key = next(v["key"] for v in variations if v["isControl"])
    non_controls = [v for v in variations if not v["isControl"]]

    overall = data["overall"]

    # 1. SRM check (overall units only)
    observed = [overall[v["key"]]["units"] for v in variations]
    expected = [v["weight"] for v in variations]
    srm_p    = check_srm(observed, expected).p_value

    # 2. Per-metric, per-variation proportion test
    results = []
    for metric in metrics:
        mid = metric["id"]
        ctrl = overall[control_key]
        n_ctrl  = ctrl["units"]
        cv_ctrl = ctrl["metrics"][mid]          # raw total (conversions)

        for var in non_controls:
            trt = overall[var["key"]]
            n_trt  = trt["units"]
            cv_trt = trt["metrics"][mid]

            if engine == "bayesian":
                res = proportion_test(n_ctrl, cv_ctrl, n_trt, cv_trt)
                result = {
                    "metricId":             mid,
                    "variationId":          var["id"],
                    "units":                n_trt,
                    "rate":                 cv_trt / n_trt,
                    "chanceToBeatControl":  res.chance_to_beat_control,
                    "expectedLoss":         res.expected_loss,
                    "credibleIntervalLower": res.uplift.mean - 1.96 * res.uplift.stddev,
                    "credibleIntervalUpper": res.uplift.mean + 1.96 * res.uplift.stddev,
                    "relativeUplift":       (cv_trt/n_trt - cv_ctrl/n_ctrl) / (cv_ctrl/n_ctrl),
                    "absoluteUplift":       cv_trt/n_trt - cv_ctrl/n_ctrl,
                    "significant":          res.chance_to_beat_control > 0.95,
                }
            else:
                p_ctrl = cv_ctrl / n_ctrl
                p_trt  = cv_trt  / n_trt
                res = frequentist_test(
                    n_ctrl, p_ctrl, p_ctrl*(1-p_ctrl),
                    n_trt,  p_trt,  p_trt*(1-p_trt),
                    alpha=0.05, two_tailed=True
                )
                result = {
                    "metricId":  mid,
                    "variationId": var["id"],
                    "units":     n_trt,
                    "rate":      p_trt,
                    "pValue":    res.p_value,
                    "confidenceIntervalLower": res.ci_lower,
                    "confidenceIntervalUpper": res.ci_upper,
                    "relativeUplift": (p_trt - p_ctrl) / p_ctrl,
                    "absoluteUplift": p_trt - p_ctrl,
                    "significant": res.p_value < 0.05,
                }
            results.append(result)

    # 3. Multiple comparison correction (non-guardrail metrics only)
    if correction != "none":
        results = apply_correction(results, metrics, correction)

    # 4. Repeat for each dimension slice
    slice_results = compute_slices(data.get("slices", {}), engine, metrics, variations)

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps({
            "srmPValue":  srm_p,
            "srmFlagged": srm_p < 0.001,
            "overall":    results,
            "slices":     slice_results,
            "warnings":   []
        })
    }
```

### 6.5a Pyodide Web Worker Sketch (Path A)

The Web Worker initialises Pyodide lazily on first use, installs `gbstats` via `micropip`, then re-uses the runtime for all subsequent calls in the session.

```typescript
// lib/stats/worker.ts
import { loadPyodide, PyodideInterface } from 'pyodide';
import type { AnalysisRequest, AnalysisResponse } from './types';

let pyodide: PyodideInterface | null = null;

async function initPyodide(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;

  self.postMessage({ type: 'status', message: 'Loading stats engine…' });
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
  });

  self.postMessage({ type: 'status', message: 'Installing gbstats…' });
  await pyodide.loadPackage(['numpy', 'scipy']);
  await pyodide.runPythonAsync(`
    import micropip
    await micropip.install('gbstats')
  `);

  self.postMessage({ type: 'status', message: 'Stats engine ready.' });
  return pyodide;
}

self.onmessage = async (event: MessageEvent<AnalysisRequest>) => {
  try {
    const py = await initPyodide();

    // Pass request payload into Python namespace
    py.globals.set('request_json', JSON.stringify(event.data));

    // Run the shared analysis logic (same as Lambda handler, minus HTTP envelope)
    const resultJson: string = await py.runPythonAsync(`
      import json
      from analysis import run_analysis   # shared module
      result = run_analysis(json.loads(request_json))
      json.dumps(result)
    `);

    const response: AnalysisResponse = JSON.parse(resultJson);
    self.postMessage({ type: 'result', data: response });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
```

**Caching strategy:** On first load, the browser fetches Pyodide (~12 MB) and the scipy/numpy WASM wheels (~28 MB combined) from the Pyodide CDN. These are cached via the Cache API so subsequent session starts load from disk. The app should display a one-time "downloading stats engine (35 MB)…" progress indicator with a progress bar. Subsequent session starts show a brief "loading from cache…" state (~1–2s).

> **Compatibility validation (do this first):** Before building the full WASM path, verify that `gbstats.bayesian.tests.proportion_test` and `gbstats.utils.check_srm` produce numerically identical results under Pyodide vs. CPython on a set of fixture inputs. If a WASM/scipy incompatibility is found, fall back to Path B and file an upstream issue.

### 6.6 Multiple Comparison Corrections

Applied within the shared analysis logic after per-metric results are computed. Guardrail metrics are always excluded.

| Method | Controls |
|---|---|
| `holm-bonferroni` | Family-Wise Error Rate (FWER) — conservative |
| `benjamini-hochberg` | False Discovery Rate (FDR) — less conservative |
| `none` | No adjustment |

### 6.7 Data Quality Checks

**Sample Ratio Mismatch (SRM):** Chi-squared test on observed vs. expected user distribution. Flag if `p_value < 0.001` (threshold configurable in app settings). Results are returned regardless, but UI shows a prominent warning.

**Multiple Exposures:** Flag if any user appears in more than one variation. Threshold: `> 1%` of total users (configurable).

**Guardrail Violations:** Any guardrail metric with statistically significant negative movement triggers a warning state in the UI.

### 6.8 Power Calculator (Client-Side Only)

Runs entirely in the browser — no Lambda or WASM invocation needed regardless of the Path A/B setting.

**Reference:** Implements the two-proportions power calculation equivalent to R's `pwr.2p2n.test` from the `pwr` package, which uses Cohen's h effect size with a two-sided z-test for two independent proportions with optionally unequal sample sizes.

The Python equivalent (used in Lambda Path B and as a validation reference) is `statsmodels.stats.power.NormalIndPower` + `statsmodels.stats.proportion.proportion_effectsize`:

```python
# Python equivalent of pwr.2p2n.test — kept in scripts/power-calc-reference.py
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize
import math

def power_calc(p_baseline, mde_relative, alpha=0.05, power=0.80, ratio=1.0):
    p_treatment = p_baseline * (1 + mde_relative)
    h = proportion_effectsize(p_baseline, p_treatment)  # Cohen's h
    n = NormalIndPower().solve_power(
        effect_size=h, power=power, alpha=alpha,
        ratio=ratio, alternative="two-sided"
    )
    return math.ceil(n)  # n per control variation; n_treatment = ceil(n * ratio)
```

`ratio` = n_treatment / n_control, which allows unequal splits (e.g. `ratio=0.25` for an 80/20 allocation).

**Browser implementation:** TypeScript using the same formula with `simple-statistics` (`ss.probitSimple` / `ss.cumulativeStdNormalProbability`) for the inverse normal CDF. The script `scripts/power-calc-reference.py` serves as a validation fixture — the TypeScript output must match Python within floating-point tolerance before shipping.

**Inputs:**
- Baseline conversion rate
- MDE — toggle between relative (e.g. 10% lift) and absolute (e.g. +0.5 percentage points)
- Traffic split — derived automatically from experiment variation weights; supports unequal splits
- α (default 0.05)
- Power / 1−β (default 0.80)
- Estimated daily users

**Outputs:**
- Required n per variation (respecting split ratio)
- Total required users
- Estimated days to required sample size
- Cohen's h effect size (shown in expandable "Details" for statistical literacy)
- Warning if h < 0.01 (_"Effect size is very small — experiment will need a very long runtime to detect this difference"_)

---

## 7. Feature Requirements

### 7.1 Experiment Creation Wizard

Multi-step form; wizard state held in Zustand, saved to IndexedDB on completion.

**Step 1 — Hypothesis:** Name (required), description, hypothesis text, tags.

**Step 2 — Variations:** Add/remove variations (min 2, max 5). Set traffic weight per variation as percentages; the UI enforces that all weights sum to exactly 100% before allowing the user to proceed — the "Next" button is disabled with an inline indicator showing the current total (e.g. _"95% — 5% remaining"_). Supports unequal splits (e.g. 80/20). Designate exactly one control. The expected proportions (weights / 100) are stored on the experiment and used for SRM calculation at analysis time.

**Step 3 — Metrics:** Select primary metrics from library (min 1). Select guardrail metrics (optional). Optional activation metric.

**Step 4 — Stats Configuration:** Engine selection (Bayesian / Frequentist / Sequential). Enable/disable CUPED with inline tooltip. Multiple comparison correction. Bayesian prior settings (enable informative prior, set prior mean + variance per metric).

**Step 5 — Review & Launch:** Full config summary. Embedded power calculator. "Save as Draft" or "Launch" (sets status to `running`, saves to IndexedDB).

### 7.2 Results Dashboard

#### Header
- Experiment name, status badge, variation count, date of last analysis
- SRM warning banner — prominent amber/red, explains implication, configurable threshold
- Multiple exposure warning (if flagged)
- "Re-run Analysis" button — reopens upload flow with current experiment config pre-loaded

#### Results Table

One row per metric. Columns:

| Column | Description |
|---|---|
| Metric | Name + type badge |
| Baseline | Control mean/rate + user count |
| Variation(s) | Treatment mean/rate + user count |
| Relative Uplift | % change vs. control with directional arrow |
| Absolute Uplift | Raw difference |
| Evidence | Bayesian: chance to beat control + risk badge / Frequentist: p-value badge |
| Interval | Credible interval or confidence interval |

Table controls: toggle Relative Lift / Absolute Lift / Scaled Impact; variation filter (multi-variant); expand row → violin plot (Bayesian) or CI bar chart (Frequentist) + debug panel.

#### Guardrail Metrics Section
Rendered separately below primary metrics: 🟢 Safe / 🟡 Borderline / 🔴 Violated per metric.

#### Visualizations
- Cumulative time series — metric values over time per variation (requires `timestamp` column)
- Violin / density plot — posterior distribution of relative uplift (Bayesian)
- CI bar chart — upper/lower CI per variation (Frequentist)
- Traffic split donut — actual observed split vs. expected

#### Export
- Export results as CSV
- Export raw `AnalysisRequest` payload as JSON (for reproducibility)

### 7.3 Metric Library

- Searchable, filterable list of all metrics in IndexedDB
- Create / edit / delete metrics
- Metric detail page: column mapping, recent experiments using this metric
- Import/export metric library as JSON (enables sharing between teammates)

### 7.4 App Settings (persisted in IndexedDB)

- **Compute engine** — toggle between `wasm` (Pyodide, default) and `lambda` (Path B fallback). When set to `wasm`, a status indicator shows whether the worker is uninitialised, loading, ready, or errored — with a manual "Reload engine" button.
- Lambda Function URL — only required when compute engine is set to `lambda`; entered at runtime, stored in IndexedDB. A "Test connection" button validates the URL is reachable before saving.
- SRM p-value threshold (default: 0.001)
- Multiple exposure rate threshold (default: 0.01)
- Default stats engine
- Default α and power for power calculator
- Dimension count soft-warning threshold (default: 5)
- Backup reminder interval in days (default: 30)
- **IndexedDB storage usage indicator** — displays estimated current usage and browser quota using `navigator.storage.estimate()`, e.g. _"Using 4.2 MB of ~500 MB available"_. Refreshes on Settings page load. Shown as a progress bar; turns amber at >50% and red at >80% of estimated quota.

### 7.5 Data Management (Settings page)

- **Export All Data** — downloads full IndexedDB snapshot as `.json`; updates last-export timestamp
- **Import Data** — uploads a `.json` export file; user chooses merge or replace; previews import summary before confirming
- **Export Experiment** — available on individual experiment detail pages; exports that experiment's config + all its results as a standalone `.json`
- **Last backup indicator** — shows date of last export in Settings; highlighted in amber if > 30 days ago

> The compute path setting and Lambda Function URL (if used) are stored in IndexedDB, not baked into the build. This means the same static site can be used in WASM-only mode or pointed at dev/prod Lambda without a rebuild.

---

## 8. UI/UX Requirements

### 8.1 Layout

- Top navigation: Experiments | Metrics | Settings
- Main content: full-width with `max-w-7xl` container
- No sidebar (single-org tool; keeps navigation simple)

### 8.2 Design Principles

- Data-dense but scannable — color and iconography communicate state without reading every number
- Statistics made legible — inline tooltips explain p-values, credible intervals, CUPED, SRM for non-statistician users
- Dark mode support via Tailwind `dark:` classes and `next-themes`
- Responsive down to 1280px (desktop-first)

### 8.3 Key UI States

| State | Behavior |
|---|---|
| No experiments yet | Empty state with "Create your first experiment" CTA |
| Draft experiment | Muted badge; no upload or results option |
| Running, no results | "Upload Data to Analyze" CTA prominently shown |
| Analysis in progress | Full-page loading overlay with progress steps |
| SRM flagged | Amber warning banner; results visible but with caution overlay |
| Significant positive | Green highlight on metric row |
| Significant negative | Red highlight on metric row |
| Guardrail violated | Red badge in guardrail section |
| Lambda error | Error state with raw error message + retry button |

### 8.4 CSV Upload UX

- Drag-and-drop zone with labeled expected columns
- After file drop: column detection preview (first 5 rows in a table)
- Column mapping step: auto-detect required columns; allow remapping if names differ
- Validation errors listed before submission is allowed
- Progress indicator during PapaParse streaming of large files

---

## 9. Stats Engine Interface

Both compute paths share identical `AnalysisRequest` / `AnalysisResponse` TypeScript types. The `runAnalysis()` abstraction routes to the correct path at runtime; all other code is path-agnostic.

```typescript
// lib/stats/runAnalysis.ts
export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const { computeEngine } = getSettings();
  if (computeEngine === 'wasm') {
    return runAnalysisInWorker(request);    // postMessage to Pyodide Web Worker
  } else {
    return runAnalysisInLambda(request);   // fetch() to Lambda Function URL
  }
}
```

### 9.1 Path A — Web Worker Call

```typescript
// lib/stats/runAnalysis.ts
function runAnalysisInWorker(request: AnalysisRequest): Promise<AnalysisResponse> {
  return new Promise((resolve, reject) => {
    const worker = getOrCreateStatsWorker();  // singleton worker, persists for session
    worker.onmessage = (e) => {
      if (e.data.type === 'result') resolve(e.data.data);
      if (e.data.type === 'error')  reject(new Error(e.data.message));
      if (e.data.type === 'status') updateEngineStatusBanner(e.data.message);
    };
    worker.postMessage(request);
  });
}
```

Worker implementation is in `lib/stats/worker.ts` — see Section 6.5a.

### 9.2 Path B — Lambda Function URL Call

```typescript
// lib/stats/runAnalysis.ts
async function runAnalysisInLambda(request: AnalysisRequest): Promise<AnalysisResponse> {
  const { lambdaUrl } = getSettings();
  const res = await fetch(lambdaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `Lambda error ${res.status}`);
  }
  return res.json() as Promise<AnalysisResponse>;
}
```

**CORS (Path B only):** Lambda Function URL must return:
```
Access-Control-Allow-Origin: https://<username>.github.io
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```
Not applicable for Path A — no network requests are made for analysis.

### 9.3 Shared TypeScript Types

```typescript
// lib/stats/types.ts

interface AnalysisRequest {
  engine: 'bayesian' | 'frequentist' | 'sequential';
  correction: 'none' | 'holm-bonferroni' | 'benjamini-hochberg';
  alpha: number;                   // default 0.05
  srmThreshold: number;            // default 0.001

  variations: {
    id: string;
    key: string;
    weight: number;                // expected proportion 0–1
    isControl: boolean;
  }[];

  metrics: {
    id: string;
    name: string;
    isGuardrail: boolean;
  }[];

  // Pre-aggregated totals — no row-level data
  data: {
    overall: Record<string, { units: number; metrics: Record<string, number> }>;
    slices:  Record<string, Record<string, Record<string, { units: number; metrics: Record<string, number> }>>>;
  };

  multipleExposureCount: number;   // detected client-side during CSV validation
}

interface AnalysisResponse {
  srmPValue: number;
  srmFlagged: boolean;
  multipleExposureFlagged: boolean;

  overall: MetricVariationResult[];
  slices:  Record<string, Record<string, MetricVariationResult[]>>;

  warnings: string[];
}

interface MetricVariationResult {
  metricId: string;
  variationId: string;
  units: number;
  rate: number;
  relativeUplift: number;
  absoluteUplift: number;
  significant: boolean;
  // Bayesian
  chanceToBeatControl?: number;
  expectedLoss?: number;
  credibleIntervalLower?: number;
  credibleIntervalUpper?: number;
  // Frequentist / Sequential
  pValue?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
}
```

### 9.4 Error Handling

Both paths raise errors that surface to the UI with a retry button:

- **Path A:** Worker posts `{ type: 'error', message: string }` — caught by `onmessage` handler
- **Path B:** Non-2xx HTTP responses throw with structured body `{ error: string, message: string }`

The UI preserves the last `AnalysisRequest` payload so the user can retry without re-uploading.

---

## 10. Infrastructure & Deployment

### 10.1 Static Site (GitHub Pages)

Required for both compute paths.

```bash
next build                          # generates /out with static export
# Deployment is handled by GitHub Actions (see Section 10.5)
# The /out directory is pushed to the gh-pages branch automatically
```

```typescript
// next.config.ts
const config = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },    // required for static export
};
export default config;
```

### 10.2 Path A — Pyodide Asset Caching

Pyodide and its wheels are large and must be cached aggressively to avoid re-downloading on every session.

**Strategy:** Use a Next.js `public/` Service Worker (`sw.js`) or the browser Cache API directly from the Web Worker to cache Pyodide assets on first load.

```typescript
// lib/stats/worker.ts — cache Pyodide runtime on first load
const PYODIDE_VERSION = '0.27.0';
const PYODIDE_CDN     = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

async function initPyodide() {
  // loadPyodide fetches from CDN; browser caches via standard HTTP cache headers
  // For offline support, pre-cache using a Service Worker or Cache API:
  self.pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });
  await self.pyodide.loadPackage(['numpy', 'scipy']);
  await self.pyodide.runPythonAsync(`
    import micropip
    await micropip.install('gbstats')
  `);
}
```

**Caching approach options (choose one):**

| Option | Complexity | Offline support |
|---|---|---|
| Browser HTTP cache (default) | None — works automatically | Partial — depends on cache headers from CDN |
| Workbox Service Worker | Medium | Full — explicit pre-cache on install |
| Manual Cache API in Worker | Low-medium | Full — explicit `cache.put()` on first fetch |

Recommended: Manual Cache API in Worker for v1 (avoids Service Worker complexity); upgrade to Workbox if full offline support becomes a requirement.

**User-facing loading state:** On first analysis of a session, show a progress indicator: _"Loading stats engine… (one-time download, ~35 MB)"_. Subsequent analyses in the same session are fast.

### 10.3 Path B — Lambda Deployment (SAM)

Only required if Path B (Lambda fallback) is enabled.

```yaml
# infra/lambda/template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  AnalysisFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handler.handler
      Runtime: python3.12
      Timeout: 60
      MemorySize: 1024
      FunctionUrlConfig:
        AuthType: NONE
        Cors:
          AllowOrigins:
            - 'https://<username>.github.io'
          AllowMethods:
            - POST
          AllowHeaders:
            - Content-Type
```

```bash
cd infra/lambda && sam build && sam deploy --guided
```

### 10.4 Environment Configuration

Neither compute path requires environment variables baked into the build.

- **Path A (WASM):** No config needed. Pyodide CDN URL is hardcoded in the worker; can be made configurable via Settings if a self-hosted Pyodide mirror is needed.
- **Path B (Lambda):** The Function URL is entered in App Settings on first use and stored in IndexedDB — not an env var.

For local development, `.env.local` can seed a default Lambda URL for Path B testing:

```
NEXT_PUBLIC_DEFAULT_LAMBDA_URL=https://<dev-lambda-url>
```

### 10.5 CI/CD (GitHub Actions)

**Frontend pipeline (both paths):**
1. `npm run build` — Next.js static export to `./out`
2. Deploy `./out` to the `gh-pages` branch using `peaceiris/actions-gh-pages`

```yaml
# .github/workflows/deploy.yml (frontend)
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./apps/web/out
```

**Lambda pipeline (Path B only):**
1. `docker build` Lambda image
2. `docker push` to ECR
3. `aws lambda update-function-code` with new image digest

The frontend pipeline is sufficient for Path A deployments. The Lambda pipeline is only needed if the team is maintaining Path B.

---

## 11. Non-Functional Requirements

### 11.1 Performance

- CSV parsing of up to 50MB must not block the main thread (PapaParse `worker: true`)
- Results dashboard renders in under 1 second from IndexedDB read
- **Path A (WASM):** Pyodide initialisation target ≤ 8s on first use per session; ≤ 1s on subsequent calls within the same session (worker stays alive). Show a loading indicator for any operation taking > 500ms.
- **Path B (Lambda):** Timeout 60s; request payload limit 6MB (Lambda Function URL hard limit). Pre-aggregated format keeps payloads well under this limit at expected data volumes.
- Analysis of a typical experiment (2 variations, 5 metrics, 10 dimension slices) should complete in under 5 seconds on either path.

### 11.2 Data Privacy

- **Path A (WASM):** No data leaves the browser at any point during analysis. This is the strongest possible privacy guarantee.
- **Path B (Lambda):** Aggregated (non-row-level) metric totals are transmitted to Lambda over HTTPS. Lambda is fully stateless — no data is written to any store. CloudWatch Lambda logs must be configured to suppress request body logging.
- Under both paths, raw CSV data is held in browser memory only for the duration of the session; it is never written to IndexedDB.

### 11.3 Reliability

- **Path A (WASM):** Worker errors (Pyodide init failure, `gbstats` exception) are caught via `worker.onerror` and surfaced with a descriptive message and retry button. If the worker crashes mid-session, it is automatically restarted on next analysis attempt (re-initialising Pyodide). Worker init failures on first load should offer a one-click fallback prompt: _"Stats engine failed to load. Switch to cloud analysis?"_ — which activates Path B if a Lambda URL is configured.
- **Path B (Lambda):** Lambda errors are surfaced with a descriptive message and retry button. Request payload is preserved in memory for retry without re-uploading.
- IndexedDB operations are wrapped in try/catch with user-facing error messages on failure
- Dexie schema versioning handles any future IndexedDB migrations without data loss
- **Result snapshot retention:** A maximum of **3** `ExperimentResult` records are retained per experiment, ordered by `computedAt` descending. When a new result is saved, any results beyond the 3 most recent are automatically deleted. This is enforced in the Dexie write transaction so it is atomic. The results history UI shows all retained snapshots with timestamps so users can compare runs.

### 11.4 Browser Compatibility

- Target: Chrome 110+, Firefox 115+, Safari 16+
- All target browsers support IndexedDB, Web Workers, and modern fetch

### 11.5 Local Development

```bash
# Frontend (both compute paths work in dev)
cd apps/web && npm install && npm run dev

# Path A — Pyodide validation spike (run before committing to WASM path)
# Open browser console on the test page and check output matches CPython
open apps/web/public/pyodide-test.html

# Path B — Lambda local testing
cd infra/lambda && sam local start-lambda
```

The Pyodide test page (`public/pyodide-test.html`) is a standalone HTML file that loads Pyodide from CDN, installs `gbstats`, runs a fixture through `proportion_test` / `frequentist_test` / `check_srm`, and logs results to the console. It is committed to the repo and used for ongoing regression checks when `gbstats` or Pyodide versions are bumped.

---

## 12. Out of Scope (v1)

- Warehouse SQL connectivity (users upload CSVs manually)
- User authentication or access control
- Multi-tenancy or cross-user data sharing
- SDK-based assignment or feature flagging
- Visual no-code experiment editor
- Multi-armed bandit / adaptive experiments
- Server-side rendering, Next.js API routes, or a persistent backend
- Large file handoff via pre-signed URL (not anticipated given pre-aggregated format; revisit only if row-level uploads are added)
- Full offline (PWA) support — caching strategy in v1 covers Pyodide assets but not full app shell offline; defer to v2 if needed
- Export to Jupyter Notebook
- **v2: Continuous metric support** — row-level per-user CSV upload (one row per user, one column per metric value) enabling mean tests with empirical variance. Deferred because pre-calculated variance is unreliable for non-normal distributions; row-level data allows the Lambda to compute variance directly.

---

## 13. Open Questions

| # | Question | Notes |
|---|---|---|
| 7 | IaC preference: AWS SAM or Terraform for Lambda deployment? | SAM is simpler for Lambda-only; Terraform is better if more AWS resources are added later. Only relevant if Path B (Lambda) is retained long-term. |
| 8 | Does `gbstats` run correctly under Pyodide's WASM scipy build? | **Must be validated early** — see Section 13.1 below. This is the highest-risk unknown in the project. |

> All other open questions from earlier drafts have been resolved and incorporated into the relevant sections of this document.

### 13.1 Pyodide Compatibility Validation (Q8 Detail)

Before committing to Path A as the primary compute path, the team should run a focused spike to confirm that `gbstats` behaves identically under Pyodide as it does under CPython. This is the single highest-risk unknown in the project.

**Validation approach:**

1. Stand up a minimal HTML page that loads Pyodide from CDN, installs `gbstats` via `micropip`, and runs a small fixture through `proportion_test`, `frequentist_test`, and `check_srm`.
2. Run the same fixture through `gbstats` in a standard Python 3.12 environment.
3. Assert that all numeric outputs match within floating-point tolerance (e.g. `abs(a - b) < 1e-9`).

**Known risk areas to test:**

| Risk | Detail |
|---|---|
| `scipy.stats` WASM build | Pyodide ships pre-built scipy wheels; most functions work but edge cases exist in distributions and special functions |
| `micropip` install of `gbstats` | `gbstats` is pure Python so should install cleanly; confirm it doesn't pull in a C-extension dependency transitively |
| Floating-point parity | WASM uses standard IEEE 754 so results should match CPython; worth confirming for the specific `gbstats` code paths used |
| Worker memory limits | Browsers cap Web Worker heap; `scipy` + `numpy` loaded together use ~150–200 MB — confirm this is within target browser limits |

**Go/no-go:** If the spike surfaces a meaningful discrepancy or a blocking incompatibility, fall back to Path B (Lambda) as the primary path and treat Path A as a future enhancement once the issue is resolved upstream.

---

## Appendix A: `gbstats` Reference

### Installation

```bash
pip install gbstats
```

### Key Imports

```python
from gbstats.bayesian.tests import proportion_test, mean_test
from gbstats.frequentist.tests import frequentist_test
from gbstats.utils import check_srm
```

### SRM Check

```python
srm_p = check_srm(
    observed=[5100, 4900],
    expected=[0.5, 0.5]
)
# srm_p < 0.001 → flag as SRM
```

### Bayesian Proportion Test (Binomial Metric)

```python
result = proportion_test(
    n_control=5000, conversions_control=500,
    n_treatment=5100, conversions_treatment=550
)
# result.chance_to_beat_control
# result.expected_loss
# result.uplift.mean, result.uplift.stddev
```

### Bayesian Mean Test (Count / Revenue / Duration)

```python
result = mean_test(
    n_control=5000, mean_control=4.5, variance_control=1.44,
    n_treatment=5100, mean_treatment=4.8, variance_treatment=1.56
)
```

### Frequentist Test

```python
result = frequentist_test(
    n_control=5000, mean_control=4.5, variance_control=1.44,
    n_treatment=5100, mean_treatment=4.8, variance_treatment=1.56,
    alpha=0.05, two_tailed=True
)
# result.p_value
# result.ci_lower, result.ci_upper
```

### Metric Type → Test Function Mapping

| Metric Type | v1 Treatment | Test Function | Notes |
|---|---|---|---|
| `binomial` | Proportion | `proportion_test` | Variance derived as p(1−p) |
| `count` | Proportion (rate) | `proportion_test` | e.g. clicks/units; treated as binomial rate |
| `revenue` | ⚠ Deferred to v2 | requires `mean_test` | Needs variance; not derivable from totals alone |

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **SRM** | Sample Ratio Mismatch — observed traffic split differs significantly from expected, indicating a bug in assignment logic |
| **CUPED** | Controlled-experiment Using Pre-Experiment Data — reduces variance by using pre-experiment metric values as covariates |
| **MDE** | Minimum Detectable Effect — the smallest true effect the experiment is powered to detect |
| **Guardrail Metric** | A metric that must not regress; catches harmful side effects of a change |
| **Credible Interval** | Bayesian analog to confidence interval |
| **Chance to Beat Control** | Bayesian probability that the treatment is better than control |
| **Expected Loss** | Expected degradation if the seemingly-winning variation is selected but is actually worse |
| **Sequential Testing** | Statistical method allowing continuous monitoring without inflating false positive rates (mSPRT) |
| **Benjamini-Hochberg** | Multiple comparison correction controlling False Discovery Rate (FDR) |
| **Holm-Bonferroni** | Multiple comparison correction controlling Family-Wise Error Rate (FWER) |
| **IndexedDB** | Browser-native key-value store used here via Dexie.js for all persistent app state |
| **Lambda Function URL** | A dedicated HTTPS endpoint for invoking AWS Lambda directly, without API Gateway |
| **Pyodide** | CPython compiled to WebAssembly; allows `numpy`, `scipy`, and `gbstats` to run in the browser |
| **Web Worker** | Browser API for running JS/WASM on a background thread, keeping the main UI thread responsive |
| **micropip** | Pyodide's package installer; loads pure-Python packages like `gbstats` from PyPI at runtime |
| **WASM** | WebAssembly — binary instruction format that runs in browsers at near-native speed |
