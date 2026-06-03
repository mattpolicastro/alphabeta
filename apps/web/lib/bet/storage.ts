// The in-flight "ab_bet" payload that carries between lifecycle screens. See
// `docs/handoff-2026-06-03.md` § "Carry pattern". This is localStorage state,
// not the locked record — Dexie/IndexedDB owns the locked snapshot.

import type { Confidence, Direction } from "@/lib/db/types";

export const AB_BET_KEY = "ab_bet";

export type AbBet = {
  change?: string;
  direction?: Direction;
  metric?: string;
  magnitude?: string;
  mechanism?: string;
  confidence?: Confidence;
  foldIf?: string;
};

export function readAbBet(): AbBet {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(AB_BET_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as AbBet;
    return {};
  } catch {
    return {};
  }
}

export function writeAbBet(bet: AbBet): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AB_BET_KEY, JSON.stringify(bet));
  } catch {
    // localStorage may be unavailable (private browsing). Carry-pattern is
    // best-effort; the locked snapshot is what's load-bearing.
  }
}
