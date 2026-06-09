# Architecture Reconciliation — Design Sessions × Rewrite Doc

**Status:** working reference
**Date:** 2026-06-08
**Context:** Aligning the wireframe journey-mapping (this project) with the rewrite
architecture doc from the Claude.ai voice session.

---

## Lens Distinction

Two valid orderings of the same five concepts:

| Design sessions (layers) | Rewrite doc (tiers) | Why the difference |
|---|---|---|
| 1. Strategy | 3. Strategy Integration | Layers = *conceptual flow* (when it happens in a bet's life) |
| 2. Planning | 2. Decomposition | Tiers = *shipping sequence* (what ships first) |
| 3. Refinement | 1. Bet Discipline (MVP) | Both are useful. Layers for the mental model; tiers for the roadmap. |
| 4. In-flight → Resolution | 4. Execution, Monitoring & Conflict | |
| 5. Knowledge Management | 5. Knowledge Management & Governance | |

**Keep both.** The layer model explains the product to users ("here's how a bet flows").
The tier model explains the roadmap to the team ("here's what we ship when").

---

## What aligns directly

| Concept | Design session artifact | Rewrite doc section |
|---|---|---|
| Bet structure (if/then/because + fold-if + win/lose/incon) | Bet Front Door, wager sentence | "Core Concept: The Bet" |
| Open front door with parsing | `substrate/Open Front Door.html` | Tier 1 regex→LLM parser |
| Decomposition (single bet vs sequence) | `substrate/Bet Sequencing.html` | Tier 2 |
| Strategy → bet pipeline | `substrate/Full Flow.html` (screen 1) | Tier 3 |
| Method-specific monitoring | In-flight views (A/B, Interview) | Tier 4 |
| Dependent bets / DAGs | `substrate/Dependent Bets.html`, `Fan-in Bets.html` | Tier 2 dependency graphs |
| Cross-goal scoping | `substrate/Cross-Goal Scoping.html` | Tier 4 conflict detection |
| Plan view / timeline | `substrate/Plan View Interactive.html` | Tier 4 Gantt view |
| Deviation logging / audit trail | `Revisit.html` | Tier 5 audit trail |
| Practitioner persona | "Merritt" in rewrite doc | |
| Adjacent-expert persona | "Jenny" in rewrite doc | |

---

## What's new in the rewrite doc (not yet in design sessions)

### 1. Lock timing shift: "ready" → "locked"

**Before (design sessions):** Lock happens at the end of the refinement flow (Commit & Lock
screen). The commit IS the lock.

**After (rewrite doc):** Lock is deferred to experiment launch. A new state — **"ready"** —
sits between "structured" and "locked." You can refine over multiple sessions; lock fires
when the experiment actually goes live.

**Implications:**
- The Commit & Lock screen needs redesign: split into "Mark ready" (reviewable, still
  editable) and "Lock" (at launch, immutable + fingerprinted).
- The journal index gains a new status: draft → **ready** → locked → running → resolved.
- "Ready" is the state where peer review / team sign-off could happen (Tier 3+).
- The lock carries more weight because it coincides with the real point of no return.

### 2. MCP-first for power users

Merritt's pushback: "Are you really going to do all this work every time?" The answer isn't
simplifying the UI — it's offering MCP tools as an alternative surface. Power users author
structured bets programmatically; the UI is one frontend among several.

**Implications for design:**
- The UI wizard remains the primary path for Jenny (scaffolded).
- Merritt may never use the wizard after the first few times.
- The bet structure (the data model) becomes the contract, not the UI flow.
- The design system card in `Design System.html` should document the bet data model as a
  first-class artifact, not just the UI components.

### 3. Inconclusive result loop

When a bet lands inconclusive, spawn follow-on hypotheses back into the pipeline — human or
agent-assisted. This turns an inconclusive from a dead end into a branching point.

**Implications:**
- Revisit gains a fourth path: win (ship) / inconclusive (**spawn follow-on**) / loss (drop).
- The follow-on enters as a new bet in Tier 1, carrying context from the parent bet.
- Creates a bet lineage: parent → inconclusive → child bet(s).
- The journal should show this lineage (bet trees, not just flat lists or chains).

### 4. Regex as floor, LLM as enhancement

The open front door we designed assumed LLM parsing. The rewrite doc makes regex the floor
with LLM optional (BYO credentials or local model).

**Implications:**
- The front door needs a graceful degradation path: regex extracts what it can, structured
  form fills the gaps, LLM (when available) does the rich parsing.
- The "altitude" routing (single bet / needs decomposition / strategy-level) may need to be
  human-assisted without LLM, rather than auto-classified.

---

## Positioning clarification

**Design sessions:** "Discipline layer for empirical work. Evidentiary integrity protects
against bad-faith colleagues."

**Rewrite doc:** "Not a compliance tool for forcing governance on bad actors. Built for
practitioners who care."

**Reconciled:** Both are true and non-contradictory. The product is **built for practitioners
who want to do good work.** The immutability and audit trail are features that serve them —
they happen to *also* protect against bad-faith actors, but that's a consequence of the
discipline, not its purpose. The practitioner's value prop is "sharpen my thinking and hold
me to it." The organizational value prop is "the audit trail exists whether you wanted it or
not."

Framing: **"Built for the person who cares. Happens to protect them when a colleague
doesn't."**

---

## What's still genuinely deferred

- Calibration / track-record (later opt-in — perverse incentives)
- Weighted / per-edge join semantics
- Knowledge graph granularity (per-bet? per-metric? per-audience?)
- Individual vs. org mode split (how early to design for?)
- Agent-assisted "what next?" loop mechanics (prompt template? MCP tool?)
- Running-phase method-specific monitoring surfaces (conceptualized, not built)
