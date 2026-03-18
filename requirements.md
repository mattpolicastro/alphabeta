# ⍺lphaβeta — Requirements

> **Status:** Active requirements document. Covers v2 feature work (phases 1-3) and remaining v1 cleanup items. Reference appendices from the original v1 spec are included at the bottom for data model, type contracts, and gbstats API details.
>
> **Related docs:** `architecture.md` (tech stack, directory layout, data flow, conventions), `TODO.md` (task tracker), `archive/requirements-v1-archived.md` (full original v1 spec, kept for historical reference).

---

## v2 Phase 1 — Continuous Metrics & Sequential Testing

> The two headline features that define v2. Both require changes across the full stack (CSV schema → request builder → engine → transform → UI).

### 1.1 Continuous Metric Support

**Motivation:** v1 treats all metrics as proportions (`p = total / units`). This works for conversion rates but not for revenue-per-user, session duration, or other continuous metrics where variance can't be derived from the rate alone. This was identified as the primary v2 feature in §12 of the v1 spec.

**Approach:** Support a second CSV format (`#schema:row-v1`) — one row per user per variation — that provides raw values from which the frontend computes mean, variance, and sample size before sending to the engine. Schema naming uses a parallel convention (`agg-v1` / `row-v1`) rather than sequential versioning, to allow independent evolution. Row-level files are capped at **100k rows** (blocking error above this); parsing runs in a **Web Worker** while `agg-v1` stays synchronous on the main thread.

A single experiment can combine both an aggregated CSV (proportion/count metrics with dimension slices) and a row-level CSV (any metric type). If a metric appears in both, row-level data takes precedence. `buildMergedAnalysisRequest` merges both into one `AnalysisRequest`, including dimension slices from both sources (row-level wins on overlap).

Both aggregated and row-level column mappings are saved to IndexedDB (keyed by experiment ID + column fingerprint) on analysis submit. On re-upload, saved mappings are restored if the column schema matches, and the ColumnMapper shows a "saved mapping" banner with the date.

The csv-worker computes dimension slices for ALL non-reserved columns regardless of auto-classification, up to a cardinality cap of 200 unique values per column. This allows users to override the auto-classification (e.g., change a numeric column to "dimension") without losing slice data. Columns exceeding the cap are silently dropped from slice aggregation.

| Task | Effort | Status | Details |
|------|--------|--------|---------|
| Define row-level CSV schema | Low | Done | `#schema:row-v1` header; columns: `experiment_id`, `variation_id`, `user_id`, `<metric_columns>` |
| Extend CSV parser for row-level format | Medium | Done | Detects schema from `#schema:` prefix; dispatches `row-v1` to Web Worker for aggregation |
| Web Worker for row-level aggregation | Medium | Done | `public/csv-worker.js` — Welford's algorithm for numerically stable online mean/variance per variation per metric |
| Add `continuous` metric type | Low | Done | New option in metric library and type selector; maps to `SampleMeanStatistic` in gbstats |
| Update `buildRequest` for mean + variance | Medium | Done | `buildAnalysisRequestV2` populates `continuousMetrics` on `VariationData`; `buildMergedAnalysisRequest` combines agg + row-level sources |
| Engine support for `mean_test` | Medium | Done | `SampleMeanStatistic` + `_run_mean_test` in both worker and Lambda; routes by `metricType` |
| Update `transformResponse` for mean metrics | Low | Done | Handles continuous metric fields (mean, variance-based stddev) |
| UI: metric type indicators in results | Low | Done | Badge distinguishing proportion vs continuous; "Mean" vs "Rate" labels |
| Revenue metrics via continuous path | Low | Done | Revenue routed through `SampleMeanStatistic` (mean test) alongside continuous; `CONTINUOUS_METRIC_TYPES` set in `buildRequest.ts` |
| Dual-upload interface | Medium | Done | Two side-by-side upload sections (aggregated + row-level); metric coverage panel; merged analysis request |
| Warnings for continuous metrics in agg upload | Low | Done | Warning when revenue/continuous metrics mapped in aggregated section; metric coverage panel shows "needs row-level" badge |
| ColumnMapper abstraction for row-v1 | Low | Done | ColumnMapper accepts `schema` prop; uses appropriate reserved columns; replaces static table in row-level section |
| Row-level dimension support | Medium | Done | Worker auto-classifies columns as metric/dimension; per-dimension-slice Welford aggregation; `buildAnalysisRequestV2` populates slices |
| Worker: slice by all potential dimensions | Low | Done | Worker computes slice aggregates for ALL non-reserved columns (not just auto-detected dimensions); cardinality cap (200 unique values) prevents memory explosion from high-cardinality numeric columns |
| Merge slices from both data sources | Low | Done | `buildMergedAnalysisRequest` merges dimension slices from both agg and row-level sources; previously only used agg slices |
| Row-level column mapping persistence | Low | Done | Row-level mappings saved to IndexedDB on submit and restored on re-upload, matching agg behavior |
| Revenue metric formatting | Low | Done | Revenue values display with configurable currency symbol (default `$`) + 2dp; continuous as plain 2dp; proportion as percentage |
| Raw p-value display (multiple comparison correction) | Low | Done | When BH or Holm correction applied, both raw and adjusted p-values shown in results table and detail panel |
| Update template CSV download | Low | Done | Explicit `format` parameter; each upload section gets its own template |

