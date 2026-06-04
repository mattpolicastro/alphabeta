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
  // 1. Draft — GPS SL_1: product-led growth demo
  {
    ...BASE,
    id: id(1),
    cardId: "ex-gps-solution-1",
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

  // 2. Locked — GPS SL_2: EU data region
  {
    ...BASE,
    id: id(2),
    cardId: "ex-gps-solution-2",
    articulation: {
      change: "deploying an EU data region on AWS Frankfurt",
      direction: "lift",
      metric: "EU customer count",
      magnitude: "50 new EU customers in 90 days",
      mechanism:
        "Data residency was the blocker cited in 3 lost deals last quarter. Removing it reopens those pipelines.",
      confidence: "highly",
      foldIf: "+20 EU customers in 90 days",
    },
    instrument: {
      type: "observational",
      overrideReason:
        "Can't randomly assign prospects to data residency; observational before/after.",
      feasibility: {},
    },
    criteria: {
      win: "Keep — commit to multi-region as default for new enterprise contracts.",
      inconclusive:
        "Hold — the infrastructure stays, but don't expand to more regions yet.",
      loss: "Revert to single-region — the compliance cost isn't justified by pipeline movement.",
      minMindChanger: "+20 EU customers in 90 days",
      evidenceBar: "",
      runtime: 90,
    },
    status: "locked",
    lockedAt: daysAgo(12),
    resolution: EMPTY_RESOLUTION,
    learning: EMPTY_LEARNING,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(12),
  },

  // 3. Resolved (win) — GPS SL_3: free-to-paid upgrade flow
  {
    ...BASE,
    id: id(3),
    cardId: "ex-gps-solution-3",
    articulation: {
      change:
        "replacing time-based trial expiration with usage-based upgrade prompts",
      direction: "lift",
      metric: "free-to-paid conversion rate (90-day cohort)",
      magnitude: "8%",
      mechanism:
        "Users hit contextual limits at the moment they feel the product's value, not an arbitrary deadline.",
      confidence: "fairly",
      foldIf: "+2pp conversion rate within 90-day cohort",
    },
    status: "resolved",
    lockedAt: daysAgo(45),
    resolution: {
      outcome: "win",
      actuals: { lift: 3.1, guardrails: "ok" },
      integrityFlags: [],
      call: "keep",
      deviation: { occurred: false, reason: null },
      resolvedAt: daysAgo(5),
    },
    learning: {
      calibration:
        "Expected +8pp; got +3.1pp. Directionally right but overestimated magnitude by ~2.5x. Usage triggers work, but the specific prompts need more iteration.",
      reflection:
        "The mechanism was right — users do convert better at natural limits. But 8% was aspirational. Next time, anchor the magnitude on the cohort data we already have, not the industry benchmark.",
    },
    createdAt: daysAgo(52),
    updatedAt: daysAgo(5),
  },

  // 4. Resolved (loss) — GPS SL_4: localization partnerships
  {
    ...BASE,
    id: id(4),
    cardId: "ex-gps-solution-4",
    articulation: {
      change:
        "translating website and help docs into German, French, and Spanish",
      direction: "lift",
      metric: "EU website-to-signup conversion rate",
      magnitude: "15%",
      mechanism:
        "Localized content reduces friction for non-English-speaking prospects evaluating the product.",
      confidence: "hunch-level",
      foldIf: "+3pp EU website-to-signup conversion within 60 days",
    },
    instrument: {
      type: "quasi",
      overrideReason:
        "Geo-based split: localized pages serve in DE/FR/ES, control markets keep English.",
      feasibility: {},
    },
    criteria: {
      win: "Keep — extend localization to sales collateral and in-app strings.",
      inconclusive: "Hold — localization stays but don't extend scope.",
      loss: "Deprioritize — redirect budget to direct sales in EU.",
      minMindChanger: "+3pp",
      evidenceBar: "",
      runtime: 60,
    },
    status: "resolved",
    lockedAt: daysAgo(75),
    resolution: {
      outcome: "loss",
      actuals: { lift: -0.4, guardrails: "ok" },
      integrityFlags: [],
      call: "hold",
      deviation: {
        occurred: true,
        reason:
          "The localized content quality was poor — agency delivered literal translations, not localized messaging. We're holding rather than reverting because a second pass with native copywriters might recover value.",
      },
      resolvedAt: daysAgo(10),
    },
    learning: {
      calibration:
        "Expected +15pp; got -0.4pp. Confidence was hunch-level and that was honest — the mechanism was wrong as executed. Translation ≠ localization.",
      reflection:
        "The bet was right to test. The failure was in execution (literal translation), not strategy (localized content). Next time, pilot one language with a native speaker before scaling to three simultaneously.",
    },
    createdAt: daysAgo(82),
    updatedAt: daysAgo(10),
  },

  // 5. Resolved (inconclusive, with deviation) — derived from GPS goal 1
  {
    ...BASE,
    id: id(5),
    cardId: null,
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
        "Interesting case: the quantitative result says inconclusive but every qualitative signal says win. Logged the deviation honestly. Next time, maybe run the quant test longer or pair it with a qualitative instrument from the start.",
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
