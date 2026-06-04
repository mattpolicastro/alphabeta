import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeCard } from "../ThemeCard";

describe("ThemeCard", () => {
  it("renders theme name", () => {
    render(<ThemeCard name="Test Theme" participantCount="5" direction="supports" />);
    expect(screen.getByText("Test Theme")).toBeInTheDocument();
  });

  it("renders participant count", () => {
    render(<ThemeCard name="Test Theme" participantCount="5 participants" direction="supports" />);
    expect(screen.getByText("5 participants")).toBeInTheDocument();
  });

  it("renders 'supports' direction text for direction='supports'", () => {
    render(<ThemeCard name="Test Theme" participantCount="5" direction="supports" />);
    expect(screen.getByText("supports")).toBeInTheDocument();
  });

  it("renders 'contradicts' direction text for direction='contradicts'", () => {
    render(<ThemeCard name="Test Theme" participantCount="5" direction="contradicts" />);
    expect(screen.getByText("contradicts")).toBeInTheDocument();
  });

  it("renders 'neutral / mixed' direction text for direction='neutral'", () => {
    render(<ThemeCard name="Test Theme" participantCount="5" direction="neutral" />);
    expect(screen.getByText("neutral / mixed")).toBeInTheDocument();
  });

  it("renders custom directionLabel when provided", () => {
    render(
      <ThemeCard
        name="Test Theme"
        participantCount="5"
        direction="supports"
        directionLabel="emergent · exploratory"
      />,
    );
    expect(screen.getByText("emergent · exploratory")).toBeInTheDocument();
  });

  it("renders quotes when provided", () => {
    render(
      <ThemeCard
        name="Test Theme"
        participantCount="5"
        direction="supports"
        quotes="This is a quote."
      />,
    );
    expect(screen.getByText("This is a quote.")).toBeInTheDocument();
  });

  it("does not render quotes block when quotes is omitted", () => {
    render(<ThemeCard name="Test Theme" participantCount="5" direction="supports" />);
    expect(screen.queryByText("This is a quote.")).not.toBeInTheDocument();
  });
});
