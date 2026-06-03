import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedButtons } from "../SegmentedButtons";

type Choice = "yes" | "no" | "shipped";

const options = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
  { value: "shipped" as const, label: "Shipped" },
];

describe("SegmentedButtons", () => {
  it("renders each option as a radio button", () => {
    render(
      <SegmentedButtons<Choice>
        value="yes"
        options={options}
        onChange={() => {}}
        ariaLabel="randomization"
      />,
    );
    expect(screen.getByRole("radiogroup", { name: /randomization/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the active option with aria-checked=true", () => {
    render(<SegmentedButtons<Choice> value="shipped" options={options} onChange={() => {}} />);
    const active = screen.getByRole("radio", { name: "Shipped" });
    expect(active).toHaveAttribute("aria-checked", "true");
  });

  it("invokes onChange with the option's value when clicked", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<SegmentedButtons<Choice> value="yes" options={options} onChange={handler} />);
    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(handler).toHaveBeenCalledWith("no");
  });
});