### 1.2 Sequential Testing Engine — *Deferred beyond v2*

> Moved out of v2 scope. See "Deferred beyond v2" section.

---

## ~~v2 Visualizations~~ — *Deferred beyond v2*

> Originally planned as a v2 phase. Moved out of scope. See "Deferred beyond v2" section.

---

## v2 Phase 2 — Quality of Life

> Independent features built in parallel alongside Phase 1 work. All complete.

### 3.1 Dark Mode

**Effort:** Low-Medium
**Approach:** Bootstrap 5's `data-bs-theme="dark"` attribute on `<html>` via a `ThemeProvider` client component. Store preference (`light` / `dark` / `auto`) in `AppSettings.theme`. Auto-detect via `prefers-color-scheme` media query when set to `auto`. Toggle button in NavBar cycles light → dark → auto. Radio buttons in Settings page.

| Task | Effort | Status |
|------|--------|--------|
| ThemeProvider component + layout wiring | Low | Done |
| Theme toggle in settings + navbar | Low | Done |
| Persist preference in settingsStore | Low | Done |
| Audit all pages for hardcoded colors | Medium | Done (`bg-light text-dark` → `bg-body-secondary`, `bg-info text-dark` → `bg-info-subtle text-info-emphasis`) |
| Test charts/visualizations in dark mode | Low | N/A — no Recharts charts yet |

### 3.2 Worker Resilience

**Effort:** Medium
**Motivation:** If the Pyodide worker crashes mid-session (OOM, unhandled exception), users currently see an opaque error. v2 should detect the crash, offer recovery, and optionally fall back to Lambda.

**Implemented:** 3-minute analysis timeout via `Promise.race` in `runAnalysisInWorker`. On crash/timeout, worker is terminated and reset for fresh creation on next attempt. `engineStatusStore.failureCount` tracks consecutive failures; UploadView shows "Switch to cloud analysis?" banner after 2+ failures (only when Lambda URL is configured). Success resets the counter.

| Task | Effort | Status |
|------|--------|--------|
| Detect worker termination (`onerror` / heartbeat) | Low | Done (onerror + timeout) |
| Auto-restart worker on next analysis attempt | Low | Done (worker nulled on crash, recreated on next call) |
| "Switch to cloud analysis?" prompt on repeated failure | Low | Done (after 2+ failures, if Lambda configured) |
| Pyodide Cache API for faster restarts | Low-Med | Done (`cachedFetch` in stats-worker.js, "Clear Stats Cache" in Settings) |

