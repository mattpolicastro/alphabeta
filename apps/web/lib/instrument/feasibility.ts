// Pure feasibility engine for the Instrument screen.
//
// The bet's fold-if (smallest effect that would change the user's mind) is
// the detection requirement; each instrument is scored against whether it
// can resolve a fold-if-sized effect under the user's constraints. This
// module has no React, no I/O — just deterministic logic the page can call
// on every state change.
//
// The math (`abWeeks`) is a rough planning estimate derived from the
// large-sample two-proportion z-test approximation:
//   n_per_arm ≈ 16 * p * (1 - p) / (p * mde)^2
// with p = 4.2% baseline conversion. Coarse but fit-for-purpose at the
// "can this instrument see X%?" question.

import type { InstrumentType } from "@/lib/db/types";

export type FeasibilityInstrument = Extract<
  InstrumentType,
  "ab" | "quasi" | "observational" | "holdback"
>;

export type Randomize = "yes" | "no" | "shipped";

export interface FeasibilityState {
  foldIfPercent: number; // 1–10
  randomize: Randomize;
  traffic: number; // 1–5 (qualitative bucket)
  urgency: number; // 1–5
  claim: number; // 1–5
}

export type FitVerdict = "fits" | "costly" | "ruled";

export interface InstrumentFit {
  verdict: FitVerdict;
  reason: string;
  metric: string; // human-readable timeline / quality hint
}

export type FitMap = Record<FeasibilityInstrument, InstrumentFit>;

const BASELINE_CONVERSION = 0.042;
const TRAFFIC_PER_DAY_PER_ARM = 4000;

export function abWeeks(foldIfPercent: number, traffic: number): number {
  const p = BASELINE_CONVERSION;
  const daily = Math.max(1, traffic) * TRAFFIC_PER_DAY_PER_ARM;
  const mde = foldIfPercent / 100;
  const abs = p * mde;
  if (abs <= 0) return Number.POSITIVE_INFINITY;
  const nPerArm = (16 * p * (1 - p)) / (abs * abs);
  return Math.max(1, Math.round(nPerArm / daily / 7));
}

function fitAb(s: FeasibilityState): InstrumentFit {
  if (s.randomize === "shipped") {
    return {
      verdict: "ruled",
      reason: "Already shipped — nothing left to split.",
      metric: "—",
    };
  }
  if (s.randomize === "no") {
    return {
      verdict: "ruled",
      reason: "Can't randomly assign here.",
      metric: "—",
    };
  }
  const weeks = abWeeks(s.foldIfPercent, s.traffic);
  if (s.urgency >= 4 && weeks > 3) {
    return {
      verdict: "costly",
      reason: `Detects +${s.foldIfPercent}% cleanly, but ~${weeks} wks — and you need an answer now.`,
      metric: `~${weeks} wks`,
    };
  }
  return {
    verdict: "fits",
    reason: `Detects your +${s.foldIfPercent}% fold-if in ~${weeks} wks.`,
    metric: `~${weeks} wks`,
  };
}

function fitQuasi(s: FeasibilityState): InstrumentFit {
  if (s.randomize === "yes") {
    return {
      verdict: "costly",
      reason: "You can randomize — why lean on an assumption?",
      metric: "2nd-best",
    };
  }
  if (s.foldIfPercent < 3) {
    return {
      verdict: "costly",
      reason: "A sub-3% effect is hard to isolate from trend noise.",
      metric: "too fine",
    };
  }
  if (s.claim >= 5) {
    return {
      verdict: "costly",
      reason: "Parallel-trends is too fragile for a bulletproof call.",
      metric: "~1–2 wks",
    };
  }
  return {
    verdict: "fits",
    reason: `Can surface a +${s.foldIfPercent}% gap if the comparison holds.`,
    metric: "~1–2 wks",
  };
}

function fitObservational(s: FeasibilityState): InstrumentFit {
  if (s.claim >= 4) {
    return {
      verdict: "costly",
      reason: "Confounding makes a defensible read impossible here.",
      metric: "~days",
    };
  }
  if (s.foldIfPercent < 5) {
    return {
      verdict: "costly",
      reason: `Can't credibly separate +${s.foldIfPercent}% from confounders.`,
      metric: "~days",
    };
  }
  return {
    verdict: "fits",
    reason: `Directional read of ~+${s.foldIfPercent}% from existing data.`,
    metric: "~days",
  };
}

function fitHoldback(s: FeasibilityState): InstrumentFit {
  if (s.randomize === "shipped") {
    const weeks = Math.max(2, abWeeks(s.foldIfPercent, s.traffic) + 1);
    return {
      verdict: "fits",
      reason: `Reads a sustained +${s.foldIfPercent}% in the held-back slice.`,
      metric: `~${weeks} wks`,
    };
  }
  if (s.randomize === "yes") {
    return {
      verdict: "costly",
      reason: "Nothing shipped yet to hold back from.",
      metric: "post-launch",
    };
  }
  return {
    verdict: "ruled",
    reason: "No launch and no way to withhold.",
    metric: "—",
  };
}

export function fit(state: FeasibilityState): FitMap {
  return {
    ab: fitAb(state),
    quasi: fitQuasi(state),
    observational: fitObservational(state),
    holdback: fitHoldback(state),
  };
}

// Higher = stronger claim defensibility / faster turnaround.
const STRENGTH: Record<FeasibilityInstrument, number> = {
  ab: 4,
  holdback: 3,
  quasi: 2,
  observational: 1,
};
const SPEED: Record<FeasibilityInstrument, number> = {
  observational: 4,
  holdback: 2,
  quasi: 2,
  ab: 1,
};

const ORDER: FeasibilityInstrument[] = ["ab", "quasi", "observational", "holdback"];

export function suggest(
  map: FitMap,
  state: FeasibilityState,
): FeasibilityInstrument | null {
  const fits = ORDER.filter((k) => map[k].verdict === "fits");
  if (fits.length === 0) return null;
  return fits
    .map((k) => ({
      k,
      score: STRENGTH[k] * state.claim + SPEED[k] * state.urgency,
    }))
    .sort((a, b) => b.score - a.score)[0].k;
}
