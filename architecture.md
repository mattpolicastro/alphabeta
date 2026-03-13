# Architecture Overview

A/B test analysis tool. Static Next.js app (GitHub Pages) + client-side IndexedDB. Stats run in-browser via Pyodide/WASM or optionally in AWS Lambda. No backend server, no auth, no database.

## Tech Stack

- **Frontend:** Next.js 15, `output: 'export'`, Bootstrap 5 (no Tailwind), React 19
- **Data:** IndexedDB via Dexie.js, Zustand stores for ephemeral state
- **Stats:** gbstats 0.8.0 (Python) running in Pyodide 0.26.2 Web Worker, or AWS Lambda
- **Build/Deploy:** GitHub Actions → GitHub Pages

## Directory Layout

```
apps/web/
  app/                    # Next.js App Router pages
    page.tsx              #   / — dashboard, experiment list
    experiments/
      new/page.tsx        #   /experiments/new — 5-step creation wizard
      view/
        page.tsx          #   /experiments/view?id=X — routing between detail/upload
        ExperimentDetailView.tsx  # results display, config panel, annotations
        UploadView.tsx    #   CSV upload → column mapping → validation → analysis
    metrics/page.tsx      #   /metrics — metric library CRUD, import/export
    settings/page.tsx     #   /settings — compute engine, thresholds, data management
  components/             # Shared React components
    ResultsTable.tsx      #   expandable metric rows, CI visualization, annotations
    ColumnMapper.tsx      #   CSV column → role/metric assignment, inline metric creation
    VariationEditor.tsx   #   add/remove/weight variations, "distribute evenly"
    StatsConfigEditor.tsx #   engine + correction selector
    MetricPicker.tsx      #   primary + guardrail metric checkbox lists
    MetricValidationPanel.tsx  # pre-submission data quality checks
    GuardrailSection.tsx  #   safe/borderline/violated status badges
    PowerCalculator.tsx   #   sample size calculator (Cohen's h)
    NavBar.tsx, CSVUploadZone.tsx, AnnotationEditor.tsx, ExperimentList.tsx
  lib/
    db/
      schema.ts           # Dexie schema: Experiment, Metric, ExperimentResult, etc.
      index.ts            # CRUD operations, export/import, backup tracking
      demo.ts             # Demo data seeding
    csv/
      parser.ts           # PapaParse, schema version check, auto-classify columns
      buildRequest.ts     # CSV + mapping → AnalysisRequest payload
      generateTemplate.ts # Download template CSV for an experiment
      exportResults.ts    # Export results table as CSV
    stats/
      types.ts            # AnalysisRequest, AnalysisResponse, WorkerMessage
      worker.ts           # TypeScript reference for the Pyodide Web Worker
      runAnalysis.ts      # Dispatcher: routes to WASM worker or Lambda
      lambda.ts           # Lambda HTTP client
      transformResponse.ts # AnalysisResponse → MetricResult[] (overall + slices)
    store/
      settingsStore.ts    # Zustand: compute engine, defaults, thresholds
      engineStatusStore.ts # Zustand: WASM/Lambda readiness
      wizardStore.ts      # Zustand: experiment creation wizard state
  public/
    stats-worker.js       # ← THE ACTUAL RUNTIME WORKER (serves as /stats-worker.js)
    pyodide-test.html     # Standalone Pyodide compatibility test harness
    demo/                 # Demo CSV + experiment JSON
infra/lambda/
  analysis/handler.py     # Lambda handler — mirrors stats-worker.js logic exactly
  analysis/requirements.txt
  template.yaml           # SAM template
  Makefile
.github/workflows/
  deploy.yml              # Build static export → deploy to GitHub Pages
```

## Data Flow

```
CSV file → parseCSVFile() → ColumnMapper (user assigns roles)
  → MetricValidationPanel (data quality checks)
  → buildAnalysisRequest() → AnalysisRequest payload
  → runAnalysis() dispatches to:
      Path A: Web Worker (stats-worker.js) — Pyodide + gbstats in WASM
      Path B: Lambda (handler.py) — same Python logic server-side
  → AnalysisResponse
  → transformResponse() → MetricResult[] (overall + slices)
  → saved to IndexedDB as ExperimentResult
  → rendered by ResultsTable, GuardrailSection, DimensionSliceSection
```

## Key Conventions

- **Two compute paths, one contract.** `stats-worker.js` and `handler.py` run identical Python analysis code. Any change to one must be mirrored in the other.
- **Pyodide version pinned to 0.26.2** (not 0.27.0 — numpy 2.x conflict). gbstats installed with `deps=False` to bypass overly-strict pins.
- **gbstats uses class-based API:** `EffectBayesianABTest`, `TwoSidedTTest`, `ProportionStatistic`, `check_srm`. NOT bare functions.
- **All data stays in IndexedDB.** No server-side persistence. Export/import via JSON.
- **Bootstrap 5 for styling.** No Tailwind. Use `className` with Bootstrap utility classes.
- **Sequential engine deferred to v2.** Type exists in schema but removed from UI; do not re-add without implementing mSPRT logic.
- **Lambda CORS is wide open (`*`).** Intentionally deferred — WASM is the primary path.
