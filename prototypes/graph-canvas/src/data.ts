// Static fixture graph, flattened from apps/web:
//   lib/strategy/templates/gps.ts  (FY26 GPS example board)
//   lib/bet/seed.ts                (10 demo bets)
// plus two follow-on drafts (bet-11, bet-12) synthesized from the demo bets'
// own reflections, so the canvas has a live dependency chain to resolve against.
// Elevation links are editorial — reassigned from the fixtures where the
// fixture cardId didn't match the bet's content.

import type { Edge, Node } from '@xyflow/react'
import type { BetRecord, EdgeKind, StratRecord } from './model'

const strat = (
  id: string,
  kind: StratRecord['kind'],
  title: string,
  x: number,
  y: number,
  detail?: string,
): Node => ({
  id,
  type: 'strat',
  position: { x, y },
  data: { strat: { kind, title, detail } },
})

const CRITERIA = {
  win: 'Keep — roll out to 100% this week.',
  inconclusive: 'Hold — sharpen the variant and re-test next quarter.',
  loss: 'Revert — log why in the decision journal.',
}

const bet = (
  id: string,
  x: number,
  y: number,
  b: Partial<BetRecord> & Pick<BetRecord, 'change' | 'metric' | 'magnitude' | 'foldIf' | 'status'>,
): Node => ({
  id,
  type: 'bet',
  position: { x, y },
  data: {
    bet: {
      direction: 'lift',
      mechanism: '',
      surface: '',
      outcome: null,
      criteria: CRITERIA,
      deviation: null,
      learning: null,
      ...b,
    } satisfies BetRecord,
  },
})

