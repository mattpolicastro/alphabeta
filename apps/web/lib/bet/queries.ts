// Dexie-backed query layer for the Bet entity. Replaces the localStorage
// carry pattern (`ab_bet` / `ab_committed`) — drafts persist to IndexedDB
// from creation, addressed by UUID, and routes hydrate from the DB via
// `?id=…` query strings. See `docs/handoff-2026-06-03.md` §"Carry pattern"
// for the broader rationale.
//
// Immutability is enforced here, not in Dexie: locked records reject draft
// updates, and `lockBet` refuses to lock a record that's already locked.
// `recordResolution` writes to post-data fields only (resolution + learning)
// — those aren't part of the LockedSnapshot, so updating them doesn't
// invalidate the fingerprint.

import type {
  Articulation,
  Bet,
  Learning,
  LockedSnapshot,
  Resolution,
} from "@/lib/db/types";
import { getDb } from "@/lib/db";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyArticulation(): Articulation {
  return {
    change: "",
    direction: "lift",
    metric: "",
    magnitude: "",
    mechanism: null,
    confidence: "fairly",
    foldIf: "",
  };
}

function emptyBet(id: string, now: string): Bet {
  return {
    id,
    cardId: null,
    ownerId: null,
    type: "single",
    articulation: emptyArticulation(),
    instrument: { type: "ab", overrideReason: null, feasibility: {} },
    criteria: {
      win: "",
      inconclusive: "",
      loss: "",
      minMindChanger: "",
      evidenceBar: "",
    },
    status: "draft",
    lockedAt: null,
    fingerprint: null,
    previousVersionId: null,
    resolution: {
      outcome: null,
      actuals: {},
      integrityFlags: [],
      call: null,
      deviation: { occurred: false, reason: null },
      resolvedAt: null,
    },
    learning: { calibration: null, reflection: null },
    createdAt: now,
    updatedAt: now,
  };
}

export async function mintDraft(
  initial?: Partial<Articulation>,
  opts?: { cardId?: string },
): Promise<Bet> {
  const now = new Date().toISOString();
  const bet = emptyBet(newId(), now);
  if (initial) {
    bet.articulation = { ...bet.articulation, ...initial };
  }
  if (opts?.cardId) {
    bet.cardId = opts.cardId;
  }
  await getDb().bets.add(bet);
  return bet;
}

export async function getBet(id: string): Promise<Bet | undefined> {
  return getDb().bets.get(id);
}

export async function listBets(): Promise<Bet[]> {
  return getDb()
    .bets.orderBy("updatedAt")
    .reverse()
    .toArray();
}

export async function updateDraft(
  id: string,
  patch: Partial<Bet>,
): Promise<void> {
  const existing = await getDb().bets.get(id);
  if (!existing) throw new Error(`Bet not found: ${id}`);
  if (existing.status !== "draft") {
    throw new Error(
      `Cannot updateDraft a ${existing.status} bet — locked records are immutable`,
    );
  }
  await getDb().bets.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function lockBet(
  id: string,
  snapshot: LockedSnapshot,
  fingerprint: string,
): Promise<void> {
  const existing = await getDb().bets.get(id);
  if (!existing) throw new Error(`Bet not found: ${id}`);
  if (existing.status !== "draft") {
    throw new Error(
      `Cannot lock a ${existing.status} bet — already locked / immutable`,
    );
  }
  const now = new Date().toISOString();
  await getDb().bets.update(id, {
    articulation: snapshot.articulation,
    instrument: snapshot.instrument,
    criteria: snapshot.criteria,
    status: "locked",
    lockedAt: snapshot.lockedAt,
    fingerprint,
    updatedAt: now,
  });
}

export async function recordResolution(
  id: string,
  resolution: Resolution,
  learning: Learning,
): Promise<void> {
  const existing = await getDb().bets.get(id);
  if (!existing) throw new Error(`Bet not found: ${id}`);
  if (existing.status === "draft") {
    throw new Error(
      `Cannot recordResolution on an un-locked bet (status=draft)`,
    );
  }
  // Locked snapshot fields are intentionally not touched here.
  await getDb().bets.update(id, {
    status: resolution.outcome === null ? existing.status : "resolved",
    resolution,
    learning,
    updatedAt: new Date().toISOString(),
  });
}
