import { describe, expect, it } from "vitest";
import { currentStage, type LifecycleStage } from "../stage";
import type { Bet, BetStatus } from "@/lib/db/types";

function bet(status: BetStatus): Bet {
  return {
    id: "test",
    objectiveId: null,
    ownerId: null,
    type: "single",
    articulation: {
      change: "",
      direction: "lift",
      metric: "",
      magnitude: "",
      mechanism: null,
      confidence: "fairly",
      foldIf: "",
    },
    instrument: { type: "ab", overrideReason: null, feasibility: {} },
    criteria: {
      win: "",
      inconclusive: "",
      loss: "",
      minMindChanger: "",
      evidenceBar: "",
    },
    status,
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
    createdAt: "2026-06-03T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
  };
}

describe("currentStage", () => {
  it("draft → wager", () => {
    expect(currentStage(bet("draft"))).toBe<LifecycleStage>("wager");
  });

  it("locked → revisit (no result yet — the seam to running)", () => {
    expect(currentStage(bet("locked"))).toBe<LifecycleStage>("revisit");
  });

  it("running → revisit", () => {
    expect(currentStage(bet("running"))).toBe<LifecycleStage>("revisit");
  });

  it("resolved → revisit", () => {
    expect(currentStage(bet("resolved"))).toBe<LifecycleStage>("revisit");
  });
});
