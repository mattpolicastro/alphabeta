"use client";

import { useCallback, useState } from "react";
import { PLAN_FIXTURES } from "@/lib/plan/fixtures";
import { findContentions, allBets, betById } from "@/lib/plan/contention";
import type { PlanEntry, PlanBet, PlanBetStatus, Contention } from "@/lib/plan/types";

const WEEKS = 10;
const LW = 190;
const WW = 70;
const TODAY = 2.5;
const HORIZON = 8;

function cols() {
  return `${LW}px repeat(${WEEKS}, ${WW}px)`;
}

function statusClass(s: PlanBetStatus) {
  if (s === "won") return "won";
  if (s === "running") return "running";
  if (s === "locked") return "locked";
  return "draft";
}

function canSlide(b: PlanBet) {
  return b.status === "locked" || b.status === "draft";
}

export function TimelineView() {
  const [entries, setEntries] = useState<PlanEntry[]>(
    () => JSON.parse(JSON.stringify(PLAN_FIXTURES)) as PlanEntry[],
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const contentions = findContentions(entries);

  const reset = useCallback(() => {
    setEntries(JSON.parse(JSON.stringify(PLAN_FIXTURES)) as PlanEntry[]);
    showToast("Reset.");
  }, [showToast]);

  const handleBarSlideEnd = useCallback(
    (betId: string, newStart: number, origStart: number) => {
      setEntries((prev) => {
        const next = JSON.parse(JSON.stringify(prev)) as PlanEntry[];
        const bet = betById(next, betId);
        if (!bet) return prev;

        bet.start = newStart;

        if (bet.dep) {
          const parent = betById(next, bet.dep);
          if (parent && bet.start < parent.start + parent.dur) {
            bet.start = origStart;
            showToast(
              `Can't start before "${parent.name}" ends. Dependency = hard constraint.`,
            );
            return next;
          }
        }

        for (const b of allBets(next)) {
          if (b.dep === betId && b.start < bet.start + bet.dur) {
            b.start = bet.start + bet.dur;
            showToast(`"${b.name}" pushed to wk ${b.start + 1}.`);
          }
        }

        return next;
      });
    },
    [showToast],
  );

  const handleReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      setEntries((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        const name =
          moved.type === "seq" ? moved.name : moved.bet.name;
        showToast(
          `Reordered: ${name} moved ${fromIdx > toIdx ? "up" : "down"}.`,
        );
        return next;
      });
    },
    [showToast],
  );

  return (
    <>
      {/* legend + reset */}
      <div className="flex gap-[14px] items-center flex-wrap mb-[14px]">
        <div className="flex gap-[12px] text-[10px] text-ink-soft flex-wrap">
          <Legend color="bg-green-soft border-green-line" label="resolved" />
          <Legend color="bg-terra-soft border-terra" label="running" />
          <Legend color="bg-white/50 border-terra-line" label="locked" />
          <Legend
            color="bg-white/35 border-rule-faint border-dashed"
            label="draft"
          />
        </div>
        <button
          type="button"
          onClick={reset}
          className="ml-auto font-mono text-[11px] py-[7px] px-[13px] border-[1.5px] border-dashed border-rule bg-transparent text-ink hover:bg-paper-2 cursor-pointer"
        >
          &#x27F2; reset
        </button>
      </div>

      {/* timeline */}
      <div className="border-[1.5px] border-dashed border-rule bg-white/[.28] overflow-x-auto relative select-none">
        {/* header */}
        <div
          className="grid border-b-[1.5px] border-dashed border-rule-faint bg-white/30 sticky top-0 z-[5]"
          style={{ gridTemplateColumns: cols() }}
        >
          <div className="border-r-[1.5px] border-dashed border-rule-faint py-[8px] px-[12px] text-[9px] tracking-[1px] uppercase text-ink-soft">
            plan
          </div>
          {Array.from({ length: WEEKS }, (_, w) => (
            <div
              key={w}
              className={`text-center text-[9px] py-[6px] border-r border-dashed border-rule-faint min-w-[70px] ${
                Math.floor(TODAY) === w
                  ? "text-terra font-bold bg-terra-soft"
                  : "text-ink-faint"
              }`}
            >
              wk {w + 1}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="relative">
          {entries.map((entry, gi) =>
            entry.type === "seq" ? (
              <SequenceBlock
                key={entry.id}
                group={entry}
                gi={gi}
                contentions={contentions}
                onBarSlideEnd={handleBarSlideEnd}
                onReorder={handleReorder}
                entries={entries}
              />
            ) : (
              <SoloRow
                key={entry.bet.id}
                bet={entry.bet}
                gi={gi}
                contentions={contentions}
                onBarSlideEnd={handleBarSlideEnd}
                onReorder={handleReorder}
              />
            ),
          )}

          {/* today line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-terra z-[3] pointer-events-none"
            style={{ left: LW + TODAY * WW }}
          >
            <span className="absolute -top-[20px] -left-[14px] text-[8px] tracking-[1px] uppercase text-terra font-bold">
              today
            </span>
          </div>

          {/* horizon line */}
          <div
            className="absolute top-0 bottom-0 z-[3] pointer-events-none"
            style={{
              left: LW + HORIZON * WW,
              borderLeft: "2px dashed var(--color-plinth)",
            }}
          >
            <span className="absolute -top-[20px] -left-[22px] text-[8px] tracking-[1px] uppercase font-bold whitespace-nowrap"
              style={{ color: "var(--color-plinth)" }}
            >
              soft horizon
            </span>
          </div>
        </div>
      </div>

      {/* callouts */}
      <div className="flex flex-col gap-[8px] mt-[14px]">
        {contentions.map((c, i) => {
          if (c.overlaps) {
            return (
              <div
                key={i}
                className="border-[1.5px] border-dashed border-amber-line bg-amber-soft p-[10px_14px] flex gap-[10px] items-baseline text-[11.5px] leading-[1.5]"
              >
                <span className="text-[13px] shrink-0">&#x26A0;</span>
                <div>
                  <b className="text-amber">Contention:</b> &ldquo;{c.a.name}
                  &rdquo; and &ldquo;{c.b.name}&rdquo; overlap on{" "}
                  <b className="text-amber">{c.surface}</b> wk {c.start + 1}
                  &ndash;{c.end}. Resequence?
                </div>
              </div>
            );
          }
          if (!c.overlaps && c.a.surface === c.b.surface) {
            return (
              <div
                key={i}
                className="border-[1.5px] border-dashed border-green-line bg-green-soft p-[10px_14px] flex gap-[10px] items-baseline text-[11.5px] leading-[1.5]"
              >
                <span className="text-[13px] text-green shrink-0">
                  &#x2713;
                </span>
                <div>
                  <b className="text-green">Sequenced:</b> &ldquo;{c.a.name}
                  &rdquo; and &ldquo;{c.b.name}&rdquo; share{" "}
                  <b className="text-green">{c.surface}</b> &mdash; no overlap.
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-[24px] left-1/2 -translate-x-1/2 bg-ink text-[#e6dfce] py-[10px] px-[18px] text-[12px] z-[100] shadow-[4px_4px_0_rgba(42,42,42,.2)]">
          {toast}
        </div>
      )}
    </>
  );
}

/* ─── Sequence block ─── */

function SequenceBlock({
  group,
  gi,
  contentions,
  onBarSlideEnd,
  onReorder,
  entries,
}: {
  group: Extract<PlanEntry, { type: "seq" }>;
  gi: number;
  contentions: Contention[];
  onBarSlideEnd: (id: string, start: number, orig: number) => void;
  onReorder: (from: number, to: number) => void;
  entries: PlanEntry[];
}) {
  return (
    <div>
      <div
        className="grid items-center bg-terra-soft border-b border-dashed border-terra-line border-t-[2px] border-t-terra-line cursor-grab active:cursor-grabbing min-h-[32px]"
        style={{ gridTemplateColumns: cols() }}
        draggable
        data-gidx={gi}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(gi));
          (e.target as HTMLElement).style.opacity = "0.35";
        }}
        onDragEnd={(e) => {
          (e.target as HTMLElement).style.opacity = "1";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const from = Number(e.dataTransfer.getData("text/plain"));
          if (from !== gi) onReorder(from, gi);
        }}
      >
        <div className="flex items-center gap-[8px] py-[6px] px-[12px] border-r-[1.5px] border-dashed border-terra-line">
          <span className="text-[12px] text-ink-faint cursor-grab">&#x2807;</span>
          <span className="text-[10px] font-bold tracking-[0.5px] uppercase text-terra">
            &#x26D3; {group.name}
          </span>
          <span className="text-[9px] text-ink-soft tracking-[0.3px]">
            {group.chain}
          </span>
        </div>
        <div style={{ gridColumn: "2 / -1" }} />
      </div>

      {group.bets.map((bet, bi) => (
        <GroupChildRow
          key={bet.id}
          bet={bet}
          bi={bi}
          isLast={bi === group.bets.length - 1}
          nextBet={bi < group.bets.length - 1 ? group.bets[bi + 1] : undefined}
          contentions={contentions}
          onBarSlideEnd={onBarSlideEnd}
        />
      ))}
    </div>
  );
}

function GroupChildRow({
  bet,
  bi,
  isLast,
  nextBet,
  contentions,
  onBarSlideEnd,
}: {
  bet: PlanBet;
  bi: number;
  isLast: boolean;
  nextBet?: PlanBet;
  contentions: Contention[];
  onBarSlideEnd: (id: string, start: number, orig: number) => void;
}) {
  const left = bet.start * WW;
  const width = bet.dur * WW;
  const sc = statusClass(bet.status);

  const zones = contentions.filter(
    (c) => c.overlaps && (c.a.id === bet.id || c.b.id === bet.id),
  );

  return (
    <div
      className={`grid items-center border-b border-dashed border-rule-faint min-h-[48px] relative ${
        isLast ? "border-b-[2px] border-b-terra-line" : ""
      }`}
      style={{
        gridTemplateColumns: cols(),
        background: "color-mix(in srgb, #a64d3b 3%, transparent)",
      }}
    >
      <div className="py-[6px] pr-[12px] pl-[28px] border-r-[1.5px] border-dashed border-rule-faint flex flex-col gap-[2px] relative">
        <span className="text-terra text-[10px] absolute left-[12px] top-1/2 -translate-y-1/2">
          {isLast ? "└" : "├"}
        </span>
        <span className="text-[11px] font-semibold leading-[1.3]">
          {bet.name}
        </span>
        <span className="text-[9px] text-ink-soft">{bet.surface}</span>
        <StatusBadge status={bet.status} />
      </div>
      <div
        className="relative flex h-full items-center"
        style={{ gridColumn: "2 / -1" }}
      >
        {zones.map((z, i) => (
          <ContentionZone key={i} start={z.start} end={z.end} />
        ))}
        {nextBet && <ChainConnector from={bet} to={nextBet} />}
        <Bar bet={bet} sc={sc} left={left} width={width} onSlideEnd={onBarSlideEnd} />
      </div>
    </div>
  );
}

function SoloRow({
  bet,
  gi,
  contentions,
  onBarSlideEnd,
  onReorder,
}: {
  bet: PlanBet;
  gi: number;
  contentions: Contention[];
  onBarSlideEnd: (id: string, start: number, orig: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const left = bet.start * WW;
  const width = bet.dur * WW;
  const sc = statusClass(bet.status);

  const zones = contentions.filter(
    (c) => c.overlaps && (c.a.id === bet.id || c.b.id === bet.id),
  );

  return (
    <div
      className="grid items-center border-b border-dashed border-rule-faint min-h-[48px] relative cursor-grab active:cursor-grabbing"
      style={{ gridTemplateColumns: cols() }}
      draggable
      data-gidx={gi}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(gi));
        (e.target as HTMLElement).style.opacity = "0.35";
      }}
      onDragEnd={(e) => {
        (e.target as HTMLElement).style.opacity = "1";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (from !== gi) onReorder(from, gi);
      }}
    >
      <div className="py-[6px] px-[12px] border-r-[1.5px] border-dashed border-rule-faint flex flex-col gap-[2px]">
        <span className="text-[11px] font-semibold leading-[1.3] flex items-center gap-[6px]">
          <span className="text-[12px] text-ink-faint cursor-grab">&#x2807;</span>
          {bet.name}
        </span>
        <span className="text-[9px] text-ink-soft">{bet.surface}</span>
        <StatusBadge status={bet.status} />
      </div>
      <div
        className="relative flex h-full items-center"
        style={{ gridColumn: "2 / -1" }}
      >
        {zones.map((z, i) => (
          <ContentionZone key={i} start={z.start} end={z.end} />
        ))}
        <Bar bet={bet} sc={sc} left={left} width={width} onSlideEnd={onBarSlideEnd} />
      </div>
    </div>
  );
}

const BAR_STYLES: Record<string, string> = {
  won: "bg-green-soft border-green-line text-green border-solid",
  running: "bg-terra-soft border-terra text-terra border-solid",
  locked: "bg-white/50 border-terra-line text-terra border-solid",
  draft: "bg-white/35 border-rule-faint text-ink-faint border-dashed",
};

function Bar({
  bet,
  sc,
  left,
  width,
  onSlideEnd,
}: {
  bet: PlanBet;
  sc: string;
  left: number;
  width: number;
  onSlideEnd: (id: string, start: number, orig: number) => void;
}) {
  const slidable = canSlide(bet);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!slidable) return;
    e.preventDefault();
    e.stopPropagation();

    const bar = e.currentTarget;
    const startX = e.clientX;
    const origStart = bet.start;
    bar.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const newStart = Math.max(
        0,
        Math.min(WEEKS - bet.dur, Math.round((origStart * WW + dx) / WW)),
      );
      bar.style.left = `${newStart * WW}px`;
    };

    const onUp = () => {
      bar.removeEventListener("pointermove", onMove);
      bar.removeEventListener("pointerup", onUp);
      const currentLeft = parseInt(bar.style.left, 10);
      const newStart = Math.round(currentLeft / WW);
      onSlideEnd(bet.id, newStart, origStart);
    };

    bar.addEventListener("pointermove", onMove);
    bar.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className={`absolute h-[22px] border-[1.5px] flex items-center px-[7px] text-[9px] font-semibold tracking-[0.3px] whitespace-nowrap overflow-hidden z-[1] transition-shadow duration-100 ${BAR_STYLES[sc]} ${
        slidable ? "cursor-ew-resize hover:shadow-[0_0_0_2px_var(--color-terra-line)]" : ""
      }`}
      style={{ left, width }}
      data-bid={bet.id}
      onPointerDown={handlePointerDown}
    >
      {bet.dur}w &middot; {bet.metric}
    </div>
  );
}

