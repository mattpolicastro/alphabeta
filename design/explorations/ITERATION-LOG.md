# ⍺lphaβeta — Iteration Log & Exploration Archive

This folder holds the **superseded explorations** from the wireframe journey-mapping of
⍺lphaβeta's setup → revisit lifecycle. The **current product** lives at the project root.
Nothing here is dead weight — each file is a step whose *reasoning* and the *feedback that
motivated the next step* are recorded below, so the trail of decisions stays walkable.

> ⍺lphaβeta is a serverless, browser-based **discipline layer** for empirical work — not a
> stats tool. It surfaces the process tradeoffs ("should I run this?") that existing
> experimentation platforms leave implicit. The wireframes are a *journey-mapping device*,
> not finished UI; the low-fi blueprint aesthetic is deliberate.

---

## The canonical product (project root — current)

The single-bet lifecycle, one carried thread end to end:

1. **`../Bet Front Door.html`** — articulate the idea as a falsifiable bet (dump → reflect → wager)
2. **`../Feasibility and Instrument.html`** — the fold-if becomes the detection spec; pick the instrument
3. **`../Decision Criteria.html`** — pre-register win/inconclusive/loss actions before results
4. **`../Commit and Lock.html`** — two-step draft/lock → timestamped, fingerprinted, immutable
5. **`../Revisit.html`** — commitment vs. outcome; deviations logged; calibration feeds the next bet

Start at **`../alphaBeta - Index.html`** for the hub view.

---

## How to read this archive

Each exploration below has a companion `.md` (same name as the `.html`) capturing its
motivating question, what it tried, the structural bets it made, the feedback it drew, and
prev/next pointers. Read them in order to follow the reasoning.

The HTML files still cross-link to each other (they were moved together, so relative links
hold). A few of them link *forward* to files that have since become canonical and live at
`../`.

---

## The timeline

Ten iterations. The first five (this folder) explored the *shape* of the problem; the last
five (root) are the converged product. Each arrow is real feedback from review.

### 1 — Setup Phase: Decompositions  ·  *archived here*
**File:** `Setup Phase - Decompositions.html`
Three structural cuts of the setup phase, against the original four-step wizard:
**A** dissolve the wizard (ambient feasibility sidebar), **B** two epistemic acts
(Should we? → Lock it), **C** twin Can/Should surfaces (five sharp beats).
**↳ Feedback:** *"These map to levels of complexity/expertise — A for experts, C for
neophytes."* The cuts weren't alternatives to pick between; they were one axis.

### 2 — The Register Dial  ·  *archived here*
**File:** `Setup Register Dial.html`
If A/B/C are an expertise axis, make it a dial. But the morphing gave the reviewer
"heebie-jeebies" about UX consistency and hidden assumptions — so the bet here was:
**fix the bones, flex only the narration.** One skeleton; the register (Scaffolded /
Standard / Ambient) only changes how much the discipline layer *talks*. A toggle proves
the spine never moves.
**↳ Feedback:** *"Decouple the method from the decision — this should be a multi-method
decision-support tool, which also resolves the diagonal user."*

### 3 — Decision × Method  ·  *archived here*
**File:** `Decision-Method.html`
The decision is the spine; the method (A/B, quasi-experiment, observational, holdback) is a
**pluggable module**. Swap the instrument, the decision journal holds still; only the
feasibility surface and running discipline change. The diagonal user (deep domain, shaky
stats) keeps authorship of the decision and leans on the module for the math.
**↳ Feedback:** *"Is the method secondary to the decision journal? Maybe the user arrives
with an instrument in mind and the feasibility panel guides them elsewhere as inputs come in."*

### 4 — Instrument Finder  ·  *archived here → superseded by `../Feasibility and Instrument.html`*
**File:** `Instrument Finder.html`
Method settles *at feasibility*, not before. You arrive planning an A/B test; constraints
(can you randomize? traffic, urgency, claim strength) argue you off it. The discipline move
is **nudge, not gate** — overriding the recommendation is allowed but *logged with a reason*.
**↳ Feedback:** *"I like the override field. What's on screen is early in articulating an
idea/bet — nail that first; live/monitoring feels relatively solved."*

### 5 — Bet Articulation (3 front doors)  ·  *archived here → superseded by `../Bet Front Door.html`*
**File:** `Bet Articulation.html`
Going upstream: how does a loose idea become a falsifiable *bet*, low-friction? Three
personalities — **wager sentence** (structure hidden in blanks), **dump & reflect** (say it,
the tool reflects and flags the gap), **triage first** (place the bet on confidence ×
reversibility).
**↳ Feedback:** *"Wager sentence is too demanding for first contact (maybe an expert mode).
Dump & reflect is closer — use it as first contact, then help structure into the wager as
step 2. Triage-first → analysis paralysis. Falsifiability is critical; like the
natural-language-first approach."*

