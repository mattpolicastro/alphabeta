# A/B Test Tool — v2 Requirements (Draft)

> **Status:** Early requirements sketch. Items are grouped by phase and prioritized by user impact and effort. Section references (§N.N) point to the original `requirements.md`.

---

## Pre-v2: v1 Cleanup

> These items were scoped for v1 but not completed. Finish before starting v2 feature work — they reduce surface area for bugs and make the codebase ready to build on.

### ~~Testing Foundation~~ ✅ Complete (137 tests)

> All test items completed and merged to `main` as of 2026-03-13. ESLint is the only remaining item.

| Item | Files | Status |
|------|-------|--------|
| ~~Jest + SWC test config~~ | `jest.config.ts`, `jest.setup.ts`, `package.json` | ✅ Merged — `next/jest` preset, `fake-indexeddb`, structuredClone + File.text() polyfills |
| ~~Unit tests: DB layer~~ | `lib/db/__tests__/` | ✅ 36 tests |
| ~~Unit tests: CSV pipeline~~ | `lib/csv/__tests__/` | ✅ 43 tests |
| ~~Unit tests: stats transform~~ | `lib/stats/__tests__/` | ✅ 12 tests |
| ~~Unit tests: shared components~~ | `components/__tests__/` | ✅ 46 tests |
| ESLint configuration | `.eslintrc.*`, `package.json` | Not started |

### ~~Incomplete UI Polish~~ ✅ Complete

> All 8 items below were completed and merged to `main` as of 2026-03-13.

| Item | Files | Status |
|------|-------|--------|
| ~~Tag-based filtering~~ | `app/page.tsx` | ✅ Merged |
| ~~`scaledImpact` computation~~ | `lib/stats/transformResponse.ts`, `components/ResultsTable.tsx` | ✅ Merged |
| ~~`capValue`/`minSampleSize` in metric form~~ | `app/metrics/page.tsx` | ✅ Merged |
| ~~Retry analysis with preserved request~~ | `app/experiments/view/UploadView.tsx` | ✅ Merged |
| ~~Annotation markdown + char limit~~ | `components/AnnotationEditor.tsx` | ✅ Merged |
| ~~Global loading indicator~~ | `components/GlobalLoadingIndicator.tsx`, `lib/store/loadingStore.ts` | ✅ Merged |
| ~~Stats concept tooltips~~ | `components/StatTooltip.tsx` + 4 consumer components | ✅ Merged |
| ~~WASM engine status in settings~~ | `app/settings/page.tsx`, `lib/stats/runAnalysis.ts` | ✅ Merged |

---

## v2 Phase 1 — Continuous Metrics & Sequential Testing

> The two headline features that define v2. Both require changes across the full stack (CSV schema → request builder → engine → transform → UI).

### 1.1 Continuous Metric Support

**Motivation:** v1 treats all metrics as proportions (`p = total / units`). This works for conversion rates but not for revenue-per-user, session duration, or other continuous metrics where variance can't be derived from the rate alone. This was identified as the primary v2 feature in §12 of `requirements.md`.

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

**Motivation:** Frequentist tests require a fixed sample size; peeking inflates false positive rate. Sequential testing (mSPRT) allows safe continuous monitoring. The type already exists in the schema but was removed from all UI selectors in v1. See §6.1.

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

> Items from `requirements.md` §12 that remain out of scope for v2.

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
