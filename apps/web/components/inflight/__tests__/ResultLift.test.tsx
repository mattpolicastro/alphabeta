import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultLift } from "../ResultLift";

describe("ResultLift", () => {
  it("renders positive lift with + sign", () => {
    render(
      <ResultLift
        lift={5.0}
        ci={null}
        metric="conversion"
        foldIf={10}
      />,
    );
    expect(screen.getByText("+5.0%")).toBeInTheDocument();
  });

  it("renders negative lift", () => {
    render(
      <ResultLift
        lift={-2.3}
        ci={null}
        metric="conversion"
        foldIf={10}
      />,
    );
    expect(screen.getByText("-2.3%")).toBeInTheDocument();
  });

  it("renders zero lift as +0.0%", () => {
    render(
      <ResultLift
        lift={0}
        ci={null}
        metric="conversion"
        foldIf={10}
      />,
    );
    expect(screen.getByText("+0.0%")).toBeInTheDocument();
  });

  it("shows CI when provided", () => {
    render(
      <ResultLift
        lift={5.0}
        ci={[2.0, 8.0]}
        metric="conversion"
        foldIf={10}
      />,
    );
    expect(screen.getByText(/95% CI/)).toBeInTheDocument();
  });

  it("shows 'confidence interval not available' when ci is null", () => {
    render(
      <ResultLift
        lift={5.0}
        ci={null}
        metric="conversion"
        foldIf={10}
      />,
    );
    expect(screen.getByText("confidence interval not available")).toBeInTheDocument();
  });

  it("renders metric text", () => {
    render(
      <ResultLift
        lift={5.0}
        ci={null}
        metric="signup rate"
        foldIf={10}
      />,
    );
    expect(screen.getByText("observed relative lift on signup rate")).toBeInTheDocument();
  });

  it("uses green color class when lift >= foldIf", () => {
    render(
      <ResultLift
        lift={15.0}
        ci={null}
        metric="conversion"
        foldIf={10}
      />,
    );
    const el = screen.getByText("+15.0%");
    expect(el.className).toContain("text-green");
  });

  it("uses terra color class when lift <= 0", () => {
    render(
      <ResultLift
        lift={-2.3}
        ci={null}
        metric="conversion"
        foldIf={10}
      />,
    );
    const el = screen.getByText("-2.3%");
    expect(el.className).toContain("text-terra");
  });
});
