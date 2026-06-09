import type { RetroMode } from "@/lib/km/types";

const SUMMARIES: Record<RetroMode, { heading: string; body: string; items: string[] }> = {
  clusters: {
    heading: "cycle summary · by mechanism",
    body: "Across 8 bets this quarter:",
    items: [
      "Friction reduction is your most reliable theory — 2/2 wins. Keep betting here.",
      "Layout/position is mixed (1W/1I/1L) — works on email, not on pricing. The surface matters.",
      "Copy/messaging failed — urgency framing backfired. Your learning says empathy next.",
      "Visual/attention split — worked on pricing (color contrast), didn’t on onboarding (progress bar).",
    ],
  },
  matrix: {
    heading: "cycle summary · surface × mechanism",
    body: "The cross-tab reveals where mechanisms work and where they don’t:",
    items: [
      "Pricing page responds to visual + friction interventions but not layout alone.",
      "Email responds to layout but not copy — your copy theories need rethinking.",
      "Onboarding rewards friction reduction more than visual polish.",
      "No bets tested copy on pricing or friction on email — blind spots for next cycle.",
    ],
  },
  evolution: {
    heading: "cycle summary · theory evolution",
    body: "How your understanding deepened per surface:",
    items: [
      "Pricing: started with layout → failed. Pivoted to visual + friction → both won. The testimonial band was the blocker, not plan visibility.",
      "Email: layout works for structure; copy failed for tone. Next cycle: empathy over urgency.",
      "Onboarding: step reduction > visual polish. Indicator was nice but step count is the real lever.",
    ],
  },
};

export function CycleSummary({ mode }: { mode: RetroMode }) {
  const s = SUMMARIES[mode];
  return (
    <div className="border-[1.5px] border-terra-line bg-terra-soft p-[14px_16px] mt-[18px]">
      <div className="text-[11px] tracking-[1.5px] uppercase text-terra font-bold mb-[8px]">
        {s.heading}
      </div>
      <div className="text-[12px] leading-[1.6]">{s.body}</div>
      <ul className="mt-[8px] pl-[18px] list-disc">
        {s.items.map((item, i) => (
          <li key={i} className="mb-[4px] text-[11.5px] leading-[1.5]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
