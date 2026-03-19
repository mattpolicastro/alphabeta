# ⍺lphaβeta — Requirements

> **Related docs:** `architecture.md` (tech stack, directory layout, data flow), `TODO.md` (task tracker with per-file detail), `archive/requirements-v1-archived.md` (original v1 spec), `archive/requirements-v2-archived.md` (v2 planning doc with task-level status).

---

## Implemented Features

### Experiment Management

- **Creation wizard** — 5-step form: hypothesis, variations (2–5 with weights), metric selection, stats config, review + power calculator
- **Lifecycle** — draft → running → stopped → archived, with transitions from the detail view (launch, stop, resume, archive, unarchive)
- **Deletion** — permanent delete with confirmation; cascades to results, annotations, and column mappings
- **Cloning** — duplicate an experiment's config into a new draft
- **Platform experiment ID** — optional external identifier for CSV filtering and template generation
- **Tags** — comma-separated, filterable from the experiment list

### Metric Library

- **Types:** binomial, count, revenue, continuous
- **Properties:** normalization (raw total / pre-normalized), direction (higher/lower is better), guardrail flag, cap value/type, min sample size
- **Detail view** — expandable rows showing which experiments reference each metric
- **Import/export** — standalone JSON with versioned envelope and bulkPut merge

### Data Ingestion

- **Aggregated CSV** (`#schema:agg-v1`) — pre-aggregated rows with `experiment_id`, `variation_id`, `units`, metric columns, and optional dimension columns. `"all"` sentinel for unsliced rows.
- **Row-level CSV** (`#schema:row-v1`) — one row per user with raw metric values. Parsed in a Web Worker using Welford's algorithm. Capped at 100k rows.
- **Dual upload** — both formats side-by-side; merged into a single `AnalysisRequest` (row-level wins on metric overlap)
- **Column mapper** — assign columns as dimension/metric/ignore; auto-classification via sampling; inline metric creation; saved mappings restored on re-upload
- **Validation** — schema header check, required columns, variation ID normalization, metric-level warnings (zero events, degenerate rates, sample imbalance), blocking errors (zero units, row limit)
- **Template download** — pre-filled CSV with experiment's variations and metrics; row-level format for continuous metrics

### Statistical Analysis

- **Engines:** Bayesian (`EffectBayesianABTest`) and Frequentist (`TwoSidedTTest`) via gbstats 0.8.0
- **Metric types:** proportion tests (`ProportionStatistic`) for binomial/count; mean tests (`SampleMeanStatistic`) for revenue/continuous
- **Multiple comparison corrections:** Holm-Bonferroni (FWER) and Benjamini-Hochberg (FDR), with raw + adjusted p-values preserved
- **Dimension slices** — per-dimension, per-value breakdowns computed in parallel to overall results
- **SRM detection** — chi-squared test on observed vs expected traffic split
- **Multiple exposure detection** — flags users appearing in more than one variation
- **Power calculator** — Cohen's h for two proportions; inputs: baseline rate, MDE, alpha, power, daily traffic

### Compute Infrastructure

- **WASM (primary)** — Pyodide 0.26.2 in a Web Worker; loads numpy, scipy, pandas, gbstats at runtime
- **Lambda (secondary)** — identical Python logic in an AWS Lambda handler; Function URL with open CORS
- **Cache API** — Pyodide assets (~35 MB) cached via `cachedFetch` for faster subsequent loads; clearable from Settings
- **Worker resilience** — 3-minute timeout, auto-restart on crash, Lambda fallback prompt after 2+ consecutive failures
- **Progress overlay** — 4-step indicator (parsing → loading engine → running analysis → saving results) driven by worker status messages

### Results Display

- **Results table** — expandable rows with per-variation detail panels; CI/credible interval visualization; direction arrows based on `higherIsBetter`; significance coloring
- **Guardrail section** — safe/borderline/violated status per guardrail metric
- **Variation filter** — multi-select dropdown to show a subset of treatment variations (visible when >1 treatment)
- **Lift toggle** — switch between relative and absolute uplift
- **Result snapshots** — up to 3 retained per experiment; selector with timestamps
- **Annotations** — markdown notes pinned to experiment/result/metric; append-only with soft-delete and audit trail
- **Export** — results as CSV; raw `AnalysisRequest` as JSON for reproducibility

