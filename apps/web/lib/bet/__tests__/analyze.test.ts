import { describe, expect, it } from "vitest";
import { analyzeDump } from "@/lib/bet/analyze";

describe("analyzeDump — magnitude", () => {
  it("extracts a percentage with no space", () => {
    expect(analyzeDump("we should get +8% lift").magnitude).toBe("8%");
  });

  it("extracts a percentage with a space", () => {
    expect(analyzeDump("expect 12 % improvement").magnitude).toBe("12%");
  });

  it("extracts a decimal percentage", () => {
    expect(analyzeDump("about 4.5% gain").magnitude).toBe("4.5%");
  });

  it("returns null when no percentage is present", () => {
    expect(analyzeDump("just a vibe, no number").magnitude).toBeNull();
  });

  it("captures the first percentage when multiple appear", () => {
    expect(
      analyzeDump("baseline 4% to target 8% lift").magnitude,
    ).toBe("4%");
  });
});

describe("analyzeDump — confidence", () => {
  it("detects hedge words and marks as a hunch", () => {
    const a = analyzeDump("I think maybe checkout-starts go up");
    expect(a.confidence.level).toBe("hunch-level");
    expect(a.confidence.hedges).toContain("i think");
    expect(a.confidence.hedges).toContain("maybe");
  });

  it("detects strong words and marks as highly confident", () => {
    const a = analyzeDump("I'm certain this clearly works");
    expect(a.confidence.level).toBe("highly");
    expect(a.confidence.strong.length).toBeGreaterThan(0);
  });

  it("defaults to fairly confident with neutral wording", () => {
    expect(
      analyzeDump("moving the picker should help conversion").confidence.level,
    ).toBe("fairly");
  });

  it("treats mixed hedge + strong as hunch (hedges win)", () => {
    const a = analyzeDump("I'm certain but maybe wrong");
    expect(a.confidence.level).toBe("hunch-level");
  });
});

describe("analyzeDump — mechanism", () => {
  it("extracts a because-clause", () => {
    const a = analyzeDump(
      "checkout-starts go up because the CTA is more salient",
    );
    expect(a.mechanism.found).toBe(true);
    expect(a.mechanism.text).toContain("CTA is more salient");
  });

  it("extracts a since-clause", () => {
    const a = analyzeDump("conversion will lift since the friction is gone");
    expect(a.mechanism.found).toBe(true);
    expect(a.mechanism.text).toContain("friction is gone");
  });

  it("falls back to evidence-pattern sentences", () => {
    const a = analyzeDump(
      "the replays show people bounce at the testimonials. so we should fix it.",
    );
    expect(a.mechanism.found).toBe(true);
    expect(a.mechanism.text).toMatch(/replays?.*bounce|bounce.*replays?/i);
  });

  it("returns not-found when no mechanism is named", () => {
    expect(
      analyzeDump("we should move the picker").mechanism.found,
    ).toBe(false);
  });

  it("strips leading hedges from extracted mechanism text", () => {
    const a = analyzeDump(
      "lift because I think the CTA is more salient",
    );
    expect(a.mechanism.text).not.toMatch(/^i think/i);
  });
});

describe("analyzeDump — falsifier", () => {
  it("detects 'fold if' phrasing", () => {
    const a = analyzeDump("I'd fold if it comes in under +4%");
    expect(a.falsifier.found).toBe(true);
    expect(a.falsifier.clause).toContain("under +4%");
  });

  it("detects 'revert if' phrasing", () => {
    const a = analyzeDump("revert if the guardrail trips");
    expect(a.falsifier.found).toBe(true);
  });

  it("detects 'change my mind if' phrasing", () => {
    const a = analyzeDump("change my mind if conversion drops");
    expect(a.falsifier.found).toBe(true);
  });

  it("detects 'less than X%' patterns", () => {
    expect(
      analyzeDump("less than 3% lift means this is dead").falsifier.found,
    ).toBe(true);
  });

  it("returns not-found when no falsifier is present", () => {
    const a = analyzeDump("this will definitely work");
    expect(a.falsifier.found).toBe(false);
  });
});

describe("analyzeDump — strategy-card source (label-aware)", () => {
  const dump = [
    "Change: swap the hero CTA verb",
    "Direction: lift",
    "Metric: checkout-start rate",
    "Magnitude: 8%",
    "Mechanism: stronger verb increases salience",
    "Fold-if: less than 3% lift after 2 weeks",
    "Confidence: fairly",
  ].join("\n");

  it("extracts change from the Change: label", () => {
    const a = analyzeDump(dump, { source: "strategy-card" });
    expect(a.articulation.change).toBe("swap the hero CTA verb");
  });

  it("extracts direction as a typed Direction value", () => {
    const a = analyzeDump(dump, { source: "strategy-card" });
    expect(a.articulation.direction).toBe("lift");
  });

  it("extracts metric", () => {
    const a = analyzeDump(dump, { source: "strategy-card" });
    expect(a.articulation.metric).toBe("checkout-start rate");
  });

  it("prefers the Magnitude: label over loose-regex percentage", () => {
    const a = analyzeDump(
      "Magnitude: 8%\nDescription: we saw a 42% bounce in logs",
      { source: "strategy-card" },
    );
    expect(a.articulation.magnitude).toBe("8%");
  });

  it("extracts mechanism from the Mechanism: label", () => {
    const a = analyzeDump(dump, { source: "strategy-card" });
    expect(a.articulation.mechanism).toBe(
      "stronger verb increases salience",
    );
  });

  it("extracts foldIf from the Fold-if: label", () => {
    const a = analyzeDump(dump, { source: "strategy-card" });
    expect(a.articulation.foldIf).toBe("less than 3% lift after 2 weeks");
  });

  it("extracts confidence as a typed Confidence value", () => {
    const a = analyzeDump(dump, { source: "strategy-card" });
    expect(a.articulation.confidence).toBe("fairly");
  });

  it("leaves articulation fields undefined when no labels match", () => {
    const a = analyzeDump("just some prose with no labels", {
      source: "strategy-card",
    });
    expect(a.articulation.change).toBeUndefined();
    expect(a.articulation.metric).toBeUndefined();
    expect(a.articulation.foldIf).toBeUndefined();
  });

  it("falls back to free-text heuristics for unlabeled fields", () => {
    const a = analyzeDump(
      "Change: swap CTA\n\nUsers are bouncing because the verb is weak.",
      { source: "strategy-card" },
    );
    expect(a.articulation.change).toBe("swap CTA");
    // mechanism came from the because-clause heuristic, not a label
    expect(a.mechanism.found).toBe(true);
  });
});

describe("analyzeDump — default source is free", () => {
  it("does not populate articulation fields without the strategy-card flag", () => {
    const a = analyzeDump("Change: swap CTA\nMetric: starts");
    expect(a.articulation.change).toBeUndefined();
    expect(a.articulation.metric).toBeUndefined();
  });
});
