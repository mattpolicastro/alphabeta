// Pure filter + group helpers for the journal/home page. The journal
// reads bets via listBets() and then projects them through these helpers
// for the filter-chip and view-lens UI. Kept pure so they're trivially
// testable and reusable from any view (Log / Board / Ledger).

import type { Bet, BetStatus } from "@/lib/db/types";

export const ALL_STATUSES: BetStatus[] = [
  "draft",
  "ready",
  "locked",
  "running",
  "resolved",
];

export type StatusGroups = Record<BetStatus, Bet[]>;

/**
 * Filters `bets` to only those whose status appears in `allowed`. An
 * empty `allowed` list or one matching the full set returns the input
 * unchanged — keeps the call site simple (no filter chip selected =
 * show everything).
 */
export function filterBetsByStatus(
  bets: Bet[],
  allowed: BetStatus[],
): Bet[] {
  if (allowed.length === 0 || allowed.length === ALL_STATUSES.length) {
    return bets;
  }
  const set = new Set(allowed);
  return bets.filter((b) => set.has(b.status));
}

/** Buckets `bets` by status. Insertion order is preserved within each bucket. */
export function groupBetsByStatus(bets: Bet[]): StatusGroups {
  const groups: StatusGroups = {
    draft: [],
    ready: [],
    locked: [],
    running: [],
    resolved: [],
  };
  for (const b of bets) {
    groups[b.status].push(b);
  }
  return groups;
}
