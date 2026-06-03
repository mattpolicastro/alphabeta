"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { WagerStatic } from "@/components/bet/WagerStatic";
import { buildLockedSnapshot } from "@/lib/bet/factory";
import { getBet, lockBet } from "@/lib/bet/queries";
import type { AbBet } from "@/lib/bet/storage";
import { fingerprint } from "@/lib/integrity/fingerprint";
import type { Bet } from "@/lib/db/types";

type LockState = "loading" | "missing" | "draft" | "confirming" | "locked";

type CommittedView = {
  betId: string;
  lockedAt: string;
  fingerprint: string;
};

export default function CommitAndLock() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <CommitAndLockInner />
    </Suspense>
  );
}

function CommitAndLockInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [bet, setBet] = useState<AbBet>({});
  const [state, setState] = useState<LockState>("loading");
  const [committed, setCommitted] = useState<CommittedView | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setBet(asAbBet(row));
        if (row.status === "locked" || row.status === "running" || row.status === "resolved") {
          setCommitted({
            betId: row.id,
            lockedAt: row.lockedAt ?? "",
            fingerprint: row.fingerprint ?? "",
          });
          setState("locked");
        } else {
          setState("draft");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load bet.");
          setState("missing");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onLock = async () => {
    if (!id) return;
    setError(null);
    try {
      const lockedAt = new Date().toISOString();
      const snapshot = buildLockedSnapshot(bet, lockedAt);
      const fp = await fingerprint(snapshot);
      await lockBet(id, snapshot, fp);
      setCommitted({ betId: id, lockedAt, fingerprint: fp });
      setState("locked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to lock.");
    }
  };

  const minimumMindChanger = bet.foldIf?.trim() ?? "";
  const isLocked = state === "locked" && committed !== null;

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!bet.foldIf?.trim()) missing.push("fold-if (the loss line)");
    if (!bet.change?.trim()) missing.push("the change");
    if (!bet.metric?.trim()) missing.push("the metric");
    return missing;
  }, [bet]);
  const canLock = missingFields.length === 0;

  if (state === "loading") {
    return (
      <div className="ab-wrap">
        <div className="dashed-panel">
          <div className="dashed-panel-title">Loading bet…</div>
        </div>
      </div>
    );
  }

  if (state === "missing") {
    return <NoBet />;
  }

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
              <Crumb>commit &amp; lock</Crumb>
              <Crumb>·</Crumb>
              <Crumb>draft → freeze</Crumb>
              <Crumb>·</Crumb>
              <Crumb>SHA-256 fingerprint</Crumb>
            </div>
          </div>
          <div className="stamp">freeze it before the data lands</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-green font-medium">
            Everything&apos;s carried here.
          </span>{" "}
          Two steps: keep it a <em className="text-terra not-italic">draft</em>{" "}
          and stay editable, or <em className="text-terra not-italic">lock</em>{" "}
          — timestamp the whole pre-registration and freeze every field. Once
          locked, it&apos;s measured against later results,{" "}
          <em className="text-terra not-italic">
            never edited to match them.
          </em>
        </p>
      </header>

      <SpineRail steps={lifecycleSteps(id, isLocked)} />

      <div className="ab-cols">
        <div className="min-w-0">
          <div className="dashed-panel">
            <div className="flex justify-between items-baseline flex-wrap gap-[10px] mb-[14px]">
              <div className="text-[15px] font-bold">
                Pre-registration — decision journal entry
              </div>
              <div
                className={
                  isLocked
                    ? "text-[10.5px] uppercase tracking-[1px] text-terra font-bold"
                    : "text-[10.5px] uppercase tracking-[1px] text-ink-soft"
                }
              >
                {isLocked ? "● locked" : "● draft · editable"}
              </div>
            </div>

            <Section label="the bet">
              <WagerStatic bet={bet} />
            </Section>

            <Section
              label="instrument"
              src="chosen at feasibility (deferred — MVP)"
            >
              <div className="text-[12px] text-ink-soft italic">
                Feasibility &amp; Instrument lands in Sprint 2. This MVP locks
                straight from the wager; the locked record stubs instrument as
                an A/B test by default.
              </div>
            </Section>

            <Section
              label="decision criteria"
              src="pre-registered actions (deferred — MVP)"
            >
              <div className="text-[12px] text-ink-soft italic">
                Decision Criteria lands in Sprint 2. The fold-if doubles as
                the minimum mind-changer below.
              </div>
            </Section>

            <Section label="minimum mind-changer" src="= the fold-if">
              <div className="text-[13px]">
                Smallest result that flips the call:{" "}
                <b className="text-terra">{minimumMindChanger || "—"}</b>
              </div>
            </Section>

            {isLocked && committed && (
              <div className="mt-[16px] border-t-[1.5px] border-dashed border-rule pt-[14px] text-[11.5px] leading-[1.7]">
                <LockRow k="locked at" v={committed.lockedAt} />
                <LockRow k="fingerprint" v={committed.fingerprint} mono />
                <LockRow
                  k="status"
                  v="immutable — edits create a new version, they don't overwrite this"
                />
              </div>
            )}
          </div>

          <div className="mt-[16px] text-[11.5px] text-ink-soft">
            <ButtonLink
              href={`/bet/revisit?id=${id ?? ""}`}
              variant="default"
              style={{ borderColor: "var(--color-terra-line)" }}
            >
              running → revisit ↻
            </ButtonLink>
            <span className="ml-[10px]">
              After lock, the experiment goes live; actuals accrue against this
              frozen record.
            </span>
          </div>
        </div>

        <div className="min-w-0 flex flex-col gap-[18px]">
          <div className="dashed-panel">
            <div className="text-[14px] font-bold mb-[4px]">Commit</div>
            <div className="text-[11.5px] text-ink-soft leading-[1.5] mb-[14px]">
              Review the record on the left. When it&apos;s right, lock it.
            </div>

            {state === "draft" && (
              <>
                {!canLock && (
                  <div className="border-[1.5px] border-dashed border-terra-line bg-terra-soft p-[12px] mb-[12px] text-[11.5px] leading-[1.55]">
                    <div className="text-[9px] tracking-[1.5px] uppercase text-terra font-bold mb-[4px]">
                      ⌑ nothing to lock yet
                    </div>
                    The draft on this device is missing:{" "}
                    <b className="text-terra">{missingFields.join(", ")}</b>.{" "}
                    Step back to the front door and sharpen the wager — the
                    fold-if is the load-bearing field.
                  </div>
                )}
                <ButtonLink
                  href={`/bet/wager?id=${id ?? ""}`}
                  variant="default"
                  style={{ width: "100%", marginBottom: 8, textAlign: "center" }}
                >
                  ← back to the wager
                </ButtonLink>
                <Button
                  variant="primary"
                  style={{ width: "100%" }}
                  onClick={() => setState("confirming")}
                  disabled={!canLock}
                >
                  Commit &amp; lock ▸
                </Button>
              </>
            )}

            {state === "confirming" && (
              <>
                <p className="text-[12px] leading-[1.6] mb-[12px]">
                  Locking freezes every field above and timestamps it. You{" "}
                  <b>won&apos;t be able to edit it to match a result</b> later
                  — that&apos;s the feature, not a bug.
                </p>
                <div className="flex gap-[8px]">
                  <Button variant="primary" onClick={onLock}>
                    Lock it ▸
                  </Button>
                  <Button onClick={() => setState("draft")}>Cancel</Button>
                </div>
              </>
            )}

            {state === "locked" && (
              <>
                <div className="text-[13px] font-bold text-terra mb-[6px]">
                  🔒 Pre-registration locked
                </div>
                <p className="text-[12px] leading-[1.6] mb-[10px]">
                  Timestamped and frozen. From here the lifecycle{" "}
                  <em className="text-terra not-italic">reports against</em>{" "}
                  this record — it can&apos;t be quietly rewritten to fit the
                  outcome.
                </p>
                <p className="text-[11.5px] text-ink-soft italic mb-[10px]">
                  Need a change? It becomes a new, separately-timestamped
                  version. The original stays on the record.
                </p>
                <ButtonLink href="/bet/new" style={{ fontSize: 10.5 }}>
                  ⟲ start a new draft
                </ButtonLink>
              </>
            )}

            {error && (
              <div className="mt-[10px] text-[11px] text-terra">{error}</div>
            )}
          </div>

          <AnnotationSidebar
            moment="Commit — the seam out of setup"
            body={
              <>
                <p>
                  The two-step is the whole ethic: low-friction <em>draft</em>{" "}
                  so nobody&apos;s gated out, then a deliberate <em>lock</em>{" "}
                  that makes the commitment real. Compliance gates get routed
                  around; a timestamp doesn&apos;t.
                </p>
                <p>
                  The fingerprint is the integrity primitive — a content hash
                  that proves <em>this</em> is what you committed, before you
                  saw a single result.
                </p>
              </>
            }
            path={
              <>
                ↳ <b>after this:</b> running — guardrails, SRM, peek discipline
                — reporting against the locked record.
              </>
            }
            margin="↖ the timestamp is the whole product."
          />
        </div>
      </div>
    </div>
  );
}

