import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashedPanel } from "../DashedPanel";

describe("DashedPanel", () => {
  it("renders children", () => {
    render(<DashedPanel><p>inner content</p></DashedPanel>);
    expect(screen.getByText("inner content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    const { container } = render(<DashedPanel title="Heading" />);
    expect(container.querySelector(".dashed-panel-title")).toBeInTheDocument();
    expect(screen.getByText("Heading")).toBeInTheDocument();
  });

  it("omits title div when absent", () => {
    const { container } = render(<DashedPanel />);
    expect(container.querySelector(".dashed-panel-title")).toBeNull();
  });

  it("renders sub when provided", () => {
    const { container } = render(<DashedPanel sub="Subtitle" />);
    expect(container.querySelector(".dashed-panel-sub")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
  });

  it("omits sub div when absent", () => {
    const { container } = render(<DashedPanel />);
    expect(container.querySelector(".dashed-panel-sub")).toBeNull();
  });

  it("merges custom className", () => {
    const { container } = render(<DashedPanel className="extra" />);
    expect(container.firstChild).toHaveClass("dashed-panel", "extra");
  });

  it("passes through HTML attributes", () => {
    render(<DashedPanel data-testid="my-panel" />);
    expect(screen.getByTestId("my-panel")).toBeInTheDocument();
  });
});
