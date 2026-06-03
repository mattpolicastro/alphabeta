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