export const initialNodes: Node[] = [
  // ── Strategy cascade (GPS example board) ─────────────────────────
  strat('gl-1', 'goal', 'Double annual recurring revenue', 300, 0, 'ARR reaches $10M by end of FY26'),
  strat('gl-2', 'goal', 'Expand into the European market', 900, 0, 'At least 200 paying EU customers by Q4'),

  strat('pb-1', 'problem', 'Sales cycle is too long for enterprise deals', 150, 170, 'Median close 178 days for deals over $50K; win rate drops 40% after 120 days.'),
  strat('pb-3', 'problem', 'Free tier users rarely convert to paid plans', 450, 170, 'Conversion flat at ~2% across channels; benchmark is 8%.'),
  strat('pb-2', 'problem', 'No GDPR-compliant data residency', 750, 170, 'Lost 3 enterprise deals in Q3 to data-residency requirements.'),
  strat('pb-4', 'problem', 'No localized marketing for EU markets', 1050, 170, 'English-only site and collateral; competitors localize in 5+ languages.'),

  strat('sl-1', 'solution', 'Product-led growth with interactive demo', 150, 340, 'Self-serve demo so prospects experience value before engaging sales.'),
  {
    ...strat('sl-3', 'solution', 'Redesign free-to-paid upgrade flow', 450, 340, 'Contextual upgrade prompts on usage triggers, not trial timers.'),
    data: { strat: {
      kind: 'solution', title: 'Redesign free-to-paid upgrade flow', detail: 'Contextual upgrade prompts on usage triggers, not trial timers.',
      grounds: [
        { text: 'Simplifying to 3 tiers won +4.8pp on demo requests (B7)', tier: 'local-observed' },
        { text: 'Usage-triggered prompts outperform timer prompts in PLG benchmarks', tier: 'cross-org-pattern' },
      ],
      screens: ['Free-tier users actually hit the usage triggers we would prompt on'],
    } satisfies StratRecord },
  },
  strat('sl-2', 'solution', 'Deploy EU data region (AWS Frankfurt)', 750, 340, 'Parallel stack in eu-central-1 with data isolation.'),
  strat('sl-4', 'solution', 'Localize for top 3 EU languages', 1050, 340, 'German, French, Spanish across site, docs, sales materials.'),

  // ── Bets ─────────────────────────────────────────────────────────
  bet('bet-1', 60, 580, {
    change: 'adding a self-serve interactive demo to the marketing site',
    direction: 'reduce',
    metric: 'median enterprise sales cycle (days)',
    magnitude: '30 days',
    foldIf: '(not yet declared)',
    mechanism: 'Prospects experience value before engaging sales, front-loading evaluation.',
    surface: 'marketing',
    status: 'draft',
  }),
  bet('bet-3', 470, 900, {
    change: 'testing a high-contrast CTA color on the pricing page',
    metric: 'pricing page → checkout-start rate',
    magnitude: '5%',
    foldIf: '+2pp checkout-start',
    mechanism: 'High-contrast CTA draws attention away from the testimonial band.',
    surface: 'pricing',
    status: 'locked',
    instrument: { type: 'ab', spec: '50/50 by visitor · 14 days' },
    confidence: '0.55',
    guardrails: 'checkout completion must hold; support tickets flat',
  }),
  bet('bet-7', 300, 580, {
    change: 'simplifying pricing from 5 tiers to 3 tiers',
    metric: 'pricing page → demo request conversion',
    magnitude: '4%',
    foldIf: '+2pp conversion rate',
    mechanism: 'Fewer choices reduce decision paralysis — prospects pick faster.',
    surface: 'pricing',
    status: 'resolved',
    outcome: 'win',
    instrument: { type: 'ab' },
    learning: 'Expected +4pp; got +4.8pp. Decision paralysis was real. Test whether the mechanism holds on plan feature comparisons too.',
  }),
  bet('bet-8', 640, 580, {
    change: 'moving the plan picker above the fold on the pricing page',
    metric: 'pricing page → checkout-start rate',
    magnitude: '8%',
    foldIf: '+3pp checkout-start',
    mechanism: 'Plans visible without scrolling — options seen immediately.',
    surface: 'pricing',
    status: 'resolved',
    outcome: 'loss',
    instrument: { type: 'ab' },
    learning: 'Expected +8pp; got +0.4pp. Position wasn’t the problem — the testimonial band intercepts attention. Target the band directly next.',
  }),
  bet('bet-2', 1740, 900, {
    change: 'adding a progress indicator to the onboarding flow',
    metric: 'onboarding completion rate',
    magnitude: '6%',
    foldIf: '+2pp completion rate',
    mechanism: 'Progress indicator reduces perceived effort.',
    surface: 'onboarding',
    status: 'ready',
  }),
  bet('bet-4', 1000, 900, {
    change: 'moving the CTA button above the fold in retention emails',
    metric: '7-day login rate from email',
    magnitude: '8%',
    foldIf: '+2pp login rate',
    mechanism: 'Action visible before the user decides to bail.',
    surface: 'email',
    status: 'running',
    instrument: { type: 'quasi', spec: 'by send cohort — no per-user split in the ESP' },
    confidence: '0.5',
    guardrails: 'unsubscribe rate must hold',
    amendments: [{ ts: '2026-08-29T09:00:00.000Z', field: 'runtime', change: '14d → 21d', reason: 'send volume below forecast; need the extra week to reach the fold-if' }],
  }),

  bet('bet-5', 1180, 580, {
    change: 'shortening email subject lines to under 40 characters',
    metric: 'email open rate',
    magnitude: '3%',
    foldIf: '+1pp open rate',
    mechanism: 'The value prop lands in the preview pane without truncation.',
    surface: 'email',
    status: 'resolved',
    outcome: 'win',
    instrument: { type: 'ab' },
    learning: 'Expected +3pp; got +4.2pp. Apply the same principle to push notification copy next.',
  }),
  bet('bet-10', 920, 580, {
    change: 'shortening the enterprise pricing page from 4 tiers to 2',
    metric: 'pricing page → demo request conversion',
    magnitude: '12%',
    foldIf: '+3pp conversion rate',
    mechanism: 'Choice overload is killing enterprise prospects.',
    surface: 'pricing',
    status: 'resolved',
    outcome: 'inconclusive',
    instrument: { type: 'prepost' },
    expectation: 'demo requests up noticeably within two weeks of the change',
    deviation: '+1.8pp is below the +3pp fold-if, but sales feedback is unanimously positive. Shipping as the new default — logged as a deviation.',
    learning: 'Direction right, magnitude wildly overestimated. Pair quant with a qualitative instrument from the start.',
  }),
  bet('bet-9', 1460, 580, {
    change: 'using urgency framing in retention email copy',
    metric: 'email → re-engagement rate (14-day)',
    magnitude: '5%',
    foldIf: '+1.5pp re-engagement',
    mechanism: 'Scarcity and deadlines create motivation to act now.',
    surface: 'email',
    status: 'resolved',
    outcome: 'loss',
    learning: 'Expected +5pp; got −1.2pp. Urgency backfired — felt spammy. Try empathy framing next.',
  }),
  bet('bet-6', 1740, 580, {
    change: 'reducing onboarding from 7 steps to 4 steps',
    metric: 'onboarding completion rate',
    magnitude: '12%',
    foldIf: '+4pp completion rate',
    mechanism: 'Each removed step eliminates a dropout point.',
    surface: 'onboarding',
    status: 'resolved',
    outcome: 'win',
    instrument: { type: 'holdback', spec: '10% held on the old flow for 3 weeks' },
    learning: 'Expected +12pp; got +14pp. Step count is the dominant lever; progress indicators are cosmetic by comparison.',
  }),

  // ── Follow-ons (synthesized from reflections) ────────────────────
  bet('bet-11', 1180, 1220, {
    change: 'shortening push notification copy to under 60 characters',
    metric: 'push notification open rate',
    magnitude: '3%',
    foldIf: '+1pp open rate',
    mechanism: 'Same preview-pane principle as email subjects — the value prop must land before truncation.',
    surface: 'notifications',
    status: 'draft',
  }),
  bet('bet-12', 1460, 1220, {
    change: 'empathy framing in retention email copy',
    metric: 'email → re-engagement rate (14-day)',
    magnitude: '3%',
    foldIf: '+1.5pp re-engagement',
    mechanism: '“We noticed you haven’t been around” reads as care, not pressure — urgency backfired.',
    surface: 'email',
    status: 'draft',
  }),
]

