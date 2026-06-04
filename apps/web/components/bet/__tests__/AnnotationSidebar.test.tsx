import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotationSidebar } from "../AnnotationSidebar";

describe("AnnotationSidebar", () => {
  it("renders moment text", () => {
    render(<AnnotationSidebar moment="t = 0" body="Initial state" />);
    expect(screen.getByText("t = 0")).toBeInTheDocument();
  });

  it("renders body text", () => {
    render(<AnnotationSidebar moment="t = 0" body="Initial state" />);
    expect(screen.getByText("Initial state")).toBeInTheDocument();
  });

  it("has complementary role", () => {
    render(<AnnotationSidebar moment="t = 0" body="body" />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("has discipline layer aria-label", () => {
    render(<AnnotationSidebar moment="t = 0" body="body" />);
    expect(screen.getByRole("complementary")).toHaveAttribute(
      "aria-label",
      "Discipline layer",
    );
  });

  it("renders path when provided", () => {
    const { container } = render(
      <AnnotationSidebar moment="t = 0" body="body" path="Strategy > Plan" />,
    );
    expect(container.querySelector(".pathline")).toBeInTheDocument();
    expect(screen.getByText("Strategy > Plan")).toBeInTheDocument();
  });

  it("omits path when absent", () => {
    const { container } = render(
      <AnnotationSidebar moment="t = 0" body="body" />,
    );
    expect(container.querySelector(".pathline")).toBeNull();
  });

  it("renders margin when provided", () => {
    const { container } = render(
      <AnnotationSidebar moment="t = 0" body="body" margin="See also" />,
    );
    expect(container.querySelector(".margin-note")).toBeInTheDocument();
    expect(screen.getByText("See also")).toBeInTheDocument();
  });

  it("omits margin when absent", () => {
    const { container } = render(
      <AnnotationSidebar moment="t = 0" body="body" />,
    );
    expect(container.querySelector(".margin-note")).toBeNull();
  });
});
