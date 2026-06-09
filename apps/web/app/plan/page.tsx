"use client";

import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { TimelineView } from "@/components/plan/TimelineView";

export default function PlanPage() {
  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[16px]">
        <div className="flex justify-between items-start gap-[18px] flex-wrap">
          <div>
            <div className="flex flex-wrap gap-x-[14px] gap-y-[6px]">
              <Crumb>Layer 2</Crumb>
              <Crumb>·</Crumb>
              <Crumb>plan view</Crumb>
              <Crumb>·</Crumb>
              <Crumb>timeline projection</Crumb>
            </div>
          </div>
          <div className="stamp">sequence matters</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-terra font-medium">
            This is your bet calendar.
          </span>{" "}
          Given your traffic and this order, here&apos;s roughly what the
          timeline looks like. Slide bars to reschedule, reorder rows to
          reprioritize. Contention zones flag where concurrent bets risk
          confounding.
        </p>
      </header>

      <Walkthrough>
        <WalkthroughStep n={1} title="Your bet calendar">
          Given your traffic and this order, here's roughly what the timeline looks like. Fixture data — real bets will flow in from the journal.
        </WalkthroughStep>
        <WalkthroughStep n={2} title="Slide and reorder">
          Drag bars to reschedule, drag rows to reprioritize. Dependencies snap back if you break a constraint. Contention zones flag confounding risk.
        </WalkthroughStep>
      </Walkthrough>

      <TimelineView />
    </div>
  );
}

function Crumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] tracking-[1px] uppercase text-ink-soft">
      {children}
    </span>
  );
}