const edge = (id: string, source: string, target: string, kind: EdgeKind, label?: string): Edge => ({
  id,
  source,
  target,
  data: { kind },
  label,
})

export const initialEdges: Edge[] = [
  // strategy cascade
  edge('e-g1-p1', 'gl-1', 'pb-1', 'lineage'),
  edge('e-g1-p3', 'gl-1', 'pb-3', 'lineage'),
  edge('e-g2-p2', 'gl-2', 'pb-2', 'lineage'),
  edge('e-g2-p4', 'gl-2', 'pb-4', 'lineage'),
  edge('e-p1-s1', 'pb-1', 'sl-1', 'lineage'),
  edge('e-p3-s3', 'pb-3', 'sl-3', 'lineage'),
  edge('e-p2-s2', 'pb-2', 'sl-2', 'lineage'),
  edge('e-p4-s4', 'pb-4', 'sl-4', 'lineage'),

  // elevation: solution → bet ("this bet tests this solution")
  edge('e-s1-b1', 'sl-1', 'bet-1', 'elevation'),
  edge('e-s3-b3', 'sl-3', 'bet-3', 'elevation'),
  edge('e-s3-b7', 'sl-3', 'bet-7', 'elevation'),
  edge('e-s3-b8', 'sl-3', 'bet-8', 'elevation'),

  // spawn: a bet's learning seeded a follow-on
  edge('e-b8-b3', 'bet-8', 'bet-3', 'spawn'),
  edge('e-b5-b11', 'bet-5', 'bet-11', 'spawn'),
  edge('e-b9-b12', 'bet-9', 'bet-12', 'spawn'),

  // dependency: win unlocks, loss prunes
  edge('e-b6-b2', 'bet-6', 'bet-2', 'dependency', 'unlocks'),
  edge('e-b4-b12', 'bet-4', 'bet-12', 'dependency', 'unlocks'),
  edge('e-b4-b11', 'bet-4', 'bet-11', 'dependency', 'unlocks (AND)'),
  edge('e-b5-b11d', 'bet-5', 'bet-11', 'dependency', 'unlocks (AND)'),
]
