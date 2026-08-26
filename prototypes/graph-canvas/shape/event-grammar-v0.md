# Event grammar v0 — the one-pager

**Rule:** the schema is an append-only event log + projection definitions.
A projection = fold(events) + a selection predicate. Records are the read view.

## Envelope (every event)

`{ seq, ts, boardId, actor: user|assistant|import, basis: observed|hypothetical|external }`

`actor`+`basis` replace all prose provenance ("PROPOSED (Claude)", "REAL", "hypothetical, 8/22").

## Event kinds (16)

| # | kind | payload (beyond refs) | append-only? |
|---|------|----------------------|--------------|
| 1 | `node.added` | nodeId, kind: goal\|problem\|solution\|question\|bet, title, body | ✓ (revise via 2) |
| 2 | `node.revised` | nodeId, patch | only while node open/draft |
| 3 | `node.removed` | nodeId, reason? | ✓ (removal ≠ erasure) |
| 4 | `node.closed` | nodeId, disposition: retired\|detonated\|mooted\|merged, basisRef | ✓ |
| 5 | `edge.added` | edgeId, source, target, kind: lineage\|elevation\|dependency\|spawn | ✓ |
| 6 | `edge.removed` | edgeId | ✓ |
| 7 | `question.expected` | nodeId, expectation | ✓ — the pre-lookup prediction (mini-lock; calibration source) |
| 8 | `question.answered` | nodeId, answer, takeaway, validity: valid\|invalid\|anecdotal, affects: [{nodeId, valence: supports\|refutes\|reshapes}] | ✓ |
| 9 | `solution.admitted` | nodeId, problemRef, groundsRefs[], screensRefs[], rivalRefs[], arbitration: {byQuestionRef, rules[]} | ✓ — the customs paperwork |
| 10 | `bet.readied` | betId | ✓ |
| 11 | `bet.locked` | betId, wager{change, direction, metric, magnitude, mechanism}, foldIf, criteria{win\|incon\|loss actions}, guardrails[], maturationHorizon?, fingerprint (hash-chains prior events) | ✓ + chained |
| 12 | `bet.launched` | betId | ✓ |
| 13 | `bet.resolved` | betId, actuals: [{metric, value, confidence}], bucket: win\|inconclusive\|loss\|invalid, call, deviation?, provisional: bool | ✓ |
| 14 | `bet.matured` | betId, observedActuals, finalBucket | ✓ — second act, discharges provisional verdict |
| 15 | `learning.noted` | ref, text, kind: mechanism\|craft | ✓ |
| 16 | `note.said` | channel: dock\|nodeId, role, text | ✓ — the conversation IS corpus |

## Explicitly NOT events (projections instead)

- **Seq tags (G1/P3/Q6)** — fold over `node.added` order per kind. Never renumber = free.
- **Gate states (gated/pruned)** — derived from dependency edges + resolutions.
- **Evidence summaries on ancestors** — derived from `question.answered.affects`.
- **Grounds / screens / refutes as visible links** — they are event *payloads* (8, 9), and each projection decides whether to draw them. (Dissolves the exchange-11/12 edge-density correction: the disagreement was about a projection, not the schema.)
- **Position / layout** — projection-local state, not domain history.
- **The rubric** (admission rules, archetypes, fold-on-support/detonate-on-refute) — policy evaluated over the log; emits events 4/9; never stored in it.

## Replay check — this week's board, by hand

- Exchanges 1–7 (goal, problems, questions, proposals): kinds 1, 5 + envelope provenance. ✓
- Two-goal split + rollback (r-5/r-6): batches of 3 and 1; same-id revival noted as edge case (rule: projection takes latest lifetime). ✓
- Hypothetical answers + detonation + mooting (r-10): kinds 8 (valence = the three archetypes: supports=locates-slack, refutes=kills, reshapes=redefines-objective) + 4. Ancestor evidence lines derive. ✓
- Edge-flip + correction (r-11/12): **vanishes** — was never schema. ✓
- S3 admission (r-14): kind 9, arbitration rules typed instead of prose. ✓
- FotF maturation, Buckner vector actuals, invalid verdicts (corpus round 2): kinds 13/14 payloads. ✓
- Fixture-era bet lifecycle + spawn + deviation: kinds 10–15 + edge kind spawn. ✓

## Gaps the replay exposed

1. `question.expected` was never captured live — every "___" slot on the board is this missing event. The grammar makes the calibration gap visible.
2. Same-id revival (rollback) needs one rule sentence (above).
3. `boardId` scoping is how "more graphs" happens — projections choose their board(s).
