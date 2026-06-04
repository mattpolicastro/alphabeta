import type { PlanBet, PlanEntry, Contention } from "./types";

export function allBets(entries: PlanEntry[]): PlanBet[] {
  const result: PlanBet[] = [];
  for (const entry of entries) {
    if (entry.type === "seq") {
      for (const bet of entry.bets) result.push(bet);
    } else {
      result.push(entry.bet);
    }
  }
  return result;
}

export function betById(entries: PlanEntry[], id: string): PlanBet | undefined {
  return allBets(entries).find((b) => b.id === id);
}

export function findContentions(entries: PlanEntry[]): Contention[] {
  const bets = allBets(entries);
  const results: Contention[] = [];
  for (let i = 0; i < bets.length; i++) {
    for (let j = i + 1; j < bets.length; j++) {
      const a = bets[i];
      const b = bets[j];
      if (a.surface === b.surface || a.metric === b.metric) {
        const start = Math.max(a.start, b.start);
        const end = Math.min(a.start + a.dur, b.start + b.dur);
        results.push({
          a,
          b,
          start,
          end,
          overlaps: end > start,
          surface: a.surface === b.surface ? a.surface : a.metric,
        });
      }
    }
  }
  return results;
}
