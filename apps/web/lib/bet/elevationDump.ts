// One-shot localStorage handoff for "card → bet" elevation. CardShell
// builds the labeled dump at elevation time, stashes it under the new
// bet's id, then navigates. /bet/wager's WagerDumpPanel takes the stash
// on mount (read + delete) and pre-fills its textarea. The user sees the
// source text, can edit it, runs Analyze, decides what to fill.
//
// We use localStorage (not Dexie) because the handoff is purely in-flight
// UI state — losing it on a tab crash is acceptable, and the synchronous
// API keeps the textarea init simple. The key is scoped to the bet id so
// concurrent elevations on different cards don't collide.

const PREFIX = "ab_elevation_dump:";

export function stashElevationDump(betId: string, text: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + betId, text);
  } catch {
    // Quota or disabled storage — silently drop. The bet still navigates,
    // the user just lands on an empty wager page.
  }
}

export function takeElevationDump(betId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(PREFIX + betId);
    if (v !== null) window.localStorage.removeItem(PREFIX + betId);
    return v;
  } catch {
    return null;
  }
}
