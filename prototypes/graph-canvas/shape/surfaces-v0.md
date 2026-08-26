# Surfaces v0 — what the prototype needs (first pass, 2026-08-23)

Law from the pivot: **one projection per question, not one screen per stage.**
Three places, one panel, five moments, four documents. Nothing else.

## Places (persistent, navigable — the only "screens")

1. **The Canvas** — the map. Live-obligations projection; altitude cascade;
   fold toggle; focus/genealogy mode (click → one thread lights up).
   *Built; needs: fold toggle, focus mode, auto-layout.*
2. **The Ledger** — every bet as a table row: tag, status, surface tags,
   validity, age, overdue flag, record-quality grade. Filter by tag/status.
   *Not built. The NextAfter-style navigation practitioners expect.*
3. **The Docket** — the time shadow: what comes due. Maturation dates, review
   schedules, overdue revisits, gated bets + what unblocks them, open
   person-owned questions by age. *Not built. This is where the tool nags.*

Nav: wordmark bar — canvas · ledger · docket. Everything else opens in context.

## The Panel (contextual, one component, four faces)

4. **Dossier** — click any node. Faces by kind:
   - *Question:* record + expectation slot + owner + answer history
   - *Solution:* admission paperwork (problem, grounds w/ tiers, screens, rivals,
     arbitration rules)
   - *Bet, pre-launch:* the draft record (editable, pencil register)
   - *Bet, post-lock:* **the cockpit** — locked commitment (ink register,
     read-only, sealed), amendment timeline, guardrail list, resolve entry
   *Partially built (current record panel); cockpit + admission faces missing.*

## Moments (ceremonies — overlays with the facilitator present, never routes)

5. **Admission** — a solution arrives (typed or conversational): attach problem
   / mint implied problem, cite or generate grounding, dedupe screens, write
   arbitration if rivals. Output: `solution.admitted`.
6. **Lock** — the ceremony. Premortem prompt ("it failed — why?") harvests
   criteria + fold-if; confidence coached to a number; roles + maturation set;
   seal animation earns its one moment of theater. Output: `bet.locked`.
7. **Resolution** — actuals entered as vector (per-metric + confidence);
   bucket COMPUTED from locked fold-if; call recorded; deviation demanded iff
   call ≠ bucket-action; provisional flag if maturation pending.
   Output: `bet.resolved`.
8. **Answer** — on a question: expectation shown (or demanded first), answer +
   takeaway + validity + valence per affected node; fold fires per valence.
   Output: `question.expected` / `question.answered`.
9. **Amendment** — mid-flight change, ASRS-postured ("updating beats hiding"),
   one field + reason. Output: `bet.amended`.

## Documents (read-only projections, one node or one view deep)

10. **The Diff** — as-planned vs as-reported, two columns; per-bet; the export/
    share artifact.
11. **Calibration mirror** — private: expected-vs-actual scatter, Brier trend,
    per-category bias, shrinkage-aware.
12. **The Graveyard** — detonated problems, mooted questions, bets never run,
    priced in avoided cost.
13. **History** — the event-log scrubber: board state at any past moment;
    rollback = replay (earned by the live rollback request on day one).

## Trays (ambient, collapsible)

14. **Open Field** — *built* (dock + spawnable nodes + facilitator switch).
15. **Intake / residue** — unschematized dumps, amnesty queue, residue age as
    health signal. *Not built.*

## Build order

- **A (makes the prototype whole):** dossier faces (cockpit + admission),
  moments 6–8 (lock/resolve/answer), ledger.
- **B:** docket, diff, history scrubber, fold toggle + focus mode.
- **C:** calibration, graveyard, intake tray, amendment moment, auto-layout.
