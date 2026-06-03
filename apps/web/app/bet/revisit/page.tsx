"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { WagerStatic } from "@/components/bet/WagerStatic";
import { buildLockedSnapshotFromBet } from "@/lib/bet/factory";
import { useSearchParams } from "next/navigation";
import { getBet, recordResolution } from "@/lib/bet/queries";
import type { Bet, Call, Outcome } from "@/lib/db/types";
import { fingerprint } from "@/lib/integrity/fingerprint";

type Guard = "ok" | "breach";

const BUCKET_LABEL: Record<Outcome, string> = {
  win: "WIN",
  inconclusive: "INCONCLUSIVE",
  loss: "LOSS",
};

const EXPECTED_CALL: Record<Outcome, Call> = {
  win: "keep",
  inconclusive: "hold",
  loss: "revert",
};

const CALL_LABEL: Record<Call, string> = {
  keep: "Keep / ship",
  hold: "Hold",
  revert: "Revert",
};

// MVP: criteria are empty until Decision Criteria ships in Sprint 2. Default
// the pre-registered action language so the bucket row still surfaces a
// recallable commitment.
const DEFAULT_ACTION: Record<Outcome, string> = {
  win: "Keep / ship — roll out the change.",
  inconclusive: "Hold — sharpen and re-test.",
  loss: "Revert — log why in the journal.",
};

