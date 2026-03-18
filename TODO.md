# ⍺lphaβeta — Task Tracker

> **How to use this file:** Each module is self-contained. Agents should claim a module by marking tasks `[~]` (in progress). Before starting, read the **Depends on** line and confirm those items are merged to `main`. Mark `[x]` when merged. Use branch naming convention `feat/<module-slug>`.
>
> **Req doc reference:** `requirements.md` in repo root. Section numbers cited inline as `§N.N` refer to the original v1 spec (now archived as `archive/requirements-v1-archived.md`).
>
> **Architecture reference:** `architecture.md` in repo root — read this first for directory layout, data flow, and key conventions.

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress (note who/which agent)
- `[x]` — Merged to main
- `[!]` — Blocked (note reason)
- `[-]` — Descoped / deferred to v2
- **P0** — Must land first; other modules depend on it
- **P1** — Core feature; can parallelize after P0
- **P2** — Important but not blocking other work
- **P3** — Polish / nice-to-have for v1

---

## ~~v1 Remaining Gaps~~ ✅ All Complete

All v1 gaps have been addressed: 5 functional features, 137 unit tests across 4 modules, and 3 polish items.

---

## Implementation Notes (deviations from requirements.md)

> These clarifications reflect decisions made during implementation. Agents should follow the actual codebase, not the original requirements, where they differ.

- **Routing:** Uses query params (`/experiments/view?id=X&view=upload`) not dynamic routes (`/experiments/[id]`). This is required for Next.js static export (`output: 'export'`).
- **Styling:** Raw Bootstrap 5 CSS classes via `className`. No `react-bootstrap` component library, no Tailwind.
- **gbstats API:** Class-based (`EffectBayesianABTest`, `TwoSidedTTest`, `ProportionStatistic`), NOT bare functions (`proportion_test`, `frequentist_test`) as requirements.md assumed. See `architecture.md`.
- **Pyodide:** Pinned to 0.26.2 (not 0.27.0) due to numpy 2.x conflict. gbstats installed with `deps=False`.
- **Sequential engine:** Deferred to v2. Type exists in schema but removed from all UI selectors.
- **CUPED:** Schema field preserved but toggle disabled in UI; not implemented in analysis logic.
- **File organization:** `lib/store/` (not `lib/stores/`), `lib/csv/buildRequest.ts` (not `lib/stats/buildRequest.ts`). DB operations are in `lib/db/index.ts` (not split into per-entity files). See `architecture.md` for actual layout.
- **Shared components:** Variation editing, stats config, and metric picker are extracted into shared components (`VariationEditor`, `StatsConfigEditor`, `MetricPicker`) used by both the wizard and config panel.
- **Test framework configured.** Jest + `next/jest` preset + `fake-indexeddb` + `@testing-library/react`. Run `npm test` from `apps/web/`. DB test isolation via `resetDb()` helper in `lib/db/__tests__/helpers.ts`.

---

## P0 — Foundation (land these first, in order)

### Module: Project Scaffold
Touches: `apps/web/`, `next.config.ts`, `package.json`
Req: §3.1, §3.5, §10.1

- [x] Initialize Next.js app with `output: 'export'` in `apps/web/`
- [x] Configure TypeScript
- [x] Install core deps: bootstrap 5, dexie, papaparse, zustand, nanoid, react-markdown
- [x] Global Bootstrap CSS import in `app/layout.tsx`
- [x] App shell: top nav (Experiments | Metrics | Settings), full-width container (§8.1)
- [x] Pages: `app/page.tsx`, `experiments/new/page.tsx`, `experiments/view/page.tsx`, `metrics/page.tsx`, `settings/page.tsx`
- [x] Verify `npm run build` produces static export in `out/`
- [x] Jest + SWC test config via `next/jest` preset (§3.6)
- [x] Install test deps: `@testing-library/react`, `fake-indexeddb`, `jest`
- [x] ESLint — `next/core-web-vitals` + `next/typescript` via flat config
- [-] `react-bootstrap` — not used; raw Bootstrap classes instead
- [-] `recharts` — not installed; visualizations deferred (see P1 charts module)

