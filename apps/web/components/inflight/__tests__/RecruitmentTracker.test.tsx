import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecruitmentTracker } from "../RecruitmentTracker";

describe("RecruitmentTracker", () => {
  it("renders recruited count as 'X / Y' format", () => {
    render(
      <RecruitmentTracker
        recruited={5}
        completed={3}
        noShows={1}
        committed={10}
        sampleSpec="daily active users"
      />,
    );
    expect(screen.getByText("5 / 10")).toBeInTheDocument();
  });

  it("renders completed count as 'X / Y' format", () => {
    render(
      <RecruitmentTracker
        recruited={5}
        completed={3}
        noShows={1}
        committed={10}
        sampleSpec="daily active users"
      />,
    );
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("renders noShows count", () => {
    render(
      <RecruitmentTracker
        recruited={5}
        completed={3}
        noShows={2}
        committed={10}
        sampleSpec="daily active users"
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders sampleSpec text", () => {
    render(
      <RecruitmentTracker
        recruited={5}
        completed={3}
        noShows={1}
        committed={10}
        sampleSpec="weekly active users"
      />,
    );
    expect(screen.getByText(/weekly active users/)).toBeInTheDocument();
  });

  it("recruited count gets green styling when recruited >= committed", () => {
    render(
      <RecruitmentTracker
        recruited={10}
        completed={5}
        noShows={1}
        committed={10}
        sampleSpec="daily active users"
      />,
    );
    const el = screen.getByText("10 / 10");
    expect(el).toHaveClass("text-green");
  });

  it("noShows gets terra styling when > 0", () => {
    render(
      <RecruitmentTracker
        recruited={5}
        completed={3}
        noShows={2}
        committed={10}
        sampleSpec="daily active users"
      />,
    );
    const el = screen.getByText("2");
    expect(el).toHaveClass("text-terra");
  });

  it("noShows gets faint styling when 0", () => {
    render(
      <RecruitmentTracker
        recruited={5}
        completed={3}
        noShows={0}
        committed={10}
        sampleSpec="daily active users"
      />,
    );
    const el = screen.getByText("0");
    expect(el).toHaveClass("text-ink-faint");
  });
});
