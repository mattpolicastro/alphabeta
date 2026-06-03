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

    // v2: add ownerId for forthcoming auth scoping (handoff §5 tier-3).
    // Backfill null on existing rows so tier-1 individual-first users keep
    // working unchanged.
    this.version(2)
      .stores({
        bets: "id, objectiveId, ownerId, status, lockedAt, previousVersionId, updatedAt",
        objectives: "id, ownerId, framework, tag, updatedAt",
      })
      .upgrade(async (tx) => {
        await tx.table("bets").toCollection().modify((b) => {
          if (b.ownerId === undefined) b.ownerId = null;
        });
        await tx.table("objectives").toCollection().modify((o) => {
          if (o.ownerId === undefined) o.ownerId = null;
        });
      });
  }
}
