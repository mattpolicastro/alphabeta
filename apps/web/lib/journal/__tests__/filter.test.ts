import { describe, expect, it } from "vitest";
import {
  ALL_STATUSES,
  filterBetsByStatus,
  groupBetsByStatus,
} from "@/lib/journal/filter";
import type { Bet, BetStatus } from "@/lib/db/types";

function bet(id: string, status: BetStatus): Bet {
  return {
    id,
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

const sample = [
  bet("a", "draft"),
  bet("b", "locked"),
  bet("c", "draft"),
  bet("d", "resolved"),
  bet("e", "running"),
];

describe("ALL_STATUSES", () => {
  it("enumerates the four bet statuses", () => {
    expect(ALL_STATUSES).toEqual(["draft", "locked", "running", "resolved"]);
  });
});

describe("filterBetsByStatus", () => {
  it("returns the input unchanged when allowed is empty", () => {
    expect(filterBetsByStatus(sample, [])).toEqual(sample);
  });

  it("returns the input unchanged when all statuses are allowed", () => {
    expect(filterBetsByStatus(sample, ALL_STATUSES)).toEqual(sample);
  });

  it("returns only bets whose status is in the allowed set", () => {
    expect(filterBetsByStatus(sample, ["draft"]).map((b) => b.id)).toEqual(["a", "c"]);
  });

  it("supports multi-status allowed lists", () => {
    expect(
      filterBetsByStatus(sample, ["locked", "resolved"]).map((b) => b.id),
    ).toEqual(["b", "d"]);
  });

  it("returns an empty array when no bet matches", () => {
    const onlyDrafts = [bet("a", "draft")];
    expect(filterBetsByStatus(onlyDrafts, ["locked"])).toEqual([]);
  });
});

describe("groupBetsByStatus", () => {
  it("returns a record keyed by every status, with bets bucketed", () => {
    const groups = groupBetsByStatus(sample);
    expect(groups.draft.map((b) => b.id)).toEqual(["a", "c"]);
    expect(groups.locked.map((b) => b.id)).toEqual(["b"]);
    expect(groups.running.map((b) => b.id)).toEqual(["e"]);
    expect(groups.resolved.map((b) => b.id)).toEqual(["d"]);
  });

  it("returns empty arrays for statuses with no matching bets", () => {
    const groups = groupBetsByStatus([bet("x", "draft")]);
    expect(groups.locked).toEqual([]);
    expect(groups.running).toEqual([]);
    expect(groups.resolved).toEqual([]);
  });

  it("preserves input order within each status group", () => {
    const groups = groupBetsByStatus([
      bet("first", "draft"),
      bet("second", "draft"),
      bet("third", "draft"),
    ]);
    expect(groups.draft.map((b) => b.id)).toEqual(["first", "second", "third"]);
  });

  it("returns an object with empty arrays on empty input", () => {
    expect(groupBetsByStatus([])).toEqual({
      draft: [],
      locked: [],
      running: [],
      resolved: [],
    });
  });
});
