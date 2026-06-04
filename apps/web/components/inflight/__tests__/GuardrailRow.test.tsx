import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuardrailRow } from "../GuardrailRow";

describe("GuardrailRow", () => {
  it("renders metric name", () => {
    render(<GuardrailRow name="test name" value="100" status="ok" />);
    expect(screen.getByText("test name")).toBeInTheDocument();
  });

  it("renders metric value", () => {
    render(<GuardrailRow name="test name" value="100" status="ok" />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders 'holding' badge text for status='ok'", () => {
    render(<GuardrailRow name="test name" value="100" status="ok" />);
    expect(screen.getByText("holding")).toBeInTheDocument();
  });

  it("renders 'elevated' badge text for status='warn'", () => {
    render(<GuardrailRow name="test name" value="100" status="warn" />);
    expect(screen.getByText("elevated")).toBeInTheDocument();
  });

  it("does not render 'elevated' when status='ok'", () => {
    render(<GuardrailRow name="test name" value="100" status="ok" />);
    expect(screen.queryByText("elevated")).not.toBeInTheDocument();
  });

  it("does not render 'holding' when status='warn'", () => {
    render(<GuardrailRow name="test name" value="100" status="warn" />);
    expect(screen.queryByText("holding")).not.toBeInTheDocument();
  });
});