function StatusBadge({ status }: { status: PlanBetStatus }) {
  const styles: Record<PlanBetStatus, string> = {
    won: "text-paper bg-green border-green",
    running: "text-terra border-terra bg-terra-soft",
    locked: "text-terra border-terra-line",
    draft: "text-ink-faint border-rule-faint border-dashed",
  };
  return (
    <span
      className={`text-[8px] tracking-[0.5px] uppercase px-[6px] py-[1px] border inline-block w-fit ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ContentionZone({ start, end }: { start: number; end: number }) {
  return (
    <div
      className="absolute top-0 bottom-0 z-0 pointer-events-none"
      style={{
        left: start * WW,
        width: (end - start) * WW,
        background:
          "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(166,77,59,.06) 4px, rgba(166,77,59,.06) 5px)",
        borderLeft: "2px solid var(--color-amber-line)",
        borderRight: "2px solid var(--color-amber-line)",
      }}
    />
  );
}

function ChainConnector({ from, to }: { from: PlanBet; to: PlanBet }) {
  const lx = from.start * WW + from.dur * WW;
  const rx = to.start * WW;
  if (rx <= lx) return null;
  const resolved = from.resolved;
  return (
    <>
      <div
        className="absolute h-0 z-0 pointer-events-none"
        style={{
          left: lx,
          width: rx - lx,
          top: "50%",
          borderTop: `1.5px ${resolved ? "solid" : "dashed"} var(--color-${resolved ? "green" : "terra-line"})`,
        }}
      />
      <div
        className="absolute z-[1] pointer-events-none rounded-full"
        style={{
          left: rx,
          top: "50%",
          width: 6,
          height: 6,
          transform: "translate(-50%, -50%)",
          background: `var(--color-${resolved ? "green" : "terra"})`,
        }}
      />
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-[5px]">
      <span className={`w-[12px] h-[8px] border ${color}`} />
      {label}
    </div>
  );
}
