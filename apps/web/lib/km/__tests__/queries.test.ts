import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import type { Bet, BetStatus, Outcome } from "@/lib/db/types";
import { buildBetRecord } from "@/lib/bet/factory";
import type { AbBet } from "@/lib/bet/storage";
import { listResolvedBets } from "../queries";

const baseAbBet: AbBet = {
  change: "swap the hero CTA",
  direction: "lift",
  metric: "checkout-start rate",
  magnitude: "8%",
  mechanism: "stronger verb increases salience",
  confidence: "fairly",
  foldIf: "less than 3% lift",
};

/** Insert a Bet, defaulting to a fully-resolved record. */
async function seedBet(overrides: Partial<Bet> = {}): Promise<Bet> {
  const bet: Bet = {
    ...buildBetRecord(baseAbBet, "2026-06-01T12:00:00.000Z", "f".repeat(64)),
    status: "resolved" as BetStatus,
    surface: "checkout",
    resolution: {
      outcome: "win" as Outcome,
      actuals: { lift: 12 },
      integrityFlags: [],
      call: "keep",
      deviation: { occurred: false, reason: null },
      resolvedAt: "2026-06-20T09:30:00.000Z",
    },
    learning: {
      calibration: "we were roughly right",
      reflection: "the mechanism held",
    },
    ...overrides,
  };
  await getDb().bets.add(bet);
  return bet;
}

async function firstRecord(overrides: Partial<Bet> = {}) {
  await seedBet(overrides);
  const [record] = await listResolvedBets();
  return record;
}

describe("listResolvedBets — selection", () => {
  it("returns an empty array when there are no bets", async () => {
    expect(await listResolvedBets()).toEqual([]);
  });

  it("returns only bets with status 'resolved'", async () => {
    const resolved = await seedBet();
    for (const status of ["draft", "ready", "locked", "running"] as BetStatus[]) {
      await seedBet({ status });
    }

    const records = await listResolvedBets();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(resolved.id);
  });

  it("returns one record per resolved bet", async () => {
    await seedBet();
    await seedBet();
    await seedBet();
    expect(await listResolvedBets()).toHaveLength(3);
  });
});

describe("listResolvedBets — field mapping", () => {
  it("maps id, question and mechanism text straight through", async () => {
    const bet = await seedBet();
    const [record] = await listResolvedBets();
    expect(record.id).toBe(bet.id);
    expect(record.question).toBe("swap the hero CTA");
    expect(record.mechanismText).toBe("stronger verb increases salience");
  });

  it("classifies the mechanism into a category", async () => {
    const record = await firstRecord({
      articulation: { ...baseAbBet, mechanism: "move the CTA above the fold" },
    });
    expect(record.mechanism).toBe("layout");
  });

  it("treats a null mechanism as empty and uncategorized", async () => {
    const record = await firstRecord({
      articulation: { ...baseAbBet, mechanism: null },
    });
    expect(record.mechanismText).toBe("");
    expect(record.mechanism).toBe("uncategorized");
  });

  it("keeps the bet's surface", async () => {
    const record = await firstRecord({ surface: "onboarding" });
    expect(record.surface).toBe("onboarding");
  });

  it("falls back to 'unknown' when the bet has no surface", async () => {
    const record = await firstRecord({ surface: undefined });
    expect(record.surface).toBe("unknown");
  });
});

describe("listResolvedBets — outcome mapping", () => {
  it.each([
    ["win", "won"],
    ["loss", "lost"],
    ["inconclusive", "inconclusive"],
  ] as const)("maps outcome %s to %s", async (outcome, expected) => {
    const record = await firstRecord({
      resolution: {
        outcome,
        actuals: {},
        integrityFlags: [],
        call: null,
        deviation: { occurred: false, reason: null },
        resolvedAt: "2026-06-20T09:30:00.000Z",
      },
    });
    expect(record.outcome).toBe(expected);
  });

  it("treats a null outcome as inconclusive", async () => {
    const record = await firstRecord({
      resolution: {
        outcome: null,
        actuals: {},
        integrityFlags: [],
        call: null,
        deviation: { occurred: false, reason: null },
        resolvedAt: "2026-06-20T09:30:00.000Z",
      },
    });
    expect(record.outcome).toBe("inconclusive");
  });
});

