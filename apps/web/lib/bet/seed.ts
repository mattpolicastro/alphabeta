import type { Bet } from "@/lib/db/types";
import { getDb } from "@/lib/db";
import { fingerprint } from "@/lib/integrity/fingerprint";

function id(n: number): string {
  return `demo-bet-${n.toString().padStart(3, "0")}`;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const BASE: Omit<
  Bet,
  | "id"
  | "surface"
  | "articulation"
  | "status"
  | "lockedAt"
  | "fingerprint"
  | "resolution"
  | "learning"
  | "createdAt"
  | "updatedAt"
> = {
  cardId: null,
  ownerId: null,
  type: "single",
  instrument: { type: "ab", overrideReason: null, feasibility: {} },
  criteria: {
    win: "Keep — roll out to 100% this week.",
    inconclusive: "Hold — sharpen the variant and re-test next quarter.",
    loss: "Revert — log why in the decision journal.",
    minMindChanger: "+4%",
    evidenceBar: "",
    runtime: 14,
  },
  previousVersionId: null,
};

const EMPTY_RESOLUTION: Bet["resolution"] = {
  outcome: null,
  actuals: {},
  integrityFlags: [],
  call: null,
  deviation: { occurred: false, reason: null },
  resolvedAt: null,
};

const EMPTY_LEARNING: Bet["learning"] = {
  calibration: null,
  reflection: null,
};

const FIXTURES: Omit<Bet, "fingerprint">[] = [
  // ── Draft ────────────────────────────────────────────────────────
  {
    ...BASE,
    id: id(1),
    cardId: "ex-gps-solution-1",
    surface: "marketing",
    articulation: {
      change: "adding a self-serve interactive demo to the marketing site",
      direction: "reduce",
      metric: "median enterprise sales cycle (days)",
      magnitude: "30 days",
      mechanism:
        "Prospects experience value before engaging sales, shortening the cycle by front-loading evaluation.",
      confidence: "fairly",
      foldIf: "",
    },
    status: "draft",
    lockedAt: null,
    resolution: EMPTY_RESOLUTION,
    learning: EMPTY_LEARNING,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // ── Ready ────────────────────────────────────────────────────────
  {
    ...BASE,
    id: id(2),
    surface: "onboarding",
    articulation: {
      change: "adding a progress indicator to the onboarding flow",
      direction: "lift",
      metric: "onboarding completion rate",
      magnitude: "6%",
      mechanism:
        "Progress indicator reduces perceived effort, keeping users moving through the flow.",
      confidence: "fairly",
      foldIf: "+2pp completion rate",
    },
    status: "ready",
    lockedAt: null,
    resolution: EMPTY_RESOLUTION,
    learning: EMPTY_LEARNING,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },

  // ── Locked ───────────────────────────────────────────────────────
  {
    ...BASE,
    id: id(3),
    cardId: "ex-gps-solution-2",
    surface: "pricing",
    articulation: {
      change: "testing a high-contrast CTA color on the pricing page",
      direction: "lift",
      metric: "pricing page → checkout-start rate",
      magnitude: "5%",
      mechanism:
        "High-contrast CTA draws attention from the testimonial band, focusing the eye on the action.",
      confidence: "fairly",
      foldIf: "+2pp checkout-start",
    },
    status: "locked",
    lockedAt: daysAgo(4),
    resolution: EMPTY_RESOLUTION,
    learning: EMPTY_LEARNING,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(4),
  },

  // ── Running ──────────────────────────────────────────────────────
  {
    ...BASE,
    id: id(4),
    surface: "email",
    articulation: {
      change: "moving the CTA button above the fold in retention emails",
      direction: "lift",
      metric: "7-day login rate from email",
      magnitude: "8%",
      mechanism:
        "Button above the fold reduces scroll friction — the action is visible before the user decides to bail.",
      confidence: "fairly",
      foldIf: "+2pp login rate",
    },
    status: "running",
    lockedAt: daysAgo(8),
    resolution: EMPTY_RESOLUTION,
    learning: EMPTY_LEARNING,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(8),
  },

  // ── Resolved: won ────────────────────────────────────────────────
  {
    ...BASE,
    id: id(5),
    surface: "email",
    articulation: {
      change: "shortening email subject lines to under 40 characters",
      direction: "lift",
      metric: "email open rate",
      magnitude: "3%",
      mechanism:
        "Shorter subject lines reduce cognitive load — the value prop lands in the preview pane without truncation.",
      confidence: "fairly",
      foldIf: "+1pp open rate",
    },
    status: "resolved",
    lockedAt: daysAgo(55),
    resolution: {
      outcome: "win",
      actuals: { lift: 4.2, guardrails: "ok" },
      integrityFlags: [],
      call: "keep",
      deviation: { occurred: false, reason: null },
      resolvedAt: daysAgo(40),
    },
    learning: {
      calibration:
        "Expected +3pp; got +4.2pp. Subject-line length matters more than personalization tokens.",
      reflection:
        "Clean win. The mechanism was right — cognitive load in the preview pane is the bottleneck. Apply the same principle to push notification copy next.",
    },
    createdAt: daysAgo(62),
    updatedAt: daysAgo(40),
  },

  // ── Resolved: won ────────────────────────────────────────────────
  {
    ...BASE,
    id: id(6),
    surface: "onboarding",
    articulation: {
      change: "reducing onboarding from 7 steps to 4 steps",
      direction: "lift",
      metric: "onboarding completion rate",
      magnitude: "12%",
      mechanism:
        "Fewer steps = higher completion. Each removed step eliminates a dropout point.",
      confidence: "highly",
      foldIf: "+4pp completion rate",
    },
    status: "resolved",
    lockedAt: daysAgo(50),
    resolution: {
      outcome: "win",
      actuals: { lift: 14, guardrails: "ok" },
      integrityFlags: [],
      call: "keep",
      deviation: { occurred: false, reason: null },
      resolvedAt: daysAgo(35),
    },
    learning: {
      calibration:
        "Expected +12pp; got +14pp. Every removed step lifted completion ~3pp. The friction reduction mechanism is reliable here.",
      reflection:
        "Confirmed — step count is the dominant lever in onboarding. Progress indicators are cosmetic compared to actually removing steps.",
    },
    createdAt: daysAgo(58),
    updatedAt: daysAgo(35),
  },

  // ── Resolved: won ────────────────────────────────────────────────
  {
    ...BASE,
    id: id(7),
    cardId: "ex-gps-solution-3",
    surface: "pricing",
    articulation: {
      change: "simplifying pricing from 5 tiers to 3 tiers",
      direction: "lift",
      metric: "pricing page → demo request conversion rate",
      magnitude: "4%",
      mechanism:
        "3 tiers instead of 5 reduces decision paralysis — prospects pick faster when the choice set is smaller.",
      confidence: "fairly",
      foldIf: "+2pp conversion rate",
    },
    criteria: {
      win: "Keep — commit to 3-tier structure.",
      inconclusive: "Hold — keep 3 tiers but watch upsell metrics.",
      loss: "Revert to 5 tiers.",
      minMindChanger: "+2pp",
      evidenceBar: "",
      runtime: 30,
    },
    status: "resolved",
    lockedAt: daysAgo(45),
    resolution: {
      outcome: "win",
      actuals: { lift: 4.8, guardrails: "ok" },
      integrityFlags: [],
      call: "keep",
      deviation: { occurred: false, reason: null },
      resolvedAt: daysAgo(15),
    },
    learning: {
      calibration:
        "Expected +4pp; got +4.8pp. Friction reduction on pricing works. But need to watch upsell — fewer tiers means less upsell surface.",
      reflection:
        "Decision paralysis was real. The mechanism (fewer choices → faster decisions) holds on pricing. Test whether it holds on plan feature comparisons too.",
    },
    createdAt: daysAgo(52),
    updatedAt: daysAgo(15),
  },

  // ── Resolved: loss ───────────────────────────────────────────────
  {
    ...BASE,
    id: id(8),
    surface: "pricing",
    articulation: {
      change: "moving the plan picker above the fold on the pricing page",
      direction: "lift",
      metric: "pricing page → checkout-start rate",
      magnitude: "8%",
      mechanism:
        "Plans visible without scrolling lifts checkout-start — users see their options immediately.",
      confidence: "fairly",
      foldIf: "+3pp checkout-start",
    },
    status: "resolved",
    lockedAt: daysAgo(70),
    resolution: {
      outcome: "loss",
      actuals: { lift: 0.4, guardrails: "ok" },
      integrityFlags: [],
      call: "revert",
      deviation: { occurred: false, reason: null },
      resolvedAt: daysAgo(50),
    },
    learning: {
      calibration:
        "Expected +8pp; got +0.4pp (under the +3pp fold-if). Users scroll past the picker regardless — the testimonial band is the real blocker.",
      reflection:
        "Layout position wasn't the problem. The testimonial band intercepts attention. Next bet should target the band directly, not the picker position.",
    },
    createdAt: daysAgo(78),
    updatedAt: daysAgo(50),
  },

  // ── Resolved: loss ───────────────────────────────────────────────
  {
    ...BASE,
    id: id(9),
    cardId: "ex-gps-solution-4",
    surface: "email",
    articulation: {
      change: "using urgency framing in retention email copy",
      direction: "lift",
      metric: "email → re-engagement rate (14-day)",
      magnitude: "5%",
      mechanism:
        "Urgency framing increases re-engagement — scarcity and deadlines create motivation to act now.",
      confidence: "hunch-level",
      foldIf: "+1.5pp re-engagement",
    },
    status: "resolved",
    lockedAt: daysAgo(60),
    resolution: {
      outcome: "loss",
      actuals: { lift: -1.2, guardrails: "ok" },
      integrityFlags: [],
      call: "revert",
      deviation: { occurred: false, reason: null },
      resolvedAt: daysAgo(42),
    },
    learning: {
      calibration:
        "Expected +5pp; got -1.2pp. Urgency backfired — felt spammy. The copy mechanism was wrong for this surface.",
      reflection:
        "Urgency framing works in transactional contexts but not in re-engagement. Empathy framing to test next — \"we noticed you haven't been around\" instead of \"last chance.\"",
    },
    createdAt: daysAgo(68),
    updatedAt: daysAgo(42),
  },

  // ── Resolved: inconclusive (with deviation) ──────────────────────
  {
    ...BASE,
    id: id(10),
    surface: "pricing",
    articulation: {
      change:
        "shortening the enterprise pricing page from 4 tiers to 2 tiers",
      direction: "lift",
      metric: "pricing page → demo request conversion rate",
      magnitude: "12%",
      mechanism:
        "Choice overload is killing enterprise prospects. Reducing options focuses the decision on the right plan.",
      confidence: "fairly",
      foldIf: "+3pp conversion rate",
    },
    criteria: {
      win: "Keep — commit to 2-tier enterprise structure.",
      inconclusive: "Hold — keep it but don't extend to other segments.",
      loss: "Revert — the enterprise buyer needs granularity.",
      minMindChanger: "+3pp",
      evidenceBar: "",
      runtime: 30,
    },
    status: "resolved",
    lockedAt: daysAgo(30),
    resolution: {
      outcome: "inconclusive",
      actuals: { lift: 1.8, guardrails: "ok" },
      integrityFlags: [],
      call: "keep",
      deviation: {
        occurred: true,
        reason:
          "The +1.8pp lift is below our +3pp fold-if, but qualitative feedback from sales is unanimously positive — prospects are less confused and ask fewer clarifying questions. Shipping it as the new default.",
      },
      resolvedAt: daysAgo(2),
    },
    learning: {
      calibration:
        "Expected +12pp; got +1.8pp. The direction was right but the magnitude wildly overestimated. Pricing page conversion is stickier than expected.",
      reflection:
        "Interesting case: the quantitative result says inconclusive but every qualitative signal says win. Logged the deviation honestly. Next time, pair quant with qualitative instrument from the start.",
    },
    createdAt: daysAgo(38),
    updatedAt: daysAgo(2),
  },
];

export async function seedDemoBets(): Promise<number> {
  const db = getDb();

  const existing = await db.bets
    .where("id")
    .startsWith("demo-bet-")
    .count();
  if (existing > 0) return 0;

  const bets: Bet[] = [];
  for (const fixture of FIXTURES) {
    let fp: string | null = null;
    if (fixture.lockedAt) {
      try {
        fp = await fingerprint({
          articulation: fixture.articulation,
          instrument: fixture.instrument,
          criteria: fixture.criteria,
          lockedAt: fixture.lockedAt,
        });
      } catch {
        fp = "demo-fingerprint";
      }
    }
    bets.push({ ...fixture, fingerprint: fp });
  }

  await db.bets.bulkAdd(bets);
  return bets.length;
}

export async function clearDemoBets(): Promise<number> {
  const db = getDb();
  const ids = await db.bets
    .where("id")
    .startsWith("demo-bet-")
    .primaryKeys();
  await db.bets.bulkDelete(ids as string[]);
  return ids.length;
}