### Module: Shared Types & Interfaces
Touches: `lib/stats/types.ts`, `lib/db/schema.ts`
Req: §4.1, §9.3

- [x] `lib/stats/types.ts` — `AnalysisRequest`, `AnalysisResponse`, `MetricVariationResult`, `WorkerMessage`
- [x] `lib/db/schema.ts` — All Dexie interfaces: `Experiment`, `Variation`, `Metric`, `ExperimentResult`, `MetricResult`, `VariationResult`, `ColumnMapping`, `Annotation`, `AppSettings`
- [x] `AppDB` Dexie class with version(1) stores and indexes
- [x] Export singleton `db` instance (via `lib/db/index.ts`)
- [x] `ExperimentResult.sliceResults` field for dimension slice data
- [x] Unit tests: DB opens, tables exist, basic CRUD smoke test

### Module: Zustand Stores
Touches: `lib/store/`
Req: §7.1 (wizard state), §7.4 (settings)

- [x] `settingsStore` — compute engine, lambda URL, SRM threshold, multiple exposure threshold, default stats engine, default α/power, dimension warning threshold, backup reminder interval, last export timestamp
- [x] `wizardStore` — multi-step experiment creation state
- [x] `engineStatusStore` — WASM/Lambda readiness tracking
- [x] Persist settings to IndexedDB on change

---

## P1 — Core Features (parallelize these)

### Module: Experiment Management
Touches: `lib/db/index.ts`, `app/page.tsx`, `app/experiments/`
Req: §5.1, §7.1, §8.3

- [x] Dexie CRUD helpers: create, read, update, archive, clone experiment
- [x] Experiment list page (`app/page.tsx`): filterable by status
- [x] Empty state: "Load Demo Experiment" prompt when DB is empty (§8.3)
- [x] Status lifecycle: `draft → running → stopped → archived`
- [x] Clone experiment action (copy config into new draft)
- [x] Status badges with appropriate colors
- [x] Tag-based filtering in experiment list
- [x] Tests: CRUD operations, status transitions, clone behavior

### Module: Experiment Creation Wizard
Touches: `app/experiments/new/page.tsx`, shared components
Req: §7.1

- [x] Step 1 — Hypothesis: name (required), description, hypothesis text, tags
- [x] Step 2 — Variations: add/remove (min 2, max 5), weight % with live sum, control radio, "Distribute evenly" button, zero-allocation validation
- [x] Step 3 — Metrics: select primary (min 1) and guardrail metrics from library
- [x] Step 4 — Stats Config: engine selection (Bayesian/Frequentist), correction method
- [x] Step 5 — Review & Launch: full config summary, embedded power calculator, "Save as Draft" / "Launch"
- [x] Shared components: `VariationEditor`, `StatsConfigEditor`, `MetricPicker` (also used by config panel)
- [-] CUPED toggle — schema field preserved, UI disabled for v1
- [-] Sequential engine option — deferred to v2
- [-] Bayesian prior settings — not surfaced in UI
- [x] Tests: VariationEditor validation, weight-sum enforcement, variation constraints

### Module: Metric Library
Touches: `lib/db/index.ts`, `app/metrics/page.tsx`
Req: §5.2, §7.3

- [x] Dexie CRUD helpers: create, read, update, delete metric (with referential integrity check)
- [x] Metric list page: filterable by type, searchable
- [x] Create/edit metric form: name, type, normalization, higherIsBetter, isGuardrail, tags
- [x] Import/export metric library as standalone JSON (versioned envelope, bulkPut merge)
- [-] Metric detail view: recent experiments using this metric — not implemented
- [x] capValue/capType, minSampleSize — surfaced in create/edit metric form
- [x] Tests: CRUD, validation, referential integrity

