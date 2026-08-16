import { describe, expect, it } from "vitest";
import { classifyMechanism } from "../classify";

describe("classifyMechanism — category matching", () => {
  it.each([
    ["move the CTA above the fold", "layout"],
    ["above-the-fold treatment", "layout"],
    ["new placement for the panel", "layout"],
    ["infinite scroll", "layout"],
    ["change the position", "layout"],
  ])("classifies %j as layout", (text, expected) => {
    expect(classifyMechanism(text)).toBe(expected);
  });

  it.each([
    ["urgency in the headline", "copy"],
    ["clearer messaging", "copy"],
    ["reframe the wording", "copy"],
    ["subject line test", "copy"],
    ["lead with empathy", "copy"],
  ])("classifies %j as copy", (text, expected) => {
    expect(classifyMechanism(text)).toBe(expected);
  });

  it.each([
    ["color contrast bump", "visual"],
    ["progress indicator", "visual"],
    ["add a badge", "visual"],
    ["grab attention", "visual"],
    ["stronger visual hierarchy", "visual"],
  ])("classifies %j as visual", (text, expected) => {
    expect(classifyMechanism(text)).toBe(expected);
  });

  it.each([
    ["reduce friction", "friction"],
    ["one fewer step", "friction"],
    ["choice paralysis", "friction"],
    ["cognitive overload", "friction"],
  ])("classifies %j as friction", (text, expected) => {
    expect(classifyMechanism(text)).toBe(expected);
  });

  it.each([
    ["narrow the audience", "audience"],
    ["better targeting", "audience"],
    ["a new segment", "audience"],
    ["vary by region", "audience"],
    ["language switcher", "audience"],
  ])("classifies %j as audience", (text, expected) => {
    expect(classifyMechanism(text)).toBe(expected);
  });
});

describe("classifyMechanism — fallback and casing", () => {
  it("returns uncategorized when nothing matches", () => {
    expect(classifyMechanism("nothing relevant here")).toBe("uncategorized");
  });

  it("returns uncategorized for an empty string", () => {
    expect(classifyMechanism("")).toBe("uncategorized");
  });

  it("is case-insensitive", () => {
    expect(classifyMechanism("LAYOUT change")).toBe("layout");
    expect(classifyMechanism("HeAdLiNe")).toBe("copy");
  });

  it("requires whole words — substrings inside a longer word do not match", () => {
    // "reposition" contains "position" but has no word boundary before it.
    expect(classifyMechanism("reposition the panel")).toBe("uncategorized");
  });
});

describe("classifyMechanism — precedence", () => {
  it("returns the first matching category in declaration order", () => {
    // Matches both layout ("placement") and copy ("headline"); layout is
    // declared first, so it wins.
    expect(classifyMechanism("headline placement")).toBe("layout");
  });

  it("copy outranks audience", () => {
    expect(classifyMechanism("localize the copy")).toBe("copy");
  });

  it("visual outranks friction", () => {
    // "progress indicator" (visual) is declared ahead of "step" (friction).
    expect(classifyMechanism("fewer steps, clearer progress")).toBe("visual");
  });
});

describe("classifyMechanism — known stem-matching limitation", () => {
  /**
   * The truncated stems in the friction and audience patterns
   * ("simplif", "reduc", "remov", "streamlin", "locali[sz]", "demograph",
   * plus singular "step" and "persona") are wrapped in a trailing `\b`.
   * A word boundary cannot occur between two word characters, so these
   * stems only match when the word ends exactly there — the inflected
   * forms they were clearly written to catch all fall through to
   * "uncategorized".
   *
   * These assertions pin the CURRENT behaviour so the gap is visible and a
   * future fix has a failing test to flip. They are not an endorsement.
   */
  it.each([
    "simplify the flow",
    "simplified checkout",
    "reduce the number of fields",
    "remove a field",
    "streamline onboarding",
  ])("does not yet classify %j as friction", (text) => {
    expect(classifyMechanism(text)).toBe("uncategorized");
  });

  it.each(["localize the interface", "demographic split", "personas matter"])(
    "does not yet classify %j as audience",
    (text) => {
      expect(classifyMechanism(text)).toBe("uncategorized");
    },
  );

  it("matches the singular stem word but not its plural", () => {
    expect(classifyMechanism("one step")).toBe("friction");
    expect(classifyMechanism("several steps")).toBe("uncategorized");
  });
});
