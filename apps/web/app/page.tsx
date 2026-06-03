"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { HeardCard } from "@/components/bet/HeardCard";
import { SpineRail, type SpineStep } from "@/components/bet/SpineRail";
import { StepCard, type StepStatus } from "@/components/bet/StepCard";
import { analyzeDump, type DumpAnalysis } from "@/lib/bet/analyze";
import { readAbBet, writeAbBet, type AbBet } from "@/lib/bet/storage";
import type { Confidence, Direction } from "@/lib/db/types";

type WagerKey = keyof AbBet;

const CONF_CYCLE: Confidence[] = ["hunch-level", "fairly", "highly"];
const DIR_CYCLE: Direction[] = ["lift", "reduce"];

const DUMP_SEED =
  "The /pricing page buries the plans below a big testimonial band. I'm pretty sure people bounce before they ever see the plans — the session replays show this big scroll drop-off right around the testimonials. If we move the plan-picker above the fold I think checkout-starts go up, maybe 8% or so. Worth a try.";

type Stage = 1 | 2 | 3;

export default function BetFrontDoor() {
  const [dump, setDump] = useState(DUMP_SEED);
  const [stage, setStage] = useState<Stage>(1);
  const [analysis, setAnalysis] = useState<DumpAnalysis | null>(null);
  const [gapClause, setGapClause] = useState<string>("");
  const [gapInput, setGapInput] = useState<string>("");
  const [bet, setBet] = useState<AbBet>({});

  // Re-hydrate from localStorage on mount (carry-pattern continuity).
  useEffect(() => {
    const prior = readAbBet();
    if (Object.keys(prior).length > 0) setBet(prior);
  }, []);

  // Mirror committed bet to localStorage on change.
  useEffect(() => {
    if (stage >= 3) writeAbBet(bet);
  }, [bet, stage]);

  const setField = <K extends WagerKey>(k: K, v: AbBet[K]) =>
    setBet((prev) => ({ ...prev, [k]: v }));

  const cycle = <T extends string>(arr: T[], current: T | undefined): T => {
    const i = current ? arr.indexOf(current) : -1;
    return arr[(i + 1) % arr.length];
  };

  const onReflect = () => {
    const a = analyzeDump(dump);
    setAnalysis(a);
    setGapClause("");
    setGapInput("");
    setStage(2);
  };

  const onGapAdd = () => {
    const v = gapInput.trim();
    if (!v) return;
    setGapClause(v);
  };

  const resolvedFalsifier =
    analysis?.falsifier.found || gapClause.length > 0
      ? gapClause || analysis?.falsifier.clause || ""
      : "";

  const onSharpen = () => {
    // Seed the wager from analysis. The user can edit any token after.
    const a = analysis ?? analyzeDump(dump);
    // If the user typed a gap clause but hadn't clicked "add", carry it anyway.
    const effectiveGap =
      gapClause || gapInput.trim() || a.falsifier.clause || "";
    const seed: AbBet = {
      change: bet.change ?? "moving the plan-picker above the fold",
      direction: bet.direction ?? "lift",
      metric: bet.metric ?? "checkout-start",
      magnitude: bet.magnitude ?? a.magnitude ?? "8%",
      mechanism: bet.mechanism ?? (a.mechanism.text ?? ""),
      confidence: bet.confidence ?? a.confidence.level,
      foldIf: bet.foldIf || effectiveGap,
    };
    setBet(seed);
    setStage(3);
  };

  const onExpressLane = () => {
    setStage(3);
    setBet((prev) => ({
      change: prev.change ?? "moving the plan-picker above the fold",
      direction: prev.direction ?? "lift",
      metric: prev.metric ?? "checkout-start",
      magnitude: prev.magnitude ?? "8%",
      mechanism: prev.mechanism,
      confidence: prev.confidence ?? "fairly",
      foldIf: prev.foldIf,
    }));
  };

  const losable = (bet.foldIf ?? "").trim().length > 0;

  const stageStatus = (target: Stage): StepStatus => {
    if (stage === target) return "active";
    if (stage > target) return "done";
    return "locked";
  };

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
              <Crumb>the front door</Crumb>
              <Crumb>·</Crumb>
              <Crumb>dump → reflect → wager</Crumb>
              <Crumb>·</Crumb>
              <Crumb>natural language first</Crumb>
            </div>
          </div>
          <div className="stamp">say it, then sharpen it</div>
        </div>
        <p className="max-w-[810px] mt-[14px] text-[13.5px] leading-[1.65]">
          <span className="text-green font-medium">
            Say the idea the way you&apos;d say it to a colleague.
          </span>{" "}
          alphaBeta listens, reflects the bet it heard, and — gently — won&apos;t
          let it pass until it can actually <em className="text-terra not-italic">lose</em>.
          Then it helps you sharpen the loose dump into a wager you can be held
          to. Low-friction first contact; real commitment by the end.{" "}
          <span className="text-ink-soft">
            Experienced? There&apos;s an express lane straight to the wager.
          </span>
        </p>
      </header>

      <SpineRail steps={lifecycleSteps()} />

      <div className="ab-cols">
        <div className="min-w-0">
          <div className="flex flex-col">
            <StepCard
              n={1}
              title="Say it"
              sub="No fields, no structure. Brain-dump the idea however it comes out."
              status={stageStatus(1)}
              trailing={
                <button
                  type="button"
                  className="express"
                  onClick={onExpressLane}
                >
                  I know what I&apos;m betting — write it straight →
                </button>
              }
            >
              <textarea
                className="dump"
                value={dump}
                onChange={(e) => setDump(e.target.value)}
                aria-label="Brain-dump the bet"
              />
              <div className="row-actions">
                <Button variant="primary" onClick={onReflect}>
                  Reflect this back ▸
                </Button>
                <span className="text-[11px] text-ink-faint">
                  the default dump names no fold-if — watch the gap fire.
                </span>
              </div>
            </StepCard>

            <StepCard
              n={2}
              title="The bet I'm hearing"
              sub={
                <>
                  Not a flattering summary — a reflection that pushes back. It
                  splits your <b>theory</b> from your <b>confidence</b> (if /
                  then / because), and won&apos;t quietly skip the falsifier.
                </>
              }
              status={stageStatus(2)}
            >
              {analysis && (
                <ReflectionBody
                  analysis={analysis}
                  gapClause={gapClause}
                  gapInput={gapInput}
                  setGapInput={setGapInput}
                  onGapAdd={onGapAdd}
                />
              )}
              <div className="row-actions">
                <Button variant="green" onClick={onSharpen} disabled={!analysis}>
                  Sharpen into a wager ▸
                </Button>
              </div>
            </StepCard>

            <StepCard
              n={3}
              title="Make it a wager"
              sub="Same idea, now precise. Edit any token; cycle ⇅ tokens by clicking. Every blank is a field you're committing to."
              status={stageStatus(3)}
            >
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
                <ButtonLink href="/commit-and-lock">
                  Carry this bet into commit &amp; lock ▸
                </ButtonLink>
              </div>
            </StepCard>
          </div>
        </div>

        <div className="min-w-0">
          <AnnotationSidebar
            moment={ANNOT[stage].moment}
            body={ANNOT[stage].body}
            path={ANNOT[stage].path}
            margin={ANNOT[stage].margin}
          />
        </div>
      </div>

      <footer className="mt-[30px] border-t-[1.5px] border-dashed border-rule pt-[18px] text-[11.5px] text-ink-soft leading-[1.7]">
        <div>
          <b className="text-terra font-medium">the fused front door:</b>{" "}
          natural-language first contact (dump) → a reflection that pushes back
          and refuses to skip the falsifier → sharpened into the wager, the
          committed artifact. Novices walk the path; experts take the express
          lane straight to the wager. Either way, it isn&apos;t a bet until it
          can lose.
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

function lifecycleSteps(): SpineStep[] {
  return [
    { n: 1, label: "bet", status: "active" },
    {
      n: 2,
      label: "feasibility & instrument",
      status: "reachable",
      href: "/feasibility",
    },
    { n: 3, label: "decision criteria", status: "reachable", href: "/criteria" },
    {
      n: 4,
      label: "commit & lock",
      status: "reachable",
      href: "/commit-and-lock",
    },
  ];
}

type ReflectionBodyProps = {
  analysis: DumpAnalysis;
  gapClause: string;
  gapInput: string;
  setGapInput: (v: string) => void;
  onGapAdd: () => void;
};

function ReflectionBody({
  analysis,
  gapClause,
  gapInput,
  setGapInput,
  onGapAdd,
}: ReflectionBodyProps) {
  const a = analysis;
  const hedgeStr = a.confidence.hedges.slice(0, 3).map((h) => `“${h}”`).join(", ");
  const strongStr = a.confidence.strong.map((h) => `“${h}”`).join(", ");

  let confText: React.ReactNode;
  if (a.confidence.level === "hunch-level") {
    confText = (
      <>
        Reads like <b>a hunch</b> — you said {hedgeStr}. Marked honestly, not as
        conviction.
      </>
    );
  } else if (a.confidence.level === "highly") {
    confText = (
      <>
        You sound <b>highly confident</b> ({strongStr}). Confidence is when
        people skip the falsifier — so we won&apos;t.
      </>
    );
  } else {
    confText = (
      <>
        Reads as <b>fairly confident</b> — no strong hedging either way.
      </>
    );
  }

  const magText = a.magnitude ? (
    <>
      Checkout-start up <b>~{a.magnitude}</b> (your number).
    </>
  ) : (
    <>
      Some lift in checkout-start — <b>you didn&apos;t put a number on it.</b>{" "}
      We&apos;ll pin one down next.
    </>
  );

  const falsifierResolved = a.falsifier.found || gapClause.length > 0;
  const falsifierDisplay =
    gapClause ||
    a.falsifier.clause ||
    "You named a fold condition in your own words — good.";

  return (
    <div>
      <HeardCard
        label="if · what you’re changing"
        body="Move the plan-picker above the fold on /pricing."
      />
      <HeardCard label="then · expected effect" body={magText} />
      {a.mechanism.found ? (
        <HeardCard
          label="because · your theory"
          body={
            <>
              {a.mechanism.text}{" "}
              <span className="text-green italic">
                — good: you said why, not just what.
              </span>
            </>
          }
        />
      ) : (
        <HeardCard
          kind="push"
          label="because · missing"
          body={
            <>
              A <em>then</em> without a <em>because</em> — you predicted the
              effect, not the mechanism. Name why it would work.
            </>
          }
        />
      )}
      <HeardCard
        label="confidence · your gut, kept separate"
        body={
          <>
            {confText}{" "}
            <span className="text-ink-faint">
              A strong theory with low confidence is fine; high confidence with
              no theory is just vibes.
            </span>
          </>
        }
      />
      {falsifierResolved ? (
        <HeardCard
          kind="filled"
          label="what would change your mind ✓"
          body={falsifierDisplay}
        />
      ) : (
        <div className="heard heard-gap">
          <div className="heard-k">⚠ what would change your mind?</div>
          <div className="heard-v">
            You never said. This is the one thing a bet needs — without it, any
            result can be spun as a win.
          </div>
          <div className="gap-fill">
            <input
              type="text"
              value={gapInput}
              onChange={(e) => setGapInput(e.target.value)}
              placeholder="e.g. under +4%, or any guardrail drop"
              aria-label="Fold-if clause"
              onKeyDown={(e) => {
                if (e.key === "Enter") onGapAdd();
              }}
            />
            <Button
              variant="primary"
              onClick={onGapAdd}
              style={{ padding: "8px 12px" }}
            >
              add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
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
  return (
    <input
      type="text"
      className={cls}
      value={value}
      placeholder={placeholder}
      size={Math.max(value.length || placeholder.length, 6)}
      onChange={(e) => setField(k, e.target.value as never)}
      aria-label={k}
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

const ANNOT: Record<
  Stage,
  {
    moment: React.ReactNode;
    body: React.ReactNode;
    path?: React.ReactNode;
    margin?: React.ReactNode;
  }
> = {
  1: {
    moment: "Low-friction first contact",
    body: (
      <>
        <p>
          The front door asks for <em>nothing structured</em>. A blank box and
          your own words — the lowest possible bar to start. Friction here is
          what kills pre-registration before it begins.
        </p>
        <p>
          The newcomer and the adjacent expert both start the same way: just
          say it.
        </p>
      </>
    ),
    path: (
      <>
        ↳ <b>express lane:</b> someone who already knows their wager skips
        straight to the wager.
      </>
    ),
    margin: "↖ say it like you’d say it out loud.",
  },
  2: {
    moment: "The reflection pushes back",
    body: (
      <>
        <p>
          This is where trust is won or lost. A flattering summary is worthless
          — and dangerous, because it&apos;s the easiest thing for a bad-faith
          PM to rubber-stamp.
        </p>
        <p>
          So the reflection <em>argues</em>: it separates your <em>theory</em>{" "}
          (the because) from your <em>confidence</em> (your gut) — two things
          people constantly fuse — and refuses to let the missing{" "}
          <em>fold-if</em> pass quietly.
        </p>
      </>
    ),
    path: (
      <>
        ↳ <b>the one insistence:</b> falsifiability. Everything else is
        optional; “what would change your mind” is not.
      </>
    ),
    margin: "↖ the gap, not the summary.",
  },
  3: {
    moment: "Sharpened into a wager",
    body: (
      <>
        <p>
          Now the loose dump becomes precise — same idea, every part pinned to
          a field you&apos;re committing to. The form was never shown; it got
          filled anyway.
        </p>
        <p>
          The <em>losable</em> stamp stays red until your bet can actually
          lose. That&apos;s the line between a journal entry and a wager.
        </p>
      </>
    ),
    path: (
      <>
        ↳ <b>downstream:</b> this committed bet pre-fills what the Commit
        &amp; Lock screen opens with.
      </>
    ),
    margin: "↖ you said it loosely. now you’re on the hook.",
  },
};
