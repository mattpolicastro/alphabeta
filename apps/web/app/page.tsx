"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { DashedPanel } from "@/components/ui/DashedPanel";
import { BetCard } from "@/components/journal/BetCard";
import { BoardView } from "@/components/journal/BoardView";
import { listBets } from "@/lib/bet/queries";
import {
  ALL_STATUSES,
  filterBetsByStatus,
} from "@/lib/journal/filter";
import type { Bet, BetStatus } from "@/lib/db/types";

type LoadState = "loading" | "loaded" | "empty";
type Lens = "log" | "board";

const STATUS_LABELS: Record<BetStatus, string> = {
  draft: "draft",
  locked: "locked",
  running: "running",
  resolved: "resolved",
};

export default function Home() {
  const [load, setLoad] = useState<LoadState>("loading");
  const [bets, setBets] = useState<Bet[]>([]);
  const [lens, setLens] = useState<Lens>("log");
  const [activeStatuses, setActiveStatuses] = useState<BetStatus[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await listBets();
        if (cancelled) return;
        setBets(result);
        setLoad(result.length > 0 ? "loaded" : "empty");
      } catch {
        if (!cancelled) setLoad("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="wordmark">
          alph<span className="a">⍺</span>
          <span className="b">β</span>eta
        </div>
        <div className="text-[13.5px] text-ink-soft mt-[6px]">
          journal — every bet logged on this device. nothing leaves the browser.
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-[14px] mb-[20px]">
        <ButtonLink variant="primary" href="/bet/new">
          Start a new bet ▸
        </ButtonLink>
        {load === "loaded" && (
          <>
            <span className="text-[11px] text-ink-faint">·</span>
            <LensToggle value={lens} onChange={setLens} />
            <span className="text-[11px] text-ink-faint">·</span>
            <FilterChips
              active={activeStatuses}
              onToggle={toggleStatus}
              counts={statusCounts(bets)}
            />
          </>
        )}
      </div>

      {load === "loading" && (
        <div className="text-[12px] text-ink-soft italic">Loading bets…</div>
      )}

      {load === "empty" && (
        <DashedPanel title="No bets yet">
          The discipline starts the first time you sharpen a loose idea into
          something that can lose. Start your first bet to see it persist here.
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
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>
          )}
          {filtered.length > 0 && lens === "board" && (
            <BoardView bets={filtered} />
          )}
        </>
      )}
    </div>
  );
}

function statusCounts(bets: Bet[]): Record<BetStatus, number> {
  const counts: Record<BetStatus, number> = {
    draft: 0,
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
  return (
    <div
      role="radiogroup"
      aria-label="View lens"
      className="flex gap-[6px]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "log"}
        onClick={() => onChange("log")}
        className={value === "log" ? "btn btn-primary" : "btn"}
        style={{ fontSize: 10.5, padding: "4px 9px" }}
      >
        log
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "board"}
        onClick={() => onChange("board")}
        className={value === "board" ? "btn btn-primary" : "btn"}
        style={{ fontSize: 10.5, padding: "4px 9px" }}
      >
        board
      </button>
    </div>
  );
}