### 3.3 Variation Filter (Multi-Variant)

**Effort:** Low
**Motivation:** Experiments with 3-5 variations produce cluttered results tables. Allow filtering to a subset of variations.

**Implemented:** Multi-select dropdown in experiment detail view (visible when >1 treatment variation). Filters apply to ResultsTable, GuardrailSection, and dimension slices. Selection uses `null` = show all, array of IDs = filtered. Bootstrap dropdown with checkmarks.

| Task | Effort | Status |
|------|--------|--------|
| Dropdown in results view header | Low | Done |
| Filter ResultsTable + GuardrailSection by selected variations | Low | Done |
| Persist selection per experiment in session | Low | Done (component state, resets on navigation) |

### 3.4 Bayesian Prior Configuration — *Deferred beyond v2*

> Moved out of v2 scope. See "Deferred beyond v2" section.

### 3.5 Metric Detail View

**Effort:** Medium
**Motivation:** Users want to see which experiments use a given metric and how it has performed historically.

**Implemented:** Expandable rows in the metric library table. Clicking a metric name reveals which experiments reference it (as primary or guardrail), with links to each experiment's detail view. Uses `getExperimentsUsingMetric()` DB query.

| Task | Effort | Status |
|------|--------|--------|
| Reverse lookup: experiments using metric (Dexie query) | Low | Done |
| Expandable metric detail panel with experiment list | Medium | Done |
| Historical trend of metric across experiments (stretch) | High | Deferred beyond v2 |

### 3.6 Annotation Improvements

**Effort:** Low
**Motivation:** Minor UX gaps from v1 annotation implementation.

| Task | Effort | Status |
|------|--------|--------|
| Append-only enforcement (soft-delete / "hide" toggle) | Low | Done |
| Audit trail view (show hidden annotations) | Low | Done |

### 3.7 Experiment Status Management

**Effort:** Low
**Motivation:** Status transitions are currently scattered and incomplete. Drafts can only be launched during creation (not from the detail view), stopped experiments can't be resumed, and archived experiments are terminal with no escape hatch. Users need a clear, consistent way to manage experiment lifecycle from the detail view.

**Implemented transitions:**
- Draft → Running: "Launch" button in detail view (single click, no confirmation modal)
- Running → Stopped: "Stop" in detail view dropdown
- Stopped → Running: "Resume" in detail view dropdown
- Any → Archived: "Archive" in detail view dropdown
- Archived → Stopped: "Unarchive" in detail view dropdown
- First analysis on a non-running experiment prompts status transition via `window.confirm`

| Task | Effort | Status |
|------|--------|--------|
| "Launch" button for draft experiments in detail view | Low | Done |
| "Resume" action for stopped experiments | Low | Done |
| "Unarchive" action | Low | Done (→ stopped) |
| Auto-transition on first analysis | Low | Done (always prompt via `window.confirm`) |

### 3.8 Full-Page Loading Overlay with Progress Steps

**Effort:** Low-Medium
**Motivation:** During analysis, users see a simple spinner. A stepped progress indicator (parsing → building request → running engine → saving results) provides better feedback, especially for first-time WASM loads.

**Implemented:** `AnalysisOverlay` component with 4 progress steps (parsing → loading engine → running analysis → saving results). Worker status messages drive step transitions via `engineStatusStore.message`. Replaces simple spinner in UploadView.

| Task | Effort | Status |
|------|--------|--------|
| Define progress step enum | Low | Done (`AnalysisStep` type in `AnalysisOverlay.tsx`) |
| Wire worker status messages to overlay component | Low-Med | Done (UploadView watches `engineMessage` to set steps) |
| Animated step transitions | Low | Done (spinner for active, checkmark for completed) |

### 3.9 Experiment Deletion

