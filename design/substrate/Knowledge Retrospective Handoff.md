# Knowledge Retrospective — Handoff to Claude Code

**Date:** 2026-06-09
**Source:** `substrate/Knowledge Retrospective.html` (interactive wireframe)
**Layer:** 5 — Knowledge Management
**Entry point:** After a cycle (quarterly/semi-annual retrospective)
**Visibility:** Individual-only (your bets, your patterns)

---

## What this is

A retrospective view that answers: **"Which of my 'because' clauses actually predicted
outcomes?"** Every resolved bet has a mechanism field (the "because" in the if/then/because
structure). This surface aggregates those mechanisms across a cycle and surfaces patterns.

It is NOT a scoreboard. It does not grade practitioners. It surfaces **which theories held up
and which didn't**, so the next cycle's strategy is informed by evidence rather than memory.

---

## Three modes over one dataset

All three modes read the same resolved-bet data. The user switches between them depending on
what question they're asking.

### Mode 1: Mechanism Clusters (default)

**Question:** "Which types of theories work?"

- Group resolved bets by mechanism category (layout, copy, visual, friction, etc.)
- Each cluster shows: win/loss/inconclusive count + colored proportion bar
- Expandable: click to see individual bets with expected vs. actual
- Per-cluster **insight** text (auto-generated or templated):
  - High win rate → "Your strongest 'because' category"
  - High loss rate → "Worth interrogating — are you over-indexing?"
  - Mixed → "Works somewhere but not everywhere; check which surfaces"

### Mode 2: Surface × Mechanism Matrix

**Question:** "What works *where*?"

- Rows = surfaces/features (pricing page, email, onboarding, etc.)
- Columns = mechanism categories
- Cells = colored dot pips per bet outcome (green=won, terra=lost, amber=inconclusive)
- Empty cells = **explicit blind spots** ("no bets tested copy on pricing")
- The blind-spot detection is genuinely valuable — it shows what you *haven't* tested

### Mode 3: Theory Evolution

**Question:** "How has my understanding of this surface deepened?"

- Grouped by surface
- Vertical timeline (chronological) of bets touching that surface
- Each node shows: the bet question, the "because" mechanism, expected vs. actual, outcome,
  and the per-bet learning captured at Revisit
- The narrative reads as a story: "I thought X → failed. Pivoted to Y → won. Then refined
  to Z → won bigger."
- This is the mode that makes the **5→1 loop concrete** — the learning IS the strategy input

### Cycle Summary

Each mode generates a **summary block** synthesizing the patterns:
- Clusters → which mechanism categories are reliable vs. suspect
- Matrix → which surface×mechanism combos work, plus blind spots
- Evolution → how understanding deepened per surface, and what to bet on next

---

## Data model requirements

Each resolved bet must have:

```
{
  id: string,
  question: string,           // the bet question
  surface: string,            // which page/flow/feature
  mechanism: string,          // category key (layout, copy, visual, friction, etc.)
  mechanismText: string,      // the actual "because" clause from the bet
  expected: string,           // expected magnitude ("+8%")
  actual: string,             // actual result ("+2.5%")
  outcome: 'won'|'lost'|'inconclusive',
  learning: string,           // captured at Revisit
  resolvedAt: timestamp,      // for cycle filtering and chronological ordering
  objective: string           // for potential future cross-goal patterns
}
```

### Mechanism categories

These should be **derived from the mechanism text**, not a forced dropdown at bet-creation
time. Options for implementation:

1. **Regex/keyword matching** (floor) — scan for "layout", "copy", "friction", "visual",
   "audience" etc. in the mechanism text
2. **LLM classification** (enhancement) — classify the free-text mechanism into categories
3. **User-confirmed** — show the auto-classification and let the user correct it

The category taxonomy should be **emergent, not pre-set** — start with a handful and let
new categories surface from the data. A "misc/uncategorized" bucket catches what doesn't
fit yet.

---

## Key interactions

- **Mode switching** — segmented control, instant switch, summary updates
- **Cluster expand/collapse** — click cluster header to show/hide individual bets
- **Cycle filtering** — select which period to review (Q4 2025, H1 2026, etc.)
- **Future: drill into a bet** — click a bet row to open its full record (Revisit view)
- **Future: "carry forward"** — mark a learning as a strategy input for next cycle

---

## Design system placement

Uses the **Retrospective template** from Page Templates:
- `<PageShell>` with standard nav
- Period selector at top (cycle filter)
- Mode switcher (segmented control)
- Content area changes per mode
- Summary block (discipline annotation style — terracotta sidecar)

---

## Relationship to other layers

- **Layer 3 (Refinement)** supplies the mechanism text via the "because" field in the bet
  front door + the learning text from Revisit
- **Layer 4 (Resolution)** supplies the outcome and actual result
- **Layer 5 → Layer 1 loop** — the summary insights feed back into strategy. The mechanism
  is unbuilt but the data path is: winning mechanism categories → prioritize bets that use
  them; failing categories → interrogate or retire; blind spots → fill gaps next cycle

---

## What's NOT in scope yet

- Team-visible / shared knowledge base (individual-only for now)
- Calibration scoreboard (deferred indefinitely — perverse incentives)
- Aggregate win-rate metrics (same concern)
- Cross-goal pattern detection (needs cross-goal scoping resolution first)
- The "carry forward" action that formally links a learning to next cycle's strategy
- LLM-generated insight text (templated is fine for v1)

---

## Sample data

The wireframe includes 8 sample bets across 3 surfaces and 4 mechanism categories.
See `substrate/Knowledge Retrospective.html` for the full dataset and rendering logic.
The bet data structure in the wireframe's `<script>` section is the source of truth for
the sample content.
