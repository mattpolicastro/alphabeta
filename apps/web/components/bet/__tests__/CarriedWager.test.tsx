import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarriedWager } from "../CarriedWager";

const bet = {
  change: "moving the plan-picker above the fold",
  direction: "lift" as const,
  metric: "checkout-start",
  magnitude: "8%",
  mechanism: "replays show scroll drop-off",
  confidence: "fairly" as const,
  foldIf: "under +4%",
};

describe("CarriedWager", () => {
  it("renders the default eyebrow label", () => {
    render(<CarriedWager bet={bet} />);
    expect(screen.getByText(/the wager you committed/i)).toBeInTheDocument();
  });

  it("renders a custom eyebrow when provided", () => {
    render(<CarriedWager bet={bet} eyebrow="the bet you're deciding against" />);
    expect(
      screen.getByText(/the bet you're deciding against/i),
    ).toBeInTheDocument();
  });

  it("delegates wager rendering to WagerStatic (key fields surface)", () => {
    render(<CarriedWager bet={bet} />);
    expect(screen.getByText(/moving the plan-picker above the fold/i)).toBeInTheDocument();
    expect(screen.getByText(/^8%$/)).toBeInTheDocument();
    expect(screen.getByText(/under \+4%/i)).toBeInTheDocument();
  });
});
