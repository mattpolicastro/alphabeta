"use client";

import type { Altitude } from "@/lib/compose/types";

const ALTITUDE_CONFIG: Record<
  Altitude,
  { label: string; sub: string; className: string }
> = {
  vague: {
    label: "Strategic / vague",
    sub: "This is a problem space, not a bet yet.",
    className: "compose-alt-vague",
  },
  goal: {
    label: "Goal-level",
    sub: "You named a goal — now narrow to a testable change.",
    className: "compose-alt-goal",
  },
  bet: {
    label: "Testable bet",
    sub: "A claim with a mechanism and a metric.",
    className: "compose-alt-bet",
  },
  ready: {
    label: "Lock-ready",
    sub: "Complete pre-registration. Ready to commit.",
    className: "compose-alt-ready",
  },
};

export function AltitudeBadge({ altitude }: { altitude: Altitude }) {
  const config = ALTITUDE_CONFIG[altitude];
  return (
    <div className="compose-altitude">
      <span className={`compose-alt-badge ${config.className}`}>
        {config.label}
      </span>
      <span className="compose-alt-sub">{config.sub}</span>
    </div>
  );
}
