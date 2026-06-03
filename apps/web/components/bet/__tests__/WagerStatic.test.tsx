// First component test — establishes the pattern for the UI kit.
// Render with @testing-library/react; assert with jest-dom matchers
// (extended via vitest.setup.ts). No state, no async, no Dexie — just
// presentational checks against the rendered output.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WagerStatic } from "../WagerStatic";
import type { AbBet } from "@/lib/bet/storage";

const fullBet: AbBet = {
  change: "moving the plan-picker above the fold",
  direction: "lift",
  metric: "checkout-start",
  magnitude: "8%",
  mechanism: "replays show scroll drop-off at the testimonials",
  confidence: "fairly",
  foldIf: "under +4%",
};

describe("WagerStatic", () => {
  it("renders every committed field when the bet is fully populated", () => {
    render(<WagerStatic bet={fullBet} />);
    expect(screen.getByText(/moving the plan-picker above the fold/i))
      .toBeInTheDocument();
    expect(screen.getByText(/lift/i)).toBeInTheDocument();
    expect(screen.getByText(/checkout-start/i)).toBeInTheDocument();
    expect(screen.getByText(/^8%$/)).toBeInTheDocument();
    expect(
      screen.getByText(/replays show scroll drop-off at the testimonials/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/fairly/i)).toBeInTheDocument();
    expect(screen.getByText(/under \+4%/i)).toBeInTheDocument();
  });

  it("falls back to the em-dash placeholder for missing fields", () => {
    render(<WagerStatic bet={{ change: "moving the plan-picker above the fold" }} />);
    expect(screen.getByText(/moving the plan-picker above the fold/i))
      .toBeInTheDocument();
    // The change is set; the rest should render as '—' tokens. We render
    // multiple '—' so getAllByText is appropriate.
    const dashes = screen.getAllByText(/^—$/);
    // metric, magnitude, mechanism, foldIf — four undefined string fields.
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("emits direction as a token even when other fields are missing", () => {
    render(<WagerStatic bet={{ direction: "reduce" }} />);
    expect(screen.getByText("reduce")).toBeInTheDocument();
  });

  it("renders '—' for direction only when the field is undefined", () => {
    render(<WagerStatic bet={{}} />);
    // direction has no fallback string in the AbBet type but the component
    // emits '—' when undefined.
    expect(screen.getAllByText(/^—$/).length).toBeGreaterThanOrEqual(1);
  });
});
