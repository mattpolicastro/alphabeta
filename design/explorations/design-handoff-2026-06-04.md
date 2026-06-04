# Design exploration brief — 2026-06-04

Three features need wireframe-fidelity exploration before they can be built. Each section
below gives you the context, constraints, and open questions. Read `design/CLAUDE.md` for
aesthetic rules and the paper/narrator split. Read `design/substrate/Layer Model.md` for the
five-layer architecture these features plug into.

---

## 1. Onboarding flow

**What it is:** the first-run experience for a new user arriving at alphaBeta with no data
in IndexedDB.

**Context:** alphaBeta is a local-first, serverless app. There's no account creation in
tier-1 — just a browser with an empty database. The product asks people to do something
uncomfortable (pre-register commitments before seeing data), so the first few minutes need
to establish *why this exists* and *what the loop is* without feeling like a compliance
tutorial.

**Constraints:**
- Must work as a static export (no server, no auth in tier-1)
- Should lead the user into creating their first bet, not just reading about the product
- The five-layer loop (strategy → planning → refinement → in-flight → KM) is the mental
  model to plant, but don't dump all five at once
- The fold-if concept is the hardest sell — "name a number that would make you stop" — and
  needs early framing
- Must not feel like enterprise compliance software

**Open questions:**
- Modal wizard vs. dedicated `/onboard` route vs. inline progressive disclosure on the
  main page?
- How much of the strategy layer (Layer 1) do we expose upfront vs. letting people start
  directly at "create a bet" (Layer 3)?
- Should onboarding plant a sample bet (pre-filled example) the user can explore, or is
  blank-slate + guided creation better?
- Where do discipline prompts ("why are you running this?", "what would change your mind?")
  first appear — during onboarding or when they hit the relevant step naturally?

**Deliverable:** one wireframe-fidelity HTML file showing the flow, with narrator commentary
explaining the pedagogical reasoning behind each step.

---

## 2. Plan view — interactive roadmaps / sequencing

**What it is:** the Layer 2 (Planning) surface for organizing multiple bets within a time
period. Distinct from the existing bet-sequencing model (explicit dependency chains between
bets); this is about *scheduling and prioritization* when multiple independent experiments
compete for the same surface or audience.

**Context:** the substrate already has `Bet Sequencing.html`, `Dependent Bets.html`, and
`Fan-in Bets.html` for structural dependency. What's missing is the *temporal* view: "we
have three A/B tests that all want the checkout page this quarter — which runs first, and
how do we document that decision?" This is a planning affordance, not a dependency graph.

**Constraints:**
- Must respect the immutability principle — once a bet is locked, its slot in the sequence
  is part of the commitment record
- Should make contention visible ("these two bets share an audience segment / page surface")
  without requiring the user to manually tag every constraint
- The plan is a *document of intent* — it's evidence of discipline, not a Gantt chart
- Needs to show how bet outcomes gate what runs next (win → unlock test B; loss → pull
  test C forward)

**Open questions:**
- Timeline (horizontal swimlanes by surface/audience) vs. ranked backlog (vertical priority
  stack) vs. something else?
- How does the plan view relate to the strategy layer's "the work" list? Is it a filtered
  view of the same data, or its own artifact?
- When a bet resolves, does the plan auto-reflow, or does the user explicitly re-sequence?
  (Auto-reflow may violate the "visibility, not compliance" positioning.)
- Should the plan view be per-goal, per-quarter, or flat?

**Deliverable:** one wireframe-fidelity HTML file showing the plan surface with 3-4 example
bets competing for two surfaces. Include both the "planning" state (pre-lock) and the
"mid-execution" state (one bet resolved, rest waiting). Narrator commentary on the
temporal-vs-structural distinction.

---

## 3. Knowledge management / Learn stage (Layer 5)

**What it is:** the post-experiment layer where individual bet outcomes become organizational
learning. Method-agnostic — by the time you're here, whether it was an A/B test or an
interview study doesn't matter. The question is: what did we learn, and how does it change
what we believe?

**Context:** Layer 5 closes the loop back to Layer 1 (strategy). The handoff mentions
calibration and win-rate scoreboards as later opt-ins, but the core value is *searchable
institutional memory*: "we tested X in Q2 2025 and here's what happened."

**Constraints:**
- Must be useful with just 3-5 completed bets (not only at scale)
- Local-first / IndexedDB — any search or graph must work client-side
- "Semantic search" and "knowledge graph" are exploratory — the question is whether they
  add real value at the scale of a single team's bet history, or whether simple keyword
  search + tagging is enough for tier-1
- Calibration/scoreboards are explicitly deferred — don't design them yet, but leave room

**Open questions:**
- What's the minimum useful knowledge artifact? A bet's revisit (Layer 4) already captures
  outcome + deviation log. Does Layer 5 add anything, or is it just an index/search over
  revisit records?
- Knowledge graph: nodes are bets, but what are edges? (same-metric, same-audience,
  same-goal, contradicts-finding-of?) Is this useful enough to justify the complexity?
- Semantic search: client-side vector embeddings (transformers.js) vs. keyword search vs.
  simple tagging? At 50 bets, vector search is overkill; at 500, keyword search fails.
  Where's the crossover, and which tier does it belong in?
- How does learning flow back to strategy? A nudge ("you tested this audience segment
  twice with conflicting results")? A read-only annotation on the strategy board?

**Deliverable:** two wireframes — (a) the learn/KM index page showing 5-6 completed bets
with whatever organization structure you propose, and (b) a single bet's "knowledge card"
showing what gets surfaced. Narrator commentary on the minimum-viable-KM question and where
semantic search / graph would slot in if pursued.

---

## General notes

- All wireframes should follow the existing aesthetic (see `design/CLAUDE.md` and
  `Design System.html`): warm paper, JetBrains Mono, dashed borders, terracotta accents,
  28px grid
- Use the narrator/dark-ground convention for design commentary
- These don't need to be pixel-perfect — wireframe fidelity, same as the existing screens
- Reference existing screens where the new surface connects (e.g., onboarding leads into
  Bet Front Door; plan view connects to Commit and Lock; KM connects to Revisit)
