import { describe, expect, it } from "vitest";
import { cardToDump, isElevatable } from "@/lib/strategy/elevate";
import type { BoardState, Card } from "@/lib/strategy/types";
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
