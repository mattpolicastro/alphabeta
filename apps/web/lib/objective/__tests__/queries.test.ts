import { describe, expect, it } from "vitest";
import {
  getObjective,
  listObjectives,
  mintObjective,
  updateObjective,
} from "@/lib/objective/queries";

describe("mintObjective", () => {
  it("creates an Objective row with a UUID and sensible defaults", async () => {
    const obj = await mintObjective({ title: "Activate more users" });
    expect(obj.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(obj.title).toBe("Activate more users");
    expect(obj.ownerId).toBeNull();
    expect(obj.framework).toBe("NSF");
    expect(obj.target).toEqual({ start: 0, goal: 0 });
    expect(obj.metric).toBe("");
    expect(obj.tag).toBe("");
  });

  it("merges partial fields over the defaults", async () => {
    const obj = await mintObjective({
      title: "Lift checkout-start",
      metric: "checkout-start rate",
      target: { start: 0.04, goal: 0.06 },
      framework: "OKR",
      tag: "Growth",
    });
    expect(obj.metric).toBe("checkout-start rate");
    expect(obj.target).toEqual({ start: 0.04, goal: 0.06 });
    expect(obj.framework).toBe("OKR");
    expect(obj.tag).toBe("Growth");
  });

  it("populates createdAt and updatedAt as identical ISO timestamps", async () => {
    const obj = await mintObjective({ title: "X" });
    expect(obj.createdAt).toBe(obj.updatedAt);
    expect(() => new Date(obj.createdAt)).not.toThrow();
  });

  it("persists to Dexie (round-trippable)", async () => {
    const minted = await mintObjective({ title: "Y" });
    const fetched = await getObjective(minted.id);
    expect(fetched?.id).toBe(minted.id);
    expect(fetched?.title).toBe("Y");
  });
});

describe("getObjective", () => {
  it("returns undefined for an unknown id", async () => {
    expect(await getObjective("nope")).toBeUndefined();
  });
});

describe("listObjectives", () => {
  it("returns an empty array on a fresh DB", async () => {
    expect(await listObjectives()).toEqual([]);
  });

  it("returns objectives ordered by updatedAt desc", async () => {
    const a = await mintObjective({ title: "alpha" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await mintObjective({ title: "beta" });
    await new Promise((r) => setTimeout(r, 5));
    const c = await mintObjective({ title: "gamma" });
    const list = await listObjectives();
    expect(list.map((o) => o.id)).toEqual([c.id, b.id, a.id]);
  });
});

describe("updateObjective", () => {
  it("merges patch fields", async () => {
    const obj = await mintObjective({ title: "X" });
    await updateObjective(obj.id, { tag: "growth" });
    const after = await getObjective(obj.id);
    expect(after?.tag).toBe("growth");
    expect(after?.title).toBe("X");
  });

  it("bumps updatedAt on every change", async () => {
    const obj = await mintObjective({ title: "X" });
    const before = obj.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await updateObjective(obj.id, { tag: "y" });
    const after = await getObjective(obj.id);
    expect(after?.updatedAt).not.toBe(before);
  });

  it("rejects unknown id", async () => {
    await expect(
      updateObjective("unknown", { tag: "x" }),
    ).rejects.toThrow(/not found/i);
  });
});
