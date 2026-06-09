import type { Articulation, Confidence, Direction } from "@/lib/db/types";
import type { Extraction } from "./types";
import { mintDraft } from "@/lib/bet/queries";

export function extractionToArticulation(
  ext: Extraction,
): Partial<Articulation> {
  const result: Partial<Articulation> = {};

  if (ext.change?.status === "found") result.change = ext.change.value;
  if (ext.metric?.status === "found") result.metric = ext.metric.value;
  if (ext.magnitude?.status === "found") result.magnitude = ext.magnitude.value;
  if (ext.foldIf?.status === "found") result.foldIf = ext.foldIf.value;

  if (ext.mechanism?.status === "found" || ext.mechanism?.status === "present") {
    result.mechanism = ext.mechanism.value;
  }

  if (ext.direction?.status === "found") {
    const d = ext.direction.value.toLowerCase();
    if (d === "lift" || d === "reduce") result.direction = d as Direction;
  }

  if (ext.confidence?.status === "found" || ext.confidence?.status === "present") {
    const c = ext.confidence.value.toLowerCase();
    if (c.includes("hunch")) result.confidence = "hunch-level";
    else if (c.includes("highly")) result.confidence = "highly";
    else if (c.includes("fairly")) result.confidence = "fairly";
  }

  return result;
}

export async function mintFromExtraction(
  ext: Extraction,
): Promise<string> {
  const articulation = extractionToArticulation(ext);
  const bet = await mintDraft(articulation);
  return bet.id;
}

export type SequenceSeed = {
  claim?: string;
  mechanism?: string;
  depType: "chain" | "fanin" | "parallel";
  subBets: { question: string; instrument: string }[];
};

const SEQ_KEY = "ab_compose_sequence";

export function stashSequenceSeed(seed: SequenceSeed): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEQ_KEY, JSON.stringify(seed));
  } catch {
    // Silently drop — the user still navigates.
  }
}

export function takeSequenceSeed(): SequenceSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SEQ_KEY);
    if (raw === null) return null;
    window.localStorage.removeItem(SEQ_KEY);
    return JSON.parse(raw) as SequenceSeed;
  } catch {
    return null;
  }
}
