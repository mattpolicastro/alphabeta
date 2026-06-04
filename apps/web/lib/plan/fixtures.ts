import type { PlanEntry } from "./types";

export const PLAN_FIXTURES: PlanEntry[] = [
  {
    type: "seq",
    id: "email",
    name: "Email campaign",
    chain: "A → B",
    bets: [
      {
        id: "a",
        name: "Subject-line A/B",
        surface: "email · open rate",
        metric: "open rate",
        status: "won",
        start: 0,
        dur: 2,
        resolved: true,
      },
      {
        id: "b",
        name: "Email body A/B",
        surface: "email · login CTA",
        metric: "7-day login",
        status: "running",
        start: 2,
        dur: 3,
        dep: "a",
      },
    ],
  },
  {
    type: "solo",
    bet: {
      id: "c",
      name: "Plan-picker above fold",
      surface: "pricing page",
      metric: "checkout-start",
      status: "running",
      start: 1,
      dur: 4,
    },
  },
  {
    type: "seq",
    id: "checkout",
    name: "Checkout sequence",
    chain: "D → F",
    bets: [
      {
        id: "d",
        name: "CTA color test",
        surface: "pricing page",
        metric: "checkout-start",
        status: "locked",
        start: 4,
        dur: 2,
      },
      {
        id: "f",
        name: "Winning CTA + copy",
        surface: "pricing page",
        metric: "checkout-start",
        status: "draft",
        start: 6,
        dur: 2,
        dep: "d",
      },
    ],
  },
  {
    type: "solo",
    bet: {
      id: "e",
      name: "Onboarding simplify",
      surface: "signup flow",
      metric: "completion rate",
      status: "draft",
      start: 7,
      dur: 3,
    },
  },
];
