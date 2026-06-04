import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation's usePathname so we can drive the active-route logic
// without booting Next's router context.
const usePathnameMock = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import { GlobalNav } from "../GlobalNav";

describe("GlobalNav", () => {
  it("renders the wordmark linking to /", () => {
    usePathnameMock.mockReturnValue("/something");
    render(<GlobalNav />);
    const logo = screen.getByRole("link", { name: /alph.*eta/i });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders the top-level destination links", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(screen.getByRole("link", { name: "new bet" })).toHaveAttribute(
      "href",
      "/bet/new",
    );
    expect(screen.getByRole("link", { name: "design system" })).toHaveAttribute(
      "href",
      "/design-system",
    );
  });

  it("marks the journal logo as current on /", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: /alph.*eta/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks /design-system as current when on a design-system route", () => {
    usePathnameMock.mockReturnValue("/design-system");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "design system" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("doesn't mark /bet/new as current when on a bet stage route", () => {
    // /bet/wager isn't a child of /bet/new.
    usePathnameMock.mockReturnValue("/bet/wager");
    render(<GlobalNav />);
    const newBet = screen.getByRole("link", { name: "new bet" });
    expect(newBet).not.toHaveAttribute("aria-current");
  });
});
