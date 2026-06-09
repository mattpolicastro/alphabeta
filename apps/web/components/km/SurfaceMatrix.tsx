"use client";

import type { ResolvedBetRecord, MechCategory } from "@/lib/km/types";
import { MECH_LABELS } from "@/lib/km/types";
import { SURFACE_LABELS } from "@/lib/km/fixtures";

function outcomeColor(outcome: string): string {
  if (outcome === "won") return "bg-green";
  if (outcome === "lost") return "bg-terra";
  return "bg-amber";
}

export function SurfaceMatrix({ bets }: { bets: ResolvedBetRecord[] }) {
  const surfaces = [...new Set(bets.map((b) => b.surface))];
  const mechs = [...new Set(bets.map((b) => b.mechanism))] as MechCategory[];

  return (
    <div className="border-[1.5px] border-dashed border-rule overflow-x-auto">
      <div
        className="grid gap-px bg-rule-faint"
        style={{
          gridTemplateColumns: `140px repeat(${mechs.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div className="bg-[rgba(255,255,255,0.5)] px-[10px] py-[8px]" />
        {mechs.map((m) => (
          <div
            key={m}
            className="bg-[rgba(255,255,255,0.5)] px-[10px] py-[8px] text-[10px] font-bold tracking-[0.5px] uppercase text-ink-soft"
          >
            {MECH_LABELS[m]}
          </div>
        ))}

        {/* Data rows */}
        {surfaces.map((s) => (
          <>
            <div
              key={`${s}-label`}
              className="bg-[rgba(255,255,255,0.5)] px-[10px] py-[8px] text-[11px] font-bold text-ink"
            >
              {SURFACE_LABELS[s] ?? s}
            </div>
            {mechs.map((m) => {
              const cell = bets.filter(
                (b) => b.surface === s && b.mechanism === m,
              );
              if (cell.length === 0) {
                return (
                  <div
                    key={`${s}-${m}`}
                    className="bg-paper px-[10px] py-[8px] text-[10px] italic text-ink-faint"
                  >
                    &mdash;
                  </div>
                );
              }
              return (
                <div
                  key={`${s}-${m}`}
                  className="bg-paper px-[10px] py-[8px]"
                >
                  {cell.map((b) => (
                    <div
                      key={b.id}
                      className="inline-flex items-center gap-[4px] text-[10px] mb-[3px]"
                    >
                      <span
                        className={`w-[8px] h-[8px] rounded-full ${outcomeColor(b.outcome)}`}
                      />
                      {b.question.length > 18
                        ? `${b.question.slice(0, 18)}...`
                        : b.question}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
