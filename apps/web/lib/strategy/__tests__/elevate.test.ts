import { describe, expect, it } from "vitest";
import { cardToDump, isElevatable } from "@/lib/strategy/elevate";
import type { BoardState, Card, TemplateId } from "@/lib/strategy/types";
import { defaultBoardState } from "@/lib/strategy/constants";

function workCard(id: string, description: string): Card {
  return {
    id,
    columnId: "work",
    saved: true,
    collapsed: false,
    fields: { columnId: "work", description, done: false },
  };
}

function goalCard(
  id: string,
  title: string,
  measuredBy: string,
  goalValue?: string,
): Card {
  return {
    id,
    columnId: "goals",
    saved: true,
    collapsed: false,
    fields: {
      columnId: "goals",
      title,
      measuredBy,
      mode: "value",
      goalValue,
    },
  };
}

function problemCard(id: string, title: string): Card {
  return {
    id,
    columnId: "problems",
    saved: true,
    collapsed: false,
    fields: { columnId: "problems", title },
  };
}

function boardWith(cards: Card[], connections: BoardState["connections"]): BoardState {
  return { ...defaultBoardState(), cards, connections };
}

describe("isElevatable", () => {
  it("returns true for the rightmost column (work in NSF)", () => {
    expect(isElevatable(workCard("w1", "swap CTA"), "nsf")).toBe(true);
  });

  it("returns false for non-rightmost columns", () => {
    expect(isElevatable(goalCard("g1", "x", "y"), "nsf")).toBe(false);
    expect(isElevatable(problemCard("p1", "x"), "nsf")).toBe(false);
  });

  it("returns false for unsaved cards", () => {
    const draft = { ...workCard("w1", "x"), saved: false };
    expect(isElevatable(draft, "nsf")).toBe(false);
  });
});

describe("cardToDump — NSF work card", () => {
  it("emits Change: from the work description", () => {
    const card = workCard("w1", "swap the hero CTA verb");
    const dump = cardToDump(card, boardWith([card], []), "nsf");
    expect(dump).toMatch(/^Change:\s+swap the hero CTA verb$/m);
  });

  it("emits Direction: lift by default (work is meant to lift its goal)", () => {
    const card = workCard("w1", "x");
    const dump = cardToDump(card, boardWith([card], []), "nsf");
    expect(dump).toMatch(/^Direction:\s+lift$/m);
  });

  it("pulls Metric: from the closest ancestor goal's measuredBy", () => {
    const work = workCard("w1", "ship oauth");
    const goal = goalCard("g1", "Reduce signup friction", "signup completion %");
    const dump = cardToDump(
      work,
      boardWith([work, goal], [{ id: "c1", fromCardId: "g1", toCardId: "w1" }]),
      "nsf",
    );
    expect(dump).toMatch(/^Metric:\s+signup completion %$/m);
  });

  it("pulls Magnitude: from the goal's goalValue when set", () => {
    const work = workCard("w1", "ship");
    const goal = goalCard("g1", "Reduce", "rate", "78%");
    const dump = cardToDump(
      work,
      boardWith([work, goal], [{ id: "c1", fromCardId: "g1", toCardId: "w1" }]),
      "nsf",
    );
    expect(dump).toMatch(/^Magnitude:\s+78%$/m);
  });

  it("pulls Mechanism: from the closest ancestor problem's title", () => {
    const work = workCard("w1", "fix it");
    const prob = problemCard("p1", "Password reset is broken");
    const dump = cardToDump(
      work,
      boardWith([work, prob], [{ id: "c1", fromCardId: "p1", toCardId: "w1" }]),
      "nsf",
    );
    expect(dump).toMatch(/^Mechanism:\s+Password reset is broken$/m);
  });

  it("omits Metric/Mechanism labels when there's no matching ancestor", () => {
    const work = workCard("w1", "x");
    const dump = cardToDump(work, boardWith([work], []), "nsf");
    expect(dump).not.toMatch(/^Metric:/m);
    expect(dump).not.toMatch(/^Mechanism:/m);
  });

  it("includes a Context block listing all ancestors by column", () => {
    const work = workCard("w1", "x");
    const goal = goalCard("g1", "Goal A", "metric a");
    const prob = problemCard("p1", "Problem B");
    const dump = cardToDump(
      work,
      boardWith(
        [work, goal, prob],
        [
          { id: "c1", fromCardId: "g1", toCardId: "w1" },
          { id: "c2", fromCardId: "p1", toCardId: "g1" },
        ],
      ),
      "nsf",
    );
    expect(dump).toMatch(/Context:/);
    expect(dump).toMatch(/Goal A/);
    expect(dump).toMatch(/Problem B/);
  });

  it("throws when called on a non-rightmost column", () => {
    const goal = goalCard("g1", "x", "y");
    expect(() => cardToDump(goal, boardWith([goal], []), "nsf")).toThrow(
      /rightmost|elevatable/i,
    );
  });
});

