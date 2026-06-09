import type { ResolvedBetRecord } from "./types";

export const SURFACE_LABELS: Record<string, string> = {
  email: "Email",
  pricing: "Pricing page",
  onboarding: "Onboarding flow",
};

export const FIXTURE_BETS: ResolvedBetRecord[] = [
  {
    id: "retro-1",
    question: "Subject-line A/B",
    surface: "email",
    mechanism: "layout",
    mechanismText: "Shorter subject lines reduce cognitive load",
    expected: "+3%",
    actual: "+4.2%",
    outcome: "won",
    learning:
      "Subject-line length matters more than personalization.",
    resolvedAt: Date.parse("2025-10-15"),
  },
  {
    id: "retro-2",
    question: "Email body CTA",
    surface: "email",
    mechanism: "layout",
    mechanismText: "Button above the fold reduces scroll friction",
    expected: "+8%",
    actual: "+2.5%",
    outcome: "inconclusive",
    learning:
      "Layout helped but the real lever was the CTA copy, not position.",
    resolvedAt: Date.parse("2025-10-28"),
  },
  {
    id: "retro-3",
    question: "Plan-picker above fold",
    surface: "pricing",
    mechanism: "layout",
    mechanismText:
      "Plans visible without scrolling lifts checkout-start",
    expected: "+8%",
    actual: "+2.5%",
    outcome: "lost",
    learning:
      "Users scroll past the picker regardless — the testimonial band is the real blocker.",
    resolvedAt: Date.parse("2025-11-05"),
  },
  {
    id: "retro-4",
    question: "CTA color test",
    surface: "pricing",
    mechanism: "visual",
    mechanismText:
      "High-contrast CTA draws attention from the testimonial band",
    expected: "+5%",
    actual: "+6.1%",
    outcome: "won",
    learning: "Color contrast works on pricing; try it on signup.",
    resolvedAt: Date.parse("2025-11-12"),
  },
  {
    id: "retro-5",
    question: "Onboarding step reduction",
    surface: "onboarding",
    mechanism: "friction",
    mechanismText: "Fewer steps = higher completion",
    expected: "+12%",
    actual: "+14%",
    outcome: "won",
    learning:
      "Confirmed — every removed step lifted completion ~3pp.",
    resolvedAt: Date.parse("2025-11-20"),
  },
  {
    id: "retro-6",
    question: "Retention email copy",
    surface: "email",
    mechanism: "copy",
    mechanismText: "Urgency framing increases re-engagement",
    expected: "+5%",
    actual: "+1.2%",
    outcome: "lost",
    learning:
      "Urgency backfired — felt spammy. Empathy framing to test next.",
    resolvedAt: Date.parse("2025-12-01"),
  },
  {
    id: "retro-7",
    question: "Simplified pricing tiers",
    surface: "pricing",
    mechanism: "friction",
    mechanismText:
      "3 tiers instead of 5 reduces decision paralysis",
    expected: "+4%",
    actual: "+4.8%",
    outcome: "won",
    learning:
      "Confirmed. But need to watch upsell — fewer tiers means less upsell surface.",
    resolvedAt: Date.parse("2025-12-10"),
  },
  {
    id: "retro-8",
    question: "Onboarding progress bar",
    surface: "onboarding",
    mechanism: "visual",
    mechanismText: "Progress indicator reduces perceived effort",
    expected: "+6%",
    actual: "+3%",
    outcome: "inconclusive",
    learning:
      "Directionally positive but under the fold-if. The step count matters more than the indicator.",
    resolvedAt: Date.parse("2025-12-18"),
  },
];
