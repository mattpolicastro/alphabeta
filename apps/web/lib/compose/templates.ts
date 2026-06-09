import type {
  Altitude,
  ChatMessage,
  Extraction,
  ExtractionField,
} from "./types";

let _seq = 0;
function msgId(): string {
  return `msg-${++_seq}-${Date.now()}`;
}

function f(value: string, status: "found" | "present" | "missing"): ExtractionField {
  return { value, status };
}

export const PRESET_INPUTS: Record<string, { label: string; text: string }> = {
  single: {
    label: "single bet",
    text: "I think moving the pricing table above the fold will lift checkout starts by about 8%, because session replays show people bouncing at the testimonial section before they ever see the plans. If it comes in under +4% I'd drop it.",
  },
  sequence: {
    label: "sequence",
    text: "We want to redesign the PDP pricing display. First figure out if the current layout is the problem — maybe it's the copy, not the position. Then test 2–3 layout variants. Then take the winner and test price anchoring. Each step depends on the last.",
  },
  strategy: {
    label: "strategy-level",
    text: "We need to increase adoption of investment products among loan-only customers. Currently only 5% cross-sell, want to get to 15% by end of year. Not sure what approach to take — could be email, in-app nudges, or a dashboard redesign.",
  },
  vague: {
    label: "vague idea",
    text: "I have a feeling the onboarding is too long and we're losing people. Should probably test something.",
  },
};

export type ConversationNode = {
  messages: ChatMessage[];
  branches?: Record<string, () => ConversationNode>;
};

export function buildSingleBetConversation(userText: string): ConversationNode {
  const extractions: Extraction = {
    change: f("Move the pricing table above the fold", "found"),
    metric: f("Checkout starts", "found"),
    magnitude: f("+8%", "found"),
    mechanism: f(
      "Session replays show bounce at testimonials before plans are visible",
      "found",
    ),
    foldIf: f("Under +4% → drop it", "found"),
  };

  return {
    messages: [
      {
        id: msgId(),
        role: "user",
        text: userText,
      },
      {
        id: msgId(),
        role: "system",
        text: "That's pretty specific — let me pull it apart.",
        extractions,
        altitude: "bet",
        classify: { icon: "⍺", label: "Single atomic bet", colorClass: "single" },
        chips: [
          { id: "confirm", label: "looks right — proceed" },
          { id: "adjust", label: "need to adjust something" },
          { id: "actually-multi", label: "actually this might be multiple bets" },
        ],
      },
    ],
    branches: {
      confirm: () => ({
        messages: [
          { id: msgId(), role: "user", text: "looks right — proceed" },
          {
            id: msgId(),
            role: "system",
            text: "All five components extracted. I'll pre-fill the wager with these.",
            routeTo: { kind: "bet", label: "Articulate this bet", extractions },
          },
        ],
      }),
      adjust: () => ({
        messages: [
          { id: msgId(), role: "user", text: "need to adjust something" },
          {
            id: msgId(),
            role: "system",
            text: 'Sure — what should I change? You can say something like "the metric should be conversion rate, not checkout starts" or "I\'m less sure than I sounded — more like a hunch."',
            chips: [
              { id: "change-metric", label: "change the metric" },
              { id: "lower-conf", label: "lower my confidence" },
              { id: "change-fold", label: "change the fold-if" },
            ],
          },
        ],
        branches: {
          "change-metric": () => ({
            messages: [
              { id: msgId(), role: "user", text: "change the metric" },
              {
                id: msgId(),
                role: "system",
                text: "Got it — I'll update the metric. What should it be instead?",
              },
            ],
          }),
          "lower-conf": () => ({
            messages: [
              { id: msgId(), role: "user", text: "lower my confidence" },
              {
                id: msgId(),
                role: "system",
                text: "Noted — I'll mark this as a hunch, not a conviction. That's honest, and it changes how aggressively we'd scope the test.",
                routeTo: { kind: "bet", label: "Articulate this bet", extractions: { ...extractions, confidence: f("Hunch-level", "found") } },
              },
            ],
          }),
          "change-fold": () => ({
            messages: [
              { id: msgId(), role: "user", text: "change the fold-if" },
              {
                id: msgId(),
                role: "system",
                text: "What threshold would actually change your mind?",
              },
            ],
          }),
        },
      }),
      "actually-multi": () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "actually this might be multiple bets",
          },
          {
            id: msgId(),
            role: "system",
            text: "Interesting — tell me more. What makes you think there's more than one claim in here?",
            chips: [
              { id: "layout-vs-copy", label: "it could be the layout OR the copy" },
              { id: "steps", label: "there are prerequisite steps" },
            ],
          },
        ],
        branches: {
          "layout-vs-copy": () => ({
            messages: [
              {
                id: msgId(),
                role: "user",
                text: "it could be the layout OR the copy — not sure which to test",
              },
              {
                id: msgId(),
                role: "system",
                text: 'That\'s a diagnostic question hiding inside a bet. Two claims:\n\nA: "Is it the layout (position) or the copy (testimonials)?" — a diagnostic.\nB: "Does moving the table lift checkouts?" — the intervention.\n\nA should resolve before B runs — if it\'s the copy, moving the table won\'t help.',
                classify: {
                  icon: "⛓",
                  label: "Sequence — A resolves before B",
                  colorClass: "sequence",
                },
                routeTo: { kind: "sequence", label: "Set up as a sequence", depType: "chain", subBets: [
                  { question: "Is it the layout (position) or the copy (testimonials)?", instrument: "diagnostic" },
                  { question: "Does moving the table lift checkouts?", instrument: "A/B test" },
                ] },
              },
            ],
          }),
          steps: () => ({
            messages: [
              { id: msgId(), role: "user", text: "there are prerequisite steps" },
              {
                id: msgId(),
                role: "system",
                text: "Makes sense. What needs to be true before this bet is worth running? I'll build the chain.",
              },
            ],
          }),
        },
      }),
    },
  };
}

