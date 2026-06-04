"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { CarriedWager } from "@/components/bet/CarriedWager";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { BetSourceBadge } from "@/components/bet/BetSourceBadge";
import { evidenceFor } from "@/lib/instrument/evidence";
import {
  type FeasibilityInstrument,
} from "@/lib/instrument/feasibility";
import { getBet, updateDraft } from "@/lib/bet/queries";
import type { AbBet } from "@/lib/bet/storage";
import type { Bet } from "@/lib/db/types";

type LoadState = "loading" | "missing" | "hydrated";

const INSTRUMENT_NAMES: Record<FeasibilityInstrument, string> = {
  ab: "A/B test",
  quasi: "Quasi-experiment",
  observational: "Observational",
  holdback: "Holdback",
};

const DEFAULT_WIN = "";
const DEFAULT_INCON = "";
const DEFAULT_LOSS = "";

function isFeasibilityInstrument(s: unknown): s is FeasibilityInstrument {
  return s === "ab" || s === "quasi" || s === "observational" || s === "holdback";
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

export default function CriteriaPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <CriteriaPageInner />
    </Suspense>
  );
}

function CriteriaPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [bet, setBet] = useState<Bet | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const [criteriaWin, setCriteriaWin] = useState<string>(DEFAULT_WIN);
  const [criteriaIncon, setCriteriaIncon] = useState<string>(DEFAULT_INCON);
  const [criteriaLoss, setCriteriaLoss] = useState<string>(DEFAULT_LOSS);
  const [foldIfPercent, setFoldIfPercent] = useState<number>(1);

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
        const m = row.articulation.foldIf.match(/(\d+(?:\.\d+)?)/);
        const percent = m
          ? Math.max(1, Math.min(10, Math.round(parseFloat(m[1]))))
          : 4;
        setFoldIfPercent(percent);
        if (row.criteria.win) setCriteriaWin(row.criteria.win);
        if (row.criteria.inconclusive) setCriteriaIncon(row.criteria.inconclusive);
        if (row.criteria.loss) setCriteriaLoss(row.criteria.loss);
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

  // Resolve which instrument feeds the evidence bar. Persisted type may be
  // "interviews" (qualitative) — until we ship an interview evidence
  // template, fall back to "holdback" rather than blanking the panel.
  const instrument: FeasibilityInstrument =
    bet && isFeasibilityInstrument(bet.instrument.type)
      ? bet.instrument.type
      : "holdback";

  const metric = bet?.articulation.metric || "the metric";

  const evidenceParts = evidenceFor(instrument, foldIfPercent, metric);
  const evidenceText = evidenceParts.map((p) => p.text).join("");

  // Persist criteria on field changes.
  useEffect(() => {
    if (!hydrated || !id || !bet) return;
    void updateDraft(id, {
      criteria: {
        win: criteriaWin,
        inconclusive: criteriaIncon,
        loss: criteriaLoss,
        minMindChanger: bet.articulation.foldIf,
        evidenceBar: evidenceText,
      },
    }).catch(() => {
      // Locked rows reject; nothing to do here.
    });
  }, [
    hydrated,
    id,
    bet,
    criteriaWin,
    criteriaIncon,
    criteriaLoss,
    evidenceText,
  ]);

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
            /bet/criteria needs an <code>?id=</code> query. If you got here
            by mistake, head back to the journal.
          </div>
          <ButtonLink href="/" variant="primary">
            ← journal
          </ButtonLink>
        </div>
      </div>
    );
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
              <Crumb>setup spine</Crumb>
              <Crumb>·</Crumb>
              <Crumb>decision criteria</Crumb>
              <Crumb>·</Crumb>
              <Crumb>pre-register the action</Crumb>
            </div>
          </div>
          <div className="stamp">commit the action, not the hope</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-green font-medium">
            You named what would change your mind, and an instrument that can
            detect it.
          </span>{" "}
          Now pre-register what you&apos;ll{" "}
          <em className="text-terra not-italic">do</em> at each outcome — while
          you still can&apos;t see the result.
        </p>
      </header>

      <SpineRail steps={lifecycleSteps(id)} />
      <BetSourceBadge cardId={bet?.cardId ?? null} />

      <div className="ab-cols">
        <div className="min-w-0">
          <CarriedWager
            bet={buildAbBet(bet)}
            eyebrow="the bet & instrument you're deciding against"
          />

          <div className="text-[11.5px] mb-[18px] flex flex-wrap gap-[8px] items-baseline">
            <span className="text-ink-soft uppercase tracking-[1px] text-[10px]">
              instrument:
            </span>
            <span className="text-terra font-bold">
              {INSTRUMENT_NAMES[instrument]}
            </span>
            <span className="text-ink-faint italic">chosen at feasibility</span>
          </div>

          <div className="border-[1.5px] border-dashed border-terra-line bg-terra-soft p-[12px] mb-[18px]">
            <div className="text-[11.5px] uppercase tracking-[1px] text-terra mb-[6px]">
              fold-if → loss line
            </div>
            <div className="text-[12.5px] leading-[1.55]">
              Your fold-if (<b className="text-terra">+{foldIfPercent}%</b>) is
              the loss boundary — below it, the bet folds. Pre-register the
              action at each outcome <b>now</b>, before the data can tempt you
              to move the line.
            </div>
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">
              What I&apos;ll do at each outcome
            </div>
            <div className="dashed-panel-sub">
              These commit before any result exists — that&apos;s the whole point.
            </div>

            <CriteriaRow
              tag="win"
              tagColor="green"
              threshold={
                <>
                  ≥ <b>+{foldIfPercent}%</b> on{" "}
                  <span className="text-ink">{metric}</span>
                </>
              }
              value={criteriaWin}
              onChange={setCriteriaWin}
              placeholder="Keep the redesign — roll to 100% this week."
            />
            <CriteriaRow
              tag="incon."
              threshold={
                <>
                  between <b>0</b> and <b>+{foldIfPercent}%</b> — real, but
                  under your mind-changer
                </>
              }
              value={criteriaIncon}
              onChange={setCriteriaIncon}
              placeholder="Hold — sharpen the variant and re-test next quarter."
            />
            <CriteriaRow
              tag="loss"
              tagColor="terra"
              threshold={<>≤ <b>0</b>, or any guardrail drop</>}
              value={criteriaLoss}
              onChange={setCriteriaLoss}
              placeholder="Revert — log why in the decision journal."
            />
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">
              The evidence that triggers the call
            </div>
            <div className="dashed-panel-sub">
              You don&apos;t author this — your chosen instrument does. Change
              the instrument back at feasibility and this changes with it.
            </div>
            <div className="border-[1.5px] border-dashed border-rule-faint bg-paper-veil p-[12px]">
              <div className="text-[10px] uppercase tracking-[1px] text-ink-soft mb-[6px]">
                evidence bar{" "}
                <span className="text-ink-faint normal-case tracking-normal italic">
                  from: {INSTRUMENT_NAMES[instrument]}
                </span>
              </div>
              <div className="text-[12.5px] leading-[1.65]">
                {evidenceParts.map((part, i) =>
                  part.type === "emph" ? (
                    <b key={i} className="text-terra">{part.text}</b>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="dashed-panel">
            <div className="dashed-panel-title">
              The smallest effect that flips the call
            </div>
            <div className="text-[10px] uppercase tracking-[1px] text-ink-soft mb-[10px]">
              read-only · = your fold-if
            </div>
            <div className="text-[32px] font-bold text-terra mb-[8px]">
              +{foldIfPercent}%
            </div>
            <div className="text-[12.5px] text-ink-soft leading-[1.55]">
              This isn&apos;t a new field — it&apos;s the same fold-if you
              committed in the bet, now doing its job as the win/loss boundary.
              One number, declared once, used everywhere.
            </div>
          </div>

          <div className="row-actions mt-[16px]">
            <ButtonLink href={`/bet/lock?id=${id}`} variant="primary">
              Commit &amp; lock ▸
            </ButtonLink>
            <span className="text-[11px] text-ink-soft">
              next in the spine — timestamps this pre-registration and freezes
              every field above.
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <AnnotationSidebar
            moment="Decision criteria — decide before you can see"
            body={
              <>
                <p>
                  Three things meet here, and only here: the{" "}
                  <em>action</em> (yours, method-agnostic), the{" "}
                  <em>evidence</em> (supplied by the instrument), and the{" "}
                  <em>threshold</em> (locked back at the bet). Together they
                  leave nothing to argue about once results land.
                </p>
                <p>
                  This is the spine of evidentiary integrity — and the surface
                  your mandate leans on. A bad-faith PM can&apos;t move the
                  goalposts if the goalposts were timestamped before kickoff.
                </p>
              </>
            }
            path={
              <>
                ↳ <b>next:</b> commit &amp; lock — freeze this pre-registration.
                Measured against later, never edited to match.
              </>
            }
            margin="↖ decide now, while you're honest."
          />
        </div>
      </div>
    </div>
  );
}

type CriteriaRowProps = {
  tag: string;
  tagColor?: "green" | "terra";
  threshold: React.ReactNode;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function CriteriaRow({
  tag,
  tagColor,
  threshold,
  value,
  onChange,
  placeholder,
}: CriteriaRowProps) {
  const tagCls = [
    "flex-shrink-0 w-[84px] border-[1.5px] border-dashed flex items-center justify-center text-[10.5px] uppercase tracking-[1px]",
    tagColor === "green" && "border-green-line text-green",
    tagColor === "terra" && "border-terra-line text-terra",
    !tagColor && "border-rule-faint text-ink-soft",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex gap-[10px] mb-[10px] items-stretch">
      <div className={tagCls}>{tag}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] text-ink-soft mb-[4px]">{threshold}</div>
        <textarea
          className="dump"
          style={{ minHeight: 56 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
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
      status: "done",
      href: `/bet/instrument${q}`,
    },
    { n: 3, label: "criteria", status: "active" },
    { n: 4, label: "lock", status: "reachable", href: `/bet/lock${q}` },
    { n: 5, label: "run", status: "locked" },
    { n: 6, label: "revisit", status: "locked" },
  ];
}
