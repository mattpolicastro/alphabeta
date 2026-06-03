// Regex-driven analysis of a free-text dump for the Bet Front Door.
// Mirrors the reflection engine in `design/Bet Front Door.html`. Pure module —
// no I/O, no side effects — so it's straightforward to test in isolation.

import type { Confidence } from "@/lib/db/types";

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
};

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

export function analyzeDump(text: string): DumpAnalysis {
  const t = text.toLowerCase();

  const magM = text.match(/(\d+(?:\.\d+)?\s?%)/);
  const magnitude = magM ? magM[1].replace(/\s/, "") : null;

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

  const mechanism = extractMechanism(text);

  const falsFound = FALSIFIER_RE.test(text);
  const clauseMatch = text.match(FALSIFIER_CLAUSE_RE);

  return {
    magnitude,
    confidence: { level, label, hedges: foundHedges, strong: foundStrong },
    mechanism,
    falsifier: {
      found: falsFound,
      clause: clauseMatch ? clauseMatch[1].trim() : null,
    },
  };
}
