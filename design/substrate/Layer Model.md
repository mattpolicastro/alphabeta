# alph⍺βeta — Platform Layer Model

**Status:** working model · open for revision
**Date:** 2026-06-03 (revised)
**Context:** formalizing the layers that make up the alphaBeta platform. Revised to fold
revisit into layer 4 (method-specific resolution) rather than kludging it into refinement.

---

## Five layers + two transitions + one cross-cutting property

The platform has **five layers**, **two named transitions**, and an **integrity spine** that
instruments everything. Ordered by altitude — from strategic governance down to operational
learning — but the system is a loop: KM (#5) feeds back into Strategy (#1).

The key structural split: **layers 1–3 are pre-data** (commit before you can see),
**layer 4 is where the experiment lives and dies** (method-specific), and **layer 5 is
post-experiment** (method-agnostic learning). By the time you're in layer 5, the method
doesn't matter anymore.

```
┌─────────────────────────────────────────────────────────┐
│  1. STRATEGY                                            │
│     top-level governance · what's in scope this cycle   │
└────────────────────┬────────────────────────────────────┘
                     │ ← discernment (which work is a bet?)
┌────────────────────▼────────────────────────────────────┐
│  2. PLANNING                                            │
│     define, vet, sequence bets within a period          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  3. REFINEMENT                   ┌───── pre-data ─────┐ │
│     articulate → commit (lock)   │ all layers 1–3     │ │
└────────────────────┬─────────────┴────────────────────┘─┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  4. IN-FLIGHT → RESOLUTION       method-specific        │
│     monitoring + verdict + deviation logging             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  5. KNOWLEDGE MANAGEMENT         method-agnostic         │
│     learning, calibration, loop back to #1               │
└────────────────────┬────────────────────────────────────┘
                     │
                     └──────────── loop back to #1 ───────┘

  ║ INTEGRITY / CHAIN OF CUSTODY — cross-cutting ║
  ║ timestamps · fingerprints · deviation logs    ║
  ║ instruments layers 2–5; not a layer itself    ║
```

---

## Layer details

### 1. Strategy

**What it is:** top-level governance and planning on a large-period basis (semi-annual,
quarterly). Determines what's in scope for the current cycle: North Star, product drivers,
top problems, current goals, and "the work."

**Where it lives:** the strategy layer (formerly Plinth Board / plinthboard.app), folded
into alphaBeta. Supports multiple planning frameworks (NSF, RICE, GPS, OKR, GIST).

**What's built:** Full Flow screen 1 (NSF board with example content).

**Open:** deeper Plinth integration; framework-specific decomposition (how RICE vs NSF vs
GPS shape the goal→work→bet mapping differently).

---

### Transition: Discernment (strategy → planning)

**What it is:** the gate between strategy and planning. Not every item in "the work" becomes
a bet — only the empirical claims. The act of recognizing *which* work items are bets is
where the discipline layer first inserts itself.

**How it works:** an action embedded in the strategy view (not a separate screen). The tool
flags claims; you send them to the substrate. Tasks stay in the strategy layer. Bets cross.

**What carries across:** the goal's context — metric, target, parent objective — seeds the
bet so it doesn't start from a blank page.

**What's built:** the seam interaction (Full Flow screen 1, the Plinth Seam concept sketch).

---

### 2. Planning

**What it is:** defining, vetting, and sequencing bets within a given period. The key
questions: is this one bet or a sequence? What's the dependency structure? How do bets relate
across objectives?

**Key concepts:**
- **Single vs sequence** — the Bet Sequencing surface.
- **Dependencies** — win unlocks next; loss prunes downstream (conditional progression).
- **Fan-in** — multi-prerequisite bets with AND/OR join semantics; the orphaned-win case.
- **Cross-goal scoping** — soft filter, muted cross-references; dependencies never hidden.
- **The journal index** — the ledger (Ledger / Board / Log lenses); status derived from
  the bet's lifecycle position (chain of custody).

**What's built:** Bet Sequencing, Journal Index, Dependent Bets, Fan-in Bets, Cross-Goal
Scoping.

**Settled decisions:** AND default, OR opt-in, per-node, no weighting
(see `Join Behavior.md`).

**Open:** portfolio health lens; weighted/per-edge joins.

---

### 3. Refinement

**What it is:** the pre-registration arc — going from a vague statement to a locked,
timestamped commitment. **Everything in this layer happens before any data exists.** That's
the whole discipline: commit before you can see.

- **Bet Front Door** — dump → reflect (scans for falsifier; separates mechanism from
  confidence) → sharpen into the wager. Natural-language first; express lane for experts.
- **Feasibility & Instrument** — fold-if becomes the detection spec; live fit engine nudges
  you to the instrument that can resolve the bet.
- **Decision Criteria** — pre-register win / inconclusive / loss actions; fold-if = loss line
  + minimum mind-changer; evidence bar supplied by the instrument.
- **Commit & Lock** — draft (editable) or lock (timestamped, immutable, fingerprinted).

**What's built:** the 5-screen canonical lifecycle at project root (Bet Front Door →
Feasibility → Criteria → Commit → Revisit).

---

### 4. In-flight → Resolution

**What it is:** the experiment plays out and resolves. This is **the method-specific layer**
— it contains both monitoring (where applicable) and the verdict/judgment. Method-specific
patterns are containerized here so that everything before (layers 1–3, pre-data) and
everything after (layer 5, learning) is method-agnostic.

**Two phases within one layer:**

#### 4a. In-flight / monitoring (method-dependent)

What the instrument demands while the bet is live:

