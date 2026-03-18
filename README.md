# ⍺lphaβeta

A static Next.js app for analyzing A/B test experiments. All data stays in the browser via IndexedDB; statistical analysis runs client-side through Pyodide/WASM (with an optional AWS Lambda fallback).

See `architecture.md` for tech stack details and `requirements.md` for the full feature inventory.

## Features

### Experiment Management
- **Creation wizard** — guided 5-step setup: hypothesis, variations, metrics, stats config, review with power calculator
- **Lifecycle management** — draft → running → stopped → archived, with full status transitions from the detail view
- **Permanent deletion** — cascading delete with confirmation (results, notes, column mappings)
- **Clone and export** — duplicate experiments or export as JSON for sharing

### Data Ingestion
- **Two CSV formats** — aggregated (`#schema:agg-v1`) for pre-summarized data, row-level (`#schema:row-v1`) for per-user data
- **Dual upload** — combine both formats in one analysis; row-level takes precedence on overlap
- **Smart column mapping** — auto-classification, inline metric creation, saved mappings restored on re-upload
- **Pre-submission validation** — sample size checks, degenerate rate warnings, blocking errors

### Statistical Analysis
- **Bayesian and Frequentist engines** — powered by gbstats running in-browser via Pyodide/WASM
- **Four metric types** — binomial, count, revenue, and continuous (mean-based)
- **Multiple comparison corrections** — Holm-Bonferroni and Benjamini-Hochberg with raw + adjusted p-values
- **Dimension slicing** — automatic breakdowns by any column in the uploaded data
- **SRM and multiple exposure detection** — flags data quality issues before you interpret results

### Results
- **Expandable results table** — per-metric rows with detailed variation panels, interval visualization, and significance coloring
- **Guardrail monitoring** — safe / borderline / violated status for guardrail metrics
- **Variation filter** — multi-select dropdown to focus on specific treatment arms
- **Annotations** — markdown notes pinned to experiments, results, or metrics with append-only audit trail
- **Result snapshots** — retains up to 3 analysis runs per experiment for comparison

### Infrastructure
- **Fully client-side** — no backend server, no auth, no database; all data in IndexedDB
- **Pyodide asset caching** — Cache API stores ~35 MB of WASM assets for fast subsequent loads
- **Worker resilience** — 3-minute timeout, auto-restart, Lambda fallback after repeated failures
- **Dark mode** — light / dark / auto (follows OS) via Bootstrap 5
- **CI/CD** — GitHub Actions: lint → test → build → deploy to GitHub Pages

### Planned
- **Sequential testing** — mSPRT-based continuous monitoring for safe peeking
- **Visualizations** — Recharts-based CI bar charts, violin plots, traffic split donuts
- **Bayesian priors** — configurable informative priors per metric
- **Metric trends** — cross-experiment performance history

## Quick Start

```bash
cd apps/web
npm install
npm run dev       # local dev server
npm run build     # static export to out/
npm test          # run Jest test suite
```

## Build Configuration

Build-time options are set via environment variables in `apps/web/.env`. Next.js inlines any `NEXT_PUBLIC_*` variable at build time.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_TITLE` | `⍺lphaβeta` | Site title displayed in the navigation bar |

### Overriding defaults

The `.env` file is committed and provides shared defaults. To override for your local environment without affecting the repo:

1. **`.env.local`** (recommended) — create `apps/web/.env.local` with your overrides. This file is gitignored by Next.js automatically.

   ```env
   NEXT_PUBLIC_APP_TITLE="My Team's Experiment Hub"
   ```

2. **Shell environment** — set variables before building:

   ```bash
   NEXT_PUBLIC_APP_TITLE="Staging" npm run build
   ```

Precedence (highest wins): shell env > `.env.local` > `.env`