### Module: CSV Parsing & Validation
Touches: `lib/csv/`
Req: §4.2, §4.3, §5.3

- [x] PapaParse integration (synchronous parse after `file.text()`, not worker mode — acceptable for pre-aggregated data)
- [x] Schema version check: first line must be `#schema_version:1`
- [x] Required column detection: `experiment_id`, `variation_id`, `units`
- [x] Variation ID normalization: trim + lowercase
- [x] Validation rules: file size ≤ 50MB, various data quality checks
- [x] Dimension count soft warning (configurable threshold)
- [x] Column auto-classification: numeric heuristic for metric vs dimension
- [x] Tests: schema version rejection, missing columns, whitespace normalization, edge cases

> **Note:** PapaParse runs synchronously (not `worker: true`) since the CSV format is pre-aggregated and small. This is a deliberate simplification.

### Module: Column Mapping
Touches: `lib/csv/parser.ts`, `components/ColumnMapper.tsx`
Req: §4.2, §5.3

- [x] Column mapping UI: assign each non-reserved column as Dimension / Metric / Ignore
- [x] For Metric columns: select from metric library or create new metric inline
- [x] Column fingerprint calculation (sorted, joined column names)
- [x] Persist mapping to IndexedDB keyed by `experimentId + columnFingerprint`
- [x] Auto-apply saved mapping on re-upload; show banner with date
- [x] Diff detection: new/removed columns highlighted with badges when schema changes
- [x] Schema-aware ColumnMapper: accepts `schema` prop (`agg-v1` / `row-v1`), uses appropriate reserved columns
- [x] Row-level auto-mapping uses worker's `columnClassification` for initial dimension/metric roles
- [ ] Tests: fingerprint matching, diff detection, persistence round-trip — not yet covered

### Module: Metric Validation (Pre-Submission)
Touches: `components/MetricValidationPanel.tsx`
Req: §5.2a

- [x] Per-metric, per-variation summary stats: units, total, rate
- [x] Warnings (non-blocking): below minSampleSize, zero total events, degenerate rate (0%/100%), rate diff > 5×, units imbalance < 10%
- [x] Errors (blocking): zero units in any variation — disables Run Analysis button
- [x] Compact preview table: one row per metric, one column per variation, showing rate + units
- [x] Non-blocking warning acknowledgement button
- [x] Tests: each warning condition, blocking error condition
- [ ] Tests: `computeMetricSummariesFromAggregates` — correct summaries from row-level aggregates
- [ ] Tests: `formatMetricValue` — revenue shows currency symbol + 2dp, continuous shows 2dp, proportion shows percentage
- [ ] Tests: MetricValidationPanel renders currency-formatted values for revenue metrics

### Module: Analysis Request Builder
Touches: `lib/csv/buildRequest.ts`
Req: §5.4, §6.3

- [x] Filter parsed CSV rows by current `experiment_id`
- [x] Compute rates: for `raw_total` metrics, multiply back by units for consistent engine handling; pass through `pre_normalized`
- [x] Construct `AnalysisRequest` payload: overall data + dimension slices
- [x] Handle `"all"` sentinel for dimension grouping
- [x] Tests: correct payload construction

> **Note:** `buildRequest.ts` lives in `lib/csv/`, not `lib/stats/` as the original TODO assumed.

### Module: Stats Engine — runAnalysis Router
Touches: `lib/stats/runAnalysis.ts`, `lib/stats/lambda.ts`
Req: §9, §2.3

- [x] `runAnalysis(request)` — routes to worker or Lambda based on settings store
- [x] `runAnalysisInLambda(request)` — fetch() to Lambda Function URL
- [x] `runAnalysisInWorker(request)` — postMessage to Web Worker, handles result/error/status
- [x] Singleton worker management: `getOrCreateStatsWorker()`
- [x] Error handling: retry with preserved request payload (§9.4)
- [-] Tests: routing logic, error handling — requires mocking Web Worker; deferred

