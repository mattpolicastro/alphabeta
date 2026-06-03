// Pure evidence-template engine for the Decision Criteria screen.
//
// The "evidence bar" is supplied by the chosen instrument — different
// instruments demand different forms of evidence to trigger a verdict.
// Returns structured parts so components can render emphasis without this
// module depending on React/JSX.

import type { FeasibilityInstrument } from "@/lib/instrument/feasibility";

export type EvidencePart =
  | { type: "text"; text: string }
  | { type: "emph"; text: string };

const t = (text: string): EvidencePart => ({ type: "text", text });
const b = (text: string): EvidencePart => ({ type: "emph", text });

export function evidenceFor(
  instrument: FeasibilityInstrument,
  foldIfPercent: number,
  metric: string,
): EvidencePart[] {
  const lift = `+${foldIfPercent}% lift`;
  const gap = `+${foldIfPercent}% gap`;
  const assoc = `+${foldIfPercent}% association`;
  switch (instrument) {
    case "ab":
      return [
        t("A "),
        b(lift),
        t(` on ${metric}, two-sided at the locked threshold — measured at runtime end, `),
        b("no peeking"),
        t(" before then."),
      ];
    case "quasi":
      return [
        t("A "),
        b(gap),
        t(` in ${metric} at the change date that `),
        b("survives a placebo test"),
        t(" and holds under an alternative comparison group."),
      ];
    case "observational":
      return [
        t("A "),
        b(assoc),
        t(` in ${metric} net of your pre-specified controls that `),
        b("survives the committed sensitivity analysis"),
        t(" — not the prettiest of many specs."),
      ];
    case "holdback":
      return [
        t("A "),
        b(`+${foldIfPercent}% lift`),
        t(` in the held-back cohort's ${metric} that `),
        b("persists past the novelty window"),
        t(" — not a launch-day spike that decays."),
      ];
  }
}
