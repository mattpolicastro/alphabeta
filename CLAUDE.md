# alphaBeta — project instructions

## Status

**Pre-build, stack settled.** The repository contains the design handoff, the planning/architecture handoff, and a manifest of code earmarked from the predecessor. No application code yet — Sprint 1 (Tier-1 MVP: Bet Front Door → Commit & Lock → Revisit) starts next.

## What this is

alphaBeta is a serverless, browser-based **discipline / decision-logging layer** for empirical work. It is *not* a stats tool; it sits alongside experimentation platforms and makes implicit process tradeoffs visible. The differentiator: existing tools answer "can I run this?"; alphaBeta asks "should I?" and holds the user to what they committed.

Five layers (Strategy → Planning → Refinement → In-flight / Resolution → KM) plus an integrity spine. A/B testing is one *instrument* within Layer 4, not the product itself.

### Canonical references

- [`docs/handoff-2026-06-03.md`](./docs/handoff-2026-06-03.md) — full architectural + planning context: positioning, lifecycle, deployment tiers, LLM provider seam, extension architecture, personas, three-layer toolchain, what-not-to-do. **Read this first.**
- [`design/`](./design) — wireframe-fidelity prototypes and the canonical design system. Start with `design/README.md` and `design/CLAUDE.md`.
- [`design/substrate/Layer Model.md`](./design/substrate/Layer%20Model.md) — full five-layer specification.
- [`reuse/README.md`](./reuse/README.md) — code earmarked from `alphabeta-legacy` for copy-and-adapt.

## Predecessor (alphabeta-legacy)

The previous incarnation — a static Next.js A/B-test analysis tool (v0.2.5, March 2026) — lives at:
- Local: `~/Projects/alphabeta-legacy`
- GitHub: [`mattpolicastro/alphabeta-legacy`](https://github.com/mattpolicastro/alphabeta-legacy) (archived, Pages disabled)

Reuse strategy is **copy + adapt** — no shared dependency, no history transfer. Files get pulled in on demand as sprints reach them.

## Tech stack (settled)

| Concern | Choice |
|---|---|
| Framework | Next.js static export, TypeScript, React |
| Storage | IndexedDB via Dexie.js |
| Stats | Pyodide/WASM (Lambda fallback is under privacy review — see handoff §5) |
| UI / CSS | **Tailwind CSS** (free / OSS). Tokens in `tailwind.config`; component anatomy via `@apply` — avoid utility-class soup in JSX |
| Charts | Recharts |
| Testing | Jest + SWC (`next/jest`), React Testing Library, `fake-indexeddb` |
| CSV | PapaParse + Web Worker (Welford's algorithm) |
| Deployment | Cloudflare Pages + Workers |
| Integrity | SHA-256 hash-chaining of committed fields |

LLM integration uses an `LLMProvider` adapter with capability negotiation at boot. Surface still to be sketched.

## Open architectural questions

- `LLMProvider` interface surface (see handoff §5).
- Lambda fallback disposition: consent-gate or remove (handoff §5).
- Fold-if backward-edit loop from Feasibility → Front Door (handoff §4, contested).
- Journal-index scope (handoff §4, open).

## Conventions

- WORKLOG entries appended at the end of significant sessions (per global instructions).
- Design tokens are canonical — implement from `design/Design System.html` (paper / ink / terra, JetBrains Mono / Caveat, 1140px max-width, dashed borders, 28px blueprint grid).
- Immutability of locked bets is a load-bearing product principle. Application layer must refuse edits to locked records; only new versions are permitted.
- The fold-if is a single thread — one number, declared once, the load-bearing mechanism that defeats goalpost-moving. Do not duplicate it across layers.

## Repo layout policy

Single-app at `~/Projects/alphabeta` for now. The handoff's `experiment-tools` monorepo proposal is deferred — revisit when the Chrome extension is ready to land alongside the app. Until then, keep the project flat.
