import { describe, expect, it } from "vitest";
import {
  getBet,
  listBets,
  lockBet,
  mintDraft,
  recordResolution,
  updateDraft,
} from "@/lib/bet/queries";
import { buildLockedSnapshot } from "@/lib/bet/factory";
import type { AbBet } from "@/lib/bet/storage";

const sampleAbBet: AbBet = {
  change: "swap the hero CTA",
  direction: "lift",
  metric: "checkout-start rate",
  magnitude: "8%",
  mechanism: "stronger verb increases salience",
  confidence: "fairly",
  foldIf: "less than 3% lift",
};

describe("mintDraft", () => {
  it("creates a Bet row with status: 'draft' and a UUID", async () => {
    const bet = await mintDraft();
    expect(bet.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(bet.status).toBe("draft");
    expect(bet.lockedAt).toBeNull();
    expect(bet.fingerprint).toBeNull();
    expect(bet.ownerId).toBeNull();
  });

  it("populates createdAt and updatedAt as identical ISO timestamps", async () => {
    const bet = await mintDraft();
    expect(bet.createdAt).toBe(bet.updatedAt);
    expect(() => new Date(bet.createdAt)).not.toThrow();
  });

  it("seeds articulation from optional initial fields", async () => {
    const bet = await mintDraft({ metric: "foo", magnitude: "5%" });
    expect(bet.articulation.metric).toBe("foo");
    expect(bet.articulation.magnitude).toBe("5%");
  });

  it("links to a strategy card when cardId is provided", async () => {
    const bet = await mintDraft(undefined, { cardId: "card-abc" });
    expect(bet.cardId).toBe("card-abc");
  });

  it("defaults cardId to null when no opts provided", async () => {
    const bet = await mintDraft();
    expect(bet.cardId).toBeNull();
  });

  it("persists to Dexie (round-trippable)", async () => {
    const minted = await mintDraft();
    const fetched = await getBet(minted.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(minted.id);
  });
});

describe("getBet", () => {
  it("returns undefined for an unknown id", async () => {
    const result = await getBet("nope");
    expect(result).toBeUndefined();
  });
});

describe("listBets", () => {
  it("returns an empty array on a fresh DB", async () => {
    expect(await listBets()).toEqual([]);
  });

  it("returns bets ordered by updatedAt desc", async () => {
    const a = await mintDraft({ change: "alpha" });
    // Bump updatedAt so ordering is deterministic.
    await new Promise((r) => setTimeout(r, 5));
    const b = await mintDraft({ change: "beta" });
    await new Promise((r) => setTimeout(r, 5));
    const c = await mintDraft({ change: "gamma" });
    const list = await listBets();
    expect(list.map((x) => x.id)).toEqual([c.id, b.id, a.id]);
  });
});

describe("updateDraft", () => {
  it("merges articulation partials", async () => {
    const bet = await mintDraft();
    await updateDraft(bet.id, {
      articulation: { ...bet.articulation, metric: "updated-metric" },
    });
    const after = await getBet(bet.id);
    expect(after?.articulation.metric).toBe("updated-metric");
  });

  it("bumps updatedAt on every change", async () => {
    const bet = await mintDraft();
    const before = bet.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await updateDraft(bet.id, {
      articulation: { ...bet.articulation, metric: "x" },
    });
    const after = await getBet(bet.id);
    expect(after?.updatedAt).not.toBe(before);
  });

  it("refuses to touch a bet that's already locked", async () => {
    const bet = await mintDraft();
    const snapshot = buildLockedSnapshot(sampleAbBet, new Date().toISOString());
    await lockBet(bet.id, snapshot, "f".repeat(64));
    await expect(
      updateDraft(bet.id, {
        articulation: { ...bet.articulation, metric: "tampered" },
      }),
    ).rejects.toThrow(/locked|immutable/i);
  });
});

describe("lockBet", () => {
  it("transitions status draft -> locked and writes fingerprint + lockedAt", async () => {
    const bet = await mintDraft();
    const lockedAt = new Date().toISOString();
    const snapshot = buildLockedSnapshot(sampleAbBet, lockedAt);
    const fp = "a".repeat(64);
    await lockBet(bet.id, snapshot, fp);
    const after = await getBet(bet.id);
    expect(after?.status).toBe("locked");
    expect(after?.lockedAt).toBe(lockedAt);
    expect(after?.fingerprint).toBe(fp);
    expect(after?.articulation).toEqual(snapshot.articulation);
    expect(after?.instrument).toEqual(snapshot.instrument);
    expect(after?.criteria).toEqual(snapshot.criteria);
  });

  it("refuses to lock a bet that's already locked", async () => {
    const bet = await mintDraft();
    const snapshot = buildLockedSnapshot(sampleAbBet, new Date().toISOString());
    await lockBet(bet.id, snapshot, "a".repeat(64));
    await expect(
      lockBet(bet.id, snapshot, "b".repeat(64)),
    ).rejects.toThrow(/locked|immutable/i);
  });

  it("rejects an unknown id", async () => {
    const snapshot = buildLockedSnapshot(sampleAbBet, new Date().toISOString());
    await expect(
      lockBet("unknown-id", snapshot, "a".repeat(64)),
    ).rejects.toThrow(/not found/i);
  });
});

describe("recordResolution", () => {
  it("writes resolution and learning without touching the locked snapshot", async () => {
    const bet = await mintDraft();
    const lockedAt = new Date().toISOString();
    const snapshot = buildLockedSnapshot(sampleAbBet, lockedAt);
    const fp = "a".repeat(64);
    await lockBet(bet.id, snapshot, fp);

    await recordResolution(
      bet.id,
      {
        outcome: "win",
        actuals: { lift: 6.2 },
        integrityFlags: [],
        call: "keep",
        deviation: { occurred: false, reason: null },
        resolvedAt: new Date().toISOString(),
      },
      { calibration: "well calibrated", reflection: "ship it" },
    );

    const after = await getBet(bet.id);
    expect(after?.resolution.outcome).toBe("win");
    expect(after?.resolution.call).toBe("keep");
    expect(after?.learning.reflection).toBe("ship it");
    // Locked snapshot fields are unchanged.
    expect(after?.articulation).toEqual(snapshot.articulation);
    expect(after?.lockedAt).toBe(lockedAt);
    expect(after?.fingerprint).toBe(fp);
  });

  it("rejects if the bet was never locked", async () => {
    const bet = await mintDraft();
    await expect(
      recordResolution(
        bet.id,
        {
          outcome: "loss",
          actuals: {},
          integrityFlags: [],
          call: "revert",
          deviation: { occurred: false, reason: null },
          resolvedAt: new Date().toISOString(),
        },
        { calibration: null, reflection: null },
      ),
    ).rejects.toThrow(/locked/i);
  });
});
