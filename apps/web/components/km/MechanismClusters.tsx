"use client";

import { useState } from "react";
import type { ResolvedBetRecord, MechCategory } from "@/lib/km/types";
import { MECH_LABELS } from "@/lib/km/types";
import { SURFACE_LABELS } from "@/lib/km/fixtures";
import { OutcomeBadge } from "./OutcomeBadge";

type ClusterData = {
  mech: MechCategory;
  bets: ResolvedBetRecord[];
  wins: number;
  losses: number;
  inconclusive: number;
};

function buildClusters(bets: ResolvedBetRecord[]): ClusterData[] {
  const map = new Map<MechCategory, ResolvedBetRecord[]>();
  for (const b of bets) {
    const arr = map.get(b.mechanism) ?? [];
    arr.push(b);
    map.set(b.mechanism, arr);
  }
  return [...map.entries()]
    .map(([mech, betList]) => ({
      mech,
      bets: betList,
      wins: betList.filter((b) => b.outcome === "won").length,
      losses: betList.filter((b) => b.outcome === "lost").length,
      inconclusive: betList.filter((b) => b.outcome === "inconclusive").length,
    }))
    .sort((a, b) => b.wins - a.wins);
}

function clusterInsight(c: ClusterData): string {
  const label = MECH_LABELS[c.mech];
  const total = c.bets.length;
  if (c.wins > c.losses)
    return `${label} theories held up ${c.wins}/${total} times this cycle. Your strongest "because" category.`;
  if (c.losses > c.wins)
    return `${label} theories failed ${c.losses}/${total} times. Worth interrogating — are you over-indexing on this mechanism?`;
  return `${label} — mixed results (${c.wins}W/${c.losses}L/${c.inconclusive}I). The mechanism works somewhere but not everywhere; check which surfaces.`;
}

export function MechanismClusters({ bets }: { bets: ResolvedBetRecord[] }) {
  const clusters = buildClusters(bets);
  const [collapsed, setCollapsed] = useState<Set<MechCategory>>(new Set());

  const toggle = (m: MechCategory) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  return (
    <div className="flex flex-col gap-[14px]">
      {clusters.map((c) => {
        const total = c.bets.length;
        const isOpen = !collapsed.has(c.mech);
        return (
          <div
            key={c.mech}
            className="border-[1.5px] border-dashed border-rule bg-paper-veil"
          >
            <button
              type="button"
              onClick={() => toggle(c.mech)}
              className="w-full flex justify-between items-center px-[15px] py-[12px] border-b-[1.5px] border-dashed border-rule-faint hover:bg-paper-hover text-left"
            >
              <span className="text-[14px] font-bold">
                {MECH_LABELS[c.mech]}
              </span>
              <span className="flex items-center gap-[14px] text-[11px]">
                <span className="flex items-center gap-[5px]">
                  <span className="w-[10px] h-[10px] rounded-full bg-green" />
                  {c.wins}W
                </span>
                <span className="flex items-center gap-[5px]">
                  <span className="w-[10px] h-[10px] rounded-full bg-terra" />
                  {c.losses}L
                </span>
                <span className="flex items-center gap-[5px]">
                  <span className="w-[10px] h-[10px] rounded-full bg-amber" />
                  {c.inconclusive}I
                </span>
                <ProportionBar
                  wins={c.wins}
                  losses={c.losses}
                  inconclusive={c.inconclusive}
                  total={total}
                />
              </span>
            </button>

            {isOpen && (
              <div>
                {c.bets.map((b) => (
                  <div
                    key={b.id}
                    className="grid items-center gap-[12px] px-[15px] py-[10px] border-b border-dashed border-rule-faint last:border-b-0"
                    style={{ gridTemplateColumns: "1fr auto auto" }}
                  >
                    <div>
                      <div className="text-[12px] font-medium">
                        {b.question}
                      </div>
                      <div className="text-[10px] text-ink-soft mt-[2px]">
                        {SURFACE_LABELS[b.surface] ?? b.surface} &middot;
                        &ldquo;{b.mechanismText}&rdquo;
                      </div>
                    </div>
                    <div className="text-[11px] text-ink-soft text-right">
                      exp <span className="font-bold text-ink">{b.expected}</span>{" "}
                      &rarr; act{" "}
                      <span className="font-bold text-ink">{b.actual}</span>
                    </div>
                    <OutcomeBadge outcome={b.outcome} />
                  </div>
                ))}
              </div>
            )}

            <div className="px-[15px] py-[10px] border-t-[1.5px] border-dashed border-rule-faint bg-[rgba(255,255,255,0.15)] text-[11px] italic text-ink-soft leading-[1.5]">
              <span className="not-italic font-bold text-terra">
                {MECH_LABELS[c.mech]}
              </span>{" "}
              — {clusterInsight(c)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProportionBar({
  wins,
  losses,
  inconclusive,
  total,
}: {
  wins: number;
  losses: number;
  inconclusive: number;
  total: number;
}) {
  const wp = (wins / total) * 100;
  const lp = (losses / total) * 100;
  const ip = (inconclusive / total) * 100;
  return (
    <div className="flex h-[8px] w-[80px] overflow-hidden border border-rule-faint">
      <div className="bg-green" style={{ width: `${wp}%` }} />
      <div className="bg-terra" style={{ width: `${lp}%` }} />
      <div className="bg-amber" style={{ width: `${ip}%` }} />
    </div>
  );
}