**Effort:** Low
**Motivation:** Users need a way to permanently remove experiments beyond archiving. The `deleteExperiment()` DB function already handled cascading cleanup; it just needed UI wiring.

**Implemented:** "Delete" button in experiment detail view header. Clicking shows an inline danger alert explaining that the experiment, all analysis results, notes, and column mappings will be permanently deleted. "Delete permanently" confirms; "Cancel" dismisses. Redirects to experiment list after deletion.

| Task | Effort | Status |
|------|--------|--------|
| Delete button with confirmation banner | Low | Done |
| Cascade delete (results, annotations, column mappings) | Low | Done (already existed in `deleteExperiment()`) |

### 3.10 Platform Experiment ID

**Effort:** Low
**Motivation:** Most experimentation platforms use an internal identifier. Adding an optional platform experiment ID field keeps things consistent across environments.

**Implemented:** Optional `experimentId` field on `Experiment` schema. Editable in creation wizard (Step 1) and config panel. CSV filtering uses `experiment.experimentId || experiment.id` as primary match, with fallback to internal nanoid, then single-experiment fallback. Template generation uses platform ID when available.

| Task | Effort | Status |
|------|--------|--------|
| Add `experimentId` to schema + wizard + config panel | Low | Done |
| CSV filtering with platform ID priority | Low | Done |
| Template generation with platform ID | Low | Done |

### 3.11 Configurable Site Title

**Effort:** Low
**Motivation:** Allow build-time customization of the app title for teams deploying their own instance.

**Implemented:** `NEXT_PUBLIC_APP_TITLE` env var (default: `⍺lphaβeta` in `apps/web/.env`). Read by NavBar and layout metadata. Override via `.env.local` or shell environment. Documented in README.md.

| Task | Effort | Status |
|------|--------|--------|
| Env var in NavBar + layout metadata | Low | Done |
| `.env` file with default | Low | Done |
| README documentation | Low | Done |

---

## Deferred beyond v2

> Features scoped for v2 but moved out to keep the release focused.

- **§1.2 Sequential Testing Engine** — mSPRT-based continuous monitoring. Requires gbstats API research (does it support sequential proportion tests?). Type exists in schema but removed from all UI selectors.
- **§2.x Visualizations** — Recharts-based charts (CI bar chart, violin plot, traffic split donut, cumulative time series). Inline CSS bars in the detail panel are functional for now.
- **§3.4 Bayesian Prior Configuration** — Informative priors per metric. Power-user feature for metrics with strong historical baselines.

## Deferred indefinitely

> Items from the v1 spec (§12) that remain out of scope.

- Warehouse SQL connectivity
- User authentication / access control / multi-tenancy
- SDK-based assignment / feature flagging
- Multi-armed bandit / adaptive experiments
- Server-side rendering or persistent backend
- Full offline PWA support (app shell caching)
- Export to Jupyter Notebook
- CUPED (variance reduction) — requires covariate data not in current CSV schemas

---

## Infrastructure

### Lambda Path

| Item | Effort | Notes |
|------|--------|-------|
| CORS lockdown | Low | Replace `*` with GitHub Pages origin; decision needed on whether Lambda stays long-term |
| Lambda CI/CD workflow | Medium | SAM pipeline + secrets; only if Lambda is the supported path |

**Decision needed:** Is Lambda still a supported compute path in v2, or has WASM proven sufficient? If WASM-only, Lambda infra can be archived.

### CI/CD

| Item | Effort | Notes |
|------|--------|-------|
| Test runner in CI | Low | Done — `npm test` step in deploy workflow |
| Lint check in CI | Low | Done — `npm run lint` step in deploy workflow |

---

## Suggested Build Order

