import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConstraintSlider } from "../ConstraintSlider";

const WORDS = ["", "a trickle", "thin", "moderate", "healthy", "abundant"];

describe("ConstraintSlider", () => {
  it("renders the label and the word that matches the current value", () => {
    render(
      <ConstraintSlider
        label="Traffic available"
        value={3}
        words={WORDS}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/traffic available/i)).toBeInTheDocument();
    expect(screen.getByText("moderate")).toBeInTheDocument();
  });

  it("emits the new value as a number on change", () => {
    const handler = vi.fn();
    render(
      <ConstraintSlider
        label="Urgency"
        value={3}
        words={WORDS}
        onChange={handler}
      />,
    );
    // jsdom's range-input keyboard support is unreliable; drive the change
    // event directly the way React's onChange listener observes it.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "4" } });
    expect(handler).toHaveBeenCalled();
    const arg = handler.mock.calls[0][0];
    expect(typeof arg).toBe("number");
    expect(arg).toBe(4);
  });

  it("shows the first and last word as min/max anchors", () => {
    render(
      <ConstraintSlider label="X" value={3} words={WORDS} onChange={() => {}} />,
    );
    // 'a trickle' (min=1) and 'abundant' (max=5) — both appear; index 0 is empty.
    expect(screen.getAllByText("a trickle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("abundant").length).toBeGreaterThan(0);
  });
});