| Method | Monitoring discipline |
|---|---|
| A/B test | SRM checks, peek discipline, guardrail metrics |
| Holdback | holdback integrity, novelty-decay window, exposure cap |
| Quasi-experiment | pre-trend validation, placebo periods |
| Observational | spec-lock (no spec-hunting); *no "run" to monitor* |
| User research | *minimal/none — straight to synthesis* |

For some methods (observational, user research), this phase barely exists. That's fine —
layer 4 isn't "monitoring"; it's **"the experiment's life and death,"** which includes
however much monitoring the method demands, including none.

#### 4b. Resolution / revisit (the verdict)

The outcome lands. The criteria — not the outcome — determine the call:

- The **bucket** is computed from the locked fold-if (win / inconclusive / loss).
- The **pre-registered action** is recalled (from layer 3's commit).
- The **evidence bar** is read using the instrument's logic (method-specific).
- **Deviation logging** — if the actual call differs from the pre-registered action, the
  override is recorded in the user's own words, beside the timestamped commitment.
  Accountability through visibility, not a gate.

The verdict propagates back to layer 2 (planning): a win unlocks the conditional next step;
a loss prunes the downstream branch. This is where conditional progression fires.

**What's built:** Revisit (the 4b judgment surface); instrument-module concepts for 4a
(per-method running discipline, specified in the Decision × Method exploration). Standalone
4a monitoring surfaces are not yet built.

**Why monitoring was deferred:** the running discipline fragments by method — there's no
method-agnostic monitoring surface. Each instrument needs its own view. But layer 4 now has
a *conceptual home* for all of them, alongside the method-specific resolution logic.

---

### 5. Knowledge Management

**What it is:** integrating insights, takeaways, and lessons that feed back into the
strategy layer. This is what makes the platform a *learning system* rather than bureaucracy.
**Layer 5 is method-agnostic** — by the time you're here, the method doesn't matter.

**Two levels:**

- **Per-bet learning** — the "what would you bet differently?" reflection, the calibration
  read (expected +8%, got +2.5%, on a hunch → overestimated ~5 pts). Seeded by the judgment
  in layer 4; captured here.
- **Aggregate learning** — patterns across many bets over time: "our hunches overestimate by
  ~X on this category"; "this type of change rarely clears"; "we honored 85% of our
  pre-registrations." This is the calibration/track-record we explicitly deferred because
  **win-rate scoreboards create perverse incentives**. The "avoided bad release" value is
  delivered structurally through conditional progression (outcome-as-gate, not
  outcome-as-grade).

**The loop from #5 back to #1:** a single bet's learning becomes a strategic input through
aggregation and pattern recognition. That mechanism — how bet-level lessons become
cycle-level strategy — is the genuinely unbuilt piece.

**What's built:** per-bet learning capture at Revisit; the journal-as-memory. Aggregate
learning and the 5→1 loop mechanism are unbuilt.

---

## Integrity / Chain of Custody (cross-cutting)

Not a layer. A property of the substrate that instruments layers 2–5:

- **Timestamps** — when the pre-registration was locked; when the verdict happened.
- **Content fingerprint** — a hash proving what was committed before results existed.
- **Immutability** — locked fields can't be retroactively edited; changes create new versions.
- **Deviation logging** — overrides recorded in the user's own words beside the original.
- **Derived status** — a bet's status flows up from its lifecycle position; the journal reads,
  it never authors.

This is the spine of evidentiary integrity — useful in environments where colleagues
misrepresent study results in bad faith.

---

## Coverage vs gaps

| Layer | Built | Gap |
|---|---|---|
| 1. Strategy | Full Flow screen 1 (NSF board) | Plinth integration; framework decomp |
| → Discernment | The seam (Full Flow 1→2) | — |
| 2. Planning | Bet Sequencing, Journal Index, Deps, Fan-in, Cross-Goal | Portfolio health |
| 3. Refinement | Bet Front Door → Feasibility → Criteria → Commit | — |
| 4a. In-flight | Instrument concepts (per-method) | Standalone monitoring surfaces |
| 4b. Resolution | Revisit | — |
| 5. KM | Per-bet learning at Revisit | Aggregate learning; 5→1 loop |
| Cross-cutting | Timestamps, fingerprints, deviation logs, derived status | — |

---

## Adoption tiers (bottom-up ladder)

The layers have asymmetric dependencies — layer 4 requires 3 (judgment needs the
commitment); layer 5 is enriched by 1–2 but works without them. So adoption isn't "pick
your layers" — it's a **bottom-up ladder**: start with one person and one bet, grow outward.

| Tier | Layers | Who | What it delivers |
|---|---|---|---|
| 1. Individual discipline | **3 → 4** | one practitioner, one bet | pre-register and judge — the minimum viable discipline loop |
| 2. Learning practitioner | **3 → 4 → 5** | practitioner over time | + the decision journal; learning feeds the next bet |
| 3. Team planning | **2 → 3 → 4 → 5** | a team with multiple bets | + sequencing, conditional progression, portfolio view |
| 4. Organizational strategy | **1 → 2 → 3 → 4 → 5** | the org | + strategy governance, the full 5→1 loop |

**Key dependencies:**
- 3→4 is the minimum viable loop. Layer 4 without 3 is nearly empty (judgment needs
  commitment to judge against).
- Layers 1–2 without 3+ is Plinth (the strategy tool). The alphaBeta value doesn't start
  until someone commits a bet.
- The ladder aligns with the persona map: practitioner at tier 1, adjacent expert at tier 2,
  team at tier 3, organization at tier 4.
- It aligns with individual-first, serverless positioning: no accounts needed for tiers 1–2.

---

## Related documents

- `CLAUDE.md` — canonical nomenclature, architecture, aesthetic conventions.
- `Join Behavior.md` — settled join decision (AND/OR, per-node).
- `../explorations/ITERATION-LOG.md` — the full iteration trail with reasoning + feedback.
