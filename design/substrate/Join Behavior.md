# Join Behavior — Settled Decision

**Status:** decided · v1 scope
**Date:** 2026-06-02
**Context:** multi-prerequisite bets (fan-in); how the join determines "satisfied."

## Decision

| Question | Answer |
|---|---|
| Default join | **AND** — all prerequisites must win for the downstream to unlock |
| Opt-in alternative | **OR** — either prerequisite winning suffices; prunes only if all lose |
| Where it's set | **Per downstream node** — the bet receiving multiple prereqs declares its join type |
| Per-edge semantics | **Deferred to v2** — mixed AND/OR on individual edges is rare; restructure the bets instead |
| Weighting / precedence | **Deferred entirely** — weighted joins are complex and usually signal the bets should be restructured, not ranked |

## Rationale

- **AND is conservative** — it prunes more aggressively, which aligns with the product's
  value proposition (avoid bad releases / wasted experiments built on unproven premises).
- **OR is the exception**, used for genuine "alternative paths" (either approach to solving
  this works; only one needs to clear).
- **Per-node, not per-edge** keeps the model simple and inspectable: a bet either requires
  all its inputs or any of them. Per-edge semantics ("this particular prereq is required but
  that one is optional") is a mixed join that adds complexity without proportional value.
- **No weighting** because under AND, any loss prunes (no ambiguity); under OR, any win
  unlocks (no ambiguity). "Precedence when prereqs disagree" only matters for weighted
  joins, which belong in a later version if real demand surfaces.

## Where it's demonstrated

- `Fan-in Bets.html` — the interactive AND/OR toggle + orphaned-win case.
- `Bet Detail.html` — the dependency-shape picker (chain / fan-in / parallel).
- `Dependent Bets.html` — the linear chain (single-prereq, AND is implicit).

## Open for later

- Per-edge join types (mixed AND/OR within a single fan-in).
- Weighted / prioritized prerequisites.
- How join type interacts with cross-goal scoping (see `Cross-Goal Scoping.html`).