export function buildSequenceConversation(userText: string): ConversationNode {
  const extractions: Extraction = {
    change: f(
      "Three chained changes: diagnostic → layout variants → price anchoring",
      "found",
    ),
    metric: f("Conversion (implied)", "present"),
    mechanism: f(
      "Each step depends on the prior resolving",
      "found",
    ),
  };

  return {
    messages: [
      { id: msgId(), role: "user", text: userText },
      {
        id: msgId(),
        role: "system",
        text: "I'm hearing three distinct claims chained together — each one depends on the prior resolving.\n\nBet A: Is it the layout or the copy? — diagnostic. Must resolve first.\nBet B: Which of 2–3 layout variants lifts conversion? — depends on A saying \"it's the layout.\"\nBet C: Does price anchoring on the winning layout add lift? — depends on B picking a winner.\n\nIf A says it's the copy, B never runs — and that's the value. You don't spend weeks testing layouts on a premise that didn't hold.",
        extractions,
        altitude: "goal",
        classify: {
          icon: "⛓",
          label: "Sequence of dependent bets · A → B → C",
          colorClass: "sequence",
        },
        chips: [
          { id: "right", label: "that's the right decomposition" },
          { id: "parallel", label: "B and C could run in parallel" },
          { id: "missing", label: "there's a step before A" },
        ],
      },
    ],
    branches: {
      right: () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "that's the right decomposition",
          },
          {
            id: msgId(),
            role: "system",
            text: 'Good. I\'ll set up the sequence. Each bet runs the full lifecycle independently; the chain records which verdicts gate what.',
            routeTo: {
              kind: "sequence", label: "Set up the sequence", depType: "chain", subBets: [
                { question: "Is it the layout or the copy?", instrument: "diagnostic" },
                { question: "Which of 2–3 layout variants lifts conversion?", instrument: "A/B test" },
                { question: "Does price anchoring on the winning layout add lift?", instrument: "A/B test" },
              ],
            },
          },
        ],
      }),
      parallel: () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "B and C could actually run in parallel",
          },
          {
            id: msgId(),
            role: "system",
            text: "That changes the shape — B and C both depend on A, but not on each other. A fan-in rather than a chain:\n\nA → (B + C in parallel) → rollout\n\nBoth B and C need to clear before you'd ship. I'll set the join as AND by default — either one losing prunes the rollout.",
            classify: {
              icon: "⛓",
              label: "Fan-in · A → (B ∥ C) → rollout",
              colorClass: "sequence",
            },
            routeTo: {
              kind: "sequence", label: "Set up with fan-in", depType: "fanin", subBets: [
                { question: "Is it the layout or the copy?", instrument: "diagnostic" },
                { question: "Which layout variant lifts conversion?", instrument: "A/B test" },
                { question: "Does price anchoring add lift?", instrument: "A/B test" },
              ],
            },
          },
        ],
      }),
      missing: () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "there's actually a step before A",
          },
          {
            id: msgId(),
            role: "system",
            text: "What needs to happen first? Describe it and I'll prepend it to the chain.",
          },
        ],
      }),
    },
  };
}

