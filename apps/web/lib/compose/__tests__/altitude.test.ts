import { describe, expect, it } from "vitest";

import { classifyAltitude } from "../altitude";

describe("classifyAltitude", () => {
  it("classifies ready-level input", () => {
    const result = classifyAltitude(
      "MDE per arm, guardrail set, win → ship, loss → revert",
    );
    expect(result.altitude).toBe("ready");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("classifies bet-level input with fold-if", () => {
    const result = classifyAltitude(
      "If we change the checkout CTA we expect to lift conversion by 5%, because the verb is stronger. Fold if under +2%.",
    );
    expect(result.altitude).toBe("bet");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("classifies bet-level input with mechanism", () => {
    const result = classifyAltitude(
      "Redesigning the signup form to improve completion rate by 10% because the current flow has too many steps.",
    );
    expect(result.altitude).toBe("bet");
  });

  it("classifies goal-level input", () => {
    const result = classifyAltitude(
      "We need to increase retention. Our goal is to get to 80% by end of Q3.",
    );
    expect(result.altitude).toBe("goal");
  });

  it("classifies sequence-level as goal", () => {
    const result = classifyAltitude(
      "First we need to fix the onboarding, then test the email flow, after that we'll look at pricing.",
    );
    expect(result.altitude).toBe("goal");
  });

  it("classifies vague input", () => {
    const result = classifyAltitude(
      "I'm not sure, something needs work. We should probably look at it.",
    );
    expect(result.altitude).toBe("vague");
  });

  it("classifies very short input as vague", () => {
    const result = classifyAltitude("pricing");
    expect(result.altitude).toBe("vague");
  });

  it("classifies medium-length input with 2 bet components as bet", () => {
    const result = classifyAltitude(
      "Moving checkout to lift conversion.",
    );
    expect(result.altitude).toBe("bet");
  });

  it("returns a confidence value between 0 and 1", () => {
    const inputs = [
      "MDE per arm, guardrail set, win → ship",
      "Change the CTA to lift conversion by 5% because reasons. Fold if under +2%.",
      "We need to increase retention. Our goal is 80%.",
      "I'm not sure, something needs work.",
      "pricing",
    ];
    for (const input of inputs) {
      const result = classifyAltitude(input);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});
