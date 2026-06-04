import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardView } from "../BoardView";
import type { Bet, BetStatus } from "@/lib/db/types";

function makeBet(id: string, status: BetStatus, overrides: Partial<Bet> = {}): Bet {
  const base: Bet = {
    id,
    cardId: null,
    ownerId: null,
    type: "single",
    articulation: {
      change: `change-${id}`,
      direction: "lift",
      metric: `metric-${id}`,
      magnitude: "8%",
      mechanism: null,
      confidence: "fairly",
      foldIf: "under +4%",
    },
    instrument: { type: "ab", overrideReason: null, feasibility: {} },
    criteria: {
      win: "",
      inconclusive: "",
      loss: "",
      minMindChanger: "",
      evidenceBar: "",
      runtime: null,
    },
    status,
    lockedAt: status === "draft" ? null : "2026-05-30T00:00:00.000Z",
    fingerprint: status === "draft" ? null : "f".repeat(64),
    previousVersionId: null,
    resolution: {
      outcome: null,
      actuals: {},
      integrityFlags: [],
      call: null,
      deviation: { occurred: false, reason: null },
      resolvedAt: null,
    },
    learning: { calibration: null, reflection: null },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

describe("BoardView", () => {
  it("renders all four status column headers", () => {
    render(<BoardView bets={[]} />);
    expect(screen.getByText(/^draft$/)).toBeInTheDocument();
    expect(screen.getByText(/^locked$/)).toBeInTheDocument();
    expect(screen.getByText(/^running$/)).toBeInTheDocument();
    expect(screen.getByText(/^resolved$/)).toBeInTheDocument();
  });

  it("shows the per-column count next to each header", () => {
    const bets = [
      makeBet("a", "draft"),
      makeBet("b", "draft"),
      makeBet("c", "locked"),
    ];
    render(<BoardView bets={bets} />);
    // Two drafts, one locked, zero running/resolved.
    const counts = screen.getAllByText(/^\(\d+\)$/).map((el) => el.textContent);
    expect(counts).toEqual(["(2)", "(1)", "(0)", "(0)"]);
  });

  it("places each bet under its own status column via BetCard", () => {
    const bets = [
      makeBet("draft-1", "draft"),
      makeBet("locked-1", "locked"),
    ];
    render(<BoardView bets={bets} />);
    expect(screen.getByTestId("bet-card-draft-1")).toHaveAttribute(
      "href",
      "/bet/wager?id=draft-1",
    );
    expect(screen.getByTestId("bet-card-locked-1")).toHaveAttribute(
      "href",
      "/bet/revisit?id=locked-1",
    );
  });

  it("renders the 'no bets yet' hint in empty columns", () => {
    render(<BoardView bets={[makeBet("d", "draft")]} />);
    // Three empty columns remaining (locked / running / resolved).
    const empties = screen.getAllByText(/no bets yet/i);
    expect(empties).toHaveLength(3);
  });
});