export function buildStrategyConversation(userText: string): ConversationNode {
  const extractions: Extraction = {
    change: f(
      "Not specified yet — this is a goal, not a testable change",
      "missing",
    ),
    metric: f("Cross-sell rate: 5% → 15%", "found"),
    mechanism: f(
      'No causal reasoning — "not sure what approach to take"',
      "missing",
    ),
    magnitude: f("5% → 15% by end of year", "found"),
  };

  return {
    messages: [
      { id: msgId(), role: "user", text: userText },
      {
        id: msgId(),
        role: "system",
        text: "This is a goal with a target, not a bet yet. I can see the metric and the ambition, but there's no specific change to test.\n\nBefore this becomes a bet (or bets), you need to pick an approach.",
        extractions,
        altitude: "goal",
        classify: {
          icon: "▤",
          label: "Strategy-level — needs decomposition first",
          colorClass: "strategy",
        },
        chips: [
          { id: "narrow", label: "narrow to one approach now" },
          { id: "test-approaches", label: "test which approach works" },
          { id: "park", label: "keep it in the strategy layer for now" },
        ],
      },
    ],
    branches: {
      narrow: () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "let me narrow to one — email campaigns",
          },
          {
            id: msgId(),
            role: "system",
            text: 'Good. Now it\'s scoped: "Does an email campaign to loan-only customers lift cross-sell?"\n\nThat\'s getting close to a bet. Next question: what specifically would you email, and what does "work" look like?',
            chips: [
              { id: "single-email", label: "one email test" },
              {
                id: "email-sequence",
                label: "a sequence — subject line, then body, then targeting",
              },
            ],
          },
        ],
        branches: {
          "single-email": () => ({
            messages: [
              { id: msgId(), role: "user", text: "one email test" },
              {
                id: msgId(),
                role: "system",
                text: "Alright — single bet. Let's articulate it.",
                routeTo: {
                  kind: "bet", label: "Articulate this bet", extractions: {
                    change: f("Email campaign to loan-only customers", "found"),
                    metric: f("Cross-sell rate", "found"),
                    magnitude: f("5% → 15%", "found"),
                  },
                },
              },
            ],
          }),
          "email-sequence": () => ({
            messages: [
              {
                id: msgId(),
                role: "user",
                text: "a sequence — subject line, then body, then targeting",
              },
              {
                id: msgId(),
                role: "system",
                text: "Three steps chained: subject line → body → targeting. Each depends on the prior. I'll set it up as a sequence.",
                routeTo: {
                  kind: "sequence", label: "Set up the sequence", depType: "chain", subBets: [
                    { question: "Which subject line gets opened?", instrument: "A/B test" },
                    { question: "Which email body drives action?", instrument: "A/B test" },
                    { question: "Which targeting segment converts?", instrument: "A/B test" },
                  ],
                },
              },
            ],
          }),
        },
      }),
      "test-approaches": () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "I want to test which approach works best",
          },
          {
            id: msgId(),
            role: "system",
            text: "That's a parallel exploration — three independent bets, each testing a different approach against the same goal metric (cross-sell rate):\n\nBet A: Email campaign → does it lift cross-sell?\nBet B: In-app nudges → does it lift cross-sell?\nBet C: Dashboard redesign → does it lift cross-sell?\n\nThese are independent (no dependencies between them) but they share a surface — be careful about running them simultaneously on the same users.",
            routeTo: {
              kind: "sequence", label: "Set up as parallel bets", depType: "parallel", subBets: [
                { question: "Does an email campaign lift cross-sell?", instrument: "A/B test" },
                { question: "Do in-app nudges lift cross-sell?", instrument: "A/B test" },
                { question: "Does a dashboard redesign lift cross-sell?", instrument: "A/B test" },
              ],
            },
          },
        ],
      }),
      park: () => ({
        messages: [
          {
            id: msgId(),
            role: "user",
            text: "keep it in the strategy layer for now",
          },
          {
            id: msgId(),
            role: "system",
            text: "Makes sense — it's a goal, not ready to be a bet. When you've narrowed to a specific approach, come back and we'll structure it.",
            routeTo: { kind: "navigate", label: "Go to strategy board", href: "/strategy" },
          },
        ],
      }),
    },
  };
}

