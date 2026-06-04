import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionLog, type Session } from "../SessionLog";

describe("SessionLog", () => {
  const sessions: Session[] = [
    { number: 1, participant: "Alice", detail: "Completed interview", status: "done" },
    { number: 2, participant: "Bob", detail: "Scheduled for tomorrow", status: "scheduled" },
    { number: 3, participant: "Charlie", detail: "Missed session", status: "no-show" },
  ];

  it("renders session numbers zero-padded ('01', '02')", () => {
    render(<SessionLog sessions={sessions} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders participant names", () => {
    render(<SessionLog sessions={sessions} />);
    const participants = screen.getAllByText(/^(Alice|Bob)$/);
    expect(participants).toHaveLength(2);
  });

  it("renders detail text", () => {
    render(<SessionLog sessions={sessions} />);
    expect(screen.getByText(/Completed interview/)).toBeInTheDocument();
    expect(screen.getByText(/Scheduled for tomorrow/)).toBeInTheDocument();
  });

  it("renders status badge text for 'done' status", () => {
    render(<SessionLog sessions={[{ number: 1, participant: "Test", detail: "Detail", status: "done" }]} />);
    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("renders status badge text for 'scheduled' status", () => {
    render(<SessionLog sessions={[{ number: 1, participant: "Test", detail: "Detail", status: "scheduled" }]} />);
    expect(screen.getByText("scheduled")).toBeInTheDocument();
  });

  it("renders 'no show' text for 'no-show' status", () => {
    render(<SessionLog sessions={[{ number: 1, participant: "Test", detail: "Detail", status: "no-show" }]} />);
    expect(screen.getByText("no show")).toBeInTheDocument();
  });

  it("renders empty when sessions array is empty", () => {
    render(<SessionLog sessions={[]} />);
    expect(screen.queryByText("01")).not.toBeInTheDocument();
  });
});
