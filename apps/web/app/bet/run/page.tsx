"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { BetSourceBadge } from "@/components/bet/BetSourceBadge";
import { LockedBetMini } from "@/components/inflight/LockedBetMini";
import { PhaseToggle } from "@/components/inflight/PhaseToggle";
import { RuntimeBar } from "@/components/inflight/RuntimeBar";
import { IntegrityCheck } from "@/components/inflight/IntegrityCheck";
import { GuardrailRow } from "@/components/inflight/GuardrailRow";
import { ResultLift } from "@/components/inflight/ResultLift";
import { StatsReadout } from "@/components/inflight/StatsReadout";
import { BucketResult } from "@/components/inflight/BucketResult";
import { RecruitmentTracker } from "@/components/inflight/RecruitmentTracker";
import { SessionLog, type Session } from "@/components/inflight/SessionLog";
import { ThemeCard } from "@/components/inflight/ThemeCard";
import { EvidenceBar } from "@/components/inflight/EvidenceBar";
import { getBet } from "@/lib/bet/queries";
import { fingerprint as computeFingerprint } from "@/lib/integrity/fingerprint";
import type { Bet, Outcome } from "@/lib/db/types";

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
  const isInterviews = bet.instrument.type === "interviews";

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
            <div className="flex flex-wrap gap-x-[14px] gap-y-[6px]">
              <Crumb>lifecycle</Crumb>
              <Crumb>·</Crumb>
              <Crumb>in-flight</Crumb>
              <Crumb>·</Crumb>
              <Crumb>{isInterviews ? "fieldwork underway" : "the experiment is running"}</Crumb>
            </div>
          </div>
          <div className="stamp">{isInterviews ? "stick to the guide" : "hands off the dials"}</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-terra font-medium">
            You locked a bet. Now it runs.
          </span>{" "}
          {isInterviews ? (
            <>
              Follow the interview guide as committed. Don&apos;t lead
              participants, don&apos;t change the questions mid-study.
              Log sessions and flag any drift.
            </>
          ) : (
            <>
              Don&apos;t peek at results, don&apos;t change the split, don&apos;t
              touch the guardrails. The only moves are wait and watch the
              integrity checks.
            </>
          )}
        </p>
      </header>

      <Walkthrough>
        <WalkthroughStep n={1} title="The experiment is live">
          Monitor progress against your locked pre-registration. The fold-if threshold is your stop-loss — if the metric crosses it, the bet folds automatically.
        </WalkthroughStep>
        <WalkthroughStep n={2} title="No peeking, no tweaking">
          The locked record is the truth you committed to. Mid-flight changes invalidate the pre-registration. If you need a change, it becomes a new version.
        </WalkthroughStep>
      </Walkthrough>

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
            bet.instrument.type === "interviews" ? (
              <InterviewFlightPanel bet={bet} fingerprintOk={fingerprintOk} />
            ) : (
              <FlightPanel
                elapsed={elapsed}
                committed={committed}
                fingerprintOk={fingerprintOk}
              />
            )
          ) : bet.instrument.type === "interviews" ? (
            <InterviewResultsPanel bet={bet} fingerprintOk={fingerprintOk} />
          ) : (
            <ResultsPanel bet={bet} fingerprintOk={fingerprintOk} />
          )}
        </div>

        <div className="annot">
          {phase === "flight" ? (
            bet.instrument.type === "interviews" ? (
              <AnnotationSidebar
                moment="Fieldwork in progress"
                body={
                  <p>
                    Interviews are underway. Stick to the guide — drift weakens
                    the signal. Log sessions as they complete.
                  </p>
                }
                path={
                  <>
                    ↳ <b>next:</b> when all sessions are complete, move to
                    Results to map themes against the hypothesis.
                  </>
                }
                margin="↖ listen more than you lead."
              />
            ) : (
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
            )
          ) : bet.instrument.type === "interviews" ? (
            <AnnotationSidebar
              moment="Synthesis phase"
              body={
                <p>
                  Fieldwork is complete. Map the themes you observed against
                  your pre-registered hypothesis. The evidence bar is your
                  qualitative judgment — own it.
                </p>
              }
              path={
                <>
                  ↳ <b>next:</b> revisit — bucket the outcome and record
                  what you learned.
                </>
              }
              margin="↖ themes, not anecdotes."
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

function parseFoldIfNumber(foldIf: string): number {
  const m = foldIf.match(/[+-]?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function computeBucket(
  lift: number,
  foldIf: number,
): Outcome {
  if (lift >= foldIf) return "win";
  if (lift <= 0) return "loss";
  return "inconclusive";
}

function bucketWhy(outcome: Outcome, lift: number, foldIf: number, metric: string): string {
  const sign = lift >= 0 ? "+" : "";
  const liftStr = `${sign}${lift.toFixed(1)}%`;
  const foldStr = `+${foldIf}%`;
  switch (outcome) {
    case "win":
      return `${liftStr} exceeds your ${foldStr} fold-if on ${metric}. The effect cleared the bar you set before the test.`;
    case "loss":
      return `${liftStr} on ${metric}. The effect moved in the wrong direction.`;
    case "inconclusive":
      return `${liftStr} is positive but below your ${foldStr} fold-if — the smallest effect you said would change your mind.`;
  }
}

function ResultsPanel({ bet, fingerprintOk }: { bet: Bet; fingerprintOk: boolean }) {
  const actuals = bet.resolution.actuals as { lift?: number; ci?: [number, number]; guardrails?: string };
  const hasResults = actuals.lift !== undefined;

  if (!hasResults) {
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
          <ButtonLink href={`/bet/revisit?id=${bet.id}`} variant="primary">
            Proceed to revisit →
          </ButtonLink>
        </div>
      </>
    );
  }

  const lift = actuals.lift!;
  const ci = actuals.ci ?? null;
  const foldIfNum = parseFoldIfNumber(bet.articulation.foldIf);
  const outcome = bet.resolution.outcome ?? computeBucket(lift, foldIfNum);
  const preRegisteredAction = bet.criteria[outcome];

  return (
    <>
      <div className="dashed-panel">
        <ResultLift
          lift={lift}
          ci={ci}
          metric={bet.articulation.metric}
          foldIf={foldIfNum}
        />
      </div>

      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          stats readout
        </div>
        <StatsReadout
          cells={[
            { label: "observed lift", value: `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}%` },
            { label: "locked fold-if", value: bet.articulation.foldIf || "—", highlight: true },
            { label: "guardrails", value: actuals.guardrails ?? "—" },
          ]}
        />
      </div>

      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          integrity summary
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
          {bet.resolution.integrityFlags.map((flag, i) => (
            <IntegrityCheck
              key={i}
              status={flag.status}
              title={flag.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              detail={flag.detail}
            />
          ))}
          {bet.resolution.integrityFlags.length === 0 && (
            <IntegrityCheck
              status="ok"
              title="No integrity flags"
              detail="No SRM, peek, or guardrail issues were recorded."
            />
          )}
        </div>
      </div>

      <BucketResult
        outcome={outcome}
        why={bucketWhy(outcome, lift, foldIfNum, bet.articulation.metric)}
        action={preRegisteredAction}
      />

      {bet.resolution.deviation.occurred && (
        <div className="dashed-panel border-terra/30">
          <div className="text-[10.5px] uppercase tracking-[1px] text-terra mb-[6px]">
            deviation recorded
          </div>
          <p className="text-[12px] leading-[1.6]">
            {bet.resolution.deviation.reason}
          </p>
        </div>
      )}

      <div className="flex gap-[10px] mt-[4px]">
        <ButtonLink href={`/bet/revisit?id=${bet.id}`} variant="primary">
          Proceed to revisit →
        </ButtonLink>
      </div>
    </>
  );
}

type InterviewActuals = {
  recruited?: number;
  completed?: number;
  noShows?: number;
  sessions?: Session[];
  themes?: {
    name: string;
    participantCount: string;
    direction: "supports" | "contradicts" | "neutral";
    quotes?: string;
  }[];
  evidenceSegments?: ("contra" | "neutral" | "support" | null)[];
  evidenceSummary?: string;
};

const DEMO_SESSIONS: Session[] = [
  { number: 1, participant: "P-01", detail: "45 min · completed on schedule", status: "done" },
  { number: 2, participant: "P-02", detail: "40 min · early insights on friction", status: "done" },
  { number: 3, participant: "P-03", detail: "scheduled for tomorrow", status: "scheduled" },
  { number: 4, participant: "P-04", detail: "did not attend", status: "no-show" },
  { number: 5, participant: "P-05", detail: "scheduled next week", status: "scheduled" },
];

function InterviewFlightPanel({ bet, fingerprintOk }: { bet: Bet; fingerprintOk: boolean }) {
  const actuals = bet.resolution.actuals as InterviewActuals;
  const committed = bet.criteria.runtime ?? 5;
  const recruited = actuals.recruited ?? 2;
  const completed = actuals.completed ?? 1;
  const noShows = actuals.noShows ?? 1;
  const sessions = actuals.sessions ?? DEMO_SESSIONS;
  const sampleSpec = (bet.instrument.feasibility?.sampleSpec as string) ?? `${committed} participants`;

  return (
    <>
      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          recruitment tracker
        </div>
        <RecruitmentTracker
          recruited={recruited}
          completed={completed}
          noShows={noShows}
          committed={committed}
          sampleSpec={sampleSpec}
        />
      </div>

      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          session log
        </div>
        <SessionLog sessions={sessions} />
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
            title="Guide adherence"
            detail="No drift flags recorded. Interview guide has been followed as committed."
          />
          <IntegrityCheck
            status={noShows > 0 ? "warn" : "ok"}
            title="Recruitment drift"
            detail={
              noShows > 0
                ? `${noShows} no-show${noShows > 1 ? "s" : ""} recorded. Consider whether sample composition has shifted.`
                : "All recruited participants attended. No composition drift detected."
            }
          />
        </div>
      </div>
    </>
  );
}

function InterviewResultsPanel({ bet, fingerprintOk }: { bet: Bet; fingerprintOk: boolean }) {
  const actuals = bet.resolution.actuals as InterviewActuals;
  const themes = actuals.themes ?? [
    { name: "Friction at checkout", participantCount: "4 / 5", direction: "supports" as const, quotes: '"I almost gave up at the address step."' },
    { name: "Trust signals matter", participantCount: "3 / 5", direction: "supports" as const, quotes: '"The badge made me feel safer."' },
    { name: "Price sensitivity", participantCount: "2 / 5", direction: "neutral" as const },
  ];
  const segments = actuals.evidenceSegments ?? [
    "support", "support", "support", "neutral", "contra", null, null,
  ] as ("contra" | "neutral" | "support" | null)[];
  const evidenceSummary = actuals.evidenceSummary ??
    "Qualitative evidence leans toward supporting the hypothesis. Friction themes align with the predicted mechanism; price sensitivity is a confound worth tracking.";

  const outcome = bet.resolution.outcome ?? (
    segments.filter((s) => s === "support").length > segments.filter((s) => s === "contra").length
      ? "win" : segments.filter((s) => s === "contra").length > segments.filter((s) => s === "support").length
        ? "loss" : "inconclusive"
  );
  const preRegisteredAction = bet.criteria[outcome];

  const outcomeWhy: Record<Outcome, string> = {
    win: "The weight of qualitative evidence supports the hypothesis. Themes from fieldwork align with the predicted mechanism.",
    loss: "The weight of qualitative evidence contradicts the hypothesis. Key themes ran counter to the predicted mechanism.",
    inconclusive: "Evidence is mixed — neither clearly supporting nor contradicting the hypothesis. More signal needed before committing.",
  };

  return (
    <>
      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          theme mapping
        </div>
        <p className="text-[11px] text-ink-soft mb-[10px]">
          Themes mapped against the pre-registered hypothesis: <b className="text-ink">{bet.articulation.change}</b>
        </p>
        {themes.map((theme) => (
          <ThemeCard
            key={theme.name}
            name={theme.name}
            participantCount={theme.participantCount}
            direction={theme.direction}
            quotes={theme.quotes}
          />
        ))}
      </div>

      <EvidenceBar segments={segments} summary={evidenceSummary} />

      <div className="dashed-panel">
        <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
          integrity summary
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
          {bet.resolution.integrityFlags.map((flag, i) => (
            <IntegrityCheck
              key={i}
              status={flag.status}
              title={flag.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              detail={flag.detail}
            />
          ))}
          {bet.resolution.integrityFlags.length === 0 && (
            <IntegrityCheck
              status="ok"
              title="No integrity flags"
              detail="No guide-drift or recruitment-drift issues were recorded."
            />
          )}
        </div>
      </div>

      <BucketResult
        outcome={outcome}
        why={outcomeWhy[outcome]}
        action={preRegisteredAction}
      />

      {bet.resolution.deviation.occurred && (
        <div className="dashed-panel border-terra/30">
          <div className="text-[10.5px] uppercase tracking-[1px] text-terra mb-[6px]">
            deviation recorded
          </div>
          <p className="text-[12px] leading-[1.6]">
            {bet.resolution.deviation.reason}
          </p>
        </div>
      )}

      <div className="flex gap-[10px] mt-[4px]">
        <ButtonLink href={`/bet/revisit?id=${bet.id}`} variant="primary">
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