export function buildVagueConversation(userText: string): ConversationNode {
  const extractions: Extraction = {
    change: f(
      "Onboarding is too long — but what specifically would you change?",
      "missing",
    ),
    metric: f(
      "Losing people — which metric? Completion rate? Time-to-first-value?",
      "missing",
    ),
    confidence: f('"I have a feeling" — hunch-level. That\'s fine, but name it.', "present"),
  };

  return {
    messages: [
      { id: msgId(), role: "user", text: userText },
      {
        id: msgId(),
        role: "system",
        text: "I hear a hunch: onboarding too long → losing people. There's a testable kernel here, but it needs sharpening before it's a bet.\n\nLet's sharpen it. What would you actually change about the onboarding?",
        extractions,
        altitude: "vague",
        chips: [
          { id: "cut", label: "cut the tutorial steps" },
          { id: "shorten", label: "shorten the form" },
          { id: "skip", label: "let people skip to the app" },
          { id: "dunno", label: "not sure yet" },
        ],
      },
    ],
    branches: {
      cut: () => buildVagueSharpen("cutting the tutorial steps"),
      shorten: () => buildVagueSharpen("shortening the signup form"),
      skip: () => buildVagueSharpen('adding a "skip to the app" option'),
      dunno: () => ({
        messages: [
          { id: msgId(), role: "user", text: "not sure yet" },
          {
            id: msgId(),
            role: "system",
            text: "That's honest. Before it's a bet, you need a specific change — \"the onboarding is too long\" is a diagnosis, not an intervention. A couple ways to get there:\n\n• Look at the funnel: where exactly do people drop? That tells you what to change.\n• Talk to 3 churned users: what was the last thing they saw?\n\nCome back when you've got a \"what if we…\" and I'll structure it.",
          },
        ],
      }),
    },
  };
}

function buildVagueSharpen(change: string): ConversationNode {
  const cap = change.charAt(0).toUpperCase() + change.slice(1);
  return {
    messages: [
      { id: msgId(), role: "user", text: change },
      {
        id: msgId(),
        role: "system",
        text: `Good — now I have a change. What does "losing people" mean in numbers?`,
        extractions: {
          change: f(cap, "found"),
          metric: f("Still vague — what specifically would you measure?", "missing"),
        },
        chips: [
          { id: "completion", label: "completion rate" },
          { id: "ttv", label: "time to first value" },
          { id: "both", label: "both" },
        ],
      },
    ],
    branches: {
      completion: () => buildVagueMetric(change, cap, "onboarding completion rate"),
      ttv: () => buildVagueMetric(change, cap, "time-to-first-value"),
      both: () =>
        buildVagueMetric(change, cap, "completion rate + time-to-first-value"),
    },
  };
}

function buildVagueMetric(
  change: string,
  capChange: string,
  metric: string,
): ConversationNode {
  return {
    messages: [
      { id: msgId(), role: "user", text: metric },
      {
        id: msgId(),
        role: "system",
        text: `Now it's a bet: "${change}" lifts ${metric}. One more thing — what result would make you say "nope, that wasn't it"?`,
        chips: [
          { id: "threshold", label: "under +5% I'd drop it" },
          { id: "any", label: "any positive signal is enough" },
          { id: "guard", label: "only if nothing else breaks" },
        ],
      },
    ],
    branches: {
      threshold: () =>
        buildVagueFinal(capChange, metric, "under +5% → drop it"),
      any: () =>
        buildVagueFinal(
          capChange,
          metric,
          "any positive lift (you might want a harder line later)",
        ),
      guard: () =>
        buildVagueFinal(
          capChange,
          metric,
          "no regression on key guardrails",
        ),
    },
  };
}

