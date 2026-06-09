"use client";

import { useCallback, useEffect, useState } from "react";
import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { MechanismClusters } from "@/components/km/MechanismClusters";
import { SurfaceMatrix } from "@/components/km/SurfaceMatrix";
import { TheoryEvolution } from "@/components/km/TheoryEvolution";
import { CycleSummary } from "@/components/km/CycleSummary";
import { listResolvedBets } from "@/lib/km/queries";
import type { ResolvedBetRecord, RetroMode } from "@/lib/km/types";

const MODES: { key: RetroMode; label: string }[] = [
  { key: "clusters", label: "Mechanism clusters" },
  { key: "matrix", label: "Surface × mechanism" },
  { key: "evolution", label: "Theory evolution" },
];

export default function LearnPage() {
  const [mode, setMode] = useState<RetroMode>("clusters");
  const [bets, setBets] = useState<ResolvedBetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const records = await listResolvedBets();
    setBets(records);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const wins = bets.filter((b) => b.outcome === "won").length;
  const losses = bets.filter((b) => b.outcome === "lost").length;
  const inconclusive = bets.filter((b) => b.outcome === "inconclusive").length;

  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[16px]">
        <div className="flex justify-between items-start gap-[18px] flex-wrap">
          <div>
            <div className="flex flex-wrap gap-x-[14px] gap-y-[6px]">
              <Crumb>Layer 5</Crumb>
              <Crumb>&middot;</Crumb>
              <Crumb>knowledge retrospective</Crumb>
            </div>
          </div>
          <div className="stamp">which theories held up?</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-terra font-medium">
            Your &ldquo;because&rdquo; clauses, tested against reality.
          </span>{" "}
          Every resolved bet had a mechanism — the theory behind why it should
          work. This surface aggregates those mechanisms and surfaces which ones
          actually predicted outcomes.
        </p>
      </header>

      <Walkthrough>
        <WalkthroughStep n={1} title="Three ways to slice the same data">
          Mechanism clusters group by theory type. The surface matrix cross-tabs
          to find what works where. Theory evolution shows how your understanding
          deepened over time.
        </WalkthroughStep>
        <WalkthroughStep n={2} title="Blind spots matter most">
          Empty cells in the matrix are explicit gaps — things you haven&apos;t
          tested. The most valuable output is often what&apos;s missing, not
          what succeeded.
        </WalkthroughStep>
      </Walkthrough>

      {loading && (
        <div className="text-[12px] text-ink-soft italic">
          Loading resolved bets...
        </div>
      )}

      {!loading && bets.length === 0 && (
        <div className="border-[1.5px] border-dashed border-rule bg-paper-veil p-[18px] text-[12px] text-ink-soft">
          No resolved bets yet. Resolve some bets in the journal, then come back
          to see which of your theories held up. Load demo fixtures from the
          settings panel to see this view in action.
        </div>
      )}

      {!loading && bets.length > 0 && (
        <>
          {/* Period indicator */}
          <div className="border-[1.5px] border-dashed border-plinth-line bg-plinth-soft p-[10px_14px] mb-[16px] flex gap-[14px] items-baseline flex-wrap">
            <span className="text-[9px] tracking-[1.5px] uppercase text-plinth font-bold">
              showing
            </span>
            <span className="text-[13px] font-bold">
              {bets.length} resolved bet{bets.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[11px] text-ink-soft">
              {wins} won &middot; {losses} lost &middot; {inconclusive}{" "}
              inconclusive
            </span>
          </div>

          {/* Mode switcher */}
          <div className="flex gap-[14px] items-center flex-wrap mb-[16px]">
            <div className="flex border-[1.5px] border-terra-line">
              {MODES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={
                    mode === key
                      ? "font-bold text-paper bg-terra border-none px-[14px] py-[7px] text-[11.5px] cursor-pointer font-[inherit]"
                      : "bg-transparent text-ink-soft border-none border-r-[1.5px] border-dashed border-terra-line px-[14px] py-[7px] text-[11.5px] cursor-pointer hover:bg-terra-soft font-[inherit]"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "clusters" && <MechanismClusters bets={bets} />}
          {mode === "matrix" && <SurfaceMatrix bets={bets} />}
          {mode === "evolution" && <TheoryEvolution bets={bets} />}

          <CycleSummary mode={mode} />
        </>
      )}

      <footer className="mt-[22px] border-t-[1.5px] border-dashed border-rule pt-[12px] text-[11px] text-ink-soft leading-[1.7]">
        Layer 5 — Knowledge Management. Individual-only, retrospective entry.
        The &ldquo;because&rdquo; field is the key — no mechanism, no pattern to
        learn from.
      </footer>
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
