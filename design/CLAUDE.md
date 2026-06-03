# alphaBeta — project nomenclature & architecture

**alphaBeta is a single platform**, not several separate products. When naming things, use
this model:

## Layers
- **Strategy layer** — *formerly "Plinth Board" (plinthboard.app)*, being rolled into
  alphaBeta as its strategy layer. Holds goals, planning frameworks (RICE / NSF / GPS / OKR /
  GIST), and "the work." Refer to it as the **strategy layer**, not a separate external
  product.
- **Decision substrate** — the **decisioning flow**: the single-bet lifecycle
  (bet → feasibility & instrument → decision criteria → commit & lock → revisit), the
  journal/ledger of many bets, and the revisit loop. This is the discipline layer for
  empirical work. *(Note: the original handoff used "decision substrate" narrowly for the
  connective layer between strategy and evidence; we have broadened it to mean the whole
  decisioning machinery — substrate as the thing decisions are made on.)*
- **The seam** — strategy layer ⇄ decision substrate. Three jobs: **discernment** (which
  "work" items are bets vs. tasks), **flow down** (goal context seeds the bet's expectation /
  fold-if), **flow up** (the bet's verdict gates the work sequence — win unlocks, loss
  withholds). The seam is an **action embedded in the strategy view** (elevate a work item to
  a bet / sequence), *not* a standalone screen. The **journal index / ledger** is the derived
  roll-up of all bets — status flows *up* from each bet's lifecycle (chain of custody); the
  ledger reads, it never authors.

## Settled positioning (do not relitigate)
Discipline layer, not a stats authority · "can" vs "should" · accountability through
**visibility, not compliance gates** · evidentiary integrity (timestamped, immutable
pre-registration; commitment-vs-outcome revisit) · serverless / IndexedDB · individual-first.
Calibration / win-rate scoreboards are a **later opt-in** (they create perverse incentives);
the "avoided bad release" value is delivered as *outcome-as-gate, not outcome-as-grade*.

## Aesthetic
Deliberately low-fi wireframe / blueprint register. JetBrains Mono; warm paper `#f5f1e8`,
ink `#2a2a2a`, terracotta accent `#a64d3b`; dashed borders, no rounded chrome; discipline
annotations in a terracotta sidecar; Caveat for margin notes. Polish at this stage misleads.

**Meta-commentary vs. product UI (important):** the product wireframe lives on the warm paper
register (dashed boxes, blueprint grid). All *walkthrough narration / journey-mapping
commentary* (storyboard captions, "why" notes) must be visually **opposite** — a **dark ink
ground with paper-colored text and a labelled accent pill** — so "this is the app" vs. "this
is commentary about the app" is unmistakable. Never narrate in the same paper/dashed register
used for actual UI.

The split: a **genuine in-product discipline prompt** (something the user would see, and could
toggle on/off or meet during onboarding) stays on-canvas in the paper register. *Claude's
journey-mapping commentary* (explaining the design) goes dark-narrator. Test: would the user
toggle this, or is it me explaining? Promote something to on-canvas only once it's a decided
product element.

## File organization
- **Project root** — the canonical decision-substrate lifecycle (Bet Front Door, Feasibility
  and Instrument, Decision Criteria, Commit and Lock, Revisit) + `alphaBeta - Index.html` hub
  + `tweaks-panel.jsx`.
- **`/explorations`** — superseded explorations, each with a companion `.md`, narrated in
  `ITERATION-LOG.md`.
- **`/substrate`** — the next-altitude exploration (the seam, and the journal index to come).
- Convention: distinct surfaces = separate files (one linked prototype); refinements edit in
  place; a superseded exploration moves to an archive folder with its companion doc (not a
  silent `vN`).
