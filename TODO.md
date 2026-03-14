# A/B Test Tool — Task Tracker

> **How to use this file:** Each module is self-contained. Agents should claim a module by marking tasks `[~]` (in progress). Before starting, read the **Depends on** line and confirm those items are merged to `main`. Mark `[x]` when merged. Use branch naming convention `feat/<module-slug>`.
>
> **Req doc reference:** `requirements.md` in repo root. Section numbers are cited inline as `§N.N`.
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
- [-] ESLint — not configured (optional for v1)
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
- [-] Cache API integration for Pyodide assets — deferred to v2 §3.2 (relies on browser HTTP cache for now)
- [-] Worker crash recovery / fallback prompt — deferred to v2 §3.2
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
- [x] Download template CSV pre-filled with experiment's variations and metrics
- [x] Error state with message
- [-] Full-page loading overlay with progress steps (simple spinner + "Running analysis…" instead)
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
- [-] Append-only / "hide" toggle — not enforced

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
- [ ] Test runner in CI — Jest is configured; add `npm test` to deploy workflow

### Module: Dark Mode
Touches: `app/layout.tsx`, theme config
Req: §8.2

- [-] Deferred to post-v1. Would use Bootstrap's `data-bs-theme="dark"` (not Tailwind `dark:` classes as requirements assumed).

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
