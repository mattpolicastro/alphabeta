import type { Altitude } from "./types";

const VAGUE_SIGNALS = [
  "feeling",
  "i feel",
  "should probably",
  "needs work",
  "not sure",
  "somewhere",
  "something",
  "i think we should",
  "we need to do something",
  "worried about",
  "concerned about",
];

const GOAL_SIGNALS = [
  "need to increase",
  "need to reduce",
  "need to improve",
  "want to get to",
  "by end of",
  "by q",
  "our strategy",
  "our goal",
  "not sure what approach",
  "could be",
  "or maybe",
];

const SEQUENCE_SIGNALS = [
  "first",
  "then",
  "after that",
  "depends on",
  "each step",
  "prerequisite",
  "before we can",
  "chain",
  "sequence",
  "step 1",
  "step 2",
];

const READY_SIGNALS = [
  "mde",
  "per arm",
  "per variant",
  "guardrail",
  "2 weeks",
  "win →",
  "win ->",
  "loss →",
  "loss ->",
  "inconclusive →",
  "inconclusive ->",
  "a/b test:",
];

const BET_COMPONENTS = [
  /\b(?:moving|move|change|add|remove|redesign|replace|test|try)\b/i,
  /\b(?:lift|reduce|increase|decrease|improve|drop)\b/i,
  /\b(?:conversion|rate|revenue|engagement|retention|sign-?ups?|checkout|completion)\b/i,
  /\d+\s?%/,
];

function countMatches(text: string, signals: string[]): number {
  const t = text.toLowerCase();
  return signals.filter((s) => t.includes(s)).length;
}

function countRegexMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

export function classifyAltitude(text: string): {
  altitude: Altitude;
  confidence: number;
} {
  const t = text.toLowerCase();

  const readyScore = countMatches(text, READY_SIGNALS);
  if (readyScore >= 3) return { altitude: "ready", confidence: 0.9 };

  const betComponents = countRegexMatches(text, BET_COMPONENTS);
  const hasFoldIf =
    /fold if|i'?ll fold|drop it|kill it|revert|under \+?\d|below \+?\d/i.test(
      text,
    );
  const hasMechanism = /\bbecause\b|\bsince\b|\breason\b|\bdriven by\b/i.test(
    text,
  );

  if (betComponents >= 3 && (hasFoldIf || hasMechanism)) {
    return { altitude: "bet", confidence: 0.8 };
  }

  const seqScore = countMatches(text, SEQUENCE_SIGNALS);
  if (seqScore >= 2) return { altitude: "goal", confidence: 0.7 };

  const goalScore = countMatches(text, GOAL_SIGNALS);
  if (goalScore >= 2) return { altitude: "goal", confidence: 0.7 };

  if (betComponents >= 2) return { altitude: "bet", confidence: 0.5 };

  const vagueScore = countMatches(text, VAGUE_SIGNALS);
  if (vagueScore >= 1) return { altitude: "vague", confidence: 0.6 };

  if (t.length < 80) return { altitude: "vague", confidence: 0.4 };

  return { altitude: "bet", confidence: 0.3 };
}