### Settings & Data Management

- **Compute engine** — toggle WASM/Lambda; Lambda URL with connection test
- **Thresholds** — SRM p-value, multiple exposure rate, dimension count warning
- **Defaults** — stats engine, alpha, power
- **Appearance** — light/dark/auto theme via Bootstrap 5 `data-bs-theme`; persisted in IndexedDB
- **Currency symbol** — configurable for revenue metric formatting
- **Data export/import** — full database or per-experiment JSON; merge or replace modes
- **Backup reminders** — configurable interval; banner on dashboard when overdue
- **Storage indicator** — IndexedDB usage via `navigator.storage.estimate()`
- **Stats cache** — clear Pyodide Cache API from Settings
- **Site title** — `NEXT_PUBLIC_APP_TITLE` env var (build-time); override via `.env.local`

### Infrastructure

- **CI/CD** — GitHub Actions: lint → test → build → deploy to GitHub Pages
- **Demo mode** — first-launch detection seeds a demo experiment with sample CSV

---

## Planned Features (beyond v2)

### Sequential Testing Engine

mSPRT-based continuous monitoring that allows safe peeking without inflating false positive rates. The `sequential` engine type exists in the schema but is removed from all UI selectors. Requires:
- Research gbstats sequential API (confirm class signatures, proportion vs mean support)
- Engine implementation in both worker and Lambda
- Monitoring boundary visualization and "safe to peek" indicator

### Visualizations

Recharts-based charts to complement the inline CSS interval bars:
- CI / credible interval bar chart (horizontal bars per variation)
- Violin / density plot for Bayesian posterior distributions
- Traffic split donut (observed vs expected allocation)
- Cumulative time series (requires timestamp column or multiple result snapshots)

### Bayesian Prior Configuration

Informative priors per metric for users with strong historical baselines. Currently defaults to uninformative priors. Requires prior settings UI in StatsConfigEditor, plumbing through `AnalysisRequest`, and validation to prevent degenerate priors.

### Metric Historical Trends

Cross-experiment performance history for a given metric. Stretch goal from the metric detail view — would show how a metric has performed across all experiments that reference it.

### GrowthBook API Alignment

**Principle:** Follow GrowthBook's data models and API conventions wherever possible. Only augment their structure when adding capabilities they don't expose (e.g., sequential analysis checkpoints, sample size estimates). This keeps the door open for future GrowthBook integration and ensures the data model reflects well-established experimentation patterns.

**Current alignment (Experiment model):**

| Field | GrowthBook | alphabeta | Status |
|-------|-----------|-----------|--------|
| Status | `draft`, `running`, `stopped` + `archived` boolean | `draft`, `running`, `stopped`, `archived` as status | Minor divergence — GB uses a flag for archived |
| Variations | `id`, `key`, `name`; weights in phases | `id`, `key`, `name`, `weight`, `isControl` | Weights/control embedded on variation — acceptable augmentation |
| Goal metrics | `metrics` (goal) | `primaryMetricIds` | Naming only |
| Guardrail metrics | `guardrailMetrics` | `guardrailMetricIds` | Aligned |
| Secondary metrics | `secondaryMetrics` | Not implemented | Gap — add if needed |
| Activation metric | `activationMetric` | `activationMetricId` | Aligned |
| Stats engine | `bayesian`, `frequentist` | Same + `sequential` (deferred) | Aligned; sequential is an augmentation |

**Current divergence (Metric types) — open decision:**

GrowthBook splits metric types by *statistical treatment*; we split by *business semantics*. GB's taxonomy maps more cleanly to the underlying gbstats classes.

| GrowthBook | gbstats class | alphabeta | Notes |
|-----------|--------------|-----------|-------|
| `proportion` | `ProportionStatistic` | `binomial` | Direct equivalent |
| `mean` | `SampleMeanStatistic` | `revenue`, `continuous`, partially `count` | GB uses one type; we have three |
| `ratio` | Custom denominator | Not implemented | Enables metrics like AOV (revenue / orders) |
| `quantile` | Quantile comparison | Not implemented | P99 latency, etc. |
| `retention` | Proportion over time window | Not implemented | Requires timestamp data |
| `daily participation` | Daily active proportion | Not implemented | Requires timestamp data |

