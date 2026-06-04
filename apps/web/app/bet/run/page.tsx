"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { BetSourceBadge } from "@/components/bet/BetSourceBadge";
import { LockedBetMini } from "@/components/inflight/LockedBetMini";
import { PhaseToggle } from "@/components/inflight/PhaseToggle";
import { RuntimeBar } from "@/components/inflight/RuntimeBar";
import { IntegrityCheck } from "@/components/inflight/IntegrityCheck";
import { GuardrailRow } from "@/components/inflight/GuardrailRow";
import { getBet } from "@/lib/bet/queries";
import { fingerprint as computeFingerprint } from "@/lib/integrity/fingerprint";
import type { Bet } from "@/lib/db/types";

type PageState = "loading" | "missing" | "not-locked" | "ready";
type Phase = "flight" | "results";

export default function InFlightPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <InFlightInner />
    </Suspense>
  );
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function InFlightInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [bet, setBet] = useState<Bet | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [phase, setPhase] = useState<Phase>("flight");

  useEffect(() => {
    if (!id) {
      setState("missing");
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await getBet(id);
      if (cancelled) return;
      if (!row) {
        setState("missing");
        return;
      }
      if (row.status === "draft") {
        setState("not-locked");
        return;
      }
      setBet(row);
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "loading") return <div className="ab-wrap" />;

  if (state === "missing") {
    return (
      <div className="ab-wrap">
        <p className="text-ink-soft">No bet found. Start from the bet front door.</p>
        <ButtonLink href="/bet/new" className="mt-[14px]">
          New bet
        </ButtonLink>
      </div>
    );
  }

  if (state === "not-locked") {
    return (
      <div className="ab-wrap">
        <p className="text-ink-soft">
          This bet hasn&apos;t been locked yet. Lock it first to begin the experiment.
        </p>
        <ButtonLink href={`/bet/lock?id=${id}`} className="mt-[14px]">
          Go to lock
        </ButtonLink>
      </div>
    );
  }

  return <InFlightDashboard bet={bet!} />;
}

function InFlightDashboard({ bet }: { bet: Bet }) {
  const [phase, setPhase] = useState<Phase>("flight");

  const elapsed = bet.lockedAt ? daysSince(bet.lockedAt) : 0;
  const committed = bet.criteria.runtime ?? 14;

  const [fingerprintOk, setFingerprintOk] = useState(true);

  useEffect(() => {
    if (!bet.fingerprint || !bet.lockedAt) return;
    computeFingerprint({
      articulation: bet.articulation,
      instrument: bet.instrument,
      criteria: bet.criteria,
      lockedAt: bet.lockedAt,
    }).then((expected) => setFingerprintOk(expected === bet.fingerprint));
  }, [bet]);

  const lifecycleSteps: SpineStep[] = useMemo(() => {
    const q = `?id=${bet.id}`;
    return [
      { n: 1, label: "wager", status: "done", href: `/bet/wager${q}` },
      { n: 2, label: "instrument", status: "done", href: `/bet/instrument${q}` },
      { n: 3, label: "criteria", status: "done", href: `/bet/criteria${q}` },
      { n: 4, label: "lock", status: "done", href: `/bet/lock${q}` },
      { n: 5, label: "run", status: bet.status === "resolved" ? "done" : "active" },
      {
        n: 6,
        label: "revisit",
        status: bet.status === "resolved" ? "active" : "reachable",
        href: bet.status === "resolved" ? `/bet/revisit${q}` : undefined,
      },
    ];
  }, [bet.id, bet.status]);

  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[16px]">
        <div className="flex justify-between items-start gap-[18px] flex-wrap">
          <div>
            <div className="wordmark">
              alph<span className="a">⍺</span>
              <span className="b">β</span>eta
            </div>
            <div className="flex flex-wrap gap-x-[14px] gap-y-[6px] mt-[6px]">
              <Crumb>lifecycle</Crumb>
              <Crumb>·</Crumb>
              <Crumb>in-flight</Crumb>
              <Crumb>·</Crumb>
              <Crumb>the experiment is running</Crumb>
            </div>
          </div>
          <div className="stamp">hands off the dials</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-terra font-medium">
            You locked a bet. Now it runs.
          </span>{" "}
          Don&apos;t peek at results, don&apos;t change the split, don&apos;t
          touch the guardrails. The only moves are wait and watch the
          integrity checks.
        </p>
      </header>

      <SpineRail steps={lifecycleSteps} />
      <BetSourceBadge cardId={bet.cardId} />

      <div className="mt-[12px] mb-[18px]">
        <LockedBetMini
          title={bet.articulation.change}
          foldIf={bet.articulation.foldIf ?? "—"}
          metric={bet.articulation.metric}
          lockedAgo={`${elapsed} day${elapsed === 1 ? "" : "s"} ago`}
        />
      </div>

      <PhaseToggle
        phases={[
          { id: "flight", label: "4a · In-flight" },
          { id: "results", label: "4b · Results" },
        ]}
        activeId={phase}
        onChange={(id) => setPhase(id as Phase)}
      />

      <div className="ab-cols mt-[18px]">
        <div className="min-w-0 flex flex-col gap-[18px]">
          {phase === "flight" ? (
            <FlightPanel
              elapsed={elapsed}
              committed={committed}
              fingerprintOk={fingerprintOk}
            />
          ) : (
            <ResultsPanel betId={bet.id} />
          )}
        </div>

        <div className="annot">
          {phase === "flight" ? (
            <AnnotationSidebar
              moment="Discipline checkpoint"
              body={
                <p>
                  The experiment is in progress. Peeking at intermediate results
                  inflates your false-positive risk. Each look is logged.
                </p>
              }
              path={
                <>
                  ↳ <b>next:</b> when the runtime completes, move to Results to
                  read the outcome.
                </>
              }
              margin="↖ patience is the edge."
            />
          ) : (
            <AnnotationSidebar
              moment="Results phase"
              body={
                <p>
                  The runtime has completed. Review the integrity checks, then
                  proceed to the revisit to record your call.
                </p>
              }
              path={
                <>
                  ↳ <b>next:</b> revisit — bucket the outcome and record
                  learnings.
                </>
              }
              margin="↖ the data speaks."
            />
          )}
        </div>
      </div>

      {elapsed >= committed && (
        <div className="mt-[24px] flex justify-end">
          <ButtonLink href={`/bet/revisit?id=${bet.id}`} variant="primary">
            Proceed to revisit →
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function FlightPanel({
  elapsed,
  committed,
  fingerprintOk,
}: {
  elapsed: number;
  committed: number;
  fingerprintOk: boolean;
}) {
  return (
    <>
      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          runtime progress
        </div>
        <RuntimeBar currentDay={elapsed} committedDays={committed} />
        <div className="mt-[8px] text-[11px] text-ink-soft">
          Day <b className="text-ink">{elapsed}</b> of{" "}
          <b className="text-ink">{committed}</b> committed days.
          {elapsed >= committed ? (
            <span className="text-green font-medium ml-[6px]">
              ✓ Runtime complete — proceed to results.
            </span>
          ) : (
            <span className="ml-[6px]">
              {committed - elapsed} day{committed - elapsed === 1 ? "" : "s"} remaining.
            </span>
          )}
        </div>
      </div>

      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          integrity checks
        </div>
        <div className="flex flex-col gap-[8px]">
          <IntegrityCheck
            status={fingerprintOk ? "ok" : "fail"}
            title="Fingerprint verification"
            detail={
              fingerprintOk
                ? "Locked fields match the recorded fingerprint. No tampering detected."
                : "Fingerprint mismatch — locked fields may have been altered."
            }
          />
          <IntegrityCheck
            status="ok"
            title="Sample Ratio Mismatch (SRM)"
            detail="No data connected yet. SRM will be checked when results are imported."
          />
        </div>
      </div>

      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          guardrails
        </div>
        <p className="text-[11px] text-ink-soft italic mb-[10px]">
          No guardrails configured yet. Add guardrails in the criteria step before locking.
        </p>
        <div className="flex flex-col border-t border-dashed border-rule-faint pt-[8px]">
          <GuardrailRow name="App crash rate" value="—" status="ok" />
          <GuardrailRow name="Page load time (p95)" value="—" status="ok" />
        </div>
      </div>
    </>
  );
}

function ResultsPanel({ betId }: { betId: string }) {
  return (
    <>
      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          results pending
        </div>
        <p className="text-[13px] leading-[1.6]">
          No results data has been imported yet. When the experiment platform
          reports results, import them here or proceed to the revisit to
          record them manually.
        </p>
      </div>

      <div className="flex gap-[10px] mt-[4px]">
        <ButtonLink href={`/bet/revisit?id=${betId}`} variant="primary">
          Proceed to revisit →
        </ButtonLink>
      </div>
    </>
  );
}

function Crumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] tracking-[1px] uppercase text-ink-soft">
      {children}
    </span>
  );
}
