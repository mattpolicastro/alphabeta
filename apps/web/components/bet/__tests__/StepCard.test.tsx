import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepCard } from "../StepCard";

describe("StepCard", () => {
  it("renders title", () => {
    render(<StepCard n={1} title="Commit" status="open" />);
    expect(screen.getByText("Commit")).toBeInTheDocument();
  });

  it("renders sub when provided", () => {
    render(<StepCard n={1} title="Commit" sub="Lock your bet" status="open" />);
    expect(screen.getByText("Lock your bet")).toBeInTheDocument();
  });

  it("omits sub when absent", () => {
    const { container } = render(
      <StepCard n={1} title="Commit" status="open" />,
    );
    expect(container.querySelector(".scard-sub")).toBeNull();
  });

  it("adds step-active class", () => {
    const { container } = render(
      <StepCard n={1} title="Commit" status="active" />,
    );
    expect(container.firstChild).toHaveClass("step", "step-active");
  });

  it("adds step-done class", () => {
    const { container } = render(
      <StepCard n={2} title="Review" status="done" />,
    );
    expect(container.firstChild).toHaveClass("step", "step-done");
  });

  it("adds step-locked class", () => {
    const { container } = render(
      <StepCard n={3} title="Locked" status="locked" />,
    );
    expect(container.firstChild).toHaveClass("step", "step-locked");
  });

  it("no extra class for open status", () => {
    const { container } = render(
      <StepCard n={1} title="Open" status="open" />,
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toBe("step");
  });

  it("sets data-n attribute", () => {
    const { container } = render(
      <StepCard n={4} title="Commit" status="open" />,
    );
    expect(container.firstChild).toHaveAttribute("data-n", "4");
  });

  it("renders trailing content", () => {
    render(
      <StepCard n={1} title="Commit" status="open" trailing={<span>badge</span>} />,
    );
    expect(screen.getByText("badge")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <StepCard n={1} title="Commit" status="open">
        <p>child content</p>
      </StepCard>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("merges custom className onto scard", () => {
    const { container } = render(
      <StepCard n={1} title="Commit" status="open" className="extra" />,
    );
    expect(container.querySelector(".scard")).toHaveClass("scard", "extra");
  });
});
