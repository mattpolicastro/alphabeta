import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotationSidebar } from "../AnnotationSidebar";
import { BetSourceBadge } from "../BetSourceBadge";
import { HeardCard } from "../HeardCard";
import { StepCard } from "../StepCard";

describe("AnnotationSidebar", () => {
  it("renders moment and body", () => {
    render(<AnnotationSidebar moment="test moment" body="test body" />);
    expect(screen.getByText("test moment")).toBeInTheDocument();
    expect(screen.getByText("test body")).toBeInTheDocument();
  });

  it("renders optional path when provided", () => {
    render(
      <AnnotationSidebar
        moment="test moment"
        body="test body"
        path="next step"
      />,
    );
    expect(screen.getByText("next step")).toBeInTheDocument();
  });

  it("does not render path when omitted", () => {
    render(<AnnotationSidebar moment="test moment" body="test body" />);
    expect(screen.queryByText("next step")).not.toBeInTheDocument();
  });

  it("renders optional margin note", () => {
    render(
      <AnnotationSidebar
        moment="test moment"
        body="test body"
        margin="a margin note"
      />,
    );
    expect(screen.getByText("a margin note")).toBeInTheDocument();
  });
});

describe("BetSourceBadge", () => {
  it("renders badge text when cardId is provided", () => {
    render(<BetSourceBadge cardId="card-123" />);
    expect(
      screen.getByText("Elevated from a strategy card."),
    ).toBeInTheDocument();
  });

  it("renders nothing when cardId is null", () => {
    const { container } = render(<BetSourceBadge cardId={null} />);
    expect(container.querySelector("[data-bet-source-badge]")).toBeNull();
  });

  it("renders nothing when cardId is undefined", () => {
    const { container } = render(<BetSourceBadge cardId={undefined} />);
    expect(container.querySelector("[data-bet-source-badge]")).toBeNull();
  });
});

describe("HeardCard", () => {
  it("renders label and body", () => {
    render(<HeardCard label="if" body="something happens" />);
    expect(screen.getByText("if")).toBeInTheDocument();
    expect(screen.getByText("something happens")).toBeInTheDocument();
  });

  it("applies kind class variant", () => {
    const { container } = render(
      <HeardCard label="if" body="something happens" kind="push" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("heard-push");
  });

  it("defaults to no kind suffix class", () => {
    const { container } = render(<HeardCard label="if" body="something happens" />);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).not.toContain("heard-push");
    expect(cls).not.toContain("heard-gap");
  });
});

describe("StepCard", () => {
  it("renders title and children", () => {
    render(
      <StepCard n={1} title="First step" status="active">
        <p>content</p>
      </StepCard>,
    );
    expect(screen.getByText("First step")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders optional sub text", () => {
    render(
      <StepCard n={1} title="First step" status="active" sub="subtitle text">
        <p>content</p>
      </StepCard>,
    );
    expect(screen.getByText("subtitle text")).toBeInTheDocument();
  });

  it("applies active classes", () => {
    const { container } = render(
      <StepCard n={1} title="First step" status="active">
        <p>content</p>
      </StepCard>,
    );
    expect(container.querySelector(".step-active")).toBeInTheDocument();
    expect(container.querySelector(".scard-active")).toBeInTheDocument();
  });
});