```
v1: ✅ complete
v2 Phase 1 (continuous metrics): ✅ complete
v2 Phase 2 (quality of life): ✅ complete
  §3.1 dark mode, §3.2 worker resilience + Cache API, §3.3 variation filter,
  §3.5 metric detail view, §3.6 annotations, §3.7 status management,
  §3.8 loading overlay, §3.9 experiment deletion, §3.10 platform ID,
  §3.11 site title, CI test/lint runner
deferred beyond v2: §1.2 sequential testing, §2.x visualizations, §3.4 Bayesian priors,
  §3.5 metric historical trends
```

---

## Appendices (from v1 spec)

> The sections below are reference material carried forward from the original v1 requirements document (`archive/requirements-v1-archived.md`). They document the data model, type contracts, and gbstats API as designed and implemented in v1. For architecture, directory layout, and runtime conventions, see `architecture.md` instead.

---

### Appendix A: Data Model

All entities live in IndexedDB via Dexie.js. No server-side storage.

#### A.1 IndexedDB Schema (Dexie)

```typescript
// lib/db/schema.ts
import Dexie, { Table } from 'dexie';

export interface Experiment {
  id: string;                        // nanoid
  experimentId?: string;             // optional platform experiment ID (used for CSV filtering)
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
  type: 'binomial' | 'count' | 'revenue' | 'continuous';
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
  sliceResults?: Record<string, Record<string, MetricResult[]>>; // dimension → value → results
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
  rawPValue?: number;              // pre-correction p-value (when multiple comparison correction applied)
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
  relativeUplift: number;
  absoluteUplift: number;
  scaledImpact?: number;
  significant: boolean;
  cupedApplied: boolean;
}

export interface AppSettings {
  id: 'singleton';
  computeEngine: 'wasm' | 'lambda';
  lambdaUrl: string;
  srmThreshold: number;
  multipleExposureThreshold: number;
  defaultStatsEngine: 'bayesian' | 'frequentist' | 'sequential';
  defaultAlpha: number;
  defaultPower: number;
  dimensionWarningThreshold: number;
  backupReminderDays: number;
  lastExportedAt: number | null;
  currencySymbol: string;          // e.g. '$', '€', '£' — used for revenue metric display
  theme: 'light' | 'dark' | 'auto'; // UI theme preference; 'auto' follows OS prefers-color-scheme
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
  hidden?: boolean;          // soft-delete for append-only audit trail
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

#### A.2 CSV Format — Aggregated (`agg-v1`)

Users upload a **single pre-aggregated CSV** per analysis run. Data is already grouped and summed before upload — no row-level user data is required.

Each row represents one `experiment_id x variation_id x dimension slice` combination.

| Column group | Columns | Required | Description |
|---|---|---|---|
| **Identifiers** | `experiment_id` | Yes | Must match an experiment defined in the app |
| | `variation_id` | Yes | Must match a variation key on the experiment |
| **Dimensions** | `[any named column]` | No | Named breakout columns (e.g. `device_type`, `browser`, `visitor_type`). Values are strings. Use `"all"` as the sentinel for the overall (unsliced) row. |
| **Units** | `units` | Yes | Denominator — total visits, visitors, or other assignment units for this row |
| **Metrics** | `[any named column]` | Yes (>=1) | Named metric totals (e.g. `purchases`, `clicks`, `revenue`). Values are raw totals; the app divides by `units` to compute rates. |

**Example:**

```csv
#schema:agg-v1
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
- **`#schema:agg-v1` header:** The first line of every aggregated CSV must be `#schema:agg-v1`. The app reads this before parsing and rejects files with an unknown or missing schema.
- **`"all"` sentinel:** A dimension value of `"all"` means "not sliced by this dimension." The overall result row has `"all"` in every dimension column.
- **Raw totals for metrics:** `purchases = 480` means 480 total purchase events, not a rate. The app computes `480 / 5000 = 9.6%` at analysis time.
- **Normalization flag per metric:** Some metrics may already be rates or averages. This is handled via a per-metric config flag (`Metric.normalization`).
- **Multiple experiments in one file:** Supported. The app filters rows by `experiment_id` matching the current experiment.

