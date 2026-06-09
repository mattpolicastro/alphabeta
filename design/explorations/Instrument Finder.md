# Instrument Finder  ·  Exploration 4 of 5

**File:** `Instrument Finder.html`
**Status:** **superseded** → [`../Feasibility and Instrument.html`](../Feasibility%20and%20Instrument.html)
**← Prev:** [Decision × Method](Decision-Method.html) · [companion](Decision-Method.md)
**→ Next:** [Bet Articulation](Bet%20Articulation.html) · [companion](Bet%20Articulation.md)

## Motivating question
If method is secondary to the decision, it shouldn't *lead*. What if the user arrives with a
default instrument and the feasibility panel argues them off it as inputs come in?

## What it explored
**Method settles at feasibility, not before.** You arrive planning an A/B test; a live fit
engine scores every instrument against your constraints (can you randomize? traffic, urgency,
how defensible the claim must be) and nudges you toward the one that fits. It opens
mid-argument: "already shipped" rules out A/B and points you to a holdback.

The discipline move is **nudge, not gate**: overriding the recommendation is allowed, but it
opens a *reason* field and is logged beside the record — accountability through visibility,
the same principle the handoff insists on (compliance gates get routed around).

## Key bets
- Choosing the instrument is a discipline intervention, not a neutral dropdown — the most
  valuable thing the tool can say is *"you don't need an experiment for this."*
- The override-with-reason pattern (kept, and reused later in Revisit).

## What carried forward
The fit engine, the nudge, and the override pattern all survive into
`../Feasibility and Instrument.html` — which adds the crucial bridge (the bet's **fold-if
becomes the detection spec**) and the carried-bet context the standalone version lacked.

## Feedback that motivated the next step
> *"I like the override field. What's on screen is early in the process of articulating an
> idea/bet — this feels important to nail, whereas live/monitoring feels relatively solved."*

→ pushed the work *upstream* to the bet itself: Bet Articulation.