### Module: Stats Engine — Pyodide Web Worker (Path A)
Touches: `lib/stats/worker.ts`, `public/stats-worker.js`, `public/pyodide-test.html`
Req: §6.5a, §10.2, §13.1

- [x] `public/pyodide-test.html` — standalone Pyodide/gbstats compatibility spike (all 16 assertions pass)
- [x] Web Worker: lazy Pyodide 0.26.2 init, install gbstats 0.8.0 via micropip (`deps=False`)
- [x] Status messages via postMessage: loading → installing → ready
- [x] Per-metric Bayesian (`EffectBayesianABTest`) and Frequentist (`TwoSidedTTest`) tests
- [x] SRM check via `check_srm`
- [x] Multiple comparison corrections (Holm-Bonferroni, Benjamini-Hochberg)
- [x] Dimension slice computation
- [x] Full parity with Lambda handler
- [-] Cache API integration for Pyodide assets — deferred (relies on browser HTTP cache for now)
- [x] Worker crash recovery / fallback prompt — 3-min timeout, auto-restart, Lambda fallback after 2+ failures (§3.2)
- [-] Tests — Pyodide worker not testable in Jest (runs in real browser only)

> **Important:** `public/stats-worker.js` is the actual runtime file. `lib/stats/worker.ts` is the typed reference. Both contain identical Python code and must be kept in sync.

### Module: Stats Engine — Lambda Handler (Path B)
Touches: `infra/lambda/`
Req: §6.5, §10.3

- [x] `handler.py` — Lambda entry point with full analysis logic
- [x] SRM check via `check_srm`
- [x] Per-metric proportion tests: Bayesian + Frequentist (class-based API)
- [x] Multiple comparison corrections: Holm-Bonferroni, Benjamini-Hochberg
- [x] Dimension slice computation
- [x] `requirements.txt`: gbstats, numpy, scipy
- [x] `template.yaml`: SAM definition with Function URL
- [x] `Makefile`: build helpers
- [!] CORS: currently `Access-Control-Allow-Origin: *` — restrict before production (intentionally deferred)
- [-] Dockerfile for Lambda container image — not created; using zip deployment via SAM

### Module: Results Dashboard
Touches: `app/experiments/view/ExperimentDetailView.tsx`, `components/ResultsTable.tsx`, `components/GuardrailSection.tsx`
Req: §7.2, §8.3

- [x] Header: experiment name, status badge, variation count, last analysis date
- [x] SRM warning banner with p-value
- [x] Multiple exposure warning
- [x] "Re-run Analysis" / "Upload Data" button
- [x] Results table: expandable rows with detail panel, CI/credible interval visualization
- [x] Table controls: toggle relative/absolute uplift
- [x] Direction arrows based on `higherIsBetter`
- [x] Annotation icons (📝) on metrics with attached notes
- [x] Guardrail section: safe/borderline/violated status badges
- [x] Significance coloring: green positive, red negative
- [x] Result snapshot selector (up to 3 retained results)
- [x] Dimension slice display with dimension/value selector dropdowns
- [x] Export results as CSV
- [x] Export raw `AnalysisRequest` as JSON
- [x] Scaled uplift — `scaledImpact` computed in `transformResponse`, displayed in detail panel
- [-] Variation filter for multi-variant — not implemented (all non-control variations shown)
- [x] Tests: GuardrailSection status logic, significance states

### Module: Results Visualizations (Recharts)
Touches: `components/results/charts/` (not yet created)
Req: §7.2 Visualizations

- [-] Violin / density plot — Bayesian posterior distribution (deferred; detail panel shows CI bar instead)
- [-] CI bar chart component — Frequentist CI spans (deferred; inline CSS bar in detail panel)
- [-] Traffic split donut — observed vs expected (deferred)
- [-] Cumulative time series — requires timestamp column, not in v1 CSV schema (deferred)

