"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { BetSourceBadge } from "@/components/bet/BetSourceBadge";
import { WagerDumpPanel } from "@/components/bet/WagerDumpPanel";
import { takeElevationDump } from "@/lib/bet/elevationDump";
import type { AbBet } from "@/lib/bet/storage";
import { getBet, updateDraft } from "@/lib/bet/queries";
import type { Bet, Confidence, Direction } from "@/lib/db/types";

type WagerKey = keyof AbBet;

const CONF_CYCLE: Confidence[] = ["hunch-level", "fairly", "highly"];
const DIR_CYCLE: Direction[] = ["lift", "reduce"];

export default function BetWager() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <BetWagerInner />
    </Suspense>
  );
}

function BetWagerInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [bet, setBet] = useState<AbBet>({});
  const [cardId, setCardId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Elevation handoff: read once on mount (per id) and pass to the dump
  // panel as its initial textarea contents. takeElevationDump clears the
  // entry so a refresh doesn't re-open the panel.
  const [elevationDump, setElevationDump] = useState<string>("");

  // Hydrate the draft from Dexie on mount. If there's no id (someone hit
  // /bet/wager directly), stay in the empty draft state. Persistence won't
  // engage until they come in via /bet/new and get a real id.
  useEffect(() => {
    if (!id) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const row = await getBet(id);
      if (cancelled) return;
      if (row) {
        setBet(asAbBet(row));
        setCardId(row.cardId);
      }
      const stash = takeElevationDump(id);
      if (stash) setElevationDump(stash);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mirror the in-flight draft to Dexie on any change.
  useEffect(() => {
    if (!hydrated || !id) return;
    if (Object.keys(bet).length === 0) return;
    void updateDraft(id, { articulation: toArticulation(bet) }).catch(() => {
      // Locked rows reject — handled at the query layer.
    });
  }, [bet, hydrated, id]);

  const setField = <K extends WagerKey>(k: K, v: AbBet[K]) =>
    setBet((prev) => ({ ...prev, [k]: v }));

  const cycle = <T extends string>(arr: T[], current: T | undefined): T => {
    const i = current ? arr.indexOf(current) : -1;
    return arr[(i + 1) % arr.length];
  };

  const losable = (bet.foldIf ?? "").trim().length > 0;

  // Carry-forward gate: every wager field must be non-empty before the
  // bet can move into instrument & feasibility. The fold-if check is
  // the same one as `losable`, but we surface the full list of missing
  // labels so the user knows what's left.
  const missing: string[] = [];
  if (!bet.change?.trim()) missing.push("change");
  if (!bet.direction) missing.push("direction");
  if (!bet.metric?.trim()) missing.push("metric");
  if (!bet.magnitude?.trim()) missing.push("magnitude");
  if (!bet.mechanism?.trim()) missing.push("mechanism");
  if (!bet.confidence) missing.push("confidence");
  if (!bet.foldIf?.trim()) missing.push("fold-if");
  const ready = missing.length === 0;

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
              <Crumb>the wager</Crumb>
              <Crumb>·</Crumb>
              <Crumb>commit under uncertainty</Crumb>
            </div>
          </div>
          <div className="stamp">a bet you can be held to</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-green font-medium">
            Pin every part of the bet to a field you&apos;re committing to.
          </span>{" "}
          Each blank below is something you&apos;ll be measured against later.
          The <em className="text-terra not-italic">fold-if</em> is the
          load-bearing one — without it, the bet can&apos;t lose, and any
          outcome can be spun as a win.
        </p>
      </header>

      <SpineRail steps={lifecycleSteps(id)} />
      <BetSourceBadge cardId={cardId} />

      {/* Only mount the panel after hydration so its useState(initialText)
       * sees the final elevation handoff value (race fix). Key on id so
       * navigating between bets remounts with the right text. */}
      {hydrated && (
        <WagerDumpPanel
          key={id ?? "anon"}
          initialText={elevationDump}
          onFill={(patch) => setBet((prev) => ({ ...prev, ...patch }))}
        />
      )}

      <div className="ab-cols">
        <div className="min-w-0">
          <div className="dashed-panel scard-active">
            <div className="scard-h">
              <div className="scard-title">Make it a wager</div>
            </div>
            <div className="scard-sub">
              Click any blank to edit; ⇅ tokens cycle between options.
            </div>
            <WagerEditor bet={bet} setField={setField} cycle={cycle} />
            <div
              className={`losable ${losable ? "losable-yes" : "losable-no"}`}
            >
              {losable
                ? "✓ losable — this is a real wager"
                : "✕ not yet a bet — it can't lose"}
            </div>
            <CommittedLine bet={bet} />
            <div className="row-actions">
              {ready ? (
                <ButtonLink
                  href={id ? `/bet/instrument?id=${id}` : "/bet/new"}
                  variant="primary"
                >
                  Carry into instrument &amp; feasibility ▸
                </ButtonLink>
              ) : (
                <Button
                  variant="primary"
                  disabled
                  aria-disabled="true"
                  title={`Still missing: ${missing.join(", ")}`}
                >
                  Carry into instrument &amp; feasibility ▸
                </Button>
              )}
              {!id ? (
                <span className="text-[11px] text-ink-faint">
                  no draft id — clicking will mint one
                </span>
              ) : !ready ? (
                <span className="text-[11px] text-ink-faint">
                  still missing: {missing.join(", ")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <AnnotationSidebar
            moment="The wager — every blank is a commitment"
            body={
              <>
                <p>
                  Same idea as the bet you already have in your head, now
                  precise. The form was never shown to you upstream — this is
                  it. Every part of the sentence pins to a field; every field
                  is something the lifecycle will measure you against.
                </p>
                <p>
                  The <em>losable</em> stamp stays red until your bet can
                  actually lose. That&apos;s the line between a journal entry
                  and a wager.
                </p>
              </>
            }
            path={
              <>
                ↳ <b>next:</b> instrument &amp; feasibility — can a test
                actually resolve this bet?
              </>
            }
            margin="↖ you said it loosely. now you’re on the hook."
          />
        </div>
      </div>

      <footer className="mt-[30px] border-t-[1.5px] border-dashed border-rule pt-[18px] text-[11.5px] text-ink-soft leading-[1.7]">
        <div>
          <b className="text-terra font-medium">the wager:</b>{" "}
          natural-language elsewhere if you want; here, just the committed
          sentence. Sharpen, then carry forward to feasibility.
        </div>
      </footer>
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
    { n: 1, label: "wager", status: "active" },
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
      status: "reachable",
      href: id ? `/bet/lock?id=${id}` : "/bet/new",
    },
    { n: 5, label: "run", status: "locked" },
    { n: 6, label: "revisit", status: "locked" },
  ];
}

type WagerEditorProps = {
  bet: AbBet;
  setField: <K extends WagerKey>(k: K, v: AbBet[K]) => void;
  cycle: <T extends string>(arr: T[], current: T | undefined) => T;
};

function WagerEditor({ bet, setField, cycle }: WagerEditorProps) {
  return (
    <div className="wager">
      <span className="lead-in">I&apos;m betting that </span>
      <Tok bet={bet} setField={setField} k="change" placeholder="—" />
      <span className="lead-in"> will </span>
      <button
        type="button"
        className="tok tok-cycle"
        onClick={() =>
          setField("direction", cycle(DIR_CYCLE, bet.direction))
        }
      >
        {bet.direction ?? "lift"}
      </button>
      <span className="lead-in"> </span>
      <Tok bet={bet} setField={setField} k="metric" placeholder="—" />
      <span className="lead-in"> by about </span>
      <Tok bet={bet} setField={setField} k="magnitude" placeholder="—" />
      <span className="lead-in">. I&apos;m </span>
      <button
        type="button"
        className="tok tok-cycle"
        onClick={() =>
          setField("confidence", cycle(CONF_CYCLE, bet.confidence))
        }
      >
        {bet.confidence ?? "fairly"}
      </button>
      <span className="lead-in"> sure, because </span>
      <Tok
        bet={bet}
        setField={setField}
        k="mechanism"
        placeholder="name why it would work"
      />
      <span className="lead-in">. I&apos;ll fold if </span>
      <Tok
        bet={bet}
        setField={setField}
        k="foldIf"
        placeholder="name what would change your mind"
        variant="fals"
      />
      <span className="lead-in">.</span>
    </div>
  );
}

type TokProps = {
  bet: AbBet;
  setField: <K extends WagerKey>(k: K, v: AbBet[K]) => void;
  k: WagerKey;
  placeholder: string;
  variant?: "fals";
};

function Tok({ bet, setField, k, placeholder, variant }: TokProps) {
  const value = (bet[k] as string | undefined) ?? "";
  const empty = value.length === 0;
  const cls = [
    "tok",
    empty && "tok-empty",
    variant === "fals" && "tok-fals",
  ]
    .filter(Boolean)
    .join(" ");

  // Contenteditable span — wraps inline with the wager sentence so long
  // values don't blow out the panel. Sync from prop only when the span
  // is unfocused; otherwise React would clobber the user's caret on
  // every keystroke. Mirrors the Vue prototype's pattern (uncontrolled
  // after mount, push on input).
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if ((el.textContent ?? "") !== value) el.textContent = value;
  }, [value]);

  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={k}
      contentEditable
      suppressContentEditableWarning
      className={cls}
      data-placeholder={placeholder}
      onInput={(e) =>
        setField(k, ((e.currentTarget.textContent ?? "") as never))
      }
    />
  );
}

function CommittedLine({ bet }: { bet: AbBet }) {
  const g = (v?: string) => (v && v.trim().length > 0 ? v : "—");
  return (
    <div className="committed-line">
      <span className="ck">committed →</span>{" "}
      <b>{g(bet.change)}</b> → {bet.direction ?? "—"} <b>{g(bet.metric)}</b>{" "}
      ~{g(bet.magnitude)} · because: <b>{g(bet.mechanism)}</b> · conf:{" "}
      <b>{bet.confidence ?? "—"}</b> · fold-if: <b>{g(bet.foldIf)}</b>
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

function toArticulation(b: AbBet): Bet["articulation"] {
  return {
    change: b.change ?? "",
    direction: b.direction ?? "lift",
    metric: b.metric ?? "",
    magnitude: b.magnitude ?? "",
    mechanism: b.mechanism && b.mechanism.length > 0 ? b.mechanism : null,
    confidence: b.confidence ?? "fairly",
    foldIf: b.foldIf ?? "",
  };
}
