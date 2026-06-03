# alphaBeta — project instructions

## Status

**Pre-build.** The repository contains the design handoff and a reuse manifest for code earmarked from the predecessor project. No application code yet. Tech stack is undecided — see Open Questions below.

## What this is

alphaBeta is a serverless, browser-based **discipline / decision-logging layer** for empirical work. It is *not* a stats tool; it's the layer that sits alongside experimentation platforms and makes implicit process tradeoffs visible. The differentiator: existing tools answer "can I run this?"; alphaBeta asks "should I?" and holds the user to what they committed.

Five layers (Strategy → Planning → Refinement → In-flight / Resolution → KM) plus an integrity spine. A/B testing is one *instrument* within Layer 4, not the product itself.

Authoritative design and nomenclature live in [`design/`](./design). Start with:
- [`design/README.md`](./design/README.md) — handoff overview, screens, data model, design tokens, build sprints.
- [`design/CLAUDE.md`](./design/CLAUDE.md) — nomenclature, layer/seam vocabulary, aesthetic conventions.
- [`design/substrate/Layer Model.md`](./design/substrate/Layer%20Model.md) — full five-layer specification.

## Predecessor (alphabeta-legacy)

The previous incarnation — a static Next.js A/B-test analysis tool — lives at:
- Local: `~/Projects/alphabeta-legacy`
- GitHub: [`mattpolicastro/alphabeta-legacy`](https://github.com/mattpolicastro/alphabeta-legacy) (archived)

A narrow slice of its code is earmarked for reuse (Dexie schema/CRUD patterns, Pyodide-backed stats engine, CSV ingestion, utilities). See [`reuse/README.md`](./reuse/README.md) for the manifest. Reuse strategy is **copy + adapt** — no shared dependency, no history transfer. Files get pulled in on demand as sprints reach them.

## Open questions

1. **Tech stack** — pending claude.ai conferral. Contenders include the predecessor's Next.js static stack, Vite + React SPA, SvelteKit, Astro + islands, Tauri desktop. Constraints: IndexedDB-first, serverless, SHA-256 fingerprint immutability, individual-first adoption. Pyodide (~35 MB WASM) is not in the MVP path — only Layer 4a A/B instrument needs it.
2. The Sprint 1 MVP (Bet Front Door → Commit & Lock → Revisit) starts once the stack decision lands.

## Conventions

- WORKLOG entries appended at the end of significant sessions (per global instructions).
- Design tokens (paper / ink / terra, JetBrains Mono / Caveat, 1140px max-width, dashed borders) are canonical — implement from `design/Design System.html` when the build starts.
- Immutability of locked bets is a load-bearing product principle. Application layer must refuse edits to locked records; only new versions are permitted.
