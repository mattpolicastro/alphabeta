# Event grammar v0.2 — consolidated after five stress rounds

**Rule:** schema = append-only event log + projection definitions. A projection =
fold(events) + selection predicate. Records are the read view. **Humans author
records; verbs compile to events** — the authoring/MCP surface is record-level
(`draft_bet`, `lock_bet`, `resolve_bet`…), never raw event append.

## Envelope (every event)

`{ seq, ts, boardId, actor, basis: observed|hypothetical|external }`

`actor`+`basis` carry all provenance. Cross-board references: `boardId/TAG`.

## Event kinds (18)

| kind | payload highlights | notes |
|---|---|---|
| `node.added` | nodeId, kind: goal\|problem\|solution\|question, title, body, **tags[]** | strat kinds only; bets born via `bet.drafted` |
| `node.revised` | nodeId, patch | only while open/draft |
| `node.removed` | nodeId, reason? | removal ≠ erasure |
| `node.closed` | nodeId, disposition: retired\|detonated\|mooted\|merged, basisRef | |
| `edge.added` | edgeId, source, target, kind: lineage\|elevation\|dependency\|spawn | structural relations only — evidential relations live in payloads |
| `edge.removed` | edgeId | |
| `question.expected` | nodeId, expectation | pre-lookup prediction; calibration source |
| `question.answered` | nodeId, answer, takeaway, validity: valid\|invalid\|anecdotal, affects:[{nodeId, valence: supports\|refutes\|reshapes}] | valences = the three answer archetypes |
| `solution.admitted` | nodeId, problemRef, groundsRefs[], screensRefs[], rivalRefs[], arbitration{byQuestionRef, rules[]} | customs paperwork; dedupe screens against open questions |
| `bet.drafted` | betId, seed | birth event (replaces generic node.added) |
| `bet.readied` | betId | review/sign-off state |
| `bet.locked` | wager{change, direction, metric, **construct**, magnitude, mechanism, **confidence**}, foldIf, criteria{win\|incon\|loss actions — free-text commitments}, guardrails[], **instrument{type, spec}**, **expectedResolveBy**, maturation: date \| **recurring schedule**, **roles{owner, resolver?, witnesses[]}**, attestations[], fingerprint | hash-chains prior events; compiled from draft state at lock |
| `bet.launched` | betId | requires prior lock (L1) |
| `bet.amended` | betId, field, change, reason | mid-flight deviations, first-class + neutral-toned (ASRS posture: disclosure earns credit) |
| `bet.resolved` | actuals:[{metric, value, confidence}], bucket: win\|inconclusive\|loss\|**invalid**, call, deviation?, provisional | vector actuals; C1: call ≠ bucket-action ⇒ deviation REQUIRED |
| `bet.matured` | betId, observedActuals, finalBucket | second act; discharges provisional verdicts; recurring for perpetual policies |
| `learning.noted` | ref, text, kind: mechanism\|craft | |
| `note.said` | channel, role, text | conversation = corpus; the metis reservoir |

## Constraints & precedence

- **L1** legal transitions: drafted → readied → locked → launched → resolved → matured
  (amendments legal between lock and resolve; recorded, flagged).
- **C1** `bet.resolved` with call ≠ bucket's pre-registered action is invalid
  without a `deviation` payload.
- **Resolution precedence:** bucket computes from the primary fold-if; a guardrail
  breach then forces either a deviation or a breach-qualified call. Fold-if stays
  the single mind-changer; guardrail bounds are co-committed at lock.
- **Contested answers:** opposite-valence `question.answered` from different actors
  ⇒ question is *contested*; folds do not auto-fire without adjudication.
- **Authority:** roles bind at lock. Off-role events are recorded, never blocked;
  projections mark the authoritative event and flag the rest.

## Canonical projections (all derived; none stored)

Seq tags (per-kind creation order, never renumbered) · gate states · evidence
summaries & grounding threads (drawn on demand, never default-on) · layout
(projection-local) · **P1** locked-metric check on actuals · **P2** ledger-of-locked
ignores removals · **P3** as-planned vs as-reported diff · calibration mirror
(shrinkage-aware, private-by-default) · docket (due/overdue/maturation) ·
customs dossier · graveyard · surrogate-validity board · intake tray/residue.

## Kept out of the log, deliberately

The rubric (admission rules, archetypes, fold-on-support/detonate-on-refute,
precedence policy): evaluated over the log, emits events, never stored in it.
Enforcement generally: everything is recorded-and-flagged, nothing is blocked —
the lock is a property (append-only + chain), not a gate.
