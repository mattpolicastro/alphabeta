export type BetOutcome = "won" | "lost" | "inconclusive";

export type MechCategory =
  | "layout"
  | "copy"
  | "visual"
  | "friction"
  | "audience"
  | "uncategorized";

export const MECH_LABELS: Record<MechCategory, string> = {
  layout: "Layout / position",
  copy: "Copy / messaging",
  visual: "Visual / attention",
  friction: "Friction reduction",
  audience: "Audience / targeting",
  uncategorized: "Uncategorized",
};

export interface ResolvedBetRecord {
  id: string;
  question: string;
  surface: string;
  mechanism: MechCategory;
  mechanismText: string;
  expected: string;
  actual: string;
  outcome: BetOutcome;
  learning: string;
  resolvedAt: number;
  objective?: string;
}

export type RetroMode = "clusters" | "matrix" | "evolution";
