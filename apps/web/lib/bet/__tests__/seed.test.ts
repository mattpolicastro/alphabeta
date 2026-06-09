import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetDb } from "@/lib/db";
import { seedDemoBets, clearDemoBets } from "@/lib/bet/seed";
import { listBets, getBet } from "@/lib/bet/queries";
import { fingerprint } from "@/lib/integrity/fingerprint";

beforeEach(async () => {
  await __resetDb();
});
afterEach(async () => {
  await __resetDb();
});

describe("seedDemoBets", () => {
  it("inserts 10 demo bets into an empty DB", async () => {
    const count = await seedDemoBets();
    expect(count).toBe(10);
    const bets = await listBets();
    expect(bets).toHaveLength(10);
  });

  it("is idempotent — returns 0 on second call", async () => {
    await seedDemoBets();
    const count = await seedDemoBets();
    expect(count).toBe(0);
    const bets = await listBets();
    expect(bets).toHaveLength(10);
  });

  it("produces valid fingerprints for locked bets", async () => {
    await seedDemoBets();
    const bet = await getBet("demo-bet-003");
    expect(bet).toBeDefined();
    expect(bet!.fingerprint).toBeTruthy();
    const expected = await fingerprint({
      articulation: bet!.articulation,
      instrument: bet!.instrument,
      criteria: bet!.criteria,
      lockedAt: bet!.lockedAt!,
    });
    expect(bet!.fingerprint).toBe(expected);
  });

  it("covers all lifecycle statuses", async () => {
    await seedDemoBets();
    const bets = await listBets();
    const statuses = new Set(bets.map((b) => b.status));
    expect(statuses).toContain("draft");
    expect(statuses).toContain("ready");
    expect(statuses).toContain("locked");
    expect(statuses).toContain("running");
    expect(statuses).toContain("resolved");
  });
});

describe("clearDemoBets", () => {
  it("removes all demo bets", async () => {
    await seedDemoBets();
    const removed = await clearDemoBets();
    expect(removed).toBe(10);
    const bets = await listBets();
    expect(bets).toHaveLength(0);
  });

  it("returns 0 when no demo bets exist", async () => {
    const removed = await clearDemoBets();
    expect(removed).toBe(0);
  });
});
