// The in-flight bet shape — a partial Articulation used by UI components
// (Bet Front Door, Commit & Lock, journal cards). Persistence is now
// Dexie-backed via `lib/bet/queries.ts`; this file is just the shape.
//
// (Earlier this module also exposed `readAbBet` / `writeAbBet` /
// `readAbCommitted` / `writeAbCommitted` localStorage helpers — retired in
// the routing refactor when drafts moved to Dexie. The AbBet type stays as
// the lightweight component-facing view of an Articulation.)

import type { Confidence, Direction } from "@/lib/db/types";

export type AbBet = {
  change?: string;
  direction?: Direction;
  metric?: string;
  magnitude?: string;
  mechanism?: string;
  confidence?: Confidence;
  foldIf?: string;
};