> **Note:** The ResultsTable detail panel includes a basic interval visualization using CSS positioning. Full Recharts-based charts are deferred. `recharts` is not yet installed.

### Module: CSV Upload Flow (Full Page)
Touches: `app/experiments/view/UploadView.tsx`
Req: §5.3, §5.4, §8.4

- [x] Drag-and-drop zone with labeled expected columns
- [x] File drop → column detection preview (first 5 rows in table)
- [x] Column mapping step (uses `ColumnMapper` component)
- [x] Variation ID normalization display
- [x] Metric validation panel (uses `MetricValidationPanel` component)
- [x] Submit → build request → run analysis → persist result → redirect to results
- [x] Dual-upload layout: two side-by-side cards (aggregated + row-level) with independent mapping and validation
- [x] Metric coverage panel: shows source per metric, overlap detection (row-level wins), continuous-needs-row-level warnings
- [x] Merged analysis via `buildMergedAnalysisRequest` at submit time
- [x] Download template CSV pre-filled with experiment's variations and metrics (per-section format)
- [x] Error state with message
- [x] Full-page loading overlay with progress steps — `AnalysisOverlay` component with 4 steps (§3.8)
- [x] Retry with preserved request payload — implemented via `lastRequestRef` in UploadView
- [ ] Tests: upload flow integration — not yet covered

### Module: Power Calculator
Touches: `components/PowerCalculator.tsx`
Req: §6.8

- [x] TypeScript implementation of Cohen's h two-proportions power calc (probit approximation)
- [x] Inputs: baseline rate, MDE, α, power, daily users
- [x] Traffic split derived from experiment variation weights
- [x] Outputs: required n per variation, total users, estimated days, Cohen's h
- [x] Warning if h is very small
- [x] `scripts/power-calc-reference.py` — Python reference
- [ ] Tests: output parity with Python reference — not yet covered

> **Note:** Power calculator lives in `components/PowerCalculator.tsx` directly (not split into `lib/stats/powerCalculator.ts` + component).

---

## P2 — Data Management & Settings

### Module: App Settings Page
Touches: `app/settings/page.tsx`
Req: §7.4, §7.5

- [x] Compute engine toggle: wasm / lambda
- [x] Lambda URL input (shown when lambda selected) + "Test connection" button
- [x] Threshold settings: SRM p-value, multiple exposure rate, dimension count warning
- [x] Defaults: stats engine (Bayesian/Frequentist), α, power
- [x] Backup reminder interval (days)
- [x] IndexedDB storage usage indicator with progress bar
- [x] Last backup date indicator (amber if > 30 days)
- [x] WASM status indicator with "Reload engine" button — status badge + reload in settings page

### Module: JSON Export / Import
Touches: `lib/db/index.ts`, settings page, experiment detail page
Req: §5.6, §5.7, §7.5

- [x] Export All Data: serialize all IndexedDB tables → versioned JSON download
- [x] Import Data: upload JSON, validate schema version, merge or replace
- [x] Selective export: single experiment + its results/metrics/annotations
- [x] Update last-export timestamp on every export
- [x] Backup reminder banner on dashboard if > 30 days since last export
- [x] Storage pressure warning via `navigator.storage.estimate()`
- [x] Tests: round-trip fidelity, merge vs replace

### Module: Annotations
Touches: `lib/db/index.ts`, `components/AnnotationEditor.tsx`, `ExperimentDetailView.tsx`
Req: §5.8

- [x] Dexie CRUD: create annotation scoped to experiment / result / metric
- [x] "Notes" section on experiment detail page (reverse chronological)
- [x] 📝 icon on result table rows with attached notes
- [x] Annotations included in JSON exports
- [x] Inline Markdown editor — react-markdown preview tab in AnnotationEditor
- [x] Character limit enforcement — 2,000 char limit in AnnotationEditor
- [x] Append-only / "hide" toggle — `hidden` field, `hideAnnotation()`, `includeHidden` filter, AnnotationEditor hide button, audit trail toggle in detail view