**Recommended direction:** Adopt GB's `proportion` / `mean` split as the primary taxonomy. Preserve `revenue` as a display-formatting flag (currency symbol, 2dp) rather than a distinct statistical type. This would:
- Eliminate the ambiguous `continuous` and `count` types
- Align the schema with GrowthBook's API for potential future integration
- Simplify the metric creation UI for business users

**Migration path:** Add a `displayFormat` field (`default`, `currency`, `percentage`, `duration`) and collapse the statistical type to `proportion` | `mean`. Existing `binomial` → `proportion`, `count`/`revenue`/`continuous` → `mean`. Revenue metrics get `displayFormat: 'currency'`.

**Breaking change — export/import migration required:**

This is a schema-level change that affects three data surfaces:

1. **IndexedDB (live data)** — Dexie schema version bump with an `.upgrade()` callback to rewrite `Metric.type` values in place and add `displayFormat`.
2. **Full database export** (`ExportData`, currently `version: 1`) — Bump to `version: 2`. The import path must continue accepting `version: 1` files with a normalizer that maps old type values (`binomial` → `proportion`, `count`/`revenue`/`continuous` → `mean`) and infers `displayFormat`.
3. **Metric library export** (`MetricLibraryExport`, currently `version: 1`) — Same version bump and backward-compatible import normalizer.

Both import paths currently `bulkPut` raw JSON with no transformation, so a normalization step must be added before the `bulkPut` call. The `ExperimentResult.rawRequest` payloads in existing result snapshots also contain metric type references — these are historical records and should be left as-is (document that `rawRequest` reflects the types at analysis time).

See Appendix D for the current mapping between metric types and gbstats statistic classes.

### Other Deferred Items

- Warehouse SQL connectivity
- User authentication / access control / multi-tenancy
- SDK-based assignment / feature flagging
- Multi-armed bandit / adaptive experiments
- Server-side rendering or persistent backend
- Full offline PWA support (app shell caching)
- Export to Jupyter Notebook
- CUPED (variance reduction) — requires covariate data not in current CSV schemas
- Lambda CORS lockdown — replace `*` with GitHub Pages origin

---

## Appendix A: Data Model

All entities live in IndexedDB via Dexie.js. No server-side storage.

```typescript
// lib/db/schema.ts — canonical source of truth

export interface Experiment {
  id: string;                        // nanoid
  experimentId?: string;             // optional platform experiment ID
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
  normalization: 'raw_total' | 'pre_normalized';
  higherIsBetter: boolean;
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
  sliceResults?: Record<string, Record<string, MetricResult[]>>;
  rawRequest: AnalysisRequest;
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
  chanceToBeatControl?: number;      // Bayesian
  expectedLoss?: number;             // Bayesian
  credibleIntervalLower?: number;    // Bayesian
  credibleIntervalUpper?: number;    // Bayesian
  pValue?: number;                   // Frequentist (adjusted if correction applied)
  rawPValue?: number;                // Frequentist (pre-correction)
  confidenceIntervalLower?: number;  // Frequentist
  confidenceIntervalUpper?: number;  // Frequentist
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
  currencySymbol: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface ColumnMapping {
  id: string;                        // experimentId + column fingerprint
  experimentId: string;
  columnFingerprint: string;
  savedAt: number;
  mapping: Record<string, { role: 'dimension' | 'metric' | 'ignore'; metricId?: string }>;
}

export interface Annotation {
  id?: number;
  experimentId: string;
  resultId?: string;
  metricId?: string;
  body: string;                      // markdown
  hidden?: boolean;                  // soft-delete
  createdAt: number;
  updatedAt: number;
}
```

---

## Appendix B: CSV Formats

### Aggregated (`#schema:agg-v1`)

Pre-aggregated rows: one row per `experiment_id × variation_id × dimension slice`.

| Column group | Columns | Required | Description |
|---|---|---|---|
| Identifiers | `experiment_id`, `variation_id` | Yes | Must match experiment config |
| Dimensions | any named column | No | String values; `"all"` = unsliced |
| Units | `units` | Yes | Denominator (visits, users, etc.) |
| Metrics | any named column | Yes (≥1) | Raw totals; app computes rates |

