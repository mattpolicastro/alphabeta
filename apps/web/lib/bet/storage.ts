// The in-flight "ab_bet" payload that carries between lifecycle screens. See
// `docs/handoff-2026-06-03.md` § "Carry pattern". This is localStorage state,
// not the locked record — Dexie/IndexedDB owns the locked snapshot.

import type { Confidence, Direction } from "@/lib/db/types";

export const AB_BET_KEY = "ab_bet";
export const AB_COMMITTED_KEY = "ab_committed";

export type AbBet = {
  change?: string;
  direction?: Direction;
  metric?: string;
  magnitude?: string;
  mechanism?: string;
  confidence?: Confidence;
  foldIf?: string;
};

/** Pointer to the most recently locked bet — the bridge from Commit & Lock to Revisit. */
export type AbCommitted = {
  betId: string;
  lockedAt: string;
  fingerprint: string;
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

export function readAbCommitted(): AbCommitted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AB_COMMITTED_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "betId" in parsed &&
      "lockedAt" in parsed &&
      "fingerprint" in parsed
    ) {
      return parsed as AbCommitted;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeAbCommitted(c: AbCommitted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AB_COMMITTED_KEY, JSON.stringify(c));
  } catch {
    // best-effort
  }
}
