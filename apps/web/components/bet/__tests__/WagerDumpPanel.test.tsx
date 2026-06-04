import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WagerDumpPanel } from "@/components/bet/WagerDumpPanel";

describe("WagerDumpPanel", () => {
  it("starts collapsed", () => {
    render(<WagerDumpPanel onFill={() => {}} />);
    expect(
      screen.queryByPlaceholderText(/slack thread/i),
    ).not.toBeInTheDocument();
  });

  it("expands when the toggle is clicked and shows the textarea", async () => {
    const user = userEvent.setup();
    render(<WagerDumpPanel onFill={() => {}} />);
    await user.click(screen.getByRole("button", { name: /paste context/i }));
    expect(screen.getByPlaceholderText(/slack thread/i)).toBeInTheDocument();
  });

  it("renders reflection lines after typing", async () => {
    const user = userEvent.setup();
    render(<WagerDumpPanel onFill={() => {}} />);
    await user.click(screen.getByRole("button", { name: /paste context/i }));
    const ta = screen.getByPlaceholderText(/slack thread/i);
    await user.type(ta, "I think maybe we get +8% lift");
    expect(screen.getByText("8%")).toBeInTheDocument();
    expect(screen.getByText(/a hunch/)).toBeInTheDocument();
  });

  it("calls onFill with the analyzer's magnitude + confidence + mechanism", async () => {
    const onFill = vi.fn();
    const user = userEvent.setup();
    render(<WagerDumpPanel onFill={onFill} />);
    await user.click(screen.getByRole("button", { name: /paste context/i }));
    await user.type(
      screen.getByPlaceholderText(/slack thread/i),
      "conversion will lift 8% since the friction is gone",
    );
    await user.click(screen.getByRole("button", { name: /fill into wager/i }));
    expect(onFill).toHaveBeenCalledTimes(1);
    const patch = onFill.mock.calls[0][0];
    expect(patch.magnitude).toBe("8%");
    expect(patch.confidence).toBe("fairly");
    expect(patch.mechanism).toMatch(/friction is gone/);
  });

  it("passes a fold-if clause through onFill when the falsifier regex catches it", async () => {
    const onFill = vi.fn();
    const user = userEvent.setup();
    render(<WagerDumpPanel onFill={onFill} />);
    await user.click(screen.getByRole("button", { name: /paste context/i }));
    await user.type(
      screen.getByPlaceholderText(/slack thread/i),
      "I'll fold if it comes in under +4%",
    );
    await user.click(screen.getByRole("button", { name: /fill into wager/i }));
    const patch = onFill.mock.calls[0][0];
    expect(patch.foldIf).toMatch(/under \+?4%/);
  });

  it("opens with the textarea pre-filled when initialText is provided", () => {
    render(
      <WagerDumpPanel
        onFill={() => {}}
        initialText="Change: swap CTA\nDescription: try a stronger verb"
      />,
    );
    const ta = screen.getByPlaceholderText(/slack thread/i) as HTMLTextAreaElement;
    expect(ta).toBeInTheDocument();
    expect(ta.value).toContain("swap CTA");
  });

  it("fills labeled fields (change, direction, metric) when the dump has them", async () => {
    const onFill = vi.fn();
    const user = userEvent.setup();
    render(
      <WagerDumpPanel
        onFill={onFill}
        initialText={[
          "Change: swap the hero CTA verb",
          "Direction: lift",
          "Metric: checkout-start rate",
        ].join("\n")}
      />,
    );
    await user.click(screen.getByRole("button", { name: /fill into wager/i }));
    const patch = onFill.mock.calls[0][0];
    expect(patch.change).toBe("swap the hero CTA verb");
    expect(patch.direction).toBe("lift");
    expect(patch.metric).toBe("checkout-start rate");
  });
});