### 6 — Bet Front Door  ·  *canonical (`../`)*
The fused front door: **dump → reflect (pushes back, scans for a falsifier) → sharpen into
the wager.** Natural-language first; wager as destination; express lane for experts. Later
additions: a **theory/mechanism** field separated from confidence (if / then / because) and a
**Tweaks panel** (pushback tone, falsifier insistence, express-lane visibility, accent).
**↳ Feedback:** *"Carry this forward into feasibility/instrument; bring the existing UI into
closer alignment with the new front door."*

### 7 — Feasibility & Instrument  ·  *canonical (`../`)*
Realigned Instrument Finder, now **carrying the committed bet** (via storage) and making the
key bridge: **the bet's fold-if becomes the detection spec** — if a test can't *see* your
fold-if, it can't resolve your bet.
**↳ Feedback:** *"Read-only fold-if (step back to edit). Make the spine rail itself the
navigation. Carrying forward into criteria makes sense."*

### 8 — Decision Criteria  ·  *canonical (`../`)*
Pre-register the win/inconclusive/loss actions. Two more carries: the **fold-if is the loss
line and the minimum mind-changer** (one number, declared once), and the **evidence bar is
supplied by the chosen instrument.**
**↳ Feedback:** *"Continue to commit."*

### 9 — Commit & Lock  ·  *canonical (`../`)*
Two-step **draft / lock**. Lock timestamps and freezes the whole pre-registration, with a
content **fingerprint** proving what was committed before any result existed. Immutable —
edits make a new version, never overwrite.
**↳ Feedback:** *"Revisit loop next. Running phase feels extremely method-dependent."*

### 10 — Revisit  ·  *canonical (`../`)*
The loop closes. The locked commitment meets the actual outcome; the **bucket is computed from
the fold-if** (not post-hoc mood); the pre-registered action is recalled; any **deviation is
logged in your words beside the timestamp**. Calibration (expected vs actual) feeds the next
bet. Deliberately **method-agnostic** — it only asks whether you honored the lock.

---

## Supersession map

| Archived exploration | Status | Successor |
|---|---|---|
| Setup Phase — Decompositions | folded into the register/decoupling thinking | — |
| Setup Register Dial | concept (fixed spine / variable narration) carried into all canonical screens | — |
| Decision × Method | concept (method as pluggable module) carried into feasibility + criteria | — |
| Instrument Finder | **superseded** | `../Feasibility and Instrument.html` |
| Bet Articulation | **superseded** | `../Bet Front Door.html` |

---

## Threads still open (next altitude up — likely their own exploration)

> **Nomenclature update (post-handoff):** alphaBeta is now one platform. **Plinth folds in
> as the strategy layer**; the **decisioning flow (this lifecycle) is the decision substrate**;
> the **seam** joins them. ("Decision substrate" broadened from the handoff's connective-layer
> sense to the whole decisioning machinery.) See `../CLAUDE.md`. First seam sketch:
> `../substrate/Plinth Seam.html`.

- **Input side** — where ideas come from; the strategy layer (Plinth) so "the work" translates
  into specific bets or sequences of bets. *(This is the seam into the decision substrate.)*
- **Planning side** — tracking, sequencing, roadmapping multiple bets. *(The in-scope core is
  a "journal index" — many bets and their states; sequencing/prioritization is Plinth Board's job.)*
- **Integration / knowledge management** — learnings accumulating across bets, becoming
  searchable, feeding the next intent.

The natural bridge surface for all three is a **journal index** (the decision journal,
pluralized) — still unambiguously ⍺lphaβeta, and the hub the other three plug into.

## Substrate altitude (in progress — `/substrate`)

The next-altitude exploration. Surfaces so far, each a working sketch:
- `Plinth Seam.html` — strategy layer ⇄ decision substrate: discernment + flow down + verdict up.
- `Journal Index.html` — the ledger (objectives → bets → outcomes) with Board / Log lenses;
  status is a **derived read-out** (chain of custody), not a control.
- `Dependent Bets.html` — linear conditional progression: a win unlocks the next, a loss
  prunes downstream (override-with-logged-flag).
- `Fan-in Bets.html` — multi-prerequisite joins (AND / OR) and the **orphaned-win** case.

**Deferred / logged for later:**
- **Join behavior** — default AND vs OR, whether it's set per-edge, precedence/weighting when
  prereqs disagree.
- **Cross-goal scoping** — how the index filters/scopes bets (and dependency chains) that
  commingle across objectives.
- **Calibration / track-record** — opt-in only; win-rate scoreboards create perverse
  incentives. Value delivered as outcome-as-gate, not outcome-as-grade.
