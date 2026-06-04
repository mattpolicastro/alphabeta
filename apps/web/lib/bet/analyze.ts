// Regex-driven analysis of a free-text dump for the Bet Front Door.
// Mirrors the reflection engine in `design/Bet Front Door.html`. Pure module —
// no I/O, no side effects — so it's straightforward to test in isolation.
//
// Two source modes:
//   - "free" (default) — stream-of-consciousness paste, reflection-only.
//     Surfaces magnitude, confidence, mechanism, falsifier as coaching
//     output; structured articulation fields stay undefined.
//   - "strategy-card" — semi-structured dump produced by stringifying a
//     kanban card (see lib/strategy/elevate.cardToDump). Label-aware
//     extractors look for `Change:`, `Direction:`, `Metric:`, `Magnitude:`,
//     `Mechanism:`, `Fold-if:`, `Confidence:` and prefer those over the
//     loose heuristics. Free-text heuristics still run as a fallback for
//     anything the labels didn't cover.

import type { Articulation, Confidence, Direction } from "@/lib/db/types";

export type ConfidenceAnalysis = {
  level: Confidence;
  label: string;
  hedges: string[];
  strong: string[];
};

export type MechanismAnalysis = {
  found: boolean;
  text: string | null;
};

export type FalsifierAnalysis = {
  found: boolean;
  clause: string | null;
};

export type DumpAnalysis = {
  magnitude: string | null;
  confidence: ConfidenceAnalysis;
  mechanism: MechanismAnalysis;
  falsifier: FalsifierAnalysis;
  // Consolidated, typed-articulation extraction. Mostly empty for free-text
  // source; populated by label extractors for strategy-card source. Callers
  // can spread this into a draft's articulation to seed structured fields.
  articulation: Partial<Articulation>;
};

export type AnalyzeOptions = {
  source?: "free" | "strategy-card";
};

const DIRECTIONS: Direction[] = ["lift", "reduce"];
const CONFIDENCES: Confidence[] = ["hunch-level", "fairly", "highly"];

function labelExtract(text: string, label: string): string | null {
  // Match `<label>:` at the start of a line; capture through end of line.
  // Case-insensitive on the label; preserve the value's original casing.
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+?)\\s*$`, "im");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

const HEDGES = [
  "maybe",
  "i think",
  "pretty sure",
  "probably",
  "might",
  "could",
  "i guess",
  "seems",
  "i suspect",
  "worth a try",
  "worth trying",
];

const STRONG = [
  "certain",
  "definitely",
  "no doubt",
  "i'm sure",
  "confident",
  "clearly",
];

const FALSIFIER_RE =
  /(fold if|i'?ll fold|we'?ll fold|revert|drop it|kill it|abandon|walk away|change my mind|not worth|isn'?t worth|unless|if it'?s? (?:under|below|less)|under \+?\d|below \+?\d|less than \+?\d|guardrail)/i;

const FALSIFIER_CLAUSE_RE =
  /\b(?:fold if|drop it if|revert if|kill it if|change my mind if|abandon it if|if it'?s?)\s+([^.;\n—]+)/i;

const MECH_HINT_RE =
  /\b(?:because|since|the reason(?:\s+is)?|driven by|due to)\b\s+([^.;—]+)/i;

const EVIDENCE_RE =
  /(replays?|recordings?|data|analytics|logs?|funnel|sessions?|users?|people|customers?|visitors?)\b[^.]*\b(show|shows|showed|bounce|bounces|bouncing|drop|drops|dropping|drop-?off|leave|leaving|abandon|exit)/i;

function extractMechanism(text: string): MechanismAnalysis {
  let raw: string | null = null;
  const hint = text.match(MECH_HINT_RE);
  if (hint) {
    raw = hint[1].trim();
  } else {
    const sentences = text.split(/(?<=[.!?—])\s+/);
    for (const s of sentences) {
      if (EVIDENCE_RE.test(s)) {
        raw = s.trim();
        break;
      }
    }
  }
  if (!raw) return { found: false, text: null };
  const cleaned = raw
    .replace(/^[—\-\s]+/, "")
    .replace(
      /^(i'?m\s+)?(pretty sure|fairly sure|quite sure|certain|confident|i think|i believe|i guess|maybe|probably)[\s,]+/i,
      "",
    )
    .replace(/[\s—\-.,;:]+$/, "");
  return { found: true, text: cleaned };
}

export function analyzeDump(
  text: string,
  opts: AnalyzeOptions = {},
): DumpAnalysis {
  const cardMode = opts.source === "strategy-card";
  const t = text.toLowerCase();

  // Label-aware extraction happens first in card mode so labeled values
  // win over loose heuristics. Each labeled value is null in free mode.
  const labelChange = cardMode ? labelExtract(text, "Change") : null;
  const labelDirRaw = cardMode ? labelExtract(text, "Direction") : null;
  const labelMetric = cardMode ? labelExtract(text, "Metric") : null;
  const labelMagnitude = cardMode ? labelExtract(text, "Magnitude") : null;
  const labelMechanism = cardMode ? labelExtract(text, "Mechanism") : null;
  const labelFoldIf = cardMode ? labelExtract(text, "Fold-if") : null;
  const labelConfRaw = cardMode ? labelExtract(text, "Confidence") : null;

  const labelDirection: Direction | null =
    labelDirRaw && (DIRECTIONS as string[]).includes(labelDirRaw.toLowerCase())
      ? (labelDirRaw.toLowerCase() as Direction)
      : null;
  const labelConfidence: Confidence | null =
    labelConfRaw && (CONFIDENCES as string[]).includes(labelConfRaw.toLowerCase())
      ? (labelConfRaw.toLowerCase() as Confidence)
      : null;

  const magM = text.match(/(\d+(?:\.\d+)?\s?%)/);
  const magnitude = labelMagnitude ?? (magM ? magM[1].replace(/\s/, "") : null);

  const foundHedges = HEDGES.filter((h) => t.includes(h));
  const foundStrong = STRONG.filter((s) => t.includes(s));

  let level: Confidence;
  let label: string;
  if (foundStrong.length && !foundHedges.length) {
    level = "highly";
    label = "highly confident";
  } else if (foundHedges.length) {
    level = "hunch-level";
    label = "a hunch";
  } else {
    level = "fairly";
    label = "fairly confident";
  }

  const mechanism = labelMechanism
    ? { found: true, text: labelMechanism }
    : extractMechanism(text);

  const falsFound = !!labelFoldIf || FALSIFIER_RE.test(text);
  const clauseMatch = text.match(FALSIFIER_CLAUSE_RE);

  // Build the consolidated articulation view. Only set keys that were
  // explicitly recovered — undefined means "don't override the draft."
  const articulation: Partial<Articulation> = {};
  if (labelChange) articulation.change = labelChange;
  if (labelDirection) articulation.direction = labelDirection;
  if (labelMetric) articulation.metric = labelMetric;
  if (labelMagnitude) articulation.magnitude = labelMagnitude;
  if (labelMechanism) articulation.mechanism = labelMechanism;
  if (labelFoldIf) articulation.foldIf = labelFoldIf;
  if (labelConfidence) articulation.confidence = labelConfidence;

  return {
    magnitude,
    confidence: { level, label, hedges: foundHedges, strong: foundStrong },
    mechanism,
    falsifier: {
      found: falsFound,
      clause: labelFoldIf ?? (clauseMatch ? clauseMatch[1].trim() : null),
    },
    articulation,
  };
}
