"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { CarriedWager } from "@/components/bet/CarriedWager";
import { SegmentedButtons } from "@/components/ui/SegmentedButtons";
import { ConstraintSlider } from "@/components/ui/ConstraintSlider";
import {
  fit,
  suggest,
  type FeasibilityInstrument,
  type Randomize,
} from "@/lib/instrument/feasibility";
import { getBet, updateDraft } from "@/lib/bet/queries";
import type { AbBet } from "@/lib/bet/storage";
import type { Bet } from "@/lib/db/types";

type LoadState = "loading" | "missing" | "hydrated";

const TRAFFIC = ["", "a trickle", "thin", "moderate", "healthy", "abundant"];
const URGENCY = ["", "no rush", "relaxed", "fairly soon", "soon", "need it now"];
const CLAIM = ["", "directional", "loose", "solid", "strong", "bulletproof"];

const NAMES: Record<FeasibilityInstrument, string> = {
  ab: "A/B test",
  quasi: "Quasi-experiment",
  observational: "Observational",
  holdback: "Holdback",
};

function isFeasibilityInstrument(s: unknown): s is FeasibilityInstrument {
  return s === "ab" || s === "quasi" || s === "observational" || s === "holdback";
}

function isRandomize(s: unknown): s is Randomize {
  return s === "yes" || s === "no" || s === "shipped";
}

function asRangedInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.max(1, Math.min(5, Math.round(v)));
  }
  return fallback;
}

function buildAbBet(bet: Bet): AbBet {
  return {
    change: bet.articulation.change || undefined,
    direction: bet.articulation.direction,
    metric: bet.articulation.metric || undefined,
    magnitude: bet.articulation.magnitude || undefined,
    mechanism: bet.articulation.mechanism ?? undefined,
    confidence: bet.articulation.confidence,
    foldIf: bet.articulation.foldIf || undefined,
  };
}

function InstrumentPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [bet, setBet] = useState<Bet | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const [declared, setDeclared] = useState<FeasibilityInstrument>("ab");
  const [randomize, setRandomize] = useState<Randomize>("shipped");
  const [traffic, setTraffic] = useState<number>(3);
  const [urgency, setUrgency] = useState<number>(4);
  const [claim, setClaim] = useState<number>(3);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [showOverride, setShowOverride] = useState<boolean>(false);
  const [foldIfPercent, setFoldIfPercent] = useState<number>(4);

  const hydrated = state === "hydrated" && bet !== null;

  useEffect(() => {
    if (!id) {
      setState("missing");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await getBet(id);
        if (cancelled) return;
        if (!row) {
          setState("missing");
          return;
        }

        // Parse foldIfPercent from the articulation's fold-if clause.
        const m = row.articulation.foldIf.match(/(\d+(?:\.\d+)?)/);
        const percent = m
          ? Math.max(1, Math.min(10, Math.round(parseFloat(m[1]))))
          : 4;
        setFoldIfPercent(percent);

        // The persisted instrument type may be "interviews" (qualitative)
        // which isn't a Feasibility-screen option; ignore that case and let
        // the user reselect from the four quantitative instruments.
        if (isFeasibilityInstrument(row.instrument.type)) {
          setDeclared(row.instrument.type);
        }
        if (row.instrument.overrideReason) {
          setOverrideReason(row.instrument.overrideReason);
          setShowOverride(true);
        }

        // bet.instrument.feasibility is Record<string, unknown> in the
        // schema; narrow what we know we wrote.
        const f = row.instrument.feasibility;
        if (isRandomize(f.randomize)) setRandomize(f.randomize);
        setTraffic(asRangedInt(f.traffic, 3));
        setUrgency(asRangedInt(f.urgency, 4));
        setClaim(asRangedInt(f.claim, 3));

        setBet(row);
        setState("hydrated");
      } catch {
        if (!cancelled) setState("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Persist on every state change once hydration completes.
  useEffect(() => {
    if (!hydrated || !id) return;
    void updateDraft(id, {
      instrument: {
        type: declared,
        overrideReason: showOverride && overrideReason ? overrideReason : null,
        feasibility: { randomize, traffic, urgency, claim, foldIfPercent },
      },
    }).catch(() => {
      // best-effort; locked rows will reject (handled at the query layer).
    });
  }, [
    hydrated,
    id,
    declared,
    showOverride,
    overrideReason,
    randomize,
    traffic,
    urgency,
    claim,
    foldIfPercent,
  ]);

  const feasibilityState = {
    foldIfPercent,
    randomize,
    traffic,
    urgency,
    claim,
  };
  const map = fit(feasibilityState);
  const best = suggest(map, feasibilityState);

  const isBest = best === declared;
  const isFit = map[declared].verdict === "fits";

  const onSwitch = () => {
    if (best === null) return;
    setDeclared(best);
    setShowOverride(false);
  };

  const onKeep = () => setShowOverride(true);

  if (state === "loading") {
    return (
      <div className="ab-wrap">
        <div className="dashed-panel">
          <div className="dashed-panel-title">Loading bet…</div>
        </div>
      </div>
    );
  }

  if (state === "missing" || !bet) {
    return (
      <div className="ab-wrap">
        <div className="dashed-panel">
          <div className="dashed-panel-title">No bet specified</div>
          <div className="dashed-panel-sub">
            /bet/instrument needs an <code>?id=</code> query. If you got
            here by mistake, head back to the journal.
          </div>
          <ButtonLink href="/" variant="primary">
            ← journal
          </ButtonLink>
        </div>
      </div>
    );
  }

  const instrumentName = NAMES[declared];

  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[20px]">
        <div className="flex justify-between items-start gap-[18px] flex-wrap">
          <div>
            <div className="wordmark">
              alph<span className="a">⍺</span>
              <span className="b">β</span>eta
            </div>
            <div className="flex flex-wrap gap-x-[14px] gap-y-[6px] mt-[6px]">
              <Crumb>setup spine</Crumb>
              <Crumb>·</Crumb>
              <Crumb>instrument &amp; feasibility</Crumb>
              <Crumb>·</Crumb>
              <Crumb>the falsifier is the spec</Crumb>
            </div>
          </div>
          <div className="stamp">can this test resolve the bet?</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-green font-medium">
            The falsifier you committed upstream isn't decoration here.
          </span>{" "}
          It's the spec. The smallest effect that would change your mind sets the
          smallest effect the instrument must detect.
        </p>
      </header>

      <SpineRail steps={lifecycleSteps(id)} />

      <div className="ab-cols">
        <div className="min-w-0">
          <CarriedWager bet={buildAbBet(bet)} />

          <div className="border-[1.5px] border-dashed border-terra-line bg-terra-soft p-[12px] mb-[18px]">
            <div className="text-[11.5px] uppercase tracking-[1px] text-terra mb-[8px]">
              falsifier → spec
            </div>
            <div className="text-[12.5px]">
              Your bet folds at +{foldIfPercent}%. The instrument must be able to see
              +{foldIfPercent}% — anything that can't detect it can't resolve your bet,
              no matter how cleanly it runs.
            </div>
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">The effect the test must see</div>
            <div className="text-[32px] font-bold mb-[10px]">
              +{foldIfPercent}%
            </div>
            <div className="text-[12.5px] text-ink-soft">
              This is your bet's fold-if — the smallest effect worth resolving.
              Locked with the bet; step back to wager to change it.
            </div>
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">Constraints</div>
            <div className="mb-[14px]">
              <SegmentedButtons
                value={randomize}
                options={[
                  { value: "yes", label: "Yes, split traffic" },
                  { value: "no", label: "No" },
                  { value: "shipped", label: "Already shipped" },
                ]}
                onChange={setRandomize}
                ariaLabel="Randomize"
              />
            </div>
            <ConstraintSlider
              label="traffic"
              value={traffic}
              words={TRAFFIC}
              onChange={setTraffic}
            />
            <ConstraintSlider
              label="urgency"
              value={urgency}
              words={URGENCY}
              onChange={setUrgency}
            />
            <ConstraintSlider
              label="claim"
              value={claim}
              words={CLAIM}
              onChange={setClaim}
            />
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">Instrument finder</div>
            <div className="flex flex-col gap-[10px]">
              {["ab", "quasi", "observational", "holdback"].map((instrument) => {
                const inst = instrument as FeasibilityInstrument;
                const fit = map[inst];
                const isBestFit = best === inst;
                const isDeclared = declared === inst;
                return (
                  <div
                    key={inst}
                    className={`border-[1.5px] border-dashed p-[12px] ${
                      isBestFit
                        ? "border-terra bg-terra-soft"
                        : isDeclared
                        ? "border-green bg-green-soft"
                        : "border-rule"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-[10px] mb-[6px]">
                      <div className="text-[13px] font-bold">
                        {NAMES[inst]}
                      </div>
                      <div className="flex flex-wrap gap-[4px]">
                        <span
                          className={`text-[10px] px-[6px] py-[2px]  ${
                            fit.verdict === "fits"
                              ? "bg-green text-paper"
                              : fit.verdict === "costly"
                              ? "bg-amber text-paper"
                              : "bg-terra-line text-terra"
                          }`}
                        >
                          {fit.verdict}
                        </span>
                        <span className="text-[10px] px-[6px] py-[2px] bg-terra-soft text-terra ">
                          {fit.metric}
                        </span>
                      </div>
                    </div>
                    <div className="text-[12px] mb-[6px]">
                      {fit.reason}
                    </div>
                    {isBestFit && (
                      <div className="text-[10px] text-terra font-bold">
                        best fit
                      </div>
                    )}
                    {isDeclared && !isBestFit && (
                      <div className="text-[10px] text-green font-bold">
                        your default
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">Nudge</div>
            {isFit && (isBest || !best) ? (
              <div className="text-[12.5px] mb-[10px]">
                <div className="text-green font-bold mb-[6px]">
                  Your pick holds.
                </div>
                <div>
                  {instrumentName} can resolve your +{foldIfPercent}% fold-if —{" "}
                  {map[declared].reason.toLowerCase()}.
                </div>
              </div>
            ) : best !== null ? (
              <div className="text-[12.5px] mb-[10px]">
                <div className="text-terra font-bold mb-[6px]">
                  Heads up:
                </div>
                <div>
                  {instrumentName} {map[declared].reason.toLowerCase()}.
                  To resolve your +{foldIfPercent}% fold-if, {NAMES[best]} fits
                  better — {map[best].reason.toLowerCase()}.
                </div>
              </div>
            ) : (
              <div className="text-[12.5px] mb-[10px]">
                Nothing fits cleanly for a +{foldIfPercent}% fold-if. Worth a
                rethink — loosen the deadline or the claim bar.
              </div>
            )}
            <div className="flex flex-wrap gap-[8px]">
              {isFit && (isBest || !best) ? (
                <ButtonLink
                  href={`/bet/criteria?id=${id}`}
                  variant="primary"
                  style={{ fontSize: 11 }}
                >
                  Continue to criteria ▸
                </ButtonLink>
              ) : best !== null ? (
                <>
                  <Button variant="primary" onClick={onSwitch}>
                    Switch to {NAMES[best]}
                  </Button>
                  <Button onClick={onKeep}>Keep {instrumentName} anyway</Button>
                </>
              ) : (
                <ButtonLink href={`/bet/wager?id=${id}`}>
                  ← back to the wager
                </ButtonLink>
              )}
            </div>
            {showOverride && (
              <div className="mt-[12px]">
                <div className="text-[12.5px] mb-[6px]">
                  Why keep {instrumentName} against the recommendation?
                </div>
                <textarea
                  className="dump"
                  style={{ minHeight: 80 }}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Logged, not blocked. Carried into your committed record alongside the recommendation it went against."
                  aria-label="Override reason"
                />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <AnnotationSidebar
          moment="Feasibility — can this test resolve the bet?"
          body={
            <>
              <p>
                The falsifier you committed upstream isn't decoration here —
                it's the spec. The smallest effect that would change your mind
                sets the smallest effect the instrument must detect.
              </p>
              <p>
                The bridge: bet's fold-if → required MDE → which instruments qualify
                → the nudge off your default.
              </p>
            </>
          }
          path={
            <>
              ↳ <b>after this:</b> decision criteria — the actions that would
              trigger a change in call.
            </>
          }
            margin="↖ the falsifier became the spec."
          />
        </div>
      </div>
    </div>
  );
}

function Crumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] text-ink-soft uppercase tracking-[1px]">
      {children}
    </span>
  );
}

function lifecycleSteps(id: string | null): SpineStep[] {
  const q = id ? `?id=${id}` : "";
  return [
    { n: 1, label: "wager", status: "done", href: `/bet/wager${q}` },
    {
      n: 2,
      label: "instrument",
      status: "active",
    },
    {
      n: 3,
      label: "criteria",
      status: "reachable",
      href: `/bet/criteria${q}`,
    },
    {
      n: 4,
      label: "lock",
      status: "reachable",
      href: `/bet/lock${q}`,
    },
  ];
}

export default function InstrumentPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <InstrumentPageInner />
    </Suspense>
  );
}
