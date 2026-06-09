import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathnameMock = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

import { GlobalNav } from "../GlobalNav";

describe("GlobalNav", () => {
  it("renders the wordmark linking to /bet/new", () => {
    usePathnameMock.mockReturnValue("/something");
    render(<GlobalNav />);
    const logo = screen.getByRole("link", { name: /alph.*eta/i });
    expect(logo).toHaveAttribute("href", "/bet/new");
  });

  it("renders 'draft' as a direct top-level link to /bet/wager", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "draft" }),
    ).toHaveAttribute("href", "/bet/wager");
  });

  it("renders design system in the footer slot", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "design system" }),
    ).toHaveAttribute("href", "/design-system");
  });

  it("renders 'orient' as a direct top-level link to /strategy", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "orient" }),
    ).toHaveAttribute("href", "/strategy");
  });

  it("renders 'learn' as a link to /learn", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    const learn = screen.getByText("learn");
    expect(learn.tagName.toLowerCase()).toBe("a");
    expect(learn).toHaveAttribute("href", "/learn");
  });

  it("renders 'run' as a dropdown trigger", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    const run = screen.getByRole("button", { name: /^run/ });
    expect(run).toHaveAttribute("aria-haspopup", "menu");
  });

  it("renders 'plan' as a direct top-level link to /", () => {
    usePathnameMock.mockReturnValue("/strategy");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "plan" }),
    ).toHaveAttribute("href", "/");
  });

  it("marks the wordmark as current on /bet/new", () => {
    usePathnameMock.mockReturnValue("/bet/new");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: /alph.*eta/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks design system as current when on a design-system route", () => {
    usePathnameMock.mockReturnValue("/design-system");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "design system" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks 'draft' as current on /bet/wager", () => {
    usePathnameMock.mockReturnValue("/bet/wager");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "draft" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
