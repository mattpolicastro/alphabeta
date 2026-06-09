"use client";

import type { ResolvedBetRecord } from "@/lib/km/types";
import { SURFACE_LABELS } from "@/lib/km/fixtures";

function outcomeTextClass(outcome: string): string {
  if (outcome === "won") return "text-green";
  if (outcome === "lost") return "text-terra";
  return "text-amber";
}

function nodeColor(outcome: string): string {
  if (outcome === "won") return "border-green bg-green-soft";
  if (outcome === "lost") return "border-terra bg-terra-soft";
  return "border-amber bg-amber-soft";
}

export function TheoryEvolution({ bets }: { bets: ResolvedBetRecord[] }) {
  const bySurface = new Map<string, ResolvedBetRecord[]>();
  for (const b of bets) {
    const arr = bySurface.get(b.surface) ?? [];
    arr.push(b);
    bySurface.set(b.surface, arr);
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {[...bySurface.entries()].map(([surface, surfaceBets]) => {
        const sorted = [...surfaceBets].sort(
          (a, b) => a.resolvedAt - b.resolvedAt,
        );
        return (
          <div
            key={surface}
            className="border-[1.5px] border-dashed border-rule bg-paper-veil p-[14px_16px]"
          >
            <div className="flex justify-between items-baseline mb-[12px]">
              <span className="text-[14px] font-bold">
                {SURFACE_LABELS[surface] ?? surface}
              </span>
              <span className="text-[10px] text-ink-soft tracking-[0.5px] uppercase">
                {sorted.length} bet{sorted.length !== 1 ? "s" : ""} this cycle
              </span>
            </div>

            <div className="relative pl-[22px] border-l-2 border-rule-faint">
              {sorted.map((b) => (
                <div
                  key={b.id}
                  className="relative pl-[14px] mb-[16px] last:mb-0"
                >
                  {/* Timeline node */}
                  <div
                    className={`absolute w-[12px] h-[12px] rounded-full border-2 ${nodeColor(b.outcome)}`}
                    style={{ left: "-28px", top: "6px" }}
                  />

                  <div className="text-[12px] font-semibold leading-[1.4]">
                    {b.question}
                  </div>
                  <div className="text-[11px] text-ink-soft mt-[3px] italic">
                    <span className="not-italic font-bold text-terra">
                      because:
                    </span>{" "}
                    {b.mechanismText}
                  </div>
                  <div className="text-[10.5px] mt-[4px] flex gap-[8px] items-baseline">
                    <span className="text-ink-faint">
                      expected {b.expected}
                    </span>
                    <span className={`font-medium ${outcomeTextClass(b.outcome)}`}>
                      &rarr; actual {b.actual} ({b.outcome})
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-soft border-l-2 border-terra-line pl-[10px] mt-[6px] leading-[1.45]">
                    {b.learning}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