// --- GPS ---

function gpsSolutionCard(id: string, title: string, description?: string): Card {
  return {
    id,
    columnId: "solutions",
    saved: true,
    collapsed: false,
    fields: { columnId: "solutions", title, description },
  };
}

function gpsGoalCard(id: string, title: string, measuredBy?: string, targetValue?: string): Card {
  return {
    id,
    columnId: "gps-goals",
    saved: true,
    collapsed: false,
    fields: { columnId: "gps-goals", title, measuredBy, targetValue },
  };
}

function gpsProblemCard(id: string, title: string): Card {
  return {
    id,
    columnId: "gps-problems",
    saved: true,
    collapsed: false,
    fields: { columnId: "gps-problems", title },
  };
}

describe("cardToDump — GPS solution card", () => {
  it("emits Change: from the solution title", () => {
    const card = gpsSolutionCard("s1", "Add SSO integration");
    const dump = cardToDump(card, boardWith([card], []), "gps");
    expect(dump).toMatch(/^Change:\s+Add SSO integration$/m);
  });

  it("emits Direction: lift", () => {
    const card = gpsSolutionCard("s1", "x");
    const dump = cardToDump(card, boardWith([card], []), "gps");
    expect(dump).toMatch(/^Direction:\s+lift$/m);
  });

  it("pulls Metric: from the closest ancestor gps-goal's measuredBy", () => {
    const sol = gpsSolutionCard("s1", "fix onboarding");
    const goal = gpsGoalCard("g1", "Improve retention", "30-day retention %");
    const dump = cardToDump(
      sol,
      boardWith([sol, goal], [{ id: "c1", fromCardId: "g1", toCardId: "s1" }]),
      "gps",
    );
    expect(dump).toMatch(/^Metric:\s+30-day retention %$/m);
  });

  it("pulls Magnitude: from the gps-goal's targetValue", () => {
    const sol = gpsSolutionCard("s1", "fix");
    const goal = gpsGoalCard("g1", "Improve", "rate", "85%");
    const dump = cardToDump(
      sol,
      boardWith([sol, goal], [{ id: "c1", fromCardId: "g1", toCardId: "s1" }]),
      "gps",
    );
    expect(dump).toMatch(/^Magnitude:\s+85%$/m);
  });

  it("pulls Mechanism: from the closest ancestor gps-problem's title", () => {
    const sol = gpsSolutionCard("s1", "fix it");
    const prob = gpsProblemCard("p1", "Users drop off at step 3");
    const dump = cardToDump(
      sol,
      boardWith([sol, prob], [{ id: "c1", fromCardId: "p1", toCardId: "s1" }]),
      "gps",
    );
    expect(dump).toMatch(/^Mechanism:\s+Users drop off at step 3$/m);
  });

  it("includes Description: when the solution has one", () => {
    const sol = gpsSolutionCard("s1", "Add SSO", "Use SAML for enterprise clients");
    const dump = cardToDump(sol, boardWith([sol], []), "gps");
    expect(dump).toMatch(/^Description:\s+Use SAML for enterprise clients$/m);
  });

  it("omits Metric/Mechanism when no ancestors exist", () => {
    const sol = gpsSolutionCard("s1", "x");
    const dump = cardToDump(sol, boardWith([sol], []), "gps");
    expect(dump).not.toMatch(/^Metric:/m);
    expect(dump).not.toMatch(/^Mechanism:/m);
  });
});

// --- RICE ---

function ricePrioritizedCard(id: string, title: string, riceScore?: number): Card {
  return {
    id,
    columnId: "prioritized",
    saved: true,
    collapsed: false,
    fields: { columnId: "prioritized", title, riceScore },
  };
}

function riceIdeaCard(id: string, title: string, description?: string): Card {
  return {
    id,
    columnId: "ideas",
    saved: true,
    collapsed: false,
    fields: { columnId: "ideas", title, description },
  };
}

function riceScoringCard(
  id: string,
  title: string,
  scores: { reach?: number; impact?: number; confidence?: number; effort?: number },
): Card {
  return {
    id,
    columnId: "scoring",
    saved: true,
    collapsed: false,
    fields: { columnId: "scoring", title, ...scores },
  };
}

