import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BetCard } from "../BetCard";
import type { Bet, BetStatus, Outcome } from "@/lib/db/types";

function makeBet(overrides: Partial<Bet> = {}): Bet {
  const base: Bet = {
    id: "test-bet",
    cardId: null,
    ownerId: null,
    type: "single",
    articulation: {
      change: "moving the plan-picker above the fold",
      direction: "lift",
      metric: "checkout-start",
      magnitude: "8%",
      mechanism: "scroll drop at the testimonials",
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
    status: "draft",
    lockedAt: null,
    fingerprint: null,
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

function resolvedBet(outcome: Outcome): Bet {
  return makeBet({
    id: `resolved-${outcome}`,
    status: "resolved" as BetStatus,
    lockedAt: "2026-05-20T00:00:00.000Z",
    fingerprint: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    resolution: {
      outcome,
      actuals: {},
      integrityFlags: [],
      call: outcome === "win" ? "keep" : "revert",
      deviation: { occurred: false, reason: null },
      resolvedAt: "2026-05-30T00:00:00.000Z",
    },
  });
}

describe("BetCard", () => {
  it("renders the wager fields from the bet's articulation", () => {
    render(<BetCard bet={makeBet()} />);
    expect(screen.getByText(/moving the plan-picker above the fold/i)).toBeInTheDocument();
    expect(screen.getByText(/checkout-start/i)).toBeInTheDocument();
    expect(screen.getByText(/under \+4%/i)).toBeInTheDocument();
  });

  it("shows the draft status badge on a draft bet", () => {
    render(<BetCard bet={makeBet({ status: "draft" })} />);
    const badge = screen.getByText("draft");
    expect(badge).toHaveClass("st-draft");
  });

  it("shows the won status badge on a resolved bet with outcome=win", () => {
    render(<BetCard bet={resolvedBet("win")} />);
    const badge = screen.getByText("won");
    expect(badge).toHaveClass("st-won");
  });

  it("shows the lost status badge on a resolved bet with outcome=loss", () => {
    render(<BetCard bet={resolvedBet("loss")} />);
    const badge = screen.getByText("lost");
    expect(badge).toHaveClass("st-lost");
  });

  it("links draft bets to /bet/wager", () => {
    render(<BetCard bet={makeBet({ id: "abc", status: "draft" })} />);
    const card = screen.getByTestId("bet-card-abc");
    const link = card.querySelector("a");
    expect(link).toHaveAttribute("href", "/bet/wager?id=abc");
  });

  it("links non-draft bets to /bet/revisit", () => {
    render(
      <BetCard
        bet={makeBet({
          id: "xyz",
          status: "locked",
          lockedAt: "2026-05-30T00:00:00.000Z",
          fingerprint: "0".repeat(64),
        })}
      />,
    );
    const card = screen.getByTestId("bet-card-xyz");
    const link = card.querySelector("a");
    expect(link).toHaveAttribute("href", "/bet/revisit?id=xyz");
  });
});
