import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BetSourceBadge } from "../BetSourceBadge";

describe("BetSourceBadge", () => {
  it("renders nothing when cardId is null", () => {
    const { container } = render(<BetSourceBadge cardId={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when cardId is undefined", () => {
    const { container } = render(<BetSourceBadge cardId={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders badge text when cardId is provided", () => {
    render(<BetSourceBadge cardId="abc-123" />);
    expect(
      screen.getByText(/Elevated from a strategy card/),
    ).toBeInTheDocument();
  });

  it("has data-bet-source-badge attribute", () => {
    render(<BetSourceBadge cardId="abc-123" />);
    const badge = screen.getByText(/Elevated from a strategy card/);
    expect(badge).toHaveAttribute("data-bet-source-badge");
  });
});