function parsePercent(s: string | null | undefined, fallback: number): number {
  if (!s) return fallback;
  const m = s.match(/(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : fallback;
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "loaded"; bet: Bet; fingerprintOk: boolean };

export default function Revisit() {
  return (
    <Suspense fallback={<div className='ab-wrap' />}>
      <RevisitInner />
    </Suspense>
  );
}

function RevisitInner() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [actualPercent, setActualPercent] = useState(2.5);
  const [guard, setGuard] = useState<Guard>("ok");
  const [call, setCall] = useState<Call | null>(null);
  const [deviationReason, setDeviationReason] = useState("");
  const [learning, setLearning] = useState("");

  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        if (!cancelled) setLoad({ kind: "missing" });
        return;
      }
      
      try {
        const bet = await getBet(id);
        if (!bet) {
          if (!cancelled) setLoad({ kind: "missing" });
          return;
        }
        // Re-verify integrity: rebuild the locked snapshot from the row's
        // full articulation/instrument/criteria and rehash. A mismatch
        // means the row was edited out-of-band (the app layer doesn't
        // allow this, but direct IndexedDB tampering would). Surface it.
        const snapshot = buildLockedSnapshotFromBet(bet, bet.lockedAt ?? "");
        const fp = await fingerprint(snapshot);
        if (!cancelled) {
          setLoad({
            kind: "loaded",
            bet,
            fingerprintOk: fp === bet.fingerprint,
          });
          // Re-hydrate prior resolution/learning if any.
          if (bet.resolution.call) setCall(bet.resolution.call);
          if (bet.resolution.deviation.reason)
            setDeviationReason(bet.resolution.deviation.reason);
          if (bet.learning.reflection) setLearning(bet.learning.reflection);
        }
      } catch {
        if (!cancelled) setLoad({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (load.kind === "loading") {
    return (
      <div className="ab-wrap">
        <div className="text-[12px] text-ink-soft">Loading committed bet…</div>
      </div>
    );
  }

  if (load.kind === "missing") {
    return <NoLockedBet />;
  }

  return (
    <RevisitBody
      bet={load.bet}
      fingerprintOk={load.fingerprintOk}
      actualPercent={actualPercent}
      setActualPercent={setActualPercent}
      guard={guard}
      setGuard={setGuard}
      call={call}
      setCall={setCall}
      deviationReason={deviationReason}
      setDeviationReason={setDeviationReason}
      learning={learning}
      setLearning={setLearning}
    />
  );
}

type RevisitBodyProps = {
  bet: Bet;
  fingerprintOk: boolean;
  actualPercent: number;
  setActualPercent: (n: number) => void;
  guard: Guard;
  setGuard: (g: Guard) => void;
  call: Call | null;
  setCall: (c: Call) => void;
  deviationReason: string;
  setDeviationReason: (s: string) => void;
  learning: string;
  setLearning: (s: string) => void;
};

function RevisitBody({
  bet,
  fingerprintOk,
  actualPercent,
  setActualPercent,
  guard,
  setGuard,
  call,
  setCall,
  deviationReason,
  setDeviationReason,
  learning,
  setLearning,
}: RevisitBodyProps) {
  const foldIfPercent = parsePercent(bet.articulation.foldIf, 4);
  const expectedPercent = parsePercent(bet.articulation.magnitude, 8);
  const elapsed = bet.lockedAt ? daysSince(bet.lockedAt) : 0;

  const bucket: Outcome = useMemo(() => {
    if (guard === "breach") return "loss";
    if (actualPercent >= foldIfPercent) return "win";
    if (actualPercent > 0) return "inconclusive";
    return "loss";
  }, [actualPercent, foldIfPercent, guard]);

  const expectedCall = EXPECTED_CALL[bucket];
  const honored = call !== null && call === expectedCall;
  const deviated = call !== null && call !== expectedCall;

  const calibration = useMemo(() => {
    if (guard === "breach")
      return `You expected +${expectedPercent}%. A guardrail broke — the headline number is moot.`;
    const delta = expectedPercent - actualPercent;
    if (Math.abs(delta) < 1)
      return `You expected +${expectedPercent}%; it came in at ${actualPercent > 0 ? "+" : ""}${actualPercent}%. Well calibrated.`;
    if (delta > 0)
      return `You expected +${expectedPercent}%; it came in at ${actualPercent > 0 ? "+" : ""}${actualPercent}% — overestimated by ~${delta.toFixed(1)} pts.`;
    return `You expected +${expectedPercent}%; it came in at +${actualPercent}% — underestimated by ~${(-delta).toFixed(1)} pts.`;
  }, [actualPercent, expectedPercent, guard]);

  const verdictWhy = useMemo(() => {
    if (guard === "breach")
      return "A guardrail breach forces a loss outcome — regardless of the headline lift. You pre-registered that.";
    if (bucket === "win")
      return `+${actualPercent}% clears your +${foldIfPercent}% fold-if. This is a win by the line you drew before the test.`;
    if (bucket === "inconclusive")
      return `+${actualPercent}% is positive but under your +${foldIfPercent}% fold-if — below the smallest effect you said would move you.`;
    return actualPercent <= 0
      ? `${actualPercent}% is at or below zero — a loss by your own pre-registered line.`
      : `A guardrail broke — a loss by your own pre-registered line.`;
  }, [actualPercent, foldIfPercent, bucket, guard]);

  const action =
    (bucket === "win"
      ? bet.criteria.win
      : bucket === "inconclusive"
        ? bet.criteria.inconclusive
        : bet.criteria.loss) || DEFAULT_ACTION[bucket];

  // Persist resolution + learning back to the Bet row. resolution and learning
  // are post-data fields and aren't part of the locked snapshot, so writing
  // them doesn't invalidate the fingerprint.
  const persist = async () => {
    try {
      await recordResolution(bet.id, {
        outcome: bucket,
        actuals: { lift: actualPercent, guardrails: guard },
        integrityFlags: [],
        call,
        deviation: {
          occurred: deviated,
          reason: deviated && deviationReason ? deviationReason : null,
        },
        resolvedAt: call ? new Date().toISOString() : null,
      }, {
        calibration: calibration,
        reflection: learning || null,
      });
    } catch {
      // best-effort; surface later if it bites
    }
  };

  // Persist whenever the user-driven state settles. Cheap and idempotent.
  useEffect(() => {
    if (call) void persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualPercent, guard, call, deviationReason, learning, bucket]);

  const bucketBucketCls =
    bucket === "win"
      ? "border-green-line bg-green-soft"
      : bucket === "loss"
        ? "border-terra-line bg-terra-soft"
        : "border-rule bg-paper-veil";

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
              <Crumb>revisit</Crumb>
              <Crumb>·</Crumb>
              <Crumb>commitment meets outcome</Crumb>
            </div>
          </div>
          <div className="stamp">the results are in</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-green font-medium">
            You locked this bet before you could see anything.
          </span>{" "}
          Now the result is in — and the criteria judge it,{" "}
          <em className="text-terra not-italic">not the other way around.</em>
        </p>
      </header>

      <SpineRail
        steps={[
          { n: 1, label: "setup (locked)", status: "done", href: "/" },
          { n: 2, label: "running", status: "done" },
          { n: 3, label: "revisit", status: "active" },
        ]}
      />

      <div className="text-[11.5px] text-ink-soft mt-[8px] mb-[12px]">
        Locked <b className="text-ink">{elapsed} day{elapsed === 1 ? "" : "s"}</b>{" "}
        ago · the experiment has reported.
      </div>

      <div className="ab-cols">
        <div className="min-w-0 flex flex-col gap-[18px]">
          <div className="dashed-panel" style={{ borderStyle: "solid", borderColor: "var(--color-terra-line)" }}>
            <div className="flex justify-between items-baseline flex-wrap gap-[10px] mb-[12px]">
              <div className="text-[14px] font-bold">🔒 what you committed</div>
              <div className={fingerprintOk ? "text-[10.5px] uppercase tracking-[1px] text-terra font-bold" : "text-[10.5px] uppercase tracking-[1px] text-amber font-bold"}>
                {fingerprintOk ? "locked · immutable" : "⚠ fingerprint mismatch"}
              </div>
            </div>
            <WagerStatic
              bet={{
                change: bet.articulation.change,
                direction: bet.articulation.direction,
                metric: bet.articulation.metric,
                magnitude: bet.articulation.magnitude,
                mechanism: bet.articulation.mechanism ?? undefined,
                confidence: bet.articulation.confidence,
                foldIf: bet.articulation.foldIf,
              }}
            />
            <div className="mt-[14px] border-t-[1px] border-dashed border-rule-faint pt-[10px] text-[11px] text-ink-soft leading-[1.6]">
              <div>fingerprint <span className="font-mono break-all">{bet.fingerprint}</span></div>
              <div>locked at {bet.lockedAt}</div>
            </div>
          </div>

          <Panel
            eyebrow="what the experiment returned"
            src="drag to explore outcomes"
            title="The actual result"
          >
            <div
              className="text-[34px] font-bold leading-none"
              style={{
                color:
                  actualPercent >= foldIfPercent
                    ? "var(--color-green)"
                    : actualPercent <= 0
                      ? "var(--color-terra)"
                      : "var(--color-ink)",
              }}
            >
              {actualPercent > 0 ? "+" : ""}
              {actualPercent.toFixed(1)}%
            </div>
            <input
              type="range"
              min={-3}
              max={12}
              step={0.5}
              value={actualPercent}
              onChange={(e) => setActualPercent(parseFloat(e.target.value))}
              className="w-full mt-[14px]"
              aria-label="Actual lift in percent"
            />
            <div className="flex justify-between text-[10.5px] text-ink-faint mt-[2px]">
              <span>-3%</span>
              <span>0</span>
              <span>+{foldIfPercent}% fold-if</span>
              <span>+12%</span>
            </div>
            <div className="mt-[14px] flex gap-[6px] text-[11px]">
              <ToggleButton
                active={guard === "ok"}
                onClick={() => setGuard("ok")}
              >
                guardrails holding
              </ToggleButton>
              <ToggleButton
                active={guard === "breach"}
                onClick={() => setGuard("breach")}
                accent
              >
                guardrail breach
              </ToggleButton>
            </div>
            <div className="mt-[14px] text-[11.5px] text-ink-soft leading-[1.55]">
              {calibration}
            </div>
          </Panel>

          <Panel
            eyebrow="the verdict"
            src="computed from your locked criteria"
            title="Where this lands"
          >
            <div className={`border-[1.5px] solid p-[16px] ${bucketBucketCls}`}>
              <div
                className="text-[20px] font-bold tracking-[0.5px]"
                style={{
                  color:
                    bucket === "win"
                      ? "var(--color-green)"
                      : bucket === "loss"
                        ? "var(--color-terra)"
                        : "var(--color-ink-soft)",
                }}
              >
                {BUCKET_LABEL[bucket]}
              </div>
              <div className="mt-[6px] text-[12px] text-ink leading-[1.55]">
                {verdictWhy}
              </div>
              <div className="mt-[12px] border-t-[1px] border-dashed border-rule-faint pt-[10px]">
                <div className="text-[9.5px] uppercase tracking-[1px] text-ink-soft">
                  your pre-registered action
                </div>
                <div className="text-[12.5px] mt-[4px]">{action}</div>
              </div>
            </div>
          </Panel>

          <Panel
            eyebrow="your call"
            src="what will you actually do?"
            title="The decision"
          >
            <div className="flex gap-[6px]">
              {(["keep", "hold", "revert"] as Call[]).map((c) => (
                <ToggleButton
                  key={c}
                  active={call === c}
                  onClick={() => setCall(c)}
                  accent={call === c}
                >
                  {CALL_LABEL[c]}
                </ToggleButton>
              ))}
            </div>
            {call && (
              <div
                className={
                  honored
                    ? "mt-[12px] text-[12px] text-green leading-[1.55]"
                    : "mt-[12px] text-[12px] text-terra leading-[1.55]"
                }
              >
                {honored ? (
                  <>
                    <b>✓ Commitment honored.</b> You pre-registered{" "}
                    <b>{CALL_LABEL[expectedCall].toLowerCase()}</b> for a{" "}
                    {BUCKET_LABEL[bucket].toLowerCase()} result, and that&apos;s
                    your call. The line held.
                  </>
                ) : (
                  <>
                    <b>⚠ Deviation from your pre-registration.</b> You committed
                    to <b>{CALL_LABEL[expectedCall]}</b> for a{" "}
                    {BUCKET_LABEL[bucket].toLowerCase()} result; you&apos;re
                    choosing <b>{CALL_LABEL[call]}</b>. Allowed — but it&apos;s
                    logged, with your reason, beside the original commitment.
                  </>
                )}
              </div>
            )}
            {deviated && (
              <div className="mt-[12px]">
                <div className="text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-[4px]">
                  Why deviate from what you pre-registered?
                </div>
                <textarea
                  className="dump"
                  style={{ minHeight: 80 }}
                  value={deviationReason}
                  onChange={(e) => setDeviationReason(e.target.value)}
                  placeholder="e.g. the directional read plus a strong qualitative signal is enough; accepting the risk."
                  aria-label="Deviation reason"
                />
                <div className="text-[11px] text-ink-soft italic mt-[6px] leading-[1.55]">
                  ↳ <b className="text-terra">Logged, not blocked.</b> Recorded
                  beside the fingerprint — the deviation is part of the
                  permanent record, in your words.
                </div>
              </div>
            )}
          </Panel>

          <Panel
            eyebrow="what this updates"
            src="feeds your next bet"
            title="Learning"
          >
            <textarea
              className="dump"
              style={{ minHeight: 100 }}
              value={learning}
              onChange={(e) => setLearning(e.target.value)}
              placeholder="What would you bet differently next time? What did the gap between expectation and outcome teach you?"
              aria-label="Learning notes"
            />
            <div className="row-actions mt-[12px]">
              <ButtonLink href="/" variant="primary">
                ↻ Start the next bet ▸
              </ButtonLink>
              <span className="text-[11px] text-ink-soft">
                this entry becomes memory — the journal closing on itself.
              </span>
            </div>
          </Panel>
        </div>

        <div className="min-w-0">
          <AnnotationSidebar
            moment="Revisit — commitment meets outcome"
            body={
              <>
                <p>
                  This is the surface the whole product exists for. The record
                  on the left was timestamped <em>before</em> any result. Now
                  the result is in — and the criteria judge it, not the
                  reverse.
                </p>
                <p>
                  The bad-faith move is to see the number first, then decide
                  what &quot;win&quot; meant. Here the bucket is computed from
                  the commitment, the pre-registered action is recalled, and
                  any deviation is logged in your own words beside the
                  fingerprint.
                </p>
              </>
            }
            path={
              <>
                ↳ <b>the loop:</b> the learning here feeds the next bet&apos;s
                intent. The decision journal, closing on itself.
              </>
            }
            margin="↖ the criteria judge the result — not the reverse."
          />
        </div>
      </div>
    </div>
  );
}

function NoLockedBet() {
  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[20px]">
        <div className="wordmark">
          alph<span className="a">⍺</span>
          <span className="b">β</span>eta · Revisit
        </div>
      </header>
      <div className="dashed-panel">
        <div className="dashed-panel-title">Nothing locked to revisit yet</div>
        <div className="dashed-panel-sub">
          Revisit is the surface where a <em>locked</em> bet meets the result
          that came in. There&apos;s no committed bet on this device — go to
          the front door, sharpen a wager, and lock it. Then come back.
        </div>
        <ButtonLink href="/" variant="primary">
          ← front door
        </ButtonLink>
      </div>
    </div>
  );
}

function Panel({
  eyebrow,
  src,
  title,
  children,
}: {
  eyebrow: string;
  src?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dashed-panel">
      <div className="text-[10px] uppercase tracking-[1px] text-ink-soft mb-[6px]">
        {eyebrow}
        {src && (
          <span className="ml-[8px] text-ink-faint normal-case tracking-normal italic">
            {src}
          </span>
        )}
      </div>
      <div className="text-[14px] font-bold mb-[12px]">{title}</div>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = "btn";
  const cls = active ? (accent ? `${base} btn-primary` : base) : base;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      style={{ flex: 1, fontSize: 11 }}
    >
      {children}
    </button>
  );
}

function Crumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] text-ink-soft uppercase tracking-[1px]">
      {children}
    </span>
  );
}