#### A.2b CSV Format — Row-level (`row-v1`)

Row-level CSVs contain **one row per user per variation** with raw metric values. The app aggregates per-variation statistics (n, mean, variance) in a Web Worker before sending to the stats engine. This format is required for continuous metrics and also supports proportion metrics (as 0/1 values per user).

| Column group | Columns | Required | Description |
|---|---|---|---|
| **Identifiers** | `experiment_id` | Yes | Must match an experiment defined in the app |
| | `variation_id` | Yes | Must match a variation key on the experiment |
| | `user_id` | Yes | Unique user identifier per row |
| **Dimensions** | `[any named column]` | No | Named breakout columns with string values (e.g. `device_type`, `country`). Auto-detected by the worker via sampling: columns where all sampled values are non-numeric are classified as dimensions. |
| **Metrics** | `[any named column]` | Yes (>=1) | Raw per-user metric values. For continuous metrics: the observed value (e.g. revenue amount, session duration). For proportion metrics: 0 or 1. |

**Example:**

```csv
#schema:row-v1
experiment_id,variation_id,user_id,device_type,revenue,converted
exp_001,control,user_001,mobile,0,0
exp_001,control,user_002,desktop,52.30,1
exp_001,control,user_003,mobile,0,0
exp_001,variant_a,user_004,desktop,48.70,1
exp_001,variant_a,user_005,mobile,61.20,1
exp_001,variant_a,user_006,desktop,0,0
```

Key conventions:
- **`#schema:row-v1` header:** The first line must be `#schema:row-v1`.
- **Dimension columns supported.** Non-reserved columns are auto-classified by the worker: columns where all sampled values (up to 20 rows) are numeric are classified as metrics; others as dimensions. Users can override the auto-classification in the ColumnMapper UI (e.g., change a numeric column like `segment_id` to "dimension").
- **Worker slices all potential dimensions.** The worker computes per-dimension-slice aggregates for ALL non-reserved columns, not just auto-detected dimensions. This ensures slice data is available regardless of how the user maps columns. A cardinality cap of **200 unique values** per column prevents memory explosion from high-cardinality numeric columns; columns exceeding the cap are silently dropped from slice aggregation.
- **No `units` column.** Sample size is computed automatically from the row count per variation.
- **Auto-mapping by worker classification.** The worker classifies columns as metric or dimension by sampling. Metric columns are then matched to experiment metrics by comparing the column name (lowercased, spaces replaced with underscores) to metric names in the library. Unmatched metric columns default to "ignore"; dimension-classified columns default to the "dimension" role.
- **Column mapping persistence.** Row-level column mappings are saved to IndexedDB on analysis submit, keyed by experiment ID + column fingerprint (sorted column names). When the same CSV schema is re-uploaded for the same experiment, the saved mapping is restored automatically, and the ColumnMapper shows a "saved mapping" banner with the date. This matches the existing behavior for aggregated CSV mappings.
- **Aggregation in Web Worker.** The CSV is parsed and aggregated in `public/csv-worker.js` using Welford's online algorithm for numerically stable mean and variance computation. The worker computes both overall aggregates and per-dimension-slice aggregates (for all non-reserved columns up to the cardinality cap). Only the first 5 rows are returned for UI preview; the full aggregates (mean, variance, n per variation per metric) are used for analysis.

#### A.2c Dimension Slice Data Flow

Dimension slices flow through a multi-stage pipeline from CSV upload to results display. Understanding this pipeline is important because dimensions can originate from either data source (aggregated or row-level) and the user can override auto-classification.

**Stage 1: CSV Worker (row-level only)**
- `public/csv-worker.js` parses the CSV in a single pass
- Auto-classifies non-reserved columns via sampling (20 rows): all-numeric → metric, otherwise → dimension
- Computes Welford aggregates for metric columns, grouped by ALL non-reserved columns as potential dimensions
- Cardinality cap: columns with >200 unique values are dropped from slice accumulation
- Output: `sliceAggregates` keyed as `dimension_name → dimension_value → variation_id → metric_column → { mean, variance, n }`