function buildVagueFinal(
  capChange: string,
  metric: string,
  fold: string,
): ConversationNode {
  return {
    messages: [
      {
        id: msgId(),
        role: "user",
        text: fold.startsWith("under")
          ? "under +5% I'd drop it"
          : fold.startsWith("any")
            ? "any positive signal is enough"
            : "only if nothing else breaks",
      },
      {
        id: msgId(),
        role: "system",
        text: "From a feeling to a falsifiable bet in four messages. Ready to articulate it.",
        extractions: {
          change: f(capChange, "found"),
          metric: f(metric, "found"),
          foldIf: f(fold, "found"),
          confidence: f("Hunch-level — and that's fine.", "present"),
        },
        routeTo: { kind: "bet", label: "Articulate this bet", extractions: {
          change: f(capChange, "found"),
          metric: f(metric, "found"),
          foldIf: f(fold, "found"),
          confidence: f("Hunch-level", "found"),
        } },
      },
    ],
  };
}

export function getConversationForPreset(
  presetKey: string,
): ConversationNode | null {
  const preset = PRESET_INPUTS[presetKey];
  if (!preset) return null;

  switch (presetKey) {
    case "single":
      return buildSingleBetConversation(preset.text);
    case "sequence":
      return buildSequenceConversation(preset.text);
    case "strategy":
      return buildStrategyConversation(preset.text);
    case "vague":
      return buildVagueConversation(preset.text);
    default:
      return null;
  }
}

export function getConversationForAltitude(
  altitude: Altitude,
  userText: string,
): ConversationNode {
  switch (altitude) {
    case "ready":
    case "bet":
      return buildSingleBetLike(userText);
    case "goal":
      return buildGoalLike(userText);
    case "vague":
      return buildVagueLike(userText);
  }
}

function buildSingleBetLike(userText: string): ConversationNode {
  return {
    messages: [
      { id: msgId(), role: "user", text: userText },
      {
        id: msgId(),
        role: "system",
        text: "This sounds like a testable claim. Let me parse it and pre-fill what I can — you can correct anything that's off.",
        altitude: "bet",
        classify: { icon: "⍺", label: "Testable bet", colorClass: "single" },
        routeTo: { kind: "bet", label: "Articulate this bet" },
      },
    ],
  };
}

function buildGoalLike(userText: string): ConversationNode {
  return {
    messages: [
      { id: msgId(), role: "user", text: userText },
      {
        id: msgId(),
        role: "system",
        text: "This reads as a goal or a set of related changes — not a single bet yet. Before testing, you need to narrow to a specific intervention.",
        altitude: "goal",
        classify: {
          icon: "▤",
          label: "Goal-level — needs narrowing",
          colorClass: "strategy",
        },
        chips: [
          { id: "pick-one", label: "I'll pick one approach" },
          { id: "park", label: "keep it in strategy for now" },
        ],
      },
    ],
    branches: {
      "pick-one": () => ({
        messages: [
          { id: msgId(), role: "user", text: "I'll pick one approach" },
          {
            id: msgId(),
            role: "system",
            text: "Good — which approach? Say it and I'll structure it as a bet.",
          },
        ],
      }),
      park: () => ({
        messages: [
          { id: msgId(), role: "user", text: "keep it in strategy for now" },
          {
            id: msgId(),
            role: "system",
            text: "Parked. When you've narrowed to a specific change, come back.",
            routeTo: { kind: "navigate", label: "Go to strategy board", href: "/strategy" },
          },
        ],
      }),
    },
  };
}

function buildVagueLike(userText: string): ConversationNode {
  return {
    messages: [
      { id: msgId(), role: "user", text: userText },
      {
        id: msgId(),
        role: "system",
        text: "I hear something worth investigating, but it needs sharpening before it's testable. What would you actually change?",
        altitude: "vague",
        chips: [
          { id: "has-idea", label: "I have a specific idea" },
          { id: "investigate", label: "need to investigate first" },
        ],
      },
    ],
    branches: {
      "has-idea": () => ({
        messages: [
          { id: msgId(), role: "user", text: "I have a specific idea" },
          {
            id: msgId(),
            role: "system",
            text: "Tell me the specific change you'd make and what metric you'd watch. I'll structure it.",
          },
        ],
      }),
      investigate: () => ({
        messages: [
          { id: msgId(), role: "user", text: "need to investigate first" },
          {
            id: msgId(),
            role: "system",
            text: "That's the right call. Run a funnel analysis, watch some session replays, or talk to 3 users who churned. Come back with a \"what if we…\" and I'll help structure it.",
          },
        ],
      }),
    },
  };
}