### Module: Result Retention
Touches: `lib/db/index.ts`
Req: §11.3

- [x] Max 3 `ExperimentResult` records per experiment, ordered by `computedAt` desc
- [x] Auto-delete oldest on new result save (atomic Dexie transaction)
- [x] Result snapshot selector UI with timestamps
- [x] Tests: retention limit enforcement

---

## P3 — Demo & Polish

### Module: Demo Mode
Touches: `public/demo/`, `scripts/generate-demo-data.py`, `lib/db/demo.ts`
Req: §5.1a

- [x] `scripts/generate-demo-data.py` — synthetic data generator
- [x] `public/demo/demo-experiment.json` — pre-configured experiment
- [x] `public/demo/demo-data.csv` — synthetic CSV matching demo experiment
- [x] First-launch detection (empty IndexedDB) → "Load demo experiment" prompt
- [x] Seed IndexedDB with demo config + offer sample CSV download

### Module: CI/CD Pipeline
Touches: `.github/workflows/`
Req: §10.5

- [x] Frontend deploy workflow: `npm run build` → deploy to GitHub Pages
- [-] Lambda deploy workflow — deferred (Lambda path is secondary)
- [x] Test runner in CI — `npm test` step in deploy workflow
- [x] Lint check in CI — `npm run lint` step in deploy workflow

### Module: Dark Mode
Touches: `app/layout.tsx`, `components/ThemeProvider.tsx`, `components/NavBar.tsx`, `app/settings/page.tsx`
Req: §3.1

- [x] ThemeProvider component — reads settingsStore, resolves `auto` via `prefers-color-scheme`, sets `data-bs-theme` on `<html>`
- [x] Theme toggle in NavBar — cycles light → dark → auto
- [x] Appearance section in Settings — radio buttons for light/dark/auto
- [x] Hardcoded color audit — `bg-light text-dark` → `bg-body-secondary`, `bg-info text-dark` → `bg-info-subtle text-info-emphasis`

### Module: Experiment Deletion
Touches: `app/experiments/view/ExperimentDetailView.tsx`
Req: §3.9

- [x] Delete button with inline confirmation banner
- [x] Cascading delete via existing `deleteExperiment()` (results, annotations, column mappings)

### Module: Platform Experiment ID
Touches: `lib/db/schema.ts`, `app/experiments/new/page.tsx`, `app/experiments/view/ExperimentDetailView.tsx`, `lib/csv/buildRequest.ts`, `lib/csv/generateTemplate.ts`
Req: §3.10

- [x] Optional `experimentId` field on Experiment schema
- [x] Editable in wizard (Step 1) and config panel
- [x] CSV filtering uses platform ID with fallback chain
- [x] Template generation uses platform ID

### Module: Configurable Site Title
Touches: `apps/web/.env`, `components/NavBar.tsx`, `app/layout.tsx`, `README.md`
Req: §3.11

- [x] `NEXT_PUBLIC_APP_TITLE` env var with `.env` default
- [x] NavBar and layout metadata read from env var
- [x] README documents override pattern

### Module: Worker Resilience
Touches: `lib/stats/runAnalysis.ts`, `lib/store/engineStatusStore.ts`, `app/experiments/view/UploadView.tsx`
Req: §3.2

- [x] 3-minute analysis timeout via `Promise.race`
- [x] Failure counter in engineStatusStore with auto-restart
- [x] Lambda fallback prompt in UploadView after 2+ failures
- [x] Pyodide Cache API for faster restarts — `cachedFetch` in stats-worker.js, "Clear Stats Cache" in Settings

### Module: Analysis Progress Overlay
Touches: `components/AnalysisOverlay.tsx`, `app/experiments/view/UploadView.tsx`
Req: §3.8

- [x] AnalysisOverlay component with 4 progress steps
- [x] Worker status messages drive step transitions
- [x] Replaces simple spinner in UploadView

