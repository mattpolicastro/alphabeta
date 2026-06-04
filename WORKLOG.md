# WORKLOG

## 2026-06-04 — Sprint 4: Framework port + in-flight components + stats

Overnight autonomous session. Completed the strategy framework port
(all 5 frameworks now have cards + templates + example data), landed
the in-flight component library, and ported the portable stats modules
from legacy.

**Strategy — cards (Qwen dispatch + manual port):**
- RICE (3 cards) and GPS (3 cards) dispatched to Qwen 3.6 27B MTP
  via Aider. RICE needed 3 retries due to import-path bug (subdirectory
  cards copying `./sharedEdit` instead of `../sharedEdit`). GPS passed
  on 1 retry after the spec was updated with explicit paths.
- OKR (3 cards) and GIST (4 cards) failed dispatch — multi-file
  whole-edit produced empty 0-byte files (Aider's parser can't always
  parse Qwen's output for multi-file tasks). Ported manually.
- Types extended: `RiceIdeaFields`, `RiceScoringFields`,
  `RicePrioritizedFields`, `GpsGoalFields`, `GpsProblemFields`,
  `GpsSolutionFields`, `OkrObjectiveFields`, `OkrKeyResultFields`
  (+ `owner`), `OkrInitiativeFields`, `GistGoalFields`, `GistIdeaFields`,
  `GistStepFields`, `GistTaskFields`. `CardFields` union updated.

**Strategy — templates:**
- `rice.ts`, `gps.ts`, `okr.ts`, `gist.ts` — full template definitions
  with card component wrappers and example board data. Each template
  includes 10-15 example cards with realistic scenarios and 6-12
  connections.
- Registry completed: `TEMPLATES` is now `Record<TemplateId, ...>`
  (no longer `Partial`). All 5 templates registered.
- OKR columnId fixed: `key-results` (matching CardFields union, not
  plinthboard's `keyresults`).

**In-flight components (8 total, 6 new this session):**
- Previously: `IntegrityCheck`, `BucketResult`, `RuntimeBar`,
  `GuardrailRow`, `ThemeCard` (dispatched to Qwen R2).
- New: `LockedBetMini` (compact locked-bet reminder with fold-if
  and metric), `PhaseToggle` (segmented toggle for in-flight/results
  phases), `EvidenceBar` (qualitative 5-segment evidence scale for
  interview-style bets).
- All 8 components have tests and design-system specimens.

**Stats port from legacy:**
- `lib/stats/types.ts` — `AnalysisRequest`, `AnalysisResponse`,
  `MetricVariationResult`, `VariationData`, worker message types.
- `lib/stats/powerCalculator.ts` — Cohen's h, probit (A&S 26.2.23),
  `computePowerCalc` (two-proportion z-test sample size). 120+
  fixture-driven parity tests against statsmodels reference.
- `lib/csv/welford.ts` — Welford's online mean/variance algorithm.
  7 tests including numerical stability check.
- `transformResponse.ts` and `runAnalysis.ts` NOT ported — they depend
  on the legacy DB schema and zustand stores. Will make sense when
  alphaBeta has its own experiment result schema.

**Cleanup:**
- 12 stale dispatch branches deleted (all merged).
- GIST worktree cleaned up (empty-file false positive).
- Remote `dispatch/strip-fixture-defaults` branch deleted.

**Dispatch lessons (saved to memory):**
- Qwen 3.6 27B MTP excels at single-file generation with reference
  files. Multi-file dispatches have ~30% failure rate.
- Empty-file false positive: verify steps must check file content, not
  just compilation (empty .tsx compiles fine).
- Import path bug in subdirectory cards: always spell out exact import
  paths in multi-file specs.
- `((var++))` with `set -e` kills the script — use `var=$((var + 1))`.

**Stats:** 422/422 tests pass across 35 files. tsc + build clean.
Origin is current.

**Scope remaining (not started):**
- In-flight page assembly (`/bet/inflight/page.tsx`).
- SpineRail: add in-flight lifecycle step.
- Legacy stats: `transformResponse`, `runAnalysis` (need DB schema first).
- Plinth dialogs (TemplatePicker, ImportExport, Snapshot, Confirm).
- Board-level tests.
- Design exploration: onboarding, plan view, KM/learn (handoff written
  for Claude Design at `design/explorations/design-handoff-2026-06-04.md`).

## 2026-06-03 — Sprint 3: Strategy layer ported from Plinth Board

The `orient` nav slot is now live: a full kanban board at `/strategy`
ported from [Plinth Board](https://github.com/mattpolicastro/plinthboard)
(`~/Projects/nsf-board`). Strategy boards hold the North Star, drivers,
problems, goals, and work — plus the lineage arrows between them — and
any card can be elevated to a bet, threading Layer 1 (strategy) into
Layer 3 (refinement).

This sprint also retired the SS-A Objective stub. `Bet.cardId` is now
the canonical strategy link; the Objective entity, the
`lib/objective/` tree, and `Bet.objectiveId` are gone.

**SP-A — Schema + queries (orchestrator, TDD):**
- `Bet.cardId: string | null` added; `Bet.objectiveId` kept for one
  sprint as deprecated. Dexie v3 migration adds the `boards` table
  (JSON-blob shape: one row per board, full BoardState inline),
  indexes `cardId` on bets, backfills `null` on existing rows.
- `lib/strategy/queries.ts` — `mintBoard`, `getBoard`, `listBoards`,
  `saveBoard`, `deleteBoard`. 8 tests up front with `fake-indexeddb`.
- `mintDraft` extended with `opts.cardId` for the bet seam.

**SP-B — NSF template + cards (manual port):**
- `lib/strategy/types.ts` (narrowed CardFields discriminated union to
  the 5 NSF column shapes), `lib/strategy/templates/{types,nsf,
  registry,index}.ts` (verbatim from nsf-board — registry trimmed to
  just NSF; OKR/RICE/GIST/GPS deferred), `lib/strategy/constants.ts`.
- `components/strategy/cards/{NorthStar,Driver,Problem,Goal,Work}
  Card.tsx` plus shared edit primitives (Labeled, TextInput, TextArea,
  ImpactSelect, EffortSelect), Expandable, BadgeRow, MetricChips,
  MilestoneBar. NSF column backgrounds + state colors added to
  `globals.css @theme`.
- 13 card display/edit tests (`components/strategy/cards/__tests__/
  cards.test.tsx`) re-restored after the BoardProvider port landed.

**SP-C — Board scaffolding + hooks:**
- `components/strategy/{Board,Column,CardShell,CardList,SortableCard,
  ColumnHeader,InlineEdit}.tsx` (kanban container + DnD reorder via
  @dnd-kit). `ConnectionLayer.tsx` + `DragConnectLayer.tsx` (SVG
  overlay with orthogonal H-V-H routing, chain coloring, drag-to-
  connect).
- `hooks/{useBoardState,useConnections,useLineageAlignment,
  BoardProvider,LineageAlignmentContext}.{ts,tsx}` — single
  `useReducer` board with debounced persistence, BFS lineage
  alignment, focus mode, chain coloring.
- Storage adapter swap: `lib/strategy/utils/storage.ts` keeps the
  sync `loadBoard()/saveBoard()` signatures `useBoardState` expects
  but routes writes through `queries.saveBoard` against a
  module-level `currentBoardId`. Pages call `setCurrentBoardId(id)`
  before mounting `BoardProvider` and pass `initialState` from
  Dexie. `loadBoard()` is a default-state fallback (tests /
  unminted boards).
- Deps: `@dnd-kit/core ^6.1.0`, `@dnd-kit/sortable ^8.0.0`,
  `@dnd-kit/utilities ^3.2.2` (same pins as nsf-board).

**SP-D — Page mount + nav:**
- `/strategy/page.tsx` — Suspense-wrapped, splits between empty-state
  CTA (no `?id`) and board mount (with `?id`). Mount hydrates via
  `getBoard(id)`, wires `setCurrentBoardId`, passes the row in as
  `initialState`. Unmount clears the id.
- `/strategy/new/page.tsx` — mirrors `/bet/new`. Mints
  `defaultBoardState()` and `router.replace`s to
  `/strategy?id=<uuid>`.
- `GlobalNav` — `orient` flipped from disabled to `<Link href=
  "/strategy">`. Test updated.
- `.strategy-canvas` CSS — full-bleed flex container under the 38px
  sticky gnav so Board owns the remaining viewport.

**SP-E — Bet seam + example onramp:**
- `CardShell` toolbar gets a third icon (`↗`, "Elevate to bet"),
  visible only when `card.saved`. Handler: `mintDraft({}, { cardId:
  card.id })` → `router.push('/bet/wager?id=<betId>')`.
- `components/bet/BetSourceBadge.tsx` — small dashed plinth pill,
  rendered on all five stage pages just below `SpineRail` when
  `bet.cardId` is non-null. No back-link to the source card yet —
  that needs a future `Bet.boardId` field.
- `/strategy/new` accepts `?example=nsf` and seeds the new board with
  `getTemplate('nsf').exampleBoard()` (22 cards, 14 connections — the
  Plinth demo fixture). Empty state shows both onramps. Fixture smoke
  test in `lib/strategy/__tests__/example-board.test.ts` (5 assertions:
  shape, columns valid, connections refer to existing cards, round-
  trips through Dexie).

**SP-F — Cleanup:**
- Deleted `lib/objective/` (queries + tests).
- Removed `Bet.objectiveId` from `lib/db/types.ts`, removed the
  `Objective` interface, removed the unused `Framework` union.
- Dexie v4 migration: drops the `objectives` table (`objectives:
  null`), removes the `objectiveId` index on bets, strips
  `objectiveId` from existing rows.
- `lib/bet/{factory,queries}.ts` no longer init `objectiveId: null`.
- Tests swept: 4 fixture files (`BetCard`, `BoardView`, `filter`,
  `stage`) lose their `objectiveId: null,` line; `lib/bet/__tests__/
  queries.test.ts` drops the two `expect(bet.objectiveId).toBeNull()`
  assertions.

**Stats:** 143/143 tests pass across 17 files. tsc + build clean. New
routes prerendered static: `/strategy`, `/strategy/new`. Dev-server
smoke check: all routes 200; both empty-state CTAs render; the
example-board onramp seeds the demo data. Full kanban interaction
(DnD reorder, drag-to-connect, lineage alignment focus, arrow chain
coloring) needs a real browser to verify end-to-end.

**Scope deferred (called out for later sprints):**
- Other 4 framework templates (OKR, RICE, GPS, GIST) — only NSF was
  ported.
- Plinth dialogs (TemplatePicker, ImportExport, Snapshot, Confirm).
- Plinth Board-level tests (Board, ConnectionLayer, CardShell,
  useBoardState, useConnections, useLineageAlignment, storage,
  lineage util) — only the card-level tests and the fixture smoke
  test were ported.
- Bet back-link from `BetSourceBadge` — needs `Bet.boardId` (future
  schema bump).
- Board list / picker UI on `/strategy` for users with multiple
  boards.

## 2026-06-03 — Sprint 2: Feasibility & Instrument + Decision Criteria

The pre-lock lifecycle is now five-stage end-to-end: wager → instrument → criteria → lock → revisit.

**Foundation (orchestrator, TDD):**
- `lib/instrument/feasibility.ts` + tests (21 cases). Pure `fit(state)` returning per-instrument verdict + reason + metric; `suggest(map, state)` weighted by claim×strength + urgency×speed; `abWeeks(foldIfPercent, traffic)` rough two-proportion sample-size estimator (baseline p=4.2%, traffic→daily-per-arm). Four quantitative instruments: A/B, Quasi, Observational, Holdback. Rules mirror `design/Feasibility and Instrument.html`.
- `lib/instrument/evidence.ts` + tests (6 cases). Pure `evidenceFor(instrument, foldIfPct, metric)` returning structured `EvidencePart[]` (text or emph). Per-instrument templates: no-peeking (A/B), placebo test (Quasi), sensitivity analysis (Observational), novelty-window persistence (Holdback).
- `components/bet/CarriedWager.tsx` + tests. Read-only wager card with configurable eyebrow, surfaced on every post-wager screen.
- `components/ui/SegmentedButtons.tsx` + tests. Accessible radiogroup-as-buttons primitive.
- `components/ui/ConstraintSlider.tsx` + tests. Labeled range slider with word-based readout.

**Pages (mixed dispatch + manual):**
- `/bet/instrument` — dispatched (qwen3-coder:30b, job dp-2728, 79s, 18k/3.9k tokens). Sidecar reported `script-failed` (the new EXIT-trap fix earned its keep — first real test of that improvement). Verify caught 8 TS errors; orchestrator corrected: type guards on hydrating the `Record<string, unknown>` feasibility blob, layout fix (annotation back inside `ab-cols`), removed `rounded-full` violations.
- `/bet/criteria` — dispatched first, hit aider syntax errors and Suspense-wrap misuse; pivoted to manual. Hydrates bet, renders three editable criteria rows, evidence-bar panel via `evidenceFor`, min-mind-changer (= fold-if), commit & lock CTA.
- `lib/bet/factory.ts` gained `buildLockedSnapshotFromBet(bet, lockedAt)` — locks the real persisted instrument + criteria instead of the Sprint-1 stubs. `/bet/lock` and `/bet/revisit` both switched to the new helper.
- `/bet/lock` Section bodies replaced their "Deferred — MVP" placeholders with real `InstrumentReadout` and `CriteriaReadout` components.

**Stats:** 86/86 tests pass (now: 4 stage + 8 fingerprint + 19 analyze + 15 queries + 21 feasibility + 6 evidence + 4 WagerStatic + 3 CarriedWager + 3 SegmentedButtons + 3 ConstraintSlider). tsc + build clean. All 8 routes static-export prerendered.

**Dispatch scorecard for Sprint 2 (qwen3-coder:30b baseline):**
| Task | Outcome | Tokens (s/r) | Notes |
|---|---|---|---|
| `/bet/instrument` | dispatched + orchestrator fix-ups | 18k/3.9k | TS hydration types, layout breakage, design violations |
| `/bet/criteria` | dispatch failed (syntax + Suspense misuse) → manual | — | Aider exhausted reflections on a multi-section page |

Sprint 2 takeaway: qwen3 is solid on additive single-file work with clear patterns (B3/B4 in Sprint 1), but the Sprint-2 lifecycle pages have enough interdependencies (state shape ↔ schema ↔ persistence ↔ JSX) that the orchestrator pays for it in fix-ups. For Sprint 3 (Layer 2 / Journal index), dispatching the simpler additive parts (BetCard component) is probably still the win; the page-shell-with-state work stays manual.

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
