# Plan View — Design Handoff

**Status:** wireframe-fidelity interactive prototype, ready for build
**Layer:** 2 (Planning)
**Files:** `substrate/Plan View.html` (static), `substrate/Plan View Interactive.html` (interactive)

---

## What it is

A timeline projection of the team's bet portfolio — bars on a horizontal time axis showing
estimated runtimes, with **grouped sequences**, **surface contention detection**, and
**dependency constraints**. The plan is approximate by design: "given your traffic and this
order, here's roughly what the calendar looks like."

## Core concepts

### Grouped sequences vs. standalone bets
The timeline organizes bets into two kinds of rows:
- **Sequence groups:** a header row (terracotta band, `⛓ Sequence Name · A → B`) with
  indented child rows sharing a tinted background. The row order within a group IS the
  dependency — top to bottom = first to last in the chain. Branch markers (├/└) reinforce
  the hierarchy.
- **Standalone bets:** plain rows sitting between groups. No header, no tinting.

The grouping replaces SVG elbow connectors — the visual structure communicates the dependency
without needing to trace lines.

### Contention detection
When two bets share a **surface** (e.g. both test the pricing page) or **metric** and their
bars overlap temporally:
- **Amber hatching** appears on the overlapping region of both rows
- A **callout** below the timeline warns: "these share a surface — running simultaneously
  risks confounding"
- If they've been sequenced to *not* overlap, a green "Sequenced" callout appears instead

Contention is derived from bet metadata (surface + metric fields), not manually tagged.

### Dependency constraints
- A child bet in a sequence **cannot start before its parent ends** — attempting to drag it
  earlier snaps it back with a toast explaining the constraint
- When a parent bar is slid later, its dependents are **automatically pushed** to maintain
  the constraint
- Structural dependency = **hard constraint**; surface contention = **soft constraint**
  (visible, not blocked)

### Soft horizon
A dashed plinth-colored vertical line marking the approximate boundary: "everything before
this runs at current pace; everything after is queued." No hard period cutoff — the horizon
moves as bets resolve.

---

## Interactions

### Bar slide (horizontal)
- **What:** drag a locked or draft bet's bar left/right on the timeline to reschedule
- **Feedback:** contention zones update **live** during drag; callouts update on release
- **Constraints:** dependency snap-back (hard); contention warning (soft)
- **Fixed bars:** won and running bets cannot be slid — they're in flight

### Group/row reorder (vertical)
- **What:** drag a sequence header (⠿ handle) to move the **entire sequence** as a unit;
  drag a standalone row to reposition it
- **Feedback:** drop target highlights; toast confirms the reorder
- **Constraint:** rows within a sequence cannot be reordered — the dependency IS the order
- **Semantic:** this is the priority-stack interaction — what runs first is what you put first

### Reset
- Restores the original bet order and positions

---

## Data model

Each entry in the plan is either a **sequence group** or a **standalone bet**:

```
PlanEntry = SequenceGroup | StandaloneBet

SequenceGroup {
  type: 'seq'
  id: string              // e.g. 'email', 'checkout'
  name: string            // display name
  chain: string           // e.g. 'A → B → C'
  bets: PlanBet[]         // ordered by dependency
}

StandaloneBet {
  type: 'solo'
  bet: PlanBet
}

PlanBet {
  id: string
  name: string
  surface: string         // e.g. 'pricing page', 'email · login CTA'
  metric: string          // e.g. 'checkout-start', '7-day login'
  status: 'won' | 'running' | 'locked' | 'draft'
  start: number           // week offset (0-indexed)
  dur: number             // duration in weeks (from feasibility estimate)
  dep?: string            // bet id of structural prerequisite
  resolved?: boolean      // true if status is 'won' or 'lost'
}
```

### Contention detection algorithm
```
for each pair (a, b) where a.surface === b.surface OR a.metric === b.metric:
  overlapStart = max(a.start, b.start)
  overlapEnd = min(a.start + a.dur, b.start + b.dur)
  if overlapEnd > overlapStart → CONTENTION (amber zone + callout)
  else if same surface → SEQUENCED (green callout, no zone)
```

### Dependency constraint enforcement
```
on bar slide release:
  if bet.dep exists:
    parent = betById(bet.dep)
    if bet.start < parent.start + parent.dur → SNAP BACK to original position
  for each dependent where dependent.dep === bet.id:
    if dependent.start < bet.start + bet.dur → PUSH dependent forward
```

---

## Layout specifications

| Element | Value |
|---|---|
| Label column width | 190px |
| Week column width | 70px |
| Week count | dynamic (10 in prototype) |
| Row height | 48px (bet rows), 32px (group headers) |
| Bar height | 22px |
| Group header background | var(--terra-soft) with 2px solid terra-line top border |
| Group child background | 3% terra tint |
| Contention zone | 135° repeating stripe pattern, amber-line borders |
| Today line | 2px solid terra, label above |
| Horizon line | 2px dashed plinth, label above |
| Chain connector | 1.5px dashed terra-line between adjacent bars in a group |

---

## Connection to other surfaces

| Surface | Relationship |
|---|---|
| Bet Sequencing | Where sequences are defined (single vs chain/fan-in/parallel) |
| Journal Index | The ledger roll-up — same bets, different lens (by objective / by status) |
| Dependent Bets | The conditional progression mechanic (win unlocks, loss prunes) |
| Fan-in Bets | Multi-prerequisite AND/OR join |
| Commit & Lock | When a bet is locked, its position in the plan becomes part of the commitment |
| Revisit | When a bet resolves, the plan highlights what's newly unblocked |

---

## Build notes

- The prototype uses pointer events for bar sliding and HTML5 drag-and-drop for row reorder.
  Production should use a proper DnD library (dnd-kit or similar) for touch support and
  smooth animations.
- Week widths should be responsive in production (the prototype uses fixed 70px).
- The "start" field on bets should map to actual dates in production, not week offsets.
- Contention detection runs on every render — at <50 bets this is fine; at scale, consider
  indexing by surface/metric.
- The soft horizon position should be computed from team velocity / historical throughput,
  not hardcoded.
