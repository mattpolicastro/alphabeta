"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { ButtonLink } from "@/components/ui/Button";
import { DashedPanel } from "@/components/ui/DashedPanel";
import { BetCard } from "@/components/journal/BetCard";
import { BoardView } from "@/components/journal/BoardView";
import { TimelineView } from "@/components/plan/TimelineView";
import { listBets, deleteBet } from "@/lib/bet/queries";
import {
  ALL_STATUSES,
  filterBetsByStatus,
} from "@/lib/journal/filter";
import type { Bet, BetStatus } from "@/lib/db/types";

type LoadState = "loading" | "loaded" | "empty";
type Lens = "log" | "board" | "timeline";

const STATUS_LABELS: Record<BetStatus, string> = {
  draft: "draft",
  ready: "ready",
  locked: "locked",
  running: "running",
  resolved: "resolved",
};

export default function Home() {
  const [load, setLoad] = useState<LoadState>("loading");
  const [bets, setBets] = useState<Bet[]>([]);
  const [lens, setLens] = useState<Lens>("log");
  const [activeStatuses, setActiveStatuses] = useState<BetStatus[]>([]);

  const refresh = useCallback(async () => {
    try {
      const result = await listBets();
      setBets(result);
      setLoad(result.length > 0 ? "loaded" : "empty");
    } catch {
      setLoad("empty");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleDeleteBet = async (id: string) => {
    try {
      await deleteBet(id);
    } catch (e) {
      console.error("deleteBet failed:", e);
    }
    await refresh();
  };

  const filtered = useMemo(
    () => filterBetsByStatus(bets, activeStatuses),
    [bets, activeStatuses],
  );

  const toggleStatus = (s: BetStatus) => {
    setActiveStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[20px]">
        <div className="text-[13.5px] text-ink-soft">
          journal — every bet logged on this device. nothing leaves the browser.
        </div>
      </header>

      <Walkthrough>
        <WalkthroughStep n={1} title="This is your bet journal">
          Every bet you create lives here — drafts, locked pre-registrations, running experiments, and resolved outcomes. Nothing leaves the browser.
        </WalkthroughStep>
        <WalkthroughStep n={2} title="Three views">
          Switch between <b>log</b> (chronological list), <b>board</b> (kanban by status), and <b>timeline</b> (Gantt-style projection with contention detection).
        </WalkthroughStep>
        <WalkthroughStep n={3} title="Start a new bet">
          The front door decomposes your idea into a structured bet — or skip straight to a blank draft with the express lane.
        </WalkthroughStep>
      </Walkthrough>

      <div className="flex flex-wrap items-center gap-[14px] mb-[20px]">
        <ButtonLink variant="primary" href="/bet/new">
          Start a new bet ▸
        </ButtonLink>
        {load === "loaded" && (
          <>
            <span className="text-[11px] text-ink-faint">·</span>
            <LensToggle value={lens} onChange={setLens} />
            {lens !== "timeline" && (
              <>
                <span className="flex-1" />
                <FilterChips
                  active={activeStatuses}
                  onToggle={toggleStatus}
                  counts={statusCounts(bets)}
                />
              </>
            )}
          </>
        )}
      </div>

      {load === "loading" && (
        <div className="text-[12px] text-ink-soft italic">Loading bets…</div>
      )}

      {load === "empty" && (
        <DashedPanel title="No bets yet">
          <p>
            The discipline starts the first time you sharpen a loose idea into
            something that can lose. Start your first bet to see it persist here.
          </p>
        </DashedPanel>
      )}


      {load === "loaded" && (
        <>
          {filtered.length === 0 && (
            <div className="text-[12px] text-ink-soft italic">
              No bets match the current filter. Clear chips to see them all.
            </div>
          )}
          {filtered.length > 0 && lens === "log" && (
            <div className="flex flex-col gap-[10px]">
              {filtered.map((bet) => (
                <BetCard key={bet.id} bet={bet} onDelete={handleDeleteBet} />
              ))}
            </div>
          )}
          {filtered.length > 0 && lens === "board" && (
            <BoardView bets={filtered} onDeleteBet={handleDeleteBet} />
          )}
          {lens === "timeline" && <TimelineView />}
        </>
      )}
    </div>
  );
}

function statusCounts(bets: Bet[]): Record<BetStatus, number> {
  const counts: Record<BetStatus, number> = {
    draft: 0,
    ready: 0,
    locked: 0,
    running: 0,
    resolved: 0,
  };
  for (const b of bets) counts[b.status]++;
  return counts;
}

type FilterChipsProps = {
  active: BetStatus[];
  onToggle: (s: BetStatus) => void;
  counts: Record<BetStatus, number>;
};

function FilterChips({ active, onToggle, counts }: FilterChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="flex flex-wrap gap-[6px]"
    >
      {ALL_STATUSES.map((s) => {
        const isOn = active.includes(s);
        const count = counts[s];
        return (
          <button
            key={s}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(s)}
            className={[
              "btn",
              isOn ? "btn-primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ fontSize: 10.5, padding: "4px 9px" }}
          >
            {STATUS_LABELS[s]}
            <span className="ml-[6px] text-ink-faint">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

type LensToggleProps = {
  value: Lens;
  onChange: (next: Lens) => void;
};

function LensToggle({ value, onChange }: LensToggleProps) {
  const lenses: { key: Lens; label: string }[] = [
    { key: "log", label: "log" },
    { key: "board", label: "board" },
    { key: "timeline", label: "timeline" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="View lens"
      className="flex gap-[6px]"
    >
      {lenses.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={value === key ? "btn btn-primary" : "btn"}
          style={{ fontSize: 10.5, padding: "4px 9px" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
