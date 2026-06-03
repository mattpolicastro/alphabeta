// Assemble Bet / LockedSnapshot records from the in-flight `ab_bet` carry.
// MVP-shaped: instrument and criteria are stubbed because Feasibility and
// Decision Criteria screens are deferred to Sprint 2 (see design/README.md
// § Build Recommendations, Sprint 1).

import type { AbBet } from "@/lib/bet/storage";
import type { Articulation, Bet, LockedSnapshot } from "@/lib/db/types";

export function buildArticulation(b: AbBet): Articulation {
  return {
    change: b.change ?? "",
    direction: b.direction ?? "lift",
    metric: b.metric ?? "",
    magnitude: b.magnitude ?? "",
    mechanism: b.mechanism && b.mechanism.length > 0 ? b.mechanism : null,
    confidence: b.confidence ?? "fairly",
    foldIf: b.foldIf ?? "",
  };
}

export function buildLockedSnapshot(
  b: AbBet,
  lockedAt: string,
): LockedSnapshot {
  const articulation = buildArticulation(b);
  return {
    articulation,
    instrument: { type: "ab", overrideReason: null, feasibility: {} },
    criteria: {
      win: "",
      inconclusive: "",
      loss: "",
      minMindChanger: articulation.foldIf,
      evidenceBar: "",
    },
    lockedAt,
  };
}

export function buildBetRecord(
  b: AbBet,
  lockedAt: string,
  fingerprint: string,
): Bet {
  const snapshot = buildLockedSnapshot(b, lockedAt);
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    objectiveId: null,
    type: "single",
    articulation: snapshot.articulation,
    instrument: snapshot.instrument,
    criteria: snapshot.criteria,
    status: "locked",
    lockedAt,
    fingerprint,
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
    createdAt: lockedAt,
    updatedAt: lockedAt,
  };
}
