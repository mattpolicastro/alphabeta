import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuntimeBar } from "../RuntimeBar";

describe("RuntimeBar", () => {
  it("renders 'day 0' label", () => {
    render(<RuntimeBar currentDay={1} committedDays={10} />);
    expect(screen.getByText("day 0")).toBeInTheDocument();
  });

  it("renders current day text", () => {
    render(<RuntimeBar currentDay={12} committedDays={25} />);
    expect(
      screen.getByText((content, element) => element?.textContent === "day 12"),
    ).toBeInTheDocument();
  });

  it("renders committed day text", () => {
    render(<RuntimeBar currentDay={12} committedDays={25} />);
    expect(
      screen.getByText((content, element) => element?.textContent === "day 25"),
    ).toBeInTheDocument();
  });

  it("renders the fill bar with correct width style", () => {
    const { container } = render(<RuntimeBar currentDay={12} committedDays={25} />);
    const fillDiv = container.querySelector("div[style]");
    expect(fillDiv).toHaveStyle({ width: "48%" });
  });

  it("clamps fill at 100%", () => {
    const { container } = render(<RuntimeBar currentDay={30} committedDays={25} />);
    const fillDiv = container.querySelector("div[style]");
    expect(fillDiv).toHaveStyle({ width: "100%" });
  });
});
