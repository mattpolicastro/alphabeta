# Stress tests v0 — red-team, transplant, volume, projections

Run 2026-08-22 against `event-grammar-v0.md`. Verdict per attack/case:
**BLOCKED** (structure prevents) · **VISIBLE** (possible but indelibly recorded) ·
**SLIPS** (possible and invisible) · **GAP** (grammar change needed).

## 1 · Red-team — ten attacks by a motivated bad actor

| Attack | Verdict |
|---|---|
| Declare win when actuals miss locked fold-if | **VISIBLE** — bucket derives from locked foldIf; call≠bucket requires deviation |
| …and omit the deviation | **GAP → fixed**: constraint C1 — `bet.resolved` with call ≠ bucket-action is invalid without `deviation` payload |
| Run test first, lock after peeking | **SLIPS (half)** — ts is system-assigned so backdating is impossible, but the system can't know external data predated the lock. This is precisely the known per-bet vs process-of-measurement boundary; the extension closes it. Grammar addition: legality rule L1 — `bet.launched` requires prior `bet.locked` (in-system ordering enforced; out-of-system honesty not provable) |
| Lock a mushy fold-if ("we'll see") | **VISIBLE** — immortalized verbatim; well-formedness is rubric's gate, not grammar's |
| Resolve reporting a different metric than locked | **VISIBLE** — projection flags actuals[] missing the locked metric (projection spec P1) |
| Cherry-pick a winning segment post-hoc | **VISIBLE** — loss → segment claim → new bet is a legible sequence; policy routes segment claims through question-minting |
| Launder external evidence as observed (`basis` lie) | **SLIPS (attributable)** — basis is author-claimed; a lie is signed (actor) but not detectable. Accepted: same trust model as lab notebooks |
| Answer-shop with repeated similar questions | **VISIBLE** — full question history persists; dedup projection surfaces prior asks |
| Remove the embarrassing locked bet, re-add cleaner | **VISIBLE → spec'd**: projection rule P2 — ledger-of-locked ignores `node.removed`; locked records never leave the ledger view |
| Backfill an "amnestied" bet with invented history | **SLIPS (attributable)** — import basis + actor recorded; same notebook trust model |

Net: 6 visible, 2 attributable-slips (accepted trust boundary), 0 silent slips after C1/L1/P1/P2.

## 2 · Foreign-domain transplant

