# WORKLOG

## 2026-06-03 — Routing refactor (?id= + Dexie drafts)

The Tier-1 MVP loop now uses per-bet URLs and Dexie-backed drafts. Phase A laid the foundation; Phase B moved/created all six pages (mostly via dispatch); Phase C cleaned up.

**Phase A — Foundation (orchestrator, TDD):**
- `Bet.ownerId` / `Objective.ownerId` added to types and schema (Dexie v2, additive upgrade). Forward-looking scoping for tier-3 auth; defaults to null.
- `lib/lifecycle/stage.ts` + tests — pure resolver `currentStage(bet)`. Feeds `/bet?id=…` redirect.
- `lib/bet/queries.ts` + tests — Dexie-backed `mintDraft`, `getBet`, `listBets`, `updateDraft`, `lockBet`, `recordResolution`. Immutability enforced at the query layer (updateDraft refuses post-lock; lockBet refuses already-locked; recordResolution requires locked).
- `fake-indexeddb` wired via `vitest.setup.ts`. `lib/db/index.ts` gains `__resetDb()` for per-test isolation.
- Back-fill: `lib/bet/__tests__/analyze.test.ts` — regression net for the regex engine.
- Total: 46/46 tests pass (8 fingerprint + 4 stage + 15 queries + 19 analyze).

**Phase B — Pages (mixed dispatch + manual):**
- B3 (Revisit move) — dispatched cleanly, landed verbatim (qwen3-coder:30b, 50s, 13k/2.1k tokens).
- B4 (new journal/home at `/`) — dispatched cleanly, landed verbatim (37s, 17k/1.3k tokens, whole format).
- B5 (`/bet/new`) — dispatched; landed manually because aider's `diff` format silently no-ops on empty new files. Dispatch script gained `edit_format` field (defaults to `diff`); new-file tasks now set `whole`.
- B6 (`/bet` stage redirect) — dispatched with `whole`, landed with two corrections (missing `/bet/` prefix in redirect target, unused import).
- B1 (Front Door move) + B2 (Commit & Lock move) — handled by orchestrator. B2 hit aider's 3-reflection limit on a multi-step diff; pivoted to manual for the two most stateful pages.

**Phase C — Cleanup:**
- Deleted `app/commit-and-lock/` and `app/revisit/` (old route shells).
- Trimmed `lib/bet/storage.ts` to just the `AbBet` type — localStorage helpers retired.

**Routing now matches the policy in CLAUDE.md:**
- `/` = journal/home (lists drafts + locked + resolved bets).
- `/bet/new` mints a UUID and redirects to `/bet/front-door?id=…`.
- `/bet?id=…` is the stage redirect — looks up status, routes to the right stage.
- `/bet/front-door?id=…`, `/bet/commit-and-lock?id=…`, `/bet/revisit?id=…` are the three lifecycle stages.
- `/design-system` unchanged.

**Dispatch infrastructure improvements landed this session:**
- `setup` hook in JSON spec (npm install per worktree; Turbopack rejects symlinked node_modules).
- Metadata sidecar JSON written next to every dispatch log (model, timing, exit codes, files touched, parsed token counts).
- `edit_format` field for new-file tasks (workaround for Aider's empty-SEARCH-block no-op).

## 2026-06-03 — Local-agents dispatch infra wired up

Brought up Aider+Ollama dispatch from MacBook Pro orchestrator to mlpc-ubuntu executor:
- `mattpolicastro/dotfiles@41ebe60` adds `scripts/dispatch` (Aider task runner with JSON spec, isolated git worktrees, ntfy-on-state, `--edit-format diff`, `--no-auto-commits`) and `scripts/setup-ubuntu` install steps for `ollama` (no-op when present), `aider-chat` via `uv tool install`, and `jq`. PATH fix for non-interactive SSH (uv installs to `~/.local/bin`, zsh profile not sourced).
- mlpc-ubuntu now has: ollama 0.24.0 native, `qwen3-coder:30b` + `devstral:latest` pulled, aider on PATH via the dispatch script, the alphabeta repo cloned at `~/Projects/alphabeta`.
- End-to-end `dispatch --dry-run` smoketest passes on mlpc-ubuntu.
- A/B baseline mid-Sprint-1 is now `qwen3-coder:30b` vs `devstral` (revised from `qwen2.5-coder:32b` — using what was already warm). `docs/local-agents.md` updated.

Open: NTFY_TOPIC not yet set on mlpc-ubuntu (notifications silent until `~/.cc-config` is dropped over). Not blocking.

## 2026-06-03 — Land planning handoff; tech stack settled

Persisted the claude.ai planning handoff at `docs/handoff-2026-06-03.md` and updated `CLAUDE.md`:
- Stack settled: Next.js static + TypeScript + React + **Tailwind** (tokens in config, component anatomy via `@apply` — replaces Bootstrap from predecessor), Dexie/IndexedDB, Pyodide (Layer 4a A/B only), Recharts, Cloudflare Pages/Workers, SHA-256 fingerprinting.
- Repo-layout policy: single-app at `~/Projects/alphabeta` for now; the handoff's `experiment-tools` monorepo proposal is deferred until the Chrome extension is ready to land alongside.
- Carried forward: deployment tiers (static / self-hosted / hosted), LLMProvider adapter seam, personas (newcomer / practitioner / diagonal user), three-layer toolchain, evidentiary-integrity context, the "what NOT to do" list.
- Open architectural threads documented: LLMProvider interface surface, Lambda fallback disposition, fold-if backward-edit loop, journal-index scope.

## 2026-06-03 — Clean break from alphabeta v1; new repo skeleton

Transitioned away from the predecessor project (static Next.js A/B-test analyzer) to a new product (discipline / decision-logging layer per the design handoff).

**Legacy housekeeping (predecessor preserved, frozen):**
- Pushed `feat/extension-scaffold` (8 unmerged GrowthBook-extension commits) to the old remote.
- Dropped the stash on `test/stats-transform` (WIP from a since-merged test branch).
- Disabled GitHub Pages on the old repo (deployed URL now 404).
- Renamed GitHub repo `mattpolicastro/alphabeta` → `mattpolicastro/alphabeta-legacy` (auto-redirect installed); archived the renamed repo.
- Renamed local `~/Projects/alphabeta` → `~/Projects/alphabeta-legacy`, updated origin URL, dropped `node_modules` (606 MB).

**New repo skeleton (`~/Projects/alphabeta`):**
- `git init`; `main` branch.
- `/design/` — full contents of the design handoff bundle (CLAUDE.md, README.md, lifecycle HTML prototypes, substrate/, explorations/, tweaks-panel.jsx, Design System).
- `/reuse/README.md` — manifest of code earmarked from `alphabeta-legacy` for copy-and-adapt as sprints reach them.
- Top-level `CLAUDE.md`, `README.md`, `WORKLOG.md`, `.gitignore`.

**Open:**
- Tech stack (pending claude.ai conferral). Constraints: IndexedDB-first, serverless, SHA-256 fingerprint immutability, individual-first. Pyodide not in MVP path.
- Sprint 1 build (Bet Front Door → Commit & Lock → Revisit) starts once stack is chosen.

Plan: `~/.claude/plans/i-have-a-claude-sprightly-fern.md`.
