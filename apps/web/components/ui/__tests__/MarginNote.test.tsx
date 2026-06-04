import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarginNote } from "../MarginNote";

describe("MarginNote", () => {
  it("renders children", () => {
    render(<MarginNote>Some note</MarginNote>);
    expect(screen.getByText("Some note")).toBeInTheDocument();
  });

  it("has margin-note class", () => {
    const { container } = render(<MarginNote>text</MarginNote>);
    expect(container.firstChild).toHaveClass("margin-note");
  });

  it("merges custom className", () => {
    const { container } = render(
      <MarginNote className="extra">text</MarginNote>,
    );
    expect(container.firstChild).toHaveClass("margin-note", "extra");
  });

  it("passes through HTML attributes", () => {
    render(<MarginNote data-testid="mn">text</MarginNote>);
    expect(screen.getByTestId("mn")).toBeInTheDocument();
  });
});