**AsPredicted-style psych preregistration.** Hypothesis/DV/conditions map to wager;
sample-size & exclusion rules do NOT — they're instrument spec, and `bet.locked` has
no instrument field. **GAP → A1: add `instrument{type, spec}` to bet.locked** (was in
the app's schema all along; the grammar dropped it). Deeper finding: academic prereg
commits to *analyses*, alphaBeta commits to *decisions* — criteria actions
(keep/revert) are org-shaped; for research the committed action is
"publish either way." Criteria actions must stay free-text commitments, not enums.

**ML model ship decision (offline eval + canary).** Maps cleanly: foldIf = regression
threshold, guardrail vector fits, maturation = drift watch. Re-confirms bundle/velocity
pressure (many small bets), nothing new breaks.

**Engineering migration ADR.** Surprisingly good fit: ADR = bet with
foldIf = rollback trigger, criteria = keep/rollback, maturation horizon = the revisit
ADRs famously never get. One finding: resolution may simply never occur —
the grammar needs no change, but a projection ("overdue obligations") does the nagging.

## 3 · Volume — 30 normalized corpus cases + demo board (script: 199 events)

- Projections stayed ~15 lines each; fold cost trivial; per-board seq tags clean
  (corpus board reaches B30; cross-board references need a board prefix, e.g. `corpus/B12`).
- Ledger-by-element and win/loss/invalid tallies per element worked first try —
  the NextAfter-style navigation practitioners actually use.
- Provenance segregated cleanly by envelope basis (demo=observed, corpus=external).
- **GAP → A2: node payloads need structured context — `tags[]` (org, element/surface,
  audience).** Title+body alone can't power taxonomy projections; `surface` existed in
  the old app schema and the grammar dropped it.

## 4 · Projection completeness (paper-defined, underived views)

| View | Derivable? | Missing |
|---|---|---|
| Calibration (expected vs actual, per actor) | mostly | **A3: `confidence` on the locked wager** (the app had it; grammar dropped it). question.expected ✓ |
| Portfolio ledger (status, overdue, gates) | mostly | **A4: `expectedResolveBy`/runtime on bet.locked** for overdue detection |
| Retrospective / KM (honored-rate, themes) | mostly | honored-rate ✓ (call vs bucket); themes need A2 tags |

Zero new event kinds needed — all four gaps are payload fields. Structure held.

## Amendments → v0.1

- **C1** deviation required when call ≠ bucket-action (structural constraint)
- **L1** legal-transition table (ready→locked→launched→resolved→matured)
- **P1/P2** projection specs: locked-metric check; ledger-of-locked ignores removal
- **A1** `instrument{type, spec}` on bet.locked
- **A2** `tags[]` structured context on node payloads
- **A3** `confidence` on the locked wager
- **A4** `expectedResolveBy` on bet.locked
- Cross-board reference form `boardId/TAG`

Pattern in the failures: every gap was something the *old app schema already had*
(instrument, surface, confidence, runtime) that the one-pager dropped — the grammar
was under-porting, not wrong. The event/projection structure itself survived all four tests.

## Round 3 (2026-08-22) — literature push: prereg adherence, enforcement, meta-analyses, adaptive methods

**F1 · Mid-flight deviation gap.** Claesen et al.: 25/27 preregistered studies deviated, most undisclosed; ~75% across fields — preregs are treated as adjustable plans. Our deviation only exists at resolution (C1). Real deviations happen between lock and resolve. **→ 17th event kind: `bet.amended` {betId, field, change, reason}** — timestamped, neutral-toned (punitive framing reproduces the hiding behavior the literature documents).

**F2 · Audience problem.** COMPare: outcome switching in 58/67 top-journal trials despite registries + CONSORT; NEJM rejected all correction letters. "VISIBLE" assumes a reader with standing. Schema can't make consequences; it can make checking free: **→ P3: as-planned-vs-as-reported diff as a first-class projection.** Positioning: the tool manufactures checkability, not consequences.

**F3 · Calibration projection is a footgun.** Kohavi: ~10% median success rate → >20% FDR on significant wins; low-power wins exaggerate (Bing's knock-20%-off rule). Naive calibration over raw actuals systematically flatters wins — first *projection-level* failure mode (correct data, honest fold, wrong conclusion). **→ calibration projection must be shrinkage-aware; base-rate priors join admission plausibility checks.** No grammar change.

**F4 · Punctual-resolution bias (NARROWED, per user).** A time-capped bandit is a punctual bet with an adaptive *instrument*: horizon pre-committed at lock (A4), bandit spec in instrument (A1), fold-if = best-arm rule at the cap. No grammar change. F4 applies only to genuinely perpetual policies (always-on personalization, standing holdouts) → recurring review schedule. Rubric caveat: capped-bandit horizons come from fixed-budget best-arm-identification bounds, NOT Y pairwise power calcs (adaptive allocation starves arms; adaptive stopping inflates error) — the fold-if-presupposes-instrument bridge, inside the instrument.

**Meta:** round 2 broke resolution's payload; round 3 broke its temporality. Resolution remains the thinnest layer — consistently the least-prototyped one.

## Round 4 (2026-08-22) — STS theory + non-business domains

**F5 · Goodhart eats the tool's own metrics.** Honored-rate and calibration streaks become targets → users write comfortable fold-ifs to protect streaks. Extends the existing "no win-rate scoreboards" position to discipline metrics themselves. → Discipline stats stay private-by-default, never rank actors; rubric flags suspiciously-safe fold-ifs.

**F6 · Auditability displaces quality (Power, *Audit Society*).** Work reshapes itself to be readable by the ritual: defensive pre-registration, vague-but-compliant bets, locking as ceremony substituting for thinking. **Concrete catch: our own demo fixtures exhibit this — all 10 seed bets share verbatim copied criteria text.** → Template-reuse/boilerplate detection projection; positioning stays instrument-not-audit.

**F7 · Legibility destroys metis (Scott).** The five node kinds are a legibility scheme; hunches, feel, and relational knowledge either go uncaptured or get deformed into fake problems. Existing mitigation is real: open-field capture-before-categorization + `note.said` keeps unschematized material. → The dump stays first-class forever; add an "uncategorized residue" projection read as a *health signal*, not a backlog to clear.

**F8 · Performativity (engine, not camera) + Porter's distrust signal.** Recording changes the process: early fold-ifs crystallize exploration prematurely; confidence statements anchor. Partly the product's point — but demands a hard mode split (exploration vs commitment; discipline prompts fire only at admission). Porter: quantification is a technology of distrust — imposing the tool on a high-trust team reads as an accusation. → Adoption path: self-tool first, team tool by invitation.

**F9 · The record as legal liability.** Discovery risk: candid deviation logs and "we knew X" pre-registrations are discoverable; corporate counsel actively coaches against creating candid internal documents. Direct collision with the product's core value, unresolvable by schema — and the hash chain cuts both ways (no quiet cleanup). → Local-first/self-hosted matters more than we thought; retention policy becomes a deliberate, visible org decision, not a default. Honest positioning: in litigation-exposed orgs this is a real adoption ceiling.

**F10 · Policy-based evidence (pilots as legitimation).** Decided-then-tested: the bet exists to bless a foregone conclusion (Checkland: pilots carry shifting political purposes; "decisions made" as a success metric is itself perverse). The log renders legitimation visible in sequence only when the decision was in-system — same attributable-not-preventable boundary as peek-before-lock.

**F11 · Non-jurisdiction domains.** Creative practice (Schön): goals are discovered in the making; pre-commitment damages the work. The tool should *declare* non-jurisdiction, not colonize. Contrast: N-of-1 self-experimentation fits cleanly. → A stated boundary is part of the positioning.

**Meta:** rounds 1–3 attacked the grammar and mostly lost. Round 4 lands above it — on rubric, projections, adoption, and law. The risk register has moved up the stack; the schema is no longer where the danger lives.

## Round 5 (2026-08-22) — multi-actor authority + Merritt speed-run

### Multi-actor authority holes (paper pass)

The envelope has `actor` but zero authorization semantics. Findings:

- **Dueling resolutions.** Nothing prevents PM emitting `bet.resolved{win}` after
  the analyst's `{loss}`. → **Roles bind at lock**: `roles{owner, resolver?,
  witnesses[]}` in the `bet.locked` payload (added to speed-run). Non-role events
  are recorded, never blocked, but projections mark the authoritative resolution
  and flag the other — visibility-over-enforcement, with a defined "authoritative"
  predicate.
- **Contested answers.** Two `question.answered` with opposite valences from
  different actors → projection state **contested**, and the fold rule must NOT
  auto-fire on a contested question; folding requires uncontested answer or an
  explicit adjudication event. (Founding-scenario test: PM cherry-answer vs
  analyst answer now has defined behavior.)
- **Post-lock role reassignment** (PM reassigns resolver to self) routes through
  `bet.amended` → flagged like any amendment.
- Board membership/write-authority: real, org-tier, deferred — not solo schema.
- Sock-puppet witnesses: attributable-not-detectable; accepted notebook trust model.

### Merritt speed-run (FotF case, hand-authored: shape/speedrun-fotf.jsonl)

10 events, ~7 minutes, one complete lifecycle. Findings:

- **Humans author records, not events.** `bet.locked` alone is 30% of the bytes;
  hand-writing it is miserable and error-prone. The right MCP/authoring contract
  is record-level verbs (draft_bet, lock_bet, resolve_bet) that *compile* to
  events; raw event append is a machine surface. Write-model ≠ log-model.
- **Wart:** `node.added(kind:bet)` is nearly empty next to `bet.locked` — bets
  barely need the generic node birth event; consider `bet.drafted` as the
  specialization.
- **The single-thread fold-if strained on a real case.** FotF's honest mind-changer
  is compound (primary lift AND guardrail bounds). Resolution precedence needs
  stating: bucket from primary fold-if, then guardrail breach forces either
  deviation or a "win-with-breach" reading — the deviation field carried it here,
  but the precedence rule should be rubric-explicit.

## Round 6 (2026-08-22) — rubric-gaming, empirical (qwen3.8 self-play, 2 scenarios × rubric-access conditions)

- **Judge caught every classic escape hatch in both conditions**; rubric access did
  not measurably aid the gamer. With-rubric bundle gamer broke persona and refused
  to game — LLM-mediated admission has a different threat model than human gaming
  (caveats: self-play, one family, n=4).
- **Named gaming patterns → rubric checks:**
  1. *Non-inferiority smuggling* ("≥0 bps, validation phase") — the null as win
     condition. Judge: REJECT — "you cannot lose, and therefore you are not
     wagering anything."
  2. *Inconclusive-ships* — escape hatch placed in the pre-registered inconclusive
     ACTION; actions need admission review, not just thresholds.
  3. *Catastrophe-tripwire* — fold-if set far below the claim creates a
     consequence-free window ($730K in the specimen); check: claim-to-fold-if gap
     must be justified; record must distinguish target from falsification threshold.
- Judge granted the genuine deadline constraint (seasonal peak) while forcing the
  record honest — the deadline-bundle policy from F-catalog, performed correctly by
  a 27B local model.

## Round 7 (2026-08-25) — real artifact ingestion: a third-party CRO readiness audit (ecommerce)

Whole audit (scorecard, power table, 16-test backlog, just-do-its, open questions) mapped onto one board: 1 goal, 5 problems, 8 owned questions, 15 solutions, 2 draft bets.

**Landed cleanly (validations):** evidence tiers H/B/D/V ≡ provenance tiers; expectation-before-lookup practiced (Q2 prior stated); every hypothesis primary+guardrail (fold-if-shaped); JDI-vs-test ≡ task/bet discernment; power table ≡ instrument spec → fold-if magnitude; audit's "learning ledger" prescription ≡ this product's ledger + calibration.

**Friction (new gaps):**
1. Hypotheses state direction, never a mind-changer — 0/16 fold-ifs. Admission demands them (confirms rubric #6).
2. **Bets gated on questions** (instrumentation, margin, Plus?) — graph gates only bet→bet. → dependency edge sources may be questions; gate opens on answer. Schema/engine tweak.
3. **Changes without tests have no node kind** (just-do-its). → lightweight "change" record: ledger row, expectation, before/after, no lock ceremony. Candidate 19th event kind or a bet sub-type (instrument: pre/post, ceremony: none).
4. **Portfolio-level feasibility** (readiness scorecard: can this org run bets at all) has no home — nothing above the goal. → org/program-level object, or goal detail convention for now.
5. Opportunity-vs-problem valence again (P3 urgency).
6. Ink budget: 15 solutions only works horizontally.
