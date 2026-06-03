import Dexie, { type EntityTable } from "dexie";
import type { Bet, Objective } from "./types";

export class AlphabetaDB extends Dexie {
  bets!: EntityTable<Bet, "id">;
  objectives!: EntityTable<Objective, "id">;

  constructor() {
    super("alphabeta");

    // v1: initial schema. Additive migrations only (per
    // `docs/handoff-2026-06-03.md` § 11 — schema.ts is additive).
    this.version(1).stores({
      bets: "id, objectiveId, status, lockedAt, previousVersionId, updatedAt",
      objectives: "id, framework, tag, updatedAt",
    });
  }
}