### Module: Variation Filter
Touches: `app/experiments/view/ExperimentDetailView.tsx`, `components/ResultsTable.tsx`, `components/GuardrailSection.tsx`
Req: §3.3

- [x] `selectedVariationIds` prop on ResultsTable and GuardrailSection
- [x] Multi-select dropdown in ExperimentDetailView (shows when >1 treatment)
- [x] Filters applied to primary metrics, guardrail metrics, and dimension slices

### Module: Metric Detail View
Touches: `app/metrics/page.tsx`, `lib/db/index.ts`
Req: §3.5

- [x] `getExperimentsUsingMetric()` query in lib/db
- [x] Expandable rows in metrics table showing experiments that reference each metric
- [x] Primary/guardrail badges per experiment

---

## v2 Phase 1 — Continuous Metrics (§1.1)

> **Decisions resolved:** 100k row limit, Web Worker for v2 parsing, dual-upload (agg + row-level) supported, revenue routed through continuous path.

### Module: Shared Types — Continuous Metric Support
Touches: `lib/stats/types.ts`, `lib/db/schema.ts`
Depends on: nothing
Priority: **P0** — all other §1.1 modules depend on these type changes

- [x] Add `'continuous'` to `Metric.type` union in `lib/db/schema.ts`
- [x] Add `metricType` field to `AnalysisRequest.metrics[]` in `lib/stats/types.ts` (`'proportion' | 'continuous'`)
- [x] Extend `VariationData` in `lib/stats/types.ts` with optional `mean`, `variance`, `n` fields for continuous metrics
- [x] Add `mean?: number` to `MetricVariationResult` in `lib/stats/types.ts` (for result display)

### Module: CSV Parser — Schema v2 (Row-Level)
Touches: `lib/csv/parser.ts`, new `lib/csv/csv-worker.ts`
Depends on: Shared Types
Priority: **P0** — buildRequest and engine depend on parsed output

