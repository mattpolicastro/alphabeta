import { describe, expect, it } from "vitest";
import { evidenceFor } from "@/lib/instrument/evidence";

const METRIC = "checkout-start";

describe("evidenceFor", () => {
  it("returns a non-empty parts array for every instrument", () => {
    const instruments = ["ab", "quasi", "observational", "holdback"] as const;
    for (const i of instruments) {
      const parts = evidenceFor(i, 4, METRIC);
      expect(parts.length).toBeGreaterThan(0);
      expect(parts.map((p) => p.text).join("")).toMatch(/\S/);
    }
  });

  it("interpolates the fold-if percent and metric into the A/B template", () => {
    const parts = evidenceFor("ab", 4, METRIC);
    const flat = parts.map((p) => p.text).join("");
    expect(flat).toContain("+4%");
    expect(flat).toContain(METRIC);
    // 'no peeking' is the discipline phrase A/B carries.
    expect(flat).toContain("no peeking");
  });

  it("uses 'gap' and references a placebo test for Quasi-experiment", () => {
    const flat = evidenceFor("quasi", 4, METRIC).map((p) => p.text).join("");
    expect(flat).toMatch(/\bgap\b/);
    expect(flat).toContain("placebo");
  });

  it("uses 'association' and references sensitivity analysis for Observational", () => {
    const flat = evidenceFor("observational", 4, METRIC).map((p) => p.text).join("");
    expect(flat).toContain("association");
    expect(flat).toContain("sensitivity analysis");
  });

  it("references the held-back cohort and persistence for Holdback", () => {
    const flat = evidenceFor("holdback", 4, METRIC).map((p) => p.text).join("");
    expect(flat).toMatch(/held-back|cohort/);
    expect(flat).toContain("novelty");
  });

  it("emphasises the fold-if lift phrase as a separate part", () => {
    const parts = evidenceFor("ab", 4, METRIC);
    expect(parts.some((p) => p.type === "emph" && p.text.includes("4%"))).toBe(true);
  });
});
