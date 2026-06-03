// Pure resolver: given a Bet, what lifecycle stage is the user on?
// Feeds /bet?id=… (the stage redirect) and the journal home's "open" target.
// Feasibility & criteria are deferred to Sprint 2 — for MVP the lifecycle is
// front-door → commit-and-lock → revisit. Once those screens land, a draft
// with a populated instrument / criteria block should resolve there instead.

import type { Bet } from "@/lib/db/types";

export type LifecycleStage =
  | "front-door"
  | "feasibility"
  | "criteria"
  | "commit-and-lock"
  | "revisit";

export function currentStage(bet: Bet): LifecycleStage {
  switch (bet.status) {
    case "draft":
      return "front-door";
    case "locked":
    case "running":
    case "resolved":
      return "revisit";
  }
}
