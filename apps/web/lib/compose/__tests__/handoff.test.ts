import { describe, expect, it } from "vitest";
import type { Extraction } from "@/lib/compose/types";
import {
  extractionToArticulation,
  mintFromExtraction,
  stashSequenceSeed,
  takeSequenceSeed,
} from "@/lib/compose/handoff";
import type { SequenceSeed } from "@/lib/compose/handoff";
import { getBet } from "@/lib/bet/queries";

describe("extractionToArticulation", () => {
  it("maps found fields to articulation", () => {
    const ext: Extraction = {
      change: { value: "swap the hero CTA", status: "found" },
      metric: { value: "checkout-start rate", status: "found" },
      magnitude: { value: "8%", status: "found" },
      foldIf: { value: "less than 3% lift", status: "found" },
    };
    const result = extractionToArticulation(ext);
    expect(result.change).toBe("swap the hero CTA");
    expect(result.metric).toBe("checkout-start rate");
    expect(result.magnitude).toBe("8%");
    expect(result.foldIf).toBe("less than 3% lift");
  });

  it("ignores missing fields", () => {
    const ext: Extraction = {
      change: { value: "swap the hero CTA", status: "missing" },
    };
    const result = extractionToArticulation(ext);
    expect(result.change).toBeUndefined();
  });

  it("maps direction values", () => {
    const ext: Extraction = {
      direction: { value: "lift", status: "found" },
    };
    const result = extractionToArticulation(ext);
    expect(result.direction).toBe("lift");
  });

  it("maps confidence values", () => {
    const ext: Extraction = {
      confidence: { value: "fairly confident", status: "found" },
    };
    const result = extractionToArticulation(ext);
    expect(result.confidence).toBe("fairly");
  });

  it("includes mechanism when present or found", () => {
    const ext: Extraction = {
      mechanism: { value: "stronger verb increases salience", status: "present" },
    };
    const result = extractionToArticulation(ext);
    expect(result.mechanism).toBe("stronger verb increases salience");
  });

  it("returns empty object for all-missing extraction", () => {
    const ext: Extraction = {
      change: { value: "", status: "missing" },
      metric: { value: "", status: "missing" },
    };
    const result = extractionToArticulation(ext);
    expect(result).toEqual({});
  });
});

describe("mintFromExtraction", () => {
  it("creates a bet and returns its id", async () => {
    const ext: Extraction = {
      change: { value: "swap the hero CTA", status: "found" },
      metric: { value: "checkout-start rate", status: "found" },
    };
    const id = await mintFromExtraction(ext);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("populates articulation from extraction", async () => {
    const ext: Extraction = {
      change: { value: "swap the hero CTA", status: "found" },
      metric: { value: "checkout-start rate", status: "found" },
      magnitude: { value: "8%", status: "found" },
      direction: { value: "lift", status: "found" },
      confidence: { value: "fairly confident", status: "found" },
    };
    const id = await mintFromExtraction(ext);
    const bet = await getBet(id);
    expect(bet).toBeDefined();
    expect(bet!.articulation.change).toBe("swap the hero CTA");
    expect(bet!.articulation.metric).toBe("checkout-start rate");
    expect(bet!.articulation.magnitude).toBe("8%");
    expect(bet!.articulation.direction).toBe("lift");
    expect(bet!.articulation.confidence).toBe("fairly");
  });
});

describe("stashSequenceSeed / takeSequenceSeed", () => {
  it("round-trips a seed through localStorage", () => {
    const seed: SequenceSeed = {
      claim: "hero CTA drives checkout",
      mechanism: "salience",
      depType: "chain",
      subBets: [{ question: "does CTA color matter?", instrument: "ab" }],
    };
    stashSequenceSeed(seed);
    const result = takeSequenceSeed();
    expect(result).toEqual(seed);
  });

  it("takeSequenceSeed returns null when nothing stashed", () => {
    const result = takeSequenceSeed();
    expect(result).toBeNull();
  });

  it("takeSequenceSeed consumes the seed (one-shot)", () => {
    const seed: SequenceSeed = {
      depType: "parallel",
      subBets: [{ question: "q1", instrument: "ab" }],
    };
    stashSequenceSeed(seed);
    const first = takeSequenceSeed();
    const second = takeSequenceSeed();
    expect(first).toEqual(seed);
    expect(second).toBeNull();
  });

  it("stashSequenceSeed overwrites previous seed", () => {
    const seedA: SequenceSeed = {
      depType: "chain",
      subBets: [{ question: "q-a", instrument: "ab" }],
    };
    const seedB: SequenceSeed = {
      depType: "fanin",
      subBets: [{ question: "q-b", instrument: "survey" }],
    };
    stashSequenceSeed(seedA);
    stashSequenceSeed(seedB);
    const result = takeSequenceSeed();
    expect(result).toEqual(seedB);
  });
});