describe("listResolvedBets — expected magnitude", () => {
  it("prefixes a bare magnitude with +", async () => {
    const record = await firstRecord({
      articulation: { ...baseAbBet, magnitude: "8%" },
    });
    expect(record.expected).toBe("+8%");
  });

  it("does not double the + on an already-signed magnitude", async () => {
    const record = await firstRecord({
      articulation: { ...baseAbBet, magnitude: "+8%" },
    });
    expect(record.expected).toBe("+8%");
  });

  it("renders an em dash when magnitude is empty", async () => {
    const record = await firstRecord({
      articulation: { ...baseAbBet, magnitude: "" },
    });
    expect(record.expected).toBe("—");
  });

  it("prefixes a negative magnitude with + as well (current behaviour)", async () => {
    // Only a leading "+" is stripped, so "-3%" becomes "+-3%". Pinned so a
    // future fix has a failing test to flip.
    const record = await firstRecord({
      articulation: { ...baseAbBet, magnitude: "-3%" },
    });
    expect(record.expected).toBe("+-3%");
  });
});

describe("listResolvedBets — actual lift", () => {
  const withActuals = (actuals: Record<string, unknown>): Partial<Bet> => ({
    resolution: {
      outcome: "win",
      actuals,
      integrityFlags: [],
      call: null,
      deviation: { occurred: false, reason: null },
      resolvedAt: "2026-06-20T09:30:00.000Z",
    },
  });

  it("signs a positive lift", async () => {
    expect((await firstRecord(withActuals({ lift: 12 }))).actual).toBe("+12%");
  });

  it("signs zero as positive", async () => {
    expect((await firstRecord(withActuals({ lift: 0 }))).actual).toBe("+0%");
  });

  it("keeps the minus on a negative lift", async () => {
    expect((await firstRecord(withActuals({ lift: -4.5 }))).actual).toBe("-4.5%");
  });

  it("renders an em dash when there is no lift", async () => {
    expect((await firstRecord(withActuals({}))).actual).toBe("—");
  });

  it("renders an em dash when lift is not a number", async () => {
    expect((await firstRecord(withActuals({ lift: "12" }))).actual).toBe("—");
  });
});

describe("listResolvedBets — learning", () => {
  it("prefers the calibration note", async () => {
    const record = await firstRecord({
      learning: { calibration: "calibrated well", reflection: "some reflection" },
    });
    expect(record.learning).toBe("calibrated well");
  });

  it("falls back to the reflection when there is no calibration", async () => {
    const record = await firstRecord({
      learning: { calibration: null, reflection: "some reflection" },
    });
    expect(record.learning).toBe("some reflection");
  });

  it("falls back to an empty string when neither is present", async () => {
    const record = await firstRecord({
      learning: { calibration: null, reflection: null },
    });
    expect(record.learning).toBe("");
  });
});

describe("listResolvedBets — resolvedAt", () => {
  it("parses the ISO resolution timestamp to epoch millis", async () => {
    const record = await firstRecord();
    expect(record.resolvedAt).toBe(Date.parse("2026-06-20T09:30:00.000Z"));
  });

  it("falls back to now when the bet has no resolution timestamp", async () => {
    const before = Date.now();
    const record = await firstRecord({
      resolution: {
        outcome: "win",
        actuals: {},
        integrityFlags: [],
        call: null,
        deviation: { occurred: false, reason: null },
        resolvedAt: null,
      },
    });
    expect(record.resolvedAt).toBeGreaterThanOrEqual(before);
    expect(record.resolvedAt).toBeLessThanOrEqual(Date.now());
  });
});
