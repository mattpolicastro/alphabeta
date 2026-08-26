# Grammar v0.3 addendum — invariants, the instrument ladder, lineage (2026-08-25)

## Structural invariants (settled in live use)
- **Every bet has exactly one parent solution.** A bet is one *swing* at a solution.
  Solution ↔ bets is one-to-many; swings vary by variant or by instrument, and the
  solution's dossier accumulates the swing history (escalation-of-commitment
  becomes visible because swings stack under one node).
- **Questions never elevate.** They inform (grounding), screen (vet a premise), or
  gate (a bet may depend on a question; the gate opens when it is answered).
- **Idea-first arrivals hold the invariant by construction**: admission mints the
  implied solution — and problem above it if absent — before the bet exists.
- **Problems are inclusive** (PSM/GPS "love your problems"): a problem is a
  challenge *or* an area of opportunity to discover, explore, and master. No
  `opportunity` kind; the facilitator phrases upside in its own terms.

## The instrument ladder — `instrument.type`, by causal strength
| rung | type | ceremony | validity ceiling |
|---|---|---|---|
| 5 | `ab` — randomized | fold-if required | valid (causal) |
| 4 | `quasi` / `holdback` — unit-level assignment | fold-if required | valid, caveated |
| 3 | `study` — interviews, usability, survey | evidence bar instead of threshold | qualitative |
| 2 | `prepost` — observational before/after | **expectation** required; no fold-if | anecdotal |
| 1 | `none` — ship-and-watch (the just-do-it) | expectation required; ledger row | anecdotal |

The lock ceremony reads the rung: it demands a fold-if wherever a counterfactual
exists, and an expectation where none does. Nobody ships without writing down
what they think will happen; nobody pretends a bug fix is an experiment. Every
rung's evidence enters the provenance tiers at its ceiling — a JDI's before/after
can ground a later solution as anecdotal-tier, never as pattern-grade.

## Feasibility, reclassified
Portfolio/program readiness ("can this org run bets, with which instruments, at
what resolution") is an **instrument-capability context object**, the twin of the
facilitator's LLM capability negotiation. Consulted by the lock (magnitude sizing,
fold-if visibility), admission (can this resolve at all), and the docket (runtime
estimates). Correctly absent from the graph; not a screen.

## Lineage
Clearhead's Problem Solution Mapping (PSM) → Goals · Problems · Solutions (GPS;
Wishnow) → Plinth Board's GPS template → this graph's problem layer. The
discipline spine (fold-if, lock, revisit) is the addition; the P→S structure and
its inclusive definition of "problem" are inherited.