function NoBet() {
  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">No bet specified</div>
        <div className="dashed-panel-sub">
          /bet/lock needs an <code>?id=</code> query. If you got
          here by mistake, head back to the journal.
        </div>
        <ButtonLink href="/" variant="primary">
          ← journal
        </ButtonLink>
      </div>
    </div>
  );
}

function asAbBet(b: Bet): AbBet {
  return {
    change: b.articulation.change || undefined,
    direction: b.articulation.direction,
    metric: b.articulation.metric || undefined,
    magnitude: b.articulation.magnitude || undefined,
    mechanism: b.articulation.mechanism ?? undefined,
    confidence: b.articulation.confidence,
    foldIf: b.articulation.foldIf || undefined,
  };
}

function Section({
  label,
  src,
  children,
}: {
  label: string;
  src?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[16px] last:mb-0">
      <div className="text-[10px] uppercase tracking-[1px] text-ink-soft mb-[6px]">
        {label}
        {src && (
          <span className="ml-[8px] text-ink-faint normal-case tracking-normal italic">
            {src}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function LockRow({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-[10px] mb-[4px]">
      <span className="text-[10px] uppercase tracking-[1px] text-ink-faint w-[110px] flex-shrink-0">
        {k}
      </span>
      <span
        className={mono ? "font-mono text-[10.5px] break-all" : "text-[11.5px]"}
      >
        {v}
      </span>
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

function lifecycleSteps(id: string | null, commitDone: boolean): SpineStep[] {
  const q = id ? `?id=${id}` : "";
  return [
    { n: 1, label: "wager", status: "done", href: `/bet/wager${q}` },
    {
      n: 2,
      label: "instrument",
      status: "reachable",
      href: `/bet/instrument${q}`,
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
      status: commitDone ? "done" : "active",
    },
  ];
}
