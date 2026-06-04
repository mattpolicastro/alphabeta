import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeardCard } from "../HeardCard";

describe("HeardCard", () => {
  it("renders label and body", () => {
    render(<HeardCard label="Metric" body="Conversion rate" />);
    expect(screen.getByText("Metric")).toBeInTheDocument();
    expect(screen.getByText("Conversion rate")).toBeInTheDocument();
  });

  it("default kind has no modifier class", () => {
    const { container } = render(
      <HeardCard label="L" body="B" kind="default" />,
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toBe("heard");
  });

  it("push kind adds heard-push", () => {
    const { container } = render(
      <HeardCard label="L" body="B" kind="push" />,
    );
    expect(container.firstChild).toHaveClass("heard", "heard-push");
  });

  it("gap kind adds heard-gap", () => {
    const { container } = render(
      <HeardCard label="L" body="B" kind="gap" />,
    );
    expect(container.firstChild).toHaveClass("heard", "heard-gap");
  });

  it("filled kind adds heard-filled", () => {
    const { container } = render(
      <HeardCard label="L" body="B" kind="filled" />,
    );
    expect(container.firstChild).toHaveClass("heard", "heard-filled");
  });

  it("merges custom className", () => {
    const { container } = render(
      <HeardCard label="L" body="B" className="extra" />,
    );
    expect(container.firstChild).toHaveClass("heard", "extra");
  });
});
