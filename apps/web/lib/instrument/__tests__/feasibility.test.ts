import { describe, expect, it } from "vitest";
import {
  abWeeks,
  fit,
  suggest,
  type FeasibilityState,
} from "@/lib/instrument/feasibility";

function state(overrides: Partial<FeasibilityState> = {}): FeasibilityState {
  return {
    foldIfPercent: 4,
    randomize: "yes",
    traffic: 3,
    urgency: 3,
    claim: 3,
    ...overrides,
  };
}

describe("abWeeks", () => {
  it("returns a positive integer for normal inputs", () => {
    const w = abWeeks(4, 3);
    expect(w).toBeGreaterThan(0);
    expect(Number.isInteger(w)).toBe(true);
  });

  it("shrinks runtime as traffic grows", () => {
    expect(abWeeks(4, 5)).toBeLessThanOrEqual(abWeeks(4, 3));
  });

  it("grows runtime as the fold-if shrinks (smaller effects need more samples)", () => {
    expect(abWeeks(2, 3)).toBeGreaterThanOrEqual(abWeeks(4, 3));
  });

  it("floors at 1 week", () => {
    expect(abWeeks(10, 5)).toBeGreaterThanOrEqual(1);
  });
});

describe("fit — A/B test", () => {
  it("is ruled when randomization is unavailable (already shipped)", () => {
    const f = fit(state({ randomize: "shipped" })).ab;
    expect(f.verdict).toBe("ruled");
    expect(f.reason.toLowerCase()).toContain("shipped");
  });

  it("is ruled when randomization is unavailable (cannot randomize)", () => {
    const f = fit(state({ randomize: "no" })).ab;
    expect(f.verdict).toBe("ruled");
  });

  it("fits cleanly when randomization is possible and timeline is comfortable", () => {
    expect(fit(state({ randomize: "yes", urgency: 2 })).ab.verdict).toBe("fits");
  });

  it("becomes costly when urgency is high and the runtime exceeds 3 weeks", () => {
    // Low traffic + small fold-if + high urgency -> AB takes a while.
    const f = fit(state({ randomize: "yes", traffic: 1, foldIfPercent: 2, urgency: 5 })).ab;
    expect(f.verdict).toBe("costly");
    expect(f.metric).toMatch(/wks/);
  });
});

describe("fit — Quasi-experiment", () => {
  it("is costly when full randomization is available (overkill)", () => {
    expect(fit(state({ randomize: "yes" })).quasi.verdict).toBe("costly");
  });

  it("is costly for sub-3% fold-ifs (too fine for trend isolation)", () => {
    expect(fit(state({ randomize: "no", foldIfPercent: 2 })).quasi.verdict).toBe("costly");
  });

  it("is costly when the claim must be bulletproof (parallel-trends fragility)", () => {
    expect(fit(state({ randomize: "no", foldIfPercent: 5, claim: 5 })).quasi.verdict).toBe("costly");
  });

  it("fits when randomization is unavailable, the fold-if is detectable, and the claim is reasonable", () => {
    expect(fit(state({ randomize: "no", foldIfPercent: 5, claim: 3 })).quasi.verdict).toBe("fits");
  });
});

describe("fit — Observational", () => {
  it("is costly when the claim must be high (confounding)", () => {
    expect(fit(state({ claim: 4 })).observational.verdict).toBe("costly");
  });

  it("is costly when the fold-if is small (cannot separate from confounders)", () => {
    expect(fit(state({ claim: 2, foldIfPercent: 3 })).observational.verdict).toBe("costly");
  });

  it("fits for a coarse fold-if with directional claim", () => {
    expect(fit(state({ claim: 2, foldIfPercent: 6 })).observational.verdict).toBe("fits");
  });
});

describe("fit — Holdback", () => {
  it("fits when something has shipped (held-back slice exists)", () => {
    expect(fit(state({ randomize: "shipped" })).holdback.verdict).toBe("fits");
  });

  it("is costly when nothing has shipped but full randomization is possible", () => {
    expect(fit(state({ randomize: "yes" })).holdback.verdict).toBe("costly");
  });

  it("is ruled when there's no shipped product and no way to randomize", () => {
    expect(fit(state({ randomize: "no" })).holdback.verdict).toBe("ruled");
  });
});

describe("suggest", () => {
  it("returns the highest-scored fitting instrument", () => {
    const s = state({ randomize: "yes", urgency: 2 });
    const winner = suggest(fit(s), s);
    expect(winner).toBe("ab");
  });

  it("prefers Observational when speed is paramount and the claim bar is low", () => {
    const s = state({
      randomize: "no",
      foldIfPercent: 6,
      claim: 1,
      urgency: 5,
    });
    expect(suggest(fit(s), s)).toBe("observational");
  });

  it("returns null when nothing fits", () => {
    // Sub-3% fold-if, can't randomize, bulletproof claim — nothing works.
    const s = state({
      randomize: "no",
      foldIfPercent: 2,
      claim: 5,
    });
    expect(suggest(fit(s), s)).toBeNull();
  });
});
