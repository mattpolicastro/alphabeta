# Roadmap — September 2026: quarry apps/web into the live canvas

**Premise.** The graph-canvas prototype is now the app (`app.alphabeta.tools`). `apps/web` — the June five-layer build, 730 tests, 77 components — is the quarry. This plan pulls its functionality into the canvas *on the canvas's terms*: one projection per question, the Instrument brand, the event grammar. Nothing from `apps/web` lands as a route.

Three emphases, from Matt, 2026-09-04:
1. **UI consistency across screens.**
2. **Honest capability markers** — what works, what's a placeholder, what's planned — so the app communicates what it can support without pretending.
3. **The lab as a loose marketing funnel** — calculators people already ask for, falling through into locked bets.

## 0. The decision this plan assumes

**The prototype is promoted in place.** `prototypes/graph-canvas` stops being "deliberately disposable" and becomes the app; it moves to `apps/canvas` when the first phase lands (path change only). `apps/web` stays as a quarry and is never deployed. If you'd rather start a clean `apps/v2` from the grammar and quarry *both*, say so before phase 1 — everything below still applies, only the starting tree changes.

## 1. Foundation — consistency and honesty (do first, small)

**1a. One capability registry, rendered everywhere.** A single `capabilities.ts` listing every surface from `shape/surfaces-v0.md` (3 places, 4 panel faces, 5 moments, 4 documents, 2 trays) plus lab tools, each with a status:

| status | meaning | how it renders |
|---|---|---|
| `live` | works end to end in the static build | nothing — it just works |
| `partial` | works with a stated gap | small chip on the surface: "partial — no X yet" |
| `stub` | present as a placeholder, shows the intended shape with fixture data | chip: "preview" + the surface is visibly pencil-register |
| `planned` | exists in the registry, not in the UI | listed on the capability page only |

The same registry drives (i) the chip on each surface, (ii) a `/capabilities` page on the landing site, (iii) a "what's here" tray in the app. One source, so the marketing claim and the running app can't drift. The pencil/ink law already distinguishes draft from committed *records*; the same visual distinction marks *surfaces* that aren't real yet.

**1b. One shell.** `prodbar` (wordmark · places · board actions), the Panel, the Moment scrim, the trays — already one component tree. Codify: every new surface is a place, a panel face, a moment, a document, or a tray. No fifth kind.

**1c. One token file, one register.** `styles.css` has the brand v0 tokens; `apps/web` used the wireframe-era set (paper/ink/terra, JetBrains Mono/Caveat, dashed borders). Everything quarried is re-skinned on arrival — no component crosses over with its old CSS. Retire the stale Tailwind/`@apply` line in `CLAUDE.md` (installed, never used).

**1d. Data safety before inviting anyone.** The static build persists to `localStorage`: one board, no account, wiped by a cleared browser. Quarry `lib/db/portable.ts` (versioned export envelope, `validateEnvelope`, migration chain) and `lib/integrity/fingerprint.ts` first. Export/import is the first *live* capability the registry advertises, and it's the precondition for asking anyone to keep real bets here.

## 2. Close the loop — make the five moments real

Surfaces-v0's build order A. The canvas has lock/resolve/answer/amend as overlays; what's missing is the faces they open onto.

| surface | quarry from `apps/web` | note |
|---|---|---|
| **Cockpit face** (post-lock bet) | `components/inflight/*` — `LockedBetMini`, `GuardrailRow`, `RuntimeBar`, `IntegrityCheck`, `BucketResult`, `StatsReadout`, `EvidenceBar` | These are the best-tested components in the quarry. Re-skinned to ink register; read-only by law. |
| **Admission face** (solution) | `components/strategy/{SolutionCard,ProblemCard,ScoringCard,PrioritizedCard}`, `lib/strategy/isElevatable` | Admission paperwork: problem, grounds with tiers, screens, rivals. |
| **Lock moment: instrument rung** | `lib/instrument/{fit,suggest,evidenceFor,abWeeks}` | The ladder is in the grammar (v0.3) but the lock doesn't read it yet. `suggest` picks a rung from feasibility context; `abWeeks` sizes runtime. |
| **Lock moment: structured criteria** | `bet/criteria` page logic, `Criteria` type | Prose stays canonical; compile `{metric, direction, threshold, comparator}` at lock (matches the openexperiment handoff). |
| **Ledger filters** | `lib/journal/{filterBetsByStatus, groupBetsByStatus}`, `components/journal/BetCard` | Ledger is built; filtering by tag/status/validity is not. |

Exit criterion: a visitor can draft → lock (with rung + compiled criteria) → resolve (bucket computed from fold-if) → see the cockpit, all in the static build, and export the board. That's the loop the funnel lands on.

## 3. The lab — the funnel (parallel with 2)

Per the paused stub: `alphabeta.tools/lab/*`, question-named, flat, stateless, URL-as-contract, sealed receipts. Order by dependency, not ambition:

