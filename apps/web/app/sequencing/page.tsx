"use client";

import { useEffect, useState } from "react";
import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { takeSequenceSeed } from "@/lib/compose/handoff";
import { uuid } from "@/lib/uuid";

type Mode = "single" | "sequence";
type DepType = "chain" | "fanin" | "parallel";

interface SubBet {
  id: string;
  q: string;
  instr: string;
}

function Crumb({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] text-ink-soft">{children}</span>;
}

export default function SequencingPage() {
  const [mode, setMode] = useState<Mode>("single");
  const [depType, setDepType] = useState<DepType>("chain");
  const [subBets, setSubBets] = useState<SubBet[]>([]);
  const [claim, setClaim] = useState("");
  const [mechanism, setMechanism] = useState("");

  useEffect(() => {
    const seed = takeSequenceSeed();
    if (seed) {
      setMode("sequence");
      setDepType(seed.depType);
      if (seed.claim) setClaim(seed.claim);
      if (seed.mechanism) setMechanism(seed.mechanism);
      setSubBets(
        seed.subBets.map((sb, i) => ({
          id: String(i + 1),
          q: sb.question,
          instr: sb.instrument,
        })),
      );
    }
  }, []);

  const addSubBet = () => {
    setSubBets([...subBets, { id: uuid(), q: "", instr: "" }]);
  };

  const removeSubBet = (id: string) => {
    setSubBets(subBets.filter((b) => b.id !== id));
  };

  const updateSubBet = (id: string, field: keyof SubBet, value: string) => {
    setSubBets(subBets.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[16px]">
        <div className="flex justify-between items-start gap-[18px] flex-wrap">
          <div>
            <div className="flex flex-wrap gap-x-[14px] gap-y-[6px]">
              <Crumb>Layer 2</Crumb>
              <Crumb>·</Crumb>
              <Crumb>sequencing</Crumb>
              <Crumb>·</Crumb>
              <Crumb>one or many?</Crumb>
            </div>
          </div>
          <div className="stamp">decompose first</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-terra font-medium">You arrive here from the strategy view.</span> The job: decide if this is one bet or a sequence of dependent bets — and if it's a sequence, lay out the shape.
        </p>
      </header>

      <Walkthrough>
        <WalkthroughStep n={1} title="Single or sequence?">
          A single bet stands alone. A sequence chains multiple bets where each depends on the previous — the order is the hypothesis.
        </WalkthroughStep>
        <WalkthroughStep n={2} title="Dependency shapes">
          Chain = sequential. Fan-in = multiple signals converging on one decision. Parallel = independent bets sharing a surface.
        </WalkthroughStep>
      </Walkthrough>

      <div className="border-[1.5px] border-solid border-green-line bg-green-soft p-[14px] mb-[18px] relative">
        <div className="absolute top-[-9px] left-[14px] bg-paper px-[8px] text-[9.5px] tracking-[2px] text-green">CARRIED FROM STRATEGY</div>
        <div className="text-[13.5px] font-bold">A/B test 3 versions of the email on 100 customers within 2 weeks</div>
        <div className="text-[11px] text-ink-soft mt-[4px]">↳ from Send an email campaign to loan-only customers · metric: 7-day login · target 30% → 80%</div>
      </div>

      <div className="border-[1.5px] border-dashed border-rule bg-white/[.28] p-[18px] mb-[18px]">
        <div className="text-[15px] font-bold">Is this one bet, or a sequence?</div>
        <div className="text-[12px] text-ink-soft mb-[14px]">Most candidates are a single claim. Some rest on prior claims that haven't been tested — those are sequences in disguise.</div>

        <div className="flex border-[1.5px] border-solid border-terra-line w-fit">
          <button
            onClick={() => setMode("single")}
            className={`p-[8px_14px] text-[12px] ${mode === "single" ? "bg-terra text-paper font-bold border-solid border-terra" : "bg-transparent text-ink-soft border-dashed border-terra-line"}`}
          >
            Single bet
          </button>
          <button
            onClick={() => setMode("sequence")}
            className={`p-[8px_14px] text-[12px] ${mode === "sequence" ? "bg-terra text-paper font-bold border-solid border-terra" : "bg-transparent text-ink-soft border-dashed border-terra-line"}`}
          >
            Sequence of bets
          </button>
        </div>

        <div className="border-[1.5px] border-dashed border-terra-line bg-terra-soft py-[12px] px-[14px] mt-[14px] text-[11.5px] leading-[1.55]">
          <div className="text-[9px] tracking-[1.5px] uppercase text-terra font-bold mb-[6px]">⌑ Tell-tale signs it's a sequence</div>
          <ul className="list-disc pl-[18px] space-y-[4px]">
            <li>This claim rests on a prior that hasn't been tested (e.g. "which body lifts logins" presumes "people open at all").</li>
            <li>You're bundling multiple distinct mechanisms under one heading.</li>
            <li>There's a downstream rollout that should fire only on a specific outcome — that's already a dependency.</li>
          </ul>
        </div>

        <div className="mt-[18px]">
          {mode === "single" ? (
            <>
              <div className="border-[1.5px] border-solid border-terra-line bg-white/40 p-[14px]">
                <div className="text-[10.5px] tracking-[1px] uppercase text-ink-soft mb-[6px]">the claim</div>
                <textarea
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  placeholder="Which of 3 email bodies lifts 7-day login on dormant loan customers?"
                  className="border-[1.5px] border-dashed border-rule-faint bg-white/50 py-[10px] px-[12px] text-[13px] leading-[1.5] min-h-[42px] outline-none w-full"
                />
                <div className="text-[10.5px] tracking-[1px] uppercase text-ink-soft mb-[6px] mt-[12px]">expected mechanism</div>
                <textarea
                  value={mechanism}
                  onChange={(e) => setMechanism(e.target.value)}
                  placeholder="A clearer CTA in the winning body reduces the click-to-login friction."
                  className="border-[1.5px] border-dashed border-rule-faint bg-white/50 py-[10px] px-[12px] text-[13px] leading-[1.5] min-h-[42px] outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-[12px] mt-[18px]">
                <a href="/bet/new" className="bg-terra text-paper border-solid border-terra py-[10px] px-[16px] text-[12px]">articulate in the lifecycle ▸</a>
                <span className="text-[11px] italic text-ink-soft">opens the bet front door</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[10.5px] tracking-[1px] uppercase text-ink-soft mb-[6px]">dependency shape</div>
              <div className="flex border-[1.5px] border-solid border-rule w-fit mb-[8px]">
                {(["chain", "fanin", "parallel"] as DepType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDepType(t)}
                    className={`p-[6px_12px] text-[11px] ${depType === t ? "bg-ink text-paper" : "bg-transparent text-ink-soft border-dashed border-rule-faint"}`}
                  >
                    {t === "chain" ? "linear chain" : t === "fanin" ? "fan-in" : "independent parallel"}
                  </button>
                ))}
              </div>
              <div className="text-[11px] italic text-ink-soft mb-[14px]">
                {depType === "chain" && "each bet depends on the prior winning · a loss prunes everything downstream."}
                {depType === "fanin" && 'multiple prereqs converge on a single downstream bet · the join (AND/OR) decides what "satisfied" means.'}
                {depType === "parallel" && "the bets stand alone · resolving one doesn't gate the others (still grouped under the goal)."}
              </div>

              <div className="space-y-[10px]">
                {subBets.map((bet, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <div key={bet.id} className="flex items-start gap-[10px]">
                      <div className="text-[11px] text-terra font-bold w-[22px]">{letter}</div>
                      <textarea
                        value={bet.q}
                        onChange={(e) => updateSubBet(bet.id, "q", e.target.value)}
                        placeholder="Enter question..."
                        className="flex-1 border-[1.5px] border-dashed border-rule-faint bg-white/50 py-[10px] px-[12px] text-[13px] leading-[1.5] min-h-[42px] outline-none"
                      />
                      <div className="text-[9.5px] tracking-[0.5px] uppercase text-ink-faint border border-dashed border-rule-faint px-[6px] py-[1px] self-center">{bet.instr}</div>
                      <button onClick={() => removeSubBet(bet.id)} className="text-[11px] text-ink-soft hover:text-red-500">remove</button>
                    </div>
                  );
                })}
              </div>
              <button onClick={addSubBet} className="text-[12px] text-terra mt-[8px]">+ add a bet</button>

              <div className="border-[1.5px] border-solid border-rule-faint bg-white/30 p-[14px] mt-[6px]">
                <div className="text-[10px] tracking-[1px] uppercase text-ink-soft mb-[10px]">how it lays out</div>
                <div className="flex items-center gap-[12px] flex-wrap">
                  {depType === "chain" && subBets.map((bet, idx) => (
                    <div key={bet.id} className="flex items-center gap-[8px]">
                      <div className="border-[1.5px] border-solid border-terra-line bg-white/50 py-[7px] px-[10px] text-[11px] font-semibold min-w-[120px] max-w-[200px] truncate">
                        {String.fromCharCode(65 + idx)}: {bet.q.slice(0, 34)}{bet.q.length > 34 ? "..." : ""}
                      </div>
                      {idx < subBets.length - 1 && <span className="text-ink-soft">→</span>}
                    </div>
                  ))}
                  {depType === "parallel" && subBets.map((bet, idx) => (
                    <div key={bet.id} className="border-[1.5px] border-solid border-terra-line bg-white/50 py-[7px] px-[10px] text-[11px] font-semibold min-w-[120px] max-w-[200px] truncate">
                      {String.fromCharCode(65 + idx)}: {bet.q.slice(0, 34)}{bet.q.length > 34 ? "..." : ""}
                    </div>
                  ))}
                  {depType === "fanin" && (
                    <>
                      <div className="flex flex-col gap-[8px]">
                        {subBets.slice(0, -1).map((bet, idx) => (
                          <div key={bet.id} className="border-[1.5px] border-solid border-terra-line bg-white/50 py-[7px] px-[10px] text-[11px] font-semibold min-w-[120px] max-w-[200px] truncate">
                            {String.fromCharCode(65 + idx)}: {bet.q.slice(0, 34)}{bet.q.length > 34 ? "..." : ""}
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] font-bold text-ink-soft border border-dashed border-rule px-[6px] py-[2px]">AND</div>
                      {subBets.length > 0 && (
                        <div className="border-[1.5px] border-solid border-terra-line bg-white/50 py-[7px] px-[10px] text-[11px] font-semibold min-w-[120px] max-w-[200px] truncate">
                          {String.fromCharCode(65 + subBets.length - 1)}: {subBets[subBets.length - 1].q.slice(0, 34)}{subBets[subBets.length - 1].q.length > 34 ? "..." : ""}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-[12px] mt-[18px]">
                <a href="/bet/new" className="bg-terra text-paper border-solid border-terra py-[10px] px-[16px] text-[12px]">articulate the first bet in the lifecycle ▸</a>
                <span className="text-[11px] italic text-ink-soft">each bet runs the lifecycle independently; the sequence is recorded so the verdicts can propagate.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
