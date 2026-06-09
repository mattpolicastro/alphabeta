import type { MechCategory } from "./types";

const PATTERNS: [RegExp, MechCategory][] = [
  [/\b(layout|position|fold|above.the.fold|placement|scroll)\b/i, "layout"],
  [/\b(copy|messaging|framing|urgency|empathy|wording|subject.line|headline)\b/i, "copy"],
  [/\b(visual|color|contrast|attention|indicator|progress|badge)\b/i, "visual"],
  [/\b(friction|step|simplif|reduc|fewer|remov|streamlin|paralysis|overload)\b/i, "friction"],
  [/\b(audience|targeting|segment|persona|locali[sz]|region|language|demograph)\b/i, "audience"],
];

export function classifyMechanism(text: string): MechCategory {
  for (const [pattern, category] of PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "uncategorized";
}
