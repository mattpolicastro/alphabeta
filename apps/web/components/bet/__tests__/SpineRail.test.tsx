import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpineRail } from "../SpineRail";
import type { SpineStep } from "../SpineRail";

describe("SpineRail", () => {
  it("renders all step labels", () => {
    const steps: SpineStep[] = [
      { n: 1, label: "Wager", status: "done" },
      { n: 2, label: "Instrument", status: "active" },
      { n: 3, label: "Criteria", status: "locked" },
    ];
    render(<SpineRail steps={steps} />);
    expect(screen.getByText(/Wager/i)).toBeInTheDocument();
    expect(screen.getByText(/Instrument/i)).toBeInTheDocument();
    expect(screen.getByText(/Criteria/i)).toBeInTheDocument();
  });

  it("shows arrows between steps but not after the last", () => {
    const steps: SpineStep[] = [
      { n: 1, label: "Wager", status: "done" },
      { n: 2, label: "Instrument", status: "active" },
      { n: 3, label: "Criteria", status: "locked" },
    ];
    render(<SpineRail steps={steps} />);
    const arrows = screen.getAllByText("→");
    expect(arrows.length).toBe(2);
  });

  it("renders reachable steps with href as links", () => {
    const steps: SpineStep[] = [
      { n: 1, label: "Wager", status: "done" },
      { n: 2, label: "Instrument", status: "reachable", href: "/bet/instrument?id=abc" },
    ];
    render(<SpineRail steps={steps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/bet/instrument?id=abc");
  });

  it("does not render locked steps as links even with href", () => {
    const steps: SpineStep[] = [
      { n: 1, label: "Wager", status: "done" },
      { n: 2, label: "Lock", status: "locked", href: "/bet/lock?id=abc" },
    ];
    render(<SpineRail steps={steps} />);
    const link = screen.queryByRole("link");
    expect(link).not.toBeInTheDocument();
  });

  it("applies active class to the active step", () => {
    const steps: SpineStep[] = [
      { n: 1, label: "Wager", status: "active" },
    ];
    render(<SpineRail steps={steps} />);
    const chip = screen.getByText(/Wager/i).closest(".srail-active");
    expect(chip).toBeInTheDocument();
  });
});
