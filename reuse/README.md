# Reuse manifest — code earmarked from `alphabeta-legacy`

Strategy: **copy + adapt** when a sprint needs the code. No git history transfer, no shared dependency. Provenance noted in the commit that introduces each adapted file (`adapted from alphabeta-legacy <path>@<sha>`).

Source: `~/Projects/alphabeta-legacy/` (archived at [`mattpolicastro/alphabeta-legacy`](https://github.com/mattpolicastro/alphabeta-legacy)).

## Earmarked

### IndexedDB / Dexie patterns
- `apps/web/lib/db/schema.ts`
- `apps/web/lib/db/index.ts`
- `apps/web/lib/db/__tests__/`

**Reuse mode:** patterns (not the schema itself). The new data model is objective / bet / sequence per `design/README.md` § Suggested Data Model, not experiment / metric / result. What carries: Dexie store conventions, CRUD style, migration approach, test scaffolding.

**Adaptation effort:** significant. **Target sprint:** Sprint 1 (Bet Front Door persistence).

### Stats engine (Pyodide / gbstats)
- `apps/web/lib/stats/` — full directory: `worker.ts`, `runAnalysis.ts`, `powerCalculator.ts`, `transformResponse.ts`, `lambda.ts`, `types.ts`, `__tests__/`

**Reuse mode:** verbatim where possible. Powers the Layer 4a A/B in-flight view only — it does not show up in the MVP. Includes the ~35 MB Pyodide bootstrap and Cache API setup.

**Adaptation effort:** light (rebind to new bet/instrument types). **Target sprint:** Sprint 2 (Feasibility & Instrument, In-flight A/B).

### CSV ingestion
- `apps/web/lib/csv/` — aggregated (`#schema:agg-v1`) and row-level (`#schema:row-v1`) pipelines

**Reuse mode:** verbatim where possible. Becomes the A/B instrument's data-input pathway.

**Adaptation effort:** light. **Target sprint:** Sprint 2.

### Utilities & test patterns
- `apps/web/lib/utils/` — formatters, validation helpers
- `apps/web/lib/store/` — store helpers
- Jest setup + Testing Library patterns from `apps/web/`

**Reuse mode:** pick-and-choose as needed.

**Adaptation effort:** trivial. **Target sprint:** opportunistic.

## Not reusing

- App-level Next.js routes, layouts, pages — entirely different product surface.
- The Chrome extension scaffold on `feat/extension-scaffold` — different framing (scraper-led, not discipline-led). Preserved in the archived remote for reference; not migrated.
- `archive/requirements-v1-archived.md`, `archive/requirements-v2-archived.md` — historical artifacts of the old framing. Stay with legacy.
- `architecture.md`, `requirements.md`, `TODO.md` — old-product specs. The new spec is `design/README.md`.
