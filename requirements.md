# A/B Test Tool — Requirements

> **Status:** Active requirements document. Covers v2 feature work (phases 1-3) and remaining v1 cleanup items. Reference appendices from the original v1 spec are included at the bottom for data model, type contracts, and gbstats API details.
>
> **Related docs:** `architecture.md` (tech stack, directory layout, data flow, conventions), `TODO.md` (task tracker), `archive/requirements-v1-archived.md` (full original v1 spec, kept for historical reference).

---

## v2 Phase 1 — Continuous Metrics & Sequential Testing

> The two headline features that define v2. Both require changes across the full stack (CSV schema → request builder → engine → transform → UI).

### 1.1 Continuous Metric Support

**Motivation:** v1 treats all metrics as proportions (`p = total / units`). This works for conversion rates but not for revenue-per-user, session duration, or other continuous metrics where variance can't be derived from the rate alone. This was identified as the primary v2 feature in §12 of the v1 spec.

**Approach:** Support a second CSV format — one row per user per variation — that provides raw values from which the frontend computes mean, variance, and sample size before sending to the engine.

| Task | Effort | Details |
|------|--------|---------|
| Define row-level CSV schema | Low | New `#schema_version:2` header; columns: `experiment_id`, `variation_id`, `user_id`, `<metric_columns>` |
| Extend CSV parser for row-level format | Medium | Detect schema version; aggregate per-variation: n, mean, variance per metric |
| Add `continuous` metric type | Low | New option in metric library; maps to `mean_test` in gbstats |
| Update `buildRequest` for mean + variance | Medium | Include `mean`, `variance`, `n` per metric per variation (not just totals) |
| Engine support for `mean_test` | Medium | Add `mean_test` / `TwoSidedTTest` with variance path to both worker and Lambda |
| Update `transformResponse` for mean metrics | Low | Handle mean-based result fields |
| UI: metric type indicators in results | Low | Badge distinguishing proportion vs continuous metrics |
| Update template CSV download | Low | Generate row-level template when continuous metrics are configured |

**Decisions needed:**
- Maximum row count before requiring pre-aggregation? (100k? 500k?)
- Should row-level parsing move to Web Worker to avoid blocking main thread?
- Support mixed CSVs (some metrics proportion, some continuous)?

### 1.2 Sequential Testing Engine

**Motivation:** Frequentist tests require a fixed sample size; peeking inflates false positive rate. Sequential testing (mSPRT) allows safe continuous monitoring. The type already exists in the schema but was removed from all UI selectors in v1. See Appendix C (gbstats Reference) for API details.

| Task | Effort | Details |
|------|--------|---------|
| Research gbstats sequential API | Low | Confirm available class/function signatures; gbstats may use `SequentialTTest` or similar |
| Implement sequential engine path in worker | Medium | Add mSPRT-based test alongside Bayesian/Frequentist |
| Implement sequential engine path in Lambda | Medium | Mirror worker logic |
| Re-enable sequential option in StatsConfigEditor | Low | Unhide from engine selector dropdown |
| Sequential-specific result fields | Medium | Adjusted p-value, always-valid CI, monitoring boundary |
| UI: monitoring boundary visualization | Medium | Show where the test currently sits relative to the stopping boundary |
| UI: "safe to peek" indicator | Low | Green/amber badge on results when using sequential engine |
| Documentation: when to use sequential | Low | Tooltip or help text explaining trade-offs vs fixed-horizon |

**Decisions needed:**
- Does gbstats support sequential proportion tests, or only mean tests?
- Should sequential results show a cumulative history (implies storing multiple result snapshots over time)?

---

## v2 Phase 2 — Visualizations

> Recharts-based charts to replace the CSS-positioned interval bars in v1. Install `recharts` as a dependency.

### 2.1 Chart Components

| Chart | Effort | When to show | Details |
|-------|--------|-------------|---------|
| CI / Credible Interval bar chart | Medium | All results | Horizontal bars per variation showing interval spans; replaces inline CSS bars |
| Violin / density plot | Medium-High | Bayesian results | Posterior distribution of relative uplift; requires sampling or KDE from posterior params |
| Traffic split donut | Low | All results | Observed vs expected allocation; highlights SRM visually |
| Cumulative time series | High | Requires timestamp column | Metric values over time per variation; needs CSV schema extension or separate upload |

**Decisions needed:**
- Does the cumulative time series require a new CSV column (`timestamp` / `period`), or should it use multiple result snapshots?
- Should charts be interactive (hover for values) or static?
- Responsive behavior below 1280px?

### 2.2 Chart Integration Points

| Location | Chart(s) | Notes |
|----------|----------|-------|
| ResultsTable expanded row | CI bar chart, violin plot | Conditional on engine type |
| Results dashboard header | Traffic split donut | Next to SRM warning |
| New "Trends" tab (if time series) | Cumulative time series | Only if timestamp data available |

---

## v2 Phase 3 — Quality of Life

> Independent features that can be built in parallel alongside Phase 1-2 work.

### 3.1 Dark Mode

**Effort:** Low-Medium
**Approach:** Bootstrap 5's `data-bs-theme="dark"` attribute on `<html>`. Store preference in settings. Auto-detect via `prefers-color-scheme` media query.

| Task | Effort |
|------|--------|
| Theme toggle in settings + navbar | Low |
| Persist preference in settingsStore | Low |
| Audit all pages for hardcoded colors | Medium |
| Test charts/visualizations in dark mode | Low |

