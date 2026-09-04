# alphaBeta — project instructions

## Status

**Live, building out from the roadmap.** `prototypes/graph-canvas` is the app (promoted in place 2026-09-04; `apps/web` is a quarry). Both sites deploy to Cloudflare Pages. Current plan: `docs/roadmap-2026-09.md`; what works today: `alphabeta.tools/capabilities/` (rendered from the registry, so it can't overstate).

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
| UI / CSS | Plain CSS, one token file per app (`prototypes/graph-canvas/src/styles.css`; landing pages inline the same tokens). Tailwind is installed in `apps/web` but was never used — do not adopt it; no component library (see roadmap §1c) |
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

## Testing

Test runner: **vitest** (`npm test`). Default environment is **jsdom** so React Testing Library works without per-file overrides.

- **`lib/**/*.test.ts`** — pure-logic tests. Dexie-touching modules get `fake-indexeddb/auto` (wired in `vitest.setup.ts`); each test gets a fresh DB via `__resetDb()` in `beforeEach` / `afterEach`. Pattern: see `lib/bet/__tests__/queries.test.ts`.
- **`components/**/*.test.tsx`** — component-level tests with RTL. Assert against rendered DOM via `screen.getByText`, `getByRole`, etc. `expect` is extended with `jest-dom` matchers (`toBeInTheDocument`, `toHaveTextContent`). Auto-cleanup between tests is wired in `vitest.setup.ts`. Pattern: see `components/bet/__tests__/WagerStatic.test.tsx`.
- **Page-level / E2E** — deferred until there's a clear shape to test (Playwright is the likely fit).

TDD posture for new work: write the tests first, then the implementation. Dispatch contract: "make these tests pass" is the verification target.

## Repo layout policy

Single-app at `~/Projects/alphabeta` for now. The handoff's `experiment-tools` monorepo proposal is deferred — revisit when the Chrome extension is ready to land alongside the app. Until then, keep the project flat.

## Routing & domain policy (settled 2026-06-03)

- **App at root `/`**, no `/app` prefix. The app's URLs stay stable from tier-1 through tier-3 without migration.
- **Marketing and app are split across subdomains (live since 2026-08-26).** `alphabeta.tools` serves the landing page; `app.alphabeta.tools` serves the application. `www` 301s to the apex. Cookie scoping, independent deploys, and cleaner Worker routes all follow.
  - **The app origin is load-bearing and must never move.** IndexedDB is origin-scoped, so `app.alphabeta.tools` *is* the datastore — relocating it silently orphans every user's bets, with no migration path short of export/import. The Chrome extension's `externally_connectable` pins the same origin.
  - `alphabeta.run` is also owned (Cloudflare registrar, same account) but unconfigured and **not** canonical. Vault/résumé references to it are stale.
- **Bets are addressed by `?id=<uuid>` query string**, not path segments. `output: 'export'` requires `generateStaticParams` for `[id]` segments; user-generated UUIDs can't be enumerated at build time. Query-string addressing is static-export native and produces a single pre-rendered page per stage.
- **Reserved route prefixes — do not claim for feature routes:**
  - `/api/*` — Cloudflare Workers backend (LLM provider proxy, sync, rate-limit checks).
  - `/auth/*` — login / callback / logout. Both consumer auth (tier-3) and SSO/OIDC (tier-2 self-hosted).
  - `/share/*` — public read-only share tokens for locked bets (handoff §10).
- **`alphabeta.tools/lab/*` — standalone analysis tools (settled 2026-08-28; `sample-size`, `detectable-lift`, `srm` live 2026-09-04).** Stateless calculators on the *marketing* origin, a flat list **named by the practitioner's question** (method is a title qualifier, never the URL noun): `/lab/sample-size`, `/lab/detectable-lift`, `/lab/srm`, `/lab/pre-post`, `/lab/results`, `/lab/sequential`, `/lab/bayes`. Modeled on Kelly Wortham's `forwarddigital.org/tools` (five of these are ports of its R Shiny apps). Holdback and study are ceremony in the lock flow, not lab tools. Rules:
  - **The URL is the contract.** Each tool has a versioned canonical query-string schema (`?v=1&…`); a sealed result is SHA-256 of the canonical string, shown as a receipt. Same provenance format as a locked bet.
  - **"Lock as bet" is the only cross-origin hop**: `app.alphabeta.tools/bet/new?from=<tool>&v=1&…` mints a draft with the instrument pre-selected and inputs prefilled.
  - Lab tools and in-bet instrument panels are the **same React component** — inputs from the URL vs. from the locked bet. Stats logic lives in a framework-free core (`packages/analysis`, TS closed-form + Pyodide engines), never in the component.
  - Closed-form tools (sample-size, detectable-lift, srm) are TS and instant; Pyodide only where there is no formula. Reference engine/oracle is Python (`spotify-confidence`, Apache-2.0) with the original R Shiny sources as a second oracle. `pre-post` ships causal-impact-wasm as-is under the path — share its `py/` engine, don't port the UI.
  - Build tools separately first; compose later. Full plan: `docs/roadmap-2026-09.md` §3.
- **Multi-tenancy: flat URLs.** No `/org/<slug>/...` prefix. Ownership resolves via auth context + Dexie query scoping. Org switching is an in-app affordance, not a URL rewrite. URLs are portable across the tier-1 → tier-3 upgrade — local-only bookmarks resolve identically once the user signs in.
- Chrome extension `externally_connectable` will pin the app domain once chosen; routing is otherwise extension-agnostic.

## Deployment (live)

| Host | Cloudflare Pages project | Source |
|---|---|---|
| `alphabeta.tools` | `alphabeta-landing` | `apps/landing/` (static HTML; `/lab/*` tools embed a built copy of `packages/analysis`) |
| `app.alphabeta.tools` | `alphabeta-app` | `prototypes/graph-canvas`, built with `VITE_STATIC=1` |

- Deploys are manual: `npx wrangler pages deploy <dir> --project-name <project>`. Add `--branch preview` to get `https://preview.<project>.pages.dev` without touching production — review there first. Not yet Git-connected.
- **Definition of done for canvas changes:** `npm test`, `npm run typecheck`, `VITE_STATIC=1 npx vite build` — all three. `strict: false` means `!r.ok` does not narrow a result union; write `r.ok === false`. Vitest does not typecheck, so a passing test suite says nothing about types.
- **The capability registry** (`apps/landing/capabilities.json`) is the single source of truth for what works. The canvas imports it at build and throws on drift; `/capabilities/` renders it; chips and the loop tray read from it. A surface is not done until its status line is flipped. When two agents edit it in one round, commit each one's lines with its own commit (stash-and-restore the other's).
- **`packages/analysis`** is the framework-free stats core (R `power.prop.test` conventions; oracles: local Rscript, scipy, spotify-confidence — disagreements are characterized in tests, never absorbed into tolerance). `npm run sync:landing` builds it and copies the ESM into each `apps/landing/lab/<tool>/analysis.js`; commit the built copies.
- **Funnel:** `app.alphabeta.tools/bet/new?from=<tool>&v=1&…` mints a draft bet from a lab result (parsers in `src/funnel.ts`; `sample-size` live, others stubbed). The static app is an SPA, so the path works via Pages' fallback.
- **`VITE_STATIC=1` is what makes the prototype shippable.** The open-field relay is a Vite *dev-server* plugin, so `/api/*` exists only under `npm run dev` — that covers board state, not just the LLM. The flag swaps `/api/state` for `localStorage`, seeds from the `data.ts` fixture (running the tree layout once so a fresh board isn't a mess), compiles out replies polling and open-field node creation, and routes the dock through `AnthropicDirectProvider` (bring-your-own key in `localStorage`, browser → api.anthropic.com, nothing server-side) instead of the relay. `npm run dev` is unaffected, so live relay sessions still work.
- When publishing the prototype, deploy a copy of `dist/` with the `public/` extras removed (`landing.html`, `brand.html`, `brand2.html`, `design-system.html`, `grid3d.html`) — Vite copies them in and they are internal.
- Known gap: `apps/web/app/api/llm/route.ts` is a route handler and cannot build under `output: 'export'`. It must become a Worker on `/api/*` or be removed before `apps/web` can deploy anywhere static.