1. **`/lab/sample-size`** — quarry `lib/stats/{computePowerCalc, cohensH, probit}` (pure TS, tested). First tool, instant, no engine. Ships the card format, the URL schema, the seal, and the `lock as bet` link in one go.
2. **`/lab/srm`** — chi-square, trivial, second card.
3. **`/lab/detectable-lift`** — inverse of #1, same functions.
4. **`/lab/pre-post`** — causal-impact-wasm deployed as-is under the path.
5. `/lab/results`, `/lab/sequential`, `/lab/bayes` — Python engine (`spotify-confidence` on Pyodide), after the oracle question is settled.

**The funnel mechanics:** every tool ends in `lock as bet →` (`app.alphabeta.tools/bet/new?from=sample-size&v=1&…`), which mints a draft with instrument `ab`, MDE and baseline prefilled. Phase 2's lock has to exist for this to land somewhere real — hence "parallel with 2, ships after."

**Landing page changes:** a `/lab` index card list (Kelly's format: question, inputs, outputs, open) and the `/capabilities` page from 1a. Both are static HTML in `apps/landing/`.

## 4. Intake without the relay

The open field is the product's thesis and the static build compiles it out. Two moves make it honest instead of absent:

- **Typed intake with rules-based classification.** `lib/compose/classifyAltitude` is a pure function — it sorts a dump into goal/problem/question/solution without an LLM. Quarry it behind an intake tray: type, get a classified draft node, place it. Registry status: `partial — classifies, doesn't converse`.
- **BYO-key facilitator.** Handoff §5 tier 1 is exactly this: the user pastes an Anthropic/OpenAI key, calls go browser → provider, nothing touches a server. Quarry `lib/llm/*` (the `LLMProvider` seam) and wire the dock behind a key field. Registry: `live` when a key is present, `stub` otherwise, with the chip saying which. This is the first thing that turns the deployed app from a demo into the tool.

The rubric prompt is public by posture now, so a BYO-key facilitator using `rubric-prompt.md` costs nothing in secrecy.

## 5. Documents and the time shadow

| surface | quarry | status on arrival |
|---|---|---|
| **The Diff** (as-planned vs as-reported) | `components/bet/{WagerStatic, CarriedWager}`; fingerprint | `live` once cockpit exists — it's two snapshots of the same record |
| **Calibration mirror** | `components/km/{OutcomeBadge, CycleSummary}`, `lib/km/listResolvedBets` | `stub` with fixture data until there are ≥ N resolved bets; the chip says so |
| **Mechanism / surface views** | `components/km/{MechanismClusters, SurfaceMatrix, TheoryEvolution}`, `classifyMechanism` | `stub` — these are the "what have we learned" projections; real only with a corpus |
| **Docket enrichment** | `lib/plan/findContentions`, `components/plan/TimelineView` | Docket is built; contention detection (two bets on one surface) is the quarry |
| **History scrubber** | event log replay | `planned` until the static build persists events, not state |

## 6. What stays out

- **The strategy board as a separate screen.** Its *frameworks* (GPS / OKR / RICE / North Star templates in `lib/strategy/templates`) become canvas seed templates; the Kanban itself is Plinth Board's job.
- **`apps/web`'s routes, shell, walkthrough, debug panel.** Screens-per-stage is the thing the pivot rejected.
- **The Lambda stats fallback.** Unresolved privacy question; static build has no server anyway.
- **Auth, sync, tiers 2–3.** Out of scope for this roadmap entirely.

## Order and rough weight

| phase | what | weight |
|---|---|---|
| 1 | registry + chips + capability page; export/import | small — a few days |
| 2 | cockpit + admission faces, ladder in lock, compiled criteria, ledger filters | the bulk — most of the quarried components |
| 3 | lab: sample-size → srm → detectable-lift → pre-post; index + funnel link | medium; #1 is a weekend, the rest are cards |
| 4 | typed intake + BYO-key facilitator | medium; mostly wiring the existing seam |
| 5 | diff, calibration, KM stubs, contentions, history | long tail; stubs are cheap, real versions wait on a corpus |

Phases 2 and 3 run in parallel; 3 ships after 2's lock exists. Phase 1 is short and gates everything, because it's what lets the app say what it is.

## Decisions (2026-09-04)

1. **Promote in place.** `prototypes/graph-canvas` → `apps/canvas` when phase 1 lands.
2. `/lab/results` — open; see the lab stub.
3. **R sources located** — the Shiny apps behind Kelly's tools page, usable as parity oracles for the lab ports:
   - `alphanumerritt/sample-size-calculator` → `sample-size-calc` (Merritt Aho is credited on the page)
   - `alphanumerritt/sequential-test-app` (Matt's fork: `mattpolicastro/sequential-test-app`) → `sequential-testing-app`
   - `alphanumerritt/abtestanalysis` → `results-analysis`
   - `alphanumerritt/bayesian-exp-app` → `bayesian-analysis`
   - `gilliganondata/sample-size-calculator-1` (2018, flexdashboard) — the runtime-based ancestor; Tim Wilson's `test-result-simulator` and `randomization-explorer` are teaching apps, not on the page but worth a look for the lab index.
   Two oracles now: R (these) and Python (`spotify-confidence`). Ports are validated when both agree.
4. **Capability page on both** landing and app, one registry.