### 3.2 Worker Resilience

**Effort:** Medium
**Motivation:** If the Pyodide worker crashes mid-session (OOM, unhandled exception), users currently see an opaque error. v2 should detect the crash, offer recovery, and optionally fall back to Lambda.

| Task | Effort |
|------|--------|
| Detect worker termination (`onerror` / heartbeat) | Low |
| Auto-restart worker on next analysis attempt | Low |
| "Switch to cloud analysis?" prompt on repeated failure | Low |
| Pyodide Cache API for faster restarts | Low-Med |

### 3.3 Variation Filter (Multi-Variant)

**Effort:** Low
**Motivation:** Experiments with 3-5 variations produce cluttered results tables. Allow filtering to a subset of variations.

| Task | Effort |
|------|--------|
| Dropdown in results table header | Low |
| Filter `MetricResult[]` by selected variations | Low |
| Persist selection per experiment in session | Low |

### 3.4 Bayesian Prior Configuration

**Effort:** Medium
**Motivation:** Power users want informative priors for metrics with strong historical baselines. Currently defaults to uninformative priors.

| Task | Effort |
|------|--------|
| Prior settings UI in StatsConfigEditor (per-metric prior mean + variance) | Medium |
| Plumb priors through `AnalysisRequest` to engine | Low |
| Pass priors to `EffectBayesianABTest` constructor | Low |
| Sensible defaults + validation (prevent degenerate priors) | Low |

### 3.5 Metric Detail View

**Effort:** Medium
**Motivation:** Users want to see which experiments use a given metric and how it has performed historically.

| Task | Effort |
|------|--------|
| Reverse lookup: experiments using metric (Dexie query) | Low |
| Metric detail page/panel with experiment list | Medium |
| Historical trend of metric across experiments (stretch) | High |

### 3.6 Annotation Improvements

**Effort:** Low
**Motivation:** Minor UX gaps from v1 annotation implementation.

| Task | Effort |
|------|--------|
| Append-only enforcement (soft-delete / "hide" toggle) | Low |
| Audit trail view (show hidden annotations) | Low |

### 3.7 Full-Page Loading Overlay with Progress Steps

**Effort:** Low-Medium
**Motivation:** During analysis, users see a simple spinner. A stepped progress indicator (parsing → building request → running engine → saving results) provides better feedback, especially for first-time WASM loads.

| Task | Effort |
|------|--------|
| Define progress step enum | Low |
| Wire worker status messages to overlay component | Low-Med |
| Animated step transitions | Low |

---

## Deferred Beyond v2

> Items from the v1 spec (§12) that remain out of scope for v2.

- Warehouse SQL connectivity
- User authentication / access control / multi-tenancy
- SDK-based assignment / feature flagging
- Multi-armed bandit / adaptive experiments
- Server-side rendering or persistent backend
- Full offline PWA support (app shell caching)
- Export to Jupyter Notebook
- CUPED (variance reduction) — requires covariate data not in current CSV schemas; revisit after continuous metrics land

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
| Test runner in CI | Low | Jest is configured — add `npm test` step to deploy workflow |
| Lint check in CI | Low | Blocked on ESLint configuration |

---

## Suggested Build Order

```
v1 cleanup: ✅ tests + polish complete; remaining: ESLint + CI test runner
  → v2 Phase 1a: continuous metrics (CSV → engine → UI)
  → v2 Phase 1b: sequential testing (parallel with 1a if different contributors)
  → v2 Phase 2: visualizations (depends on Phase 1 for continuous metric charts)
  → v2 Phase 3: quality of life (parallel throughout)
```

---
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

#### A.2 CSV Format (v1 — Pre-Aggregated)

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
- **`#schema_version` header comment:** The first line of every CSV must be `#schema_version:1`. The app reads this before parsing and rejects files with an unknown or missing version.
- **`"all"` sentinel:** A dimension value of `"all"` means "not sliced by this dimension." The overall result row has `"all"` in every dimension column.
- **Raw totals for metrics:** `purchases = 480` means 480 total purchase events, not a rate. The app computes `480 / 5000 = 9.6%` at analysis time.
- **Normalization flag per metric:** Some metrics may already be rates or averages. This is handled via a per-metric config flag (`Metric.normalization`).
- **Multiple experiments in one file:** Supported. The app filters rows by `experiment_id` matching the current experiment.

#### A.3 CSV Validation Rules

Before dispatching to the active compute path, the frontend validates:

- First line is `#schema_version:1` (blocking error if missing or unrecognised)
- `experiment_id`, `variation_id`, and `units` columns are present
- `variation_id` values, after trimming whitespace and lowercasing, match those defined on the experiment
- At least one metric column has been mapped
- `units` is a positive integer on every row
- Metric columns contain parseable non-negative numbers (invalid rows flagged and dropped with warning)
- Each `variation_id` has exactly one row with all dimensions = `"all"` (the overall row); warn if missing
- File size does not exceed configured limit (default: 50MB)
- If the number of mapped dimension columns exceeds **5**, display a soft warning (non-blocking)

---

### Appendix B: Shared TypeScript Types

> These are the v1 type contracts for the stats engine interface. Both compute paths (WASM worker and Lambda) consume and produce these types. See `lib/stats/types.ts` in the codebase for the canonical definitions.

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
| `revenue` | Deferred to v2 | requires `mean_test` | Needs variance; not derivable from totals alone |

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
