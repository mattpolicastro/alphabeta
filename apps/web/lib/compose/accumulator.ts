import type { Extraction, ExtractionField } from "./types";

function mergeField(
  existing: ExtractionField | undefined,
  incoming: ExtractionField | undefined,
): ExtractionField | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;
  if (incoming.status === "found" && existing.status !== "found")
    return incoming;
  if (incoming.status === "present" && existing.status === "missing")
    return incoming;
  if (incoming.value && incoming.value !== existing.value) return incoming;
  return existing;
}

export function mergeExtractions(
  base: Extraction,
  update: Extraction,
): Extraction {
  const keys = new Set([
    ...Object.keys(base),
    ...Object.keys(update),
  ]) as Set<keyof Extraction>;

  const result: Extraction = {};
  for (const k of keys) {
    const merged = mergeField(base[k], update[k]);
    if (merged) result[k] = merged;
  }
  return result;
}
