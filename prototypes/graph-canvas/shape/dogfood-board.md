# Dogfood board — this project's own decisions, in its own grammar

*The exploration written as the ledger it proposes. Every entry real; basis:observed.*

| tag | wager | status | resolution |
|---|---|---|---|
| **B1** | The five-layer concept model, expressed as a screens app, will carry the product | **resolved · loss** | Fold-if (unstated at the time — that's the point): concept iteration stays cheap. Actual: lock-timing change forced UI rebuild; route tree = transcribed state machine. Deviation: none — folded honestly, 2026-08-16. Learning: the design *medium* (HTML wireframes) authored the architecture. |
| **B2** | Force-graph physics is the right canvas | **detonated pre-bet** | Killed by a question ("what does position mean?") before anything was built — the cheapest win on this board. Spawned: altitude-pinned canvas (shipped in prototype). |
| **B3** | Local models are too weak for the reflect tier (2026-06 assumption) | **resolved · loss** | Locked implicitly in the June architecture. Actuals: qwen3.8:27b ≈17/19 vs reference, passed the confound trap; ~98s/case. Resolved 2026-08-22 by eval, sample n=4 (validity: anecdotal-plus). Learning: assumption aged out in ~10 weeks; re-test dated assumptions before building around them. |
| **B4** | The LLM inverts Grudin — conversational capture pays the author enough that the record is a free byproduct | **running · provisional** | Grounds: 25 live exchanges (n=1, designer-as-user, frontier facilitator). Fold-if (proposed, unlocked): a non-designer user, on a local model, stops volunteering material within 3 sessions. Maturation: real second user. **The load-bearing open bet.** |
| **B5** | An event grammar of ~18 kinds can carry the whole substrate | **resolved · win (provisional)** | Six stress rounds, three domains, red-team, volume, authority; all failures were payload-level. Matures at: first real implementation. |
| **B6** | Rubric secrecy is required for the feedback tier | **running → weakened** | Gaming round: LLM judge caught all escape hatches with rubric exposed; human-gamer case untested. Reframed: secrecy matters for *human* adversaries; for LLM-mediated flows the judge holds. **2026-08-27 evidence:** the compiled rubric (`rubric-v0.1.md`) + graded exam sat in the public repo for ~2 days before anyone noticed — including us. Split the asset: the *facilitation prompt* is public by posture now (no thresholds, arguably good marketing); the *compiled checks with trip points* are what secrecy actually protects. Narrows B6 to the numeric layer. |
| **Q1** | Does the immediate-value loop survive a 27B facilitator? | **open** | The live qwen3.8 dock session. Screens B4. |
| **Q2** | Does amnesty intake work on a real in-flight test? | **open** | Amnesty-diff of an in-flight test. Screens the adoption story. |

Notes: B1's loss spawned everything below it — the inconclusive-loop from the
rewrite doc, demonstrated on the project itself. B4 is the bet the fresh repo is
actually funding. If B4 folds, the honest fallback is the tool as a
*frontier-assisted* practice (hosted tier first), not a local-first one.