**Stage 2: Column Mapping**
- Auto-mapping uses worker classification as default; saved mappings override if available
- User can override any column's role in the ColumnMapper (dimension / metric / ignore)
- Mapping changes don't require re-parsing; the worker pre-computed slices for all eligible columns

**Stage 3: Request Builder**
- `buildAnalysisRequestV2`: reads `dimensionCols` from the user's mapping, looks up slice data from `rowLevelSliceAggregates`
- `buildMergedAnalysisRequest`: when both data sources present, merges slices from both. Row-level slices take precedence on dimension name overlap
- For aggregated CSVs: slices come from rows where exactly one dimension has a real value and all others = "all"

**Stage 4: Stats Engine**
- `_compute_slices` (in both `stats-worker.js` and `handler.py`) runs per-metric, per-variation tests for each dimension slice
- Multiple comparison correction is applied per-slice independently

**Stage 5: Transform + Storage**
- `transformResponse` processes `response.slices` in parallel to `response.overall`
- Result stored with `sliceResults?: Record<string, Record<string, MetricResult[]>>` on `ExperimentResult`

**Stage 6: Results Display**
- `ExperimentDetailView` renders `DimensionSliceSection` when `sliceResults` is non-empty
- Dropdown selectors for dimension name and dimension value
- Selected slice renders a full `ResultsTable` with the same columns as the overall results

#### A.3 CSV Validation Rules

**Common (both formats):**
- First line must be a recognized schema header (`#schema:agg-v1` or `#schema:row-v1`); blocking error if missing or unrecognised
- `experiment_id` and `variation_id` columns are present
- `variation_id` values, after trimming whitespace and lowercasing, match those defined on the experiment
- At least one metric column has been mapped
- File size does not exceed configured limit (default: 50 MB)

**Aggregated (`agg-v1`) specific:**
- `units` column is present and contains a positive integer on every row
- Metric columns contain parseable non-negative numbers (invalid rows flagged and dropped with warning)
- Each `variation_id` has exactly one row with all dimensions = `"all"` (the overall row); warn if missing
- If the number of mapped dimension columns exceeds **5**, display a soft warning (non-blocking)

**Row-level (`row-v1`) specific:**
- `user_id` column is present
- At least one non-reserved column exists (metric data)
- Row count does not exceed **100,000** rows (blocking error)
- Variation IDs are checked against the aggregated keys from the worker output

---

### Appendix B: Shared TypeScript Types

> Type contracts for the stats engine interface. Both compute paths (WASM worker and Lambda) consume and produce these types. See `lib/stats/types.ts` in the codebase for the canonical definitions.

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
    metricType?: 'proportion' | 'continuous'; // default: 'proportion' for backward compat
  }[];

  // Pre-aggregated totals — no row-level data
  data: {
    overall: Record<string, VariationData>;
    slices:  Record<string, Record<string, Record<string, VariationData>>>;
  };

  multipleExposureCount: number;   // detected client-side during CSV validation
}

