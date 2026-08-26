# Literature review v0 — six bodies, boiled down

2026-08-22. Each: core finding → what it changes for us.

## 1 · Design rationale capture (IBIS/gIBIS, Grudin) — the dead ancestor

Issues/positions/arguments as linked graph nodes, 1988. Died outside facilitated
meetings. Cause of death (Grudin): capture cost falls on the author, benefit accrues
to an unknown future reader — "there must be immediate value." No one altruistically
writes rationale.

→ **Our central wager, now named: the LLM inverts Grudin.** The user talks (cheap);
the assistant does the capture labor. This week's dock sessions are the
proof-of-concept. Product law: **every capture moment must pay the author
immediately** (pushback, admission checks, sharpened thinking) — the archive is
byproduct, never the pitch. The gIBIS exception (worked with a human facilitator)
generalizes: the assistant is a facilitator who never leaves the room.

## 2 · Safety science (ASRS, just culture) — candor is engineerable

1.3M voluntary reports since 1976. The machinery: neutral third-party custodian
(NASA, not the enforcer FAA), confidentiality, limited immunity — filing signals a
"constructive safety attitude" and usually voids penalty — with an immunity cap
(once per 5 years) to prevent gaming.

→ Deviation/amendment reporting needs the **ASRS posture: disclosure earns credit.**
Honored-rate style projections must count disclosed-deviation-with-reason as good
standing, not failure (answers F1's tone problem and Claesen's hiding behavior).
Org tier: **the record custodian must be structurally separate from the performance
evaluator** — deployment topology (who hosts) is an integrity feature, not ops detail.

## 3 · Forecasting & JDM (Tetlock, Klein) — the person-side mechanics

Calibration is trainable (GJP: brief probability training measurably improves Brier
scores). Granular probabilities beat vague words. Premortems ("it's a year later and
this failed — why?") exploit prospective hindsight: ~30% more risks identified, and
reliably reduce overconfidence (Veinott/Klein RCT) — better than pro/con critique.

→ (a) `question.expected` + wager confidence become **privately Brier-scored** over
time (private per F5 — never a leaderboard). (b) **Premortem as the criteria-authoring
prompt**: don't ask "what's your fold-if?" — ask "this bet failed; what happened?"
and harvest the fold-if from the answers. (c) Confidence field coaches from words
("fairly sure") toward numbers. (d) Amendment framing = Bayesian updating — changing
your mind on new facts is scored as virtue, aligning with the ASRS posture.

## 4 · Patent lab notebooks & archival practice — the lock's real ancestor

A century of tamper-evident practice with legal standing: bound numbered pages, ink,
no white space, signed/dated per page — and the part we lack: **a corroborating
non-inventor witness**. Poorly kept notebooks get "little or no weight" as evidence.
Post-AIA (first-to-file) the legal driver weakened, yet the practice persisted for
internal integrity — good omen for our lock-as-property demotion.

→ (a) **Witnessing/attestation** as optional payload (`attestations[]` on
`bet.locked`): a second-party signature upgrades a record from diary to testimony —
the cheap social version of the lock. (b) Record-keeping quality is *gradeable*:
a projection can score chain completeness, and exports carry that grade — the
"little or no weight" principle made visible.

## 5 · Commitment devices (Schelling, Ulysses, stickK) — the renegotiation threat

Stakes work (money-at-stake ≈ 3× goal completion) but self-set stakes get
renegotiated — the solo Ulysses ties the knot *and keeps the knife*. Sustained
behavior-change evidence is weaker than the folklore. stickK's referee design adds
a second party for a reason.

→ Confirms enforcement demotion: the tool's job is making renegotiation **visible**
(`bet.amended`), not impossible. Social stake = sharing the lock with a witness
(ties to #4). Timing law: locks are for cool moments — the ceremony should resist
being performed in the heat it exists to constrain.

## 6 · Surrogate endpoints (CAST, ICH criteria) — every metric is a proxy

CAST: drugs approved for suppressing arrhythmias (the surrogate) *increased
mortality* (the truth). Medicine's validation bar: statistical relation to the true
endpoint + treatment-effect correspondence + sensitivity/specificity; patient-level
vs trial-level surrogacy distinguished.

→ (a) **The wager should name what its metric is a surrogate for** — a `construct`
field beside `metric`; the rubric's "would the metric move if the hypothesis were
true?" gains its mortality-grade cautionary tale, and the inverse question too
("could the metric move while the construct doesn't?"). (b) Surrogate validity is
corpus work: a KM projection testing whether metric X's movement predicted outcome Y
across resolved bets. (c) Maturation horizon = the surrogate/true-endpoint time gap,
now with a proper name.

## Cross-cutting

The six pair against our three sore spots: **Grudin + ASRS** → capture & candor
(adoption); **Tetlock + commitment devices** → calibration & renegotiation (the
person); **notebooks + surrogates** → record & metric integrity (the substance).
Every literature independently endorses the same architecture conclusion: visibility
and immediate value over enforcement. New schema candidates: `attestations[]`,
`construct` on the wager; new rubric mechanics: premortem-derived criteria,
ASRS-posture deviation credit, Brier-scored private calibration.