describe("cardToDump — RICE prioritized card", () => {
  it("emits Change: from the prioritized title", () => {
    const card = ricePrioritizedCard("r1", "Dark mode");
    const dump = cardToDump(card, boardWith([card], []), "rice");
    expect(dump).toMatch(/^Change:\s+Dark mode$/m);
  });

  it("emits Direction: lift", () => {
    const card = ricePrioritizedCard("r1", "x");
    const dump = cardToDump(card, boardWith([card], []), "rice");
    expect(dump).toMatch(/^Direction:\s+lift$/m);
  });

  it("pulls Mechanism: from the closest ancestor idea's description", () => {
    const pri = ricePrioritizedCard("r1", "Dark mode");
    const idea = riceIdeaCard("i1", "Theme support", "Users request dark mode 3:1 over any other feature");
    const dump = cardToDump(
      pri,
      boardWith([pri, idea], [{ id: "c1", fromCardId: "i1", toCardId: "r1" }]),
      "rice",
    );
    expect(dump).toMatch(/^Mechanism:\s+Users request dark mode 3:1 over any other feature$/m);
  });

  it("pulls RICE dimensions from the closest ancestor scoring card", () => {
    const pri = ricePrioritizedCard("r1", "Dark mode");
    const scoring = riceScoringCard("sc1", "Dark mode scoring", { reach: 1000, impact: 3, confidence: 80, effort: 2 });
    const dump = cardToDump(
      pri,
      boardWith([pri, scoring], [{ id: "c1", fromCardId: "sc1", toCardId: "r1" }]),
      "rice",
    );
    expect(dump).toMatch(/^RICE dimensions:\s+R:1000 I:3 C:80 E:2$/m);
  });

  it("emits Score: when the prioritized card has a riceScore", () => {
    const pri = ricePrioritizedCard("r1", "Dark mode", 120);
    const dump = cardToDump(pri, boardWith([pri], []), "rice");
    expect(dump).toMatch(/^Score:\s+120$/m);
  });

  it("omits RICE dimensions and Mechanism when no ancestors exist", () => {
    const pri = ricePrioritizedCard("r1", "x");
    const dump = cardToDump(pri, boardWith([pri], []), "rice");
    expect(dump).not.toMatch(/^RICE dimensions:/m);
    expect(dump).not.toMatch(/^Mechanism:/m);
  });
});

// --- OKR ---

function okrInitiativeCard(id: string, title: string, description?: string): Card {
  return {
    id,
    columnId: "initiatives",
    saved: true,
    collapsed: false,
    fields: { columnId: "initiatives", title, description },
  };
}

function okrKeyResultCard(id: string, title: string, measuredBy?: string, targetValue?: string): Card {
  return {
    id,
    columnId: "key-results",
    saved: true,
    collapsed: false,
    fields: { columnId: "key-results", title, measuredBy, targetValue },
  };
}

function okrObjectiveCard(id: string, title: string): Card {
  return {
    id,
    columnId: "objectives",
    saved: true,
    collapsed: false,
    fields: { columnId: "objectives", title },
  };
}

describe("cardToDump — OKR initiative card", () => {
  it("emits Change: from the initiative title", () => {
    const card = okrInitiativeCard("i1", "Ship mobile app");
    const dump = cardToDump(card, boardWith([card], []), "okr");
    expect(dump).toMatch(/^Change:\s+Ship mobile app$/m);
  });

  it("emits Direction: lift", () => {
    const card = okrInitiativeCard("i1", "x");
    const dump = cardToDump(card, boardWith([card], []), "okr");
    expect(dump).toMatch(/^Direction:\s+lift$/m);
  });

  it("pulls Metric: from the closest ancestor key-result's measuredBy", () => {
    const init = okrInitiativeCard("i1", "Ship mobile app");
    const kr = okrKeyResultCard("kr1", "Mobile DAU", "daily active users", "50000");
    const dump = cardToDump(
      init,
      boardWith([init, kr], [{ id: "c1", fromCardId: "kr1", toCardId: "i1" }]),
      "okr",
    );
    expect(dump).toMatch(/^Metric:\s+daily active users$/m);
  });

  it("pulls Magnitude: from the key-result's targetValue", () => {
    const init = okrInitiativeCard("i1", "Ship");
    const kr = okrKeyResultCard("kr1", "DAU", "dau", "50000");
    const dump = cardToDump(
      init,
      boardWith([init, kr], [{ id: "c1", fromCardId: "kr1", toCardId: "i1" }]),
      "okr",
    );
    expect(dump).toMatch(/^Magnitude:\s+50000$/m);
  });

  it("pulls Mechanism: from the closest ancestor objective's title", () => {
    const init = okrInitiativeCard("i1", "Ship mobile app");
    const obj = okrObjectiveCard("o1", "Expand to mobile-first markets");
    const dump = cardToDump(
      init,
      boardWith([init, obj], [{ id: "c1", fromCardId: "o1", toCardId: "i1" }]),
      "okr",
    );
    expect(dump).toMatch(/^Mechanism:\s+Expand to mobile-first markets$/m);
  });

  it("includes Description: when the initiative has one", () => {
    const init = okrInitiativeCard("i1", "Ship mobile", "React Native MVP targeting iOS first");
    const dump = cardToDump(init, boardWith([init], []), "okr");
    expect(dump).toMatch(/^Description:\s+React Native MVP targeting iOS first$/m);
  });

  it("omits Metric/Mechanism when no ancestors exist", () => {
    const init = okrInitiativeCard("i1", "x");
    const dump = cardToDump(init, boardWith([init], []), "okr");
    expect(dump).not.toMatch(/^Metric:/m);
    expect(dump).not.toMatch(/^Mechanism:/m);
  });
});