interface VariationData {
  units: number;
  metrics: Record<string, number>;  // metric id → raw total (proportion metrics)
  // Continuous metric aggregates (populated by row-level CSV parser)
  continuousMetrics?: Record<string, { mean: number; variance: number; n: number }>;
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
  mean?: number;                   // populated for continuous metrics (instead of rate)
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
  rawPValue?: number;              // pre-correction p-value (populated when multiple comparison correction applied)
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
}
```

#### B.1 Multiple Comparison Correction — Raw p-value Preservation

When a multiple comparison correction (Holm-Bonferroni or Benjamini-Hochberg) is applied, the engine preserves the original p-value as `rawPValue` before overwriting `pValue` with the adjusted value. This flows through the full pipeline:

1. **Engine** (`stats-worker.js` / `handler.py`): `_apply_correction` saves `r["rawPValue"] = r["pValue"]` before setting `r["pValue"] = adjusted[i]`.
2. **Types** (`types.ts`): `MetricVariationResult.rawPValue?: number`.
3. **Transform** (`transformResponse.ts`): passes `rawPValue` through to `VariationResult`.
4. **Schema** (`schema.ts`): `VariationResult.rawPValue?: number`.
5. **UI** (`ResultsTable.tsx`): Evidence column shows `(raw: X.XXXX)` inline; detail panel shows separate "p-value (adjusted)" and "p-value (raw)" rows.

**Why both values matter:** Benjamini-Hochberg step-down correction enforces monotonicity via a cumulative minimum. When raw p-values are within a factor of `m` (number of tests) of the largest, the adjusted values converge to the same number. Showing the raw p-value alongside the adjusted value helps users understand that different metrics do have different evidence strength despite identical adjusted values.

#### B.2 Revenue and Continuous Metric Formatting

Revenue and continuous metrics are formatted differently from proportion metrics throughout the UI:

| Metric type | Format | Example |
|-------------|--------|---------|
| Proportion (binomial, count) | Percentage with 2dp | `9.60%` |
| Revenue | Currency symbol + 2dp | `$52.30` |
| Continuous | Plain number with 2dp | `14.72` |

The currency symbol is configurable via `AppSettings.currencySymbol` (default: `$`). Both `ResultsTable` and `MetricValidationPanel` use metric-type-aware formatters (`formatValue`, `formatMetricValue`) that read the currency symbol from the settings store.

---

### Appendix C: `gbstats` Reference

> **Important:** The v1 spec assumed bare-function imports (`proportion_test`, `frequentist_test`). The actual implementation uses the class-based API (`EffectBayesianABTest`, `TwoSidedTTest`, `ProportionStatistic`). See `architecture.md` for the correct API. The function signatures below are preserved for reference but do not reflect the production code.

#### Installation

```bash
pip install gbstats
```

#### Key Imports (v1 spec — see note above)

```python
from gbstats.bayesian.tests import proportion_test, mean_test
from gbstats.frequentist.tests import frequentist_test
from gbstats.utils import check_srm
```

#### SRM Check

```python
srm_p = check_srm(
    observed=[5100, 4900],
    expected=[0.5, 0.5]
)
# srm_p < 0.001 → flag as SRM
```

#### Bayesian Proportion Test (Binomial Metric)

```python
result = proportion_test(
    n_control=5000, conversions_control=500,
    n_treatment=5100, conversions_treatment=550
)
# result.chance_to_beat_control
# result.expected_loss
# result.uplift.mean, result.uplift.stddev
```

#### Bayesian Mean Test (Count / Revenue / Duration)

```python
result = mean_test(
    n_control=5000, mean_control=4.5, variance_control=1.44,
    n_treatment=5100, mean_treatment=4.8, variance_treatment=1.56
)
```

#### Frequentist Test

```python
result = frequentist_test(
    n_control=5000, mean_control=4.5, variance_control=1.44,
    n_treatment=5100, mean_treatment=4.8, variance_treatment=1.56,
    alpha=0.05, two_tailed=True
)
# result.p_value
# result.ci_lower, result.ci_upper
```

#### Metric Type → Test Function Mapping

| Metric Type | v1 Treatment | Test Function | Notes |
|---|---|---|---|
| `binomial` | Proportion | `proportion_test` | Variance derived as p(1-p) |
| `count` | Proportion (rate) | `proportion_test` | e.g. clicks/units; treated as binomial rate |
| `revenue` | Continuous (mean) | `mean_test` via `SampleMeanStatistic` | Routed through continuous path; requires row-level data for variance |

---

### Appendix D: Glossary

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