- [x] Extend schema version support to accept `'1'` and `'2'` (`SUPPORTED_SCHEMA_VERSIONS`)
- [x] Detect schema version in `parseCSVFile` and branch logic
- [x] v2 required columns: `experiment_id`, `variation_id`, `user_id`, `<metric_columns>`
- [x] v2 row count validation: reject > 100k rows with blocking error
- [x] v2 parsing in Web Worker: `public/csv-worker.js` aggregates per-variation: n, mean, variance per metric (Welford's algorithm)
- [x] Worker auto-classifies columns as metric/dimension via sampling; aggregates per-dimension-slice stats
- [x] Worker returns aggregated data via extended `ParsedCSV` type (`rowLevelAggregates`, `rowLevelSliceAggregates`, `rowLevelColumnClassification`, `rowLevelTotalRows`)
- [x] v2 validation function (`validateCSVv2`), v2-aware `autoClassifyColumns`
- [ ] Tests: v2 schema detection, row limit rejection, aggregation correctness (mean, variance, n)

### Module: Metric Library — Continuous Type
Touches: `app/metrics/page.tsx`, `components/MetricPicker.tsx`
Depends on: Shared Types
Priority: **P1**

- [x] Add `'continuous'` option to metric type selector in create/edit form (metrics page + ColumnMapper inline create)
- [x] Add `'continuous'` to metric type filter buttons in metric list
- [x] Validation: warning when continuous/revenue metrics mapped in aggregated upload section (UploadView + metric coverage panel)

### Module: Request Builder — Mean + Variance Path
Touches: `lib/csv/buildRequest.ts`
Depends on: Shared Types, CSV Parser v2
Priority: **P1**

- [x] Detect metric type from `Metric.type` when building request (v2 branch in `buildAnalysisRequest`)
- [x] For continuous metrics: include `mean`, `variance`, `n` per variation via `continuousMetrics` field
- [x] For proportion metrics: existing `total / units` path unchanged
- [x] Revenue metrics routed through continuous path via `CONTINUOUS_METRIC_TYPES` set
- [x] `buildMergedAnalysisRequest` merges agg + row-level sources; row-level wins on overlap
- [x] `buildAnalysisRequestV2` supports dimension slices via `extractVariationDataFromAgg` helper
- [ ] Tests: `buildAnalysisRequestV2` — continuous metric routing (revenue + continuous → `continuousMetrics`), proportion routing (binomial/count → `metrics`), dimension slices from row-level aggregates
- [ ] Tests: `buildMergedAnalysisRequest` — single-source delegation, both-sources merge, overlap resolution (row-level wins), slices from agg only
- [ ] Tests: `isContinuousMetric` — revenue and continuous return true, binomial/count return false

### Module: Stats Engine — Mean Test Path
Touches: `public/stats-worker.js`, `lib/stats/worker.ts`, `infra/lambda/analysis/handler.py`
Depends on: Shared Types, Request Builder
Priority: **P1**

- [x] Add `mean_test` via `SampleMeanStatistic` + `_run_mean_test` to worker (Bayesian + Frequentist)
- [x] Mirror in Lambda handler (`_make_mean_stat`, `_run_mean_test`, updated `_run_tests`)
- [x] Route based on `metricType` field in request: proportion → existing path, continuous → mean test
- [x] Kept worker.ts typed reference in sync
- [ ] Tests: add mean test cases to `infra/lambda/analysis/test_corrections.py` or new test file

### Module: Transform Response — Mean Metrics
Touches: `lib/stats/transformResponse.ts`
Depends on: Shared Types, Stats Engine
Priority: **P1**

- [x] Handle mean-based result fields from engine (mean instead of rate)
- [x] Map to `MetricVariationResult` with `mean` field; continuous-aware control synthesis
- [x] Continuous-aware stddev calculation (variance/n for continuous, binomial formula for proportion)
- [ ] Tests: transform correctness for continuous metric results — mean field populated, variance-based stddev, control synthesis with continuous data

### Module: Results UI — Metric Type Indicators
Touches: `components/ResultsTable.tsx`
Depends on: Transform Response
Priority: **P2**

- [x] Badge already exists in results table (shows `metric.type` including 'continuous')
- [x] Display raw mean value instead of percentage for continuous metrics in table and detail panel
- [x] Revenue metrics display as raw values (via `isContinuousDisplay` helper covering both `continuous` and `revenue` types)
- [x] Currency symbol formatting for revenue metrics (configurable via settings)
- [ ] Tests: `formatValue` — revenue shows currency symbol + 2dp, continuous shows 2dp, proportion shows percentage

### Module: Template CSV — Row-Level Format
Touches: `lib/csv/generateTemplate.ts`
Depends on: Shared Types
Priority: **P2**

- [x] Detect if experiment has continuous metrics
- [x] Generate schema v2 row-level template with `user_id` column when continuous metrics are configured
- [x] Fallback to v1 pre-aggregated template when all metrics are proportion

---

## Cross-Cutting Concerns

- [x] CSV data held in memory only — never written to IndexedDB (§5.3, §11.2)
- [x] Dexie schema versioning (version 1 defined, ready for future migrations)
- [x] Browser compatibility: standard APIs, no vendor-specific code
- [ ] All IndexedDB operations wrapped in try/catch with user-facing error messages — partially done
- [x] Loading indicator for any operation > 500ms — global progress bar via `GlobalLoadingIndicator` + `loadingStore`
- [x] Inline tooltips for statistical concepts — `StatTooltip` component with 14 term wrappers across key components

---

## Dependency Graph (actual merge order)

All modules were developed on `main` (no feature branches). The commit history reflects the logical build order:

```
scaffold → next.js app → data model + stores → csv pipeline → stats engine
  → components → pages → lambda → demo + scripts → CI/CD
  → shared config components → ResultsTable + ColumnMapper
  → stats worker parity → validation panel + guardrail section
  → dimension slices + export features + architecture docs
```
