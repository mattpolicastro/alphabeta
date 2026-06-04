import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  it("renders refinement as a direct top-level link to /bet/new", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "refinement" }),
    ).toHaveAttribute("href", "/bet/new");
  });

  it("renders design system in the footer slot", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "design system" }),
    ).toHaveAttribute("href", "/design-system");
  });

  it("renders disabled top-level layers without anchors", () => {
    usePathnameMock.mockReturnValue("/");
    render(<GlobalNav />);
    for (const label of ["strategy", "running", "KM"]) {
      const node = screen.getByText(label);
      expect(node.tagName.toLowerCase()).toBe("span");
      expect(node).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("opens the planning dropdown on click and shows its children", async () => {
    usePathnameMock.mockReturnValue("/");
    const user = userEvent.setup();
    render(<GlobalNav />);
    const trigger = screen.getByRole("button", { name: /planning/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: /journal/i })).toHaveAttribute(
      "href",
      "/",
    );
    // Sequencing is disabled within the dropdown.
    const sequencing = screen.getByText("sequencing");
    expect(sequencing.tagName.toLowerCase()).toBe("span");
    expect(sequencing).toHaveAttribute("aria-disabled", "true");
  });

  it("marks the journal logo as current on /", () => {
    usePathnameMock.mockReturnValue("/");
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

  it("doesn't mark refinement as current when on a bet stage route", () => {
    usePathnameMock.mockReturnValue("/bet/wager");
    render(<GlobalNav />);
    expect(
      screen.getByRole("link", { name: "refinement" }),
    ).not.toHaveAttribute("aria-current");
  });
});