// --- GIST ---

function gistTaskCard(id: string, description: string): Card {
  return {
    id,
    columnId: "tasks",
    saved: true,
    collapsed: false,
    fields: { columnId: "tasks", description, done: false },
  };
}

function gistGoalCard(id: string, title: string, measuredBy?: string, targetValue?: string): Card {
  return {
    id,
    columnId: "gist-goals",
    saved: true,
    collapsed: false,
    fields: { columnId: "gist-goals", title, measuredBy, targetValue },
  };
}

function gistStepCard(id: string, title: string): Card {
  return {
    id,
    columnId: "steps",
    saved: true,
    collapsed: false,
    fields: { columnId: "steps", title },
  };
}

describe("cardToDump — GIST task card", () => {
  it("emits Change: from the task description", () => {
    const card = gistTaskCard("t1", "Write integration tests");
    const dump = cardToDump(card, boardWith([card], []), "gist");
    expect(dump).toMatch(/^Change:\s+Write integration tests$/m);
  });

  it("emits Direction: lift", () => {
    const card = gistTaskCard("t1", "x");
    const dump = cardToDump(card, boardWith([card], []), "gist");
    expect(dump).toMatch(/^Direction:\s+lift$/m);
  });

  it("pulls Metric: from the closest ancestor gist-goal's measuredBy", () => {
    const task = gistTaskCard("t1", "Write tests");
    const goal = gistGoalCard("g1", "Ship v2", "test coverage %", "90%");
    const dump = cardToDump(
      task,
      boardWith([task, goal], [{ id: "c1", fromCardId: "g1", toCardId: "t1" }]),
      "gist",
    );
    expect(dump).toMatch(/^Metric:\s+test coverage %$/m);
  });

  it("pulls Magnitude: from the gist-goal's targetValue", () => {
    const task = gistTaskCard("t1", "Write tests");
    const goal = gistGoalCard("g1", "Ship v2", "coverage", "90%");
    const dump = cardToDump(
      task,
      boardWith([task, goal], [{ id: "c1", fromCardId: "g1", toCardId: "t1" }]),
      "gist",
    );
    expect(dump).toMatch(/^Magnitude:\s+90%$/m);
  });

  it("pulls Mechanism: from the closest ancestor step's title", () => {
    const task = gistTaskCard("t1", "Write tests");
    const step = gistStepCard("s1", "Harden the test suite");
    const dump = cardToDump(
      task,
      boardWith([task, step], [{ id: "c1", fromCardId: "s1", toCardId: "t1" }]),
      "gist",
    );
    expect(dump).toMatch(/^Mechanism:\s+Harden the test suite$/m);
  });

  it("omits Metric/Mechanism when no ancestors exist", () => {
    const task = gistTaskCard("t1", "x");
    const dump = cardToDump(task, boardWith([task], []), "gist");
    expect(dump).not.toMatch(/^Metric:/m);
    expect(dump).not.toMatch(/^Mechanism:/m);
  });
});

// --- isElevatable across templates ---

describe("isElevatable — all templates", () => {
  it("GPS: solutions are elevatable", () => {
    expect(isElevatable(gpsSolutionCard("s1", "x"), "gps")).toBe(true);
  });
  it("GPS: gps-goals are not elevatable", () => {
    expect(isElevatable(gpsGoalCard("g1", "x"), "gps")).toBe(false);
  });
  it("RICE: prioritized are elevatable", () => {
    expect(isElevatable(ricePrioritizedCard("r1", "x"), "rice")).toBe(true);
  });
  it("RICE: ideas are not elevatable", () => {
    expect(isElevatable(riceIdeaCard("i1", "x"), "rice")).toBe(false);
  });
  it("OKR: initiatives are elevatable", () => {
    expect(isElevatable(okrInitiativeCard("i1", "x"), "okr")).toBe(true);
  });
  it("OKR: objectives are not elevatable", () => {
    expect(isElevatable(okrObjectiveCard("o1", "x"), "okr")).toBe(false);
  });
  it("GIST: tasks are elevatable", () => {
    expect(isElevatable(gistTaskCard("t1", "x"), "gist")).toBe(true);
  });
  it("GIST: steps are not elevatable", () => {
    expect(isElevatable(gistStepCard("s1", "x"), "gist")).toBe(false);
  });
});