### Row-level (`#schema:row-v1`)

One row per user: raw metric values aggregated in-browser via Web Worker.

| Column group | Columns | Required | Description |
|---|---|---|---|
| Identifiers | `experiment_id`, `variation_id`, `user_id` | Yes | Must match experiment config |
| Dimensions | any named column | No | Auto-classified by sampling |
| Metrics | any named column | Yes (≥1) | Raw per-user values (0/1 for proportion, numeric for continuous) |

**Limits:** 50 MB file size (both formats), 100k rows (row-level only), 200 unique values per dimension column.

---

## Appendix C: Analysis Engine Types

> Canonical definitions in `lib/stats/types.ts`.

```typescript
interface AnalysisRequest {
  engine: 'bayesian' | 'frequentist' | 'sequential';
  correction: 'none' | 'holm-bonferroni' | 'benjamini-hochberg';
  alpha: number;
  srmThreshold: number;
  variations: { id: string; key: string; weight: number; isControl: boolean }[];
  metrics: { id: string; name: string; isGuardrail: boolean; metricType?: 'proportion' | 'continuous' }[];
  data: {
    overall: Record<string, VariationData>;
    slices: Record<string, Record<string, Record<string, VariationData>>>;
  };
  multipleExposureCount: number;
}

interface VariationData {
  units: number;
  metrics: Record<string, number>;
  continuousMetrics?: Record<string, { mean: number; variance: number; n: number }>;
}

interface AnalysisResponse {
  srmPValue: number;
  srmFlagged: boolean;
  multipleExposureFlagged: boolean;
  overall: MetricVariationResult[];
  slices: Record<string, Record<string, MetricVariationResult[]>>;
  warnings: string[];
}
```

---

## Appendix D: gbstats Reference

> The implementation uses the **class-based API**, not the bare functions from the original v1 spec.

```python
# Actual imports used in stats-worker.js and handler.py
from gbstats.bayesian.tests import EffectBayesianABTest, EffectBayesianConfig
from gbstats.frequentist.tests import TwoSidedTTest, FrequentistConfig
from gbstats.models.statistics import ProportionStatistic, SampleMeanStatistic
from gbstats.utils import check_srm
```

| Metric Type | Statistic Class | Test Routing |
|---|---|---|
| `binomial` | `ProportionStatistic(n, sum)` | Proportion test — variance derived as p(1-p) |
| `count` | `ProportionStatistic(n, sum)` | Proportion test — treated as rate |
| `revenue` | `SampleMeanStatistic(n, sum, sum_squares)` | Mean test — requires row-level data for variance |
| `continuous` | `SampleMeanStatistic(n, sum, sum_squares)` | Mean test |

**Multiple comparison corrections** preserve the raw p-value as `rawPValue` before overwriting `pValue` with the adjusted value. Both are displayed in the UI.

---

## Appendix E: Glossary

| Term | Definition |
|---|---|
| **SRM** | Sample Ratio Mismatch — observed traffic split differs significantly from expected |
| **CUPED** | Controlled-experiment Using Pre-Experiment Data — variance reduction via pre-experiment covariates |
| **MDE** | Minimum Detectable Effect — smallest true effect the experiment is powered to detect |
| **Guardrail Metric** | A metric that must not regress; catches harmful side effects |
| **Credible Interval** | Bayesian analog to confidence interval |
| **Chance to Beat Control** | Bayesian probability that treatment outperforms control |
| **Expected Loss** | Expected degradation if the "winning" variation is actually worse |
| **Sequential Testing** | Statistical method allowing continuous monitoring without inflating false positives (mSPRT) |
| **Benjamini-Hochberg** | Multiple comparison correction controlling False Discovery Rate (FDR) |
| **Holm-Bonferroni** | Multiple comparison correction controlling Family-Wise Error Rate (FWER) |
| **Pyodide** | CPython compiled to WebAssembly; runs numpy, scipy, gbstats in-browser |
| **IndexedDB** | Browser-native key-value store; all persistent app state via Dexie.js |
