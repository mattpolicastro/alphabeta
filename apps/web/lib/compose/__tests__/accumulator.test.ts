import { describe, expect, it } from "vitest";
import { mergeExtractions } from "../accumulator";
import type { Extraction, ExtractionField } from "../types";

const f = (value: string, status: ExtractionField["status"]): ExtractionField => ({
  value,
  status,
});

describe("mergeExtractions — presence", () => {
  it("returns an empty extraction when both sides are empty", () => {
    expect(mergeExtractions({}, {})).toEqual({});
  });

  it("takes a field present only in the update", () => {
    const update: Extraction = { metric: f("checkout-start rate", "found") };
    expect(mergeExtractions({}, update)).toEqual(update);
  });

  it("keeps a field present only in the base", () => {
    const base: Extraction = { metric: f("checkout-start rate", "found") };
    expect(mergeExtractions(base, {})).toEqual(base);
  });

  it("unions keys from both sides", () => {
    const base: Extraction = { change: f("swap the hero CTA", "found") };
    const update: Extraction = { metric: f("checkout-start rate", "found") };
    expect(Object.keys(mergeExtractions(base, update)).sort()).toEqual([
      "change",
      "metric",
    ]);
  });

  it("omits keys whose merged value is undefined", () => {
    const base: Extraction = { change: undefined };
    const update: Extraction = { metric: undefined };
    expect(mergeExtractions(base, update)).toEqual({});
  });
});

describe("mergeExtractions — status upgrades", () => {
  it("upgrades missing to present", () => {
    const merged = mergeExtractions(
      { foldIf: f("", "missing") },
      { foldIf: f("less than 3% lift", "present") },
    );
    expect(merged.foldIf).toEqual(f("less than 3% lift", "present"));
  });

  it("upgrades missing to found", () => {
    const merged = mergeExtractions(
      { foldIf: f("", "missing") },
      { foldIf: f("less than 3% lift", "found") },
    );
    expect(merged.foldIf).toEqual(f("less than 3% lift", "found"));
  });

  it("upgrades present to found", () => {
    const merged = mergeExtractions(
      { magnitude: f("8%", "present") },
      { magnitude: f("8%", "found") },
    );
    expect(merged.magnitude?.status).toBe("found");
  });

  it("does not downgrade found to present when the value is unchanged", () => {
    const existing = f("8%", "found");
    const merged = mergeExtractions(
      { magnitude: existing },
      { magnitude: f("8%", "present") },
    );
    expect(merged.magnitude).toBe(existing);
  });

  it("does not downgrade present to missing when the value is unchanged", () => {
    const existing = f("8%", "present");
    const merged = mergeExtractions(
      { magnitude: existing },
      { magnitude: f("8%", "missing") },
    );
    expect(merged.magnitude).toBe(existing);
  });
});

describe("mergeExtractions — value changes", () => {
  it("takes a newer non-empty value at equal status", () => {
    const merged = mergeExtractions(
      { magnitude: f("8%", "found") },
      { magnitude: f("12%", "found") },
    );
    expect(merged.magnitude?.value).toBe("12%");
  });

  it("keeps the existing field when the value is identical", () => {
    const existing = f("8%", "found");
    const merged = mergeExtractions(
      { magnitude: existing },
      { magnitude: f("8%", "found") },
    );
    expect(merged.magnitude).toBe(existing);
  });

  it("ignores an empty incoming value rather than blanking the field", () => {
    const existing = f("8%", "found");
    const merged = mergeExtractions(
      { magnitude: existing },
      { magnitude: f("", "found") },
    );
    expect(merged.magnitude).toBe(existing);
  });

  it("lets a changed value win even when it lowers the status", () => {
    // Rule ordering: the value-change check runs after the upgrade checks,
    // so a differing value is taken regardless of status direction.
    const merged = mergeExtractions(
      { magnitude: f("8%", "found") },
      { magnitude: f("12%", "present") },
    );
    expect(merged.magnitude).toEqual(f("12%", "present"));
  });
});

describe("mergeExtractions — immutability", () => {
  it("does not mutate either input", () => {
    const base: Extraction = { magnitude: f("8%", "present") };
    const update: Extraction = { magnitude: f("12%", "found") };
    const baseSnapshot = structuredClone(base);
    const updateSnapshot = structuredClone(update);

    mergeExtractions(base, update);

    expect(base).toEqual(baseSnapshot);
    expect(update).toEqual(updateSnapshot);
  });

  it("returns a new object rather than one of its inputs", () => {
    const base: Extraction = { magnitude: f("8%", "found") };
    const merged = mergeExtractions(base, {});
    expect(merged).not.toBe(base);
    expect(merged).toEqual(base);
  });
});

describe("mergeExtractions — accumulation over a conversation", () => {
  it("builds up a full articulation across successive turns", () => {
    const turns: Extraction[] = [
      { change: f("swap the hero CTA", "found") },
      { metric: f("checkout-start rate", "found"), direction: f("lift", "found") },
      { magnitude: f("8%", "present") },
      { magnitude: f("8%", "found"), foldIf: f("less than 3% lift", "found") },
    ];

    const merged = turns.reduce<Extraction>(
      (acc, turn) => mergeExtractions(acc, turn),
      {},
    );

    expect(merged).toEqual({
      change: f("swap the hero CTA", "found"),
      metric: f("checkout-start rate", "found"),
      direction: f("lift", "found"),
      magnitude: f("8%", "found"),
      foldIf: f("less than 3% lift", "found"),
    });
  });
});
