import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntegrityCheck } from "../IntegrityCheck";

describe("IntegrityCheck", () => {
  it("renders title and detail text for ok status", () => {
    render(<IntegrityCheck status="ok" title="OK Title" detail="OK Detail" />);
    expect(screen.getByText("OK Title")).toBeInTheDocument();
    expect(screen.getByText("OK Detail")).toBeInTheDocument();
  });

  it("renders title and detail text for warn status", () => {
    render(<IntegrityCheck status="warn" title="Warn Title" detail="Warn Detail" />);
    expect(screen.getByText("Warn Title")).toBeInTheDocument();
    expect(screen.getByText("Warn Detail")).toBeInTheDocument();
  });

  it("renders title and detail text for fail status", () => {
    render(<IntegrityCheck status="fail" title="Fail Title" detail="Fail Detail" />);
    expect(screen.getByText("Fail Title")).toBeInTheDocument();
    expect(screen.getByText("Fail Detail")).toBeInTheDocument();
  });

  it("renders the correct icon for each status", () => {
    const { rerender } = render(<IntegrityCheck status="ok" title="Icon Test" detail="Detail" />);
    expect(screen.getByText("✓")).toBeInTheDocument();

    rerender(<IntegrityCheck status="warn" title="Icon Test" detail="Detail" />);
    expect(screen.getByText("!")).toBeInTheDocument();

    rerender(<IntegrityCheck status="fail" title="Icon Test" detail="Detail" />);
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("accepts ReactNode as detail", () => {
    render(
      <IntegrityCheck
        status="ok"
        title="ReactNode Title"
        detail={<b>bold</b>}
      />,
    );
    expect(screen.getByText("bold")).toBeInTheDocument();
  });
});
