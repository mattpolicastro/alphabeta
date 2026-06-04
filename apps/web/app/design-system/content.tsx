"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { DashedPanel } from "@/components/ui/DashedPanel";
import { MarginNote } from "@/components/ui/MarginNote";
import { SpineRail } from "@/components/bet/SpineRail";
import { HeardCard } from "@/components/bet/HeardCard";
import { AnnotationSidebar } from "@/components/bet/AnnotationSidebar";
import { WagerStatic } from "@/components/bet/WagerStatic";
import { StepCard } from "@/components/bet/StepCard";
import { IntegrityCheck } from "@/components/inflight/IntegrityCheck";
import { BucketResult } from "@/components/inflight/BucketResult";
import { RuntimeBar } from "@/components/inflight/RuntimeBar";
import { GuardrailRow } from "@/components/inflight/GuardrailRow";
import { ThemeCard } from "@/components/inflight/ThemeCard";
import { LockedBetMini } from "@/components/inflight/LockedBetMini";
import { PhaseToggle } from "@/components/inflight/PhaseToggle";
import { EvidenceBar } from "@/components/inflight/EvidenceBar";

export function DesignSystemContent() {
  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[24px]">
        <div className="wordmark">
          alph<span className="a">⍺</span>
          <span className="b">β</span>eta · Design System
        </div>
        <p className="mt-[6px] text-[12px] text-ink-soft leading-[1.6] max-w-[700px]">
          Canonical tokens, layouts, components. One page a builder reads before
          touching any wireframe. Mirrors{" "}
          <code className="text-terra">design/Design System.html</code>. Grows
          with each extracted component.
        </p>
      </header>

      <Section label="Tokens · Color" id="color">
        <SectionNote>
          Six roles. Surfaces are warm; ink is near-black; terracotta is the
          primary accent and discipline voice; green = positive / done; amber =
          caution; plinth-blue = strategy-layer origin.
        </SectionNote>
        <SwatchRow>
          <Swatch name="paper" value="#f5f1e8" var="--color-paper" />
          <Swatch
            name="paper-hover"
            value="#efe9da"
            var="--color-paper-hover"
          />
          <Swatch name="ink" value="#2a2a2a" var="--color-ink" />
          <Swatch name="ink-soft" value="55% ink" var="--color-ink-soft" />
          <Swatch name="ink-faint" value="32% ink" var="--color-ink-faint" />
        </SwatchRow>
        <SwatchRow>
          <Swatch name="terra" value="#a64d3b" var="--color-terra" />
          <Swatch
            name="terra-soft"
            value="7% terra"
            var="--color-terra-soft"
          />
          <Swatch
            name="terra-line"
            value="45% terra"
            var="--color-terra-line"
          />
          <Swatch name="green" value="#3a6b4a" var="--color-green" />
          <Swatch name="amber" value="#b8860b" var="--color-amber" />
          <Swatch name="plinth" value="#5a6b8c" var="--color-plinth" />
        </SwatchRow>
      </Section>

      <Section label="Tokens · Typography" id="type">
        <SectionNote>
          Two families only. JetBrains Mono for everything; Caveat for margin
          notes and narrator labels. Monospace is the brand voice.
        </SectionNote>
        <TypeRow size={26} weight={700} spec="Page title · 26px / 700 / -0.5px">
          alphaBeta — Page title
        </TypeRow>
        <TypeRow size={18} weight={700} spec="Section title · 18px / 700">
          Section title
        </TypeRow>
        <TypeRow size={14} weight={700} spec="Panel title · 14px / 700">
          Panel title
        </TypeRow>
        <TypeRow size={13} weight={400} spec="Body · 13px / 400">
          Body — field content, prose.
        </TypeRow>
        <TypeRow
          size={11.5}
          weight={400}
          color="var(--color-ink-soft)"
          spec="Detail · 11.5px / 400 / ink-soft"
        >
          Detail — descriptions, sub-copy.
        </TypeRow>
        <TypeRow
          size={10.5}
          weight={400}
          color="var(--color-ink-soft)"
          upper
          tracking="1px"
          spec="Label · 10.5px / 400 / uppercase / 1px"
        >
          Field label
        </TypeRow>
        <TypeRow
          size={9}
          weight={700}
          color="var(--color-terra)"
          upper
          tracking="1.5px"
          spec="Micro-label · 9px / 700 / uppercase / 1.5px"
        >
          Discipline badge
        </TypeRow>
        <div className="mt-[10px]">
          <MarginNote>↖ Margin note — Caveat 16px, rotated.</MarginNote>
          <div className="text-[10px] text-ink-faint mt-[2px]">
            Handwritten annotations. Always terracotta, slightly rotated.
          </div>
        </div>
      </Section>

      <Section label="Tokens · Spacing" id="spacing">
        <SectionNote>
          All borders are 1.5px dashed. No rounded corners. No drop shadows.
        </SectionNote>
        {[
          { label: "xs", px: 4, note: "" },
          { label: "s", px: 8, note: "" },
          { label: "m", px: 14, note: "" },
          { label: "l", px: 18, note: "panel padding" },
          { label: "xl", px: 24, note: "" },
          { label: "2xl", px: 28, note: "page padding · grid size" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-[8px] mb-[6px]"
          >
            <span className="text-[10px] text-ink-soft w-[50px]">{s.label}</span>
            <span
              className="h-[12px] bg-terra-soft border border-terra-line"
              style={{ width: s.px }}
            />
            <span className="text-[10px] text-ink-faint">
              {s.px}px {s.note && <span>— {s.note}</span>}
            </span>
          </div>
        ))}
      </Section>

      <Section label="Layout" id="layout">
        <SectionNote>
          Max-width <b>1140px</b>. Two-column <b>1.4fr 1fr</b>, gap 22px. Main
          left, annotation sidebar right. Collapses at 860px.
        </SectionNote>
        <div className="ab-cols">
          <DashedPanel title="Main content" sub="The form, the fields, the data. This is where the user works.">
            <div className="text-[11px] text-ink-faint">1.4fr column.</div>
          </DashedPanel>
          <div className="annot" style={{ position: "static" }}>
            <div className="moment">Annotation sidebar</div>
            <p>
              1fr — discipline commentary, insertion-moment notes. Sticky in
              real flow.
            </p>
          </div>
        </div>
      </Section>

      <Section label="Components · Buttons" id="buttons">
        <Specimen note="Default · primary · green · disabled">
          <div className="flex gap-[10px] flex-wrap">
            <Button>default</Button>
            <Button variant="primary">primary</Button>
            <Button variant="green">green</Button>
            <Button disabled>disabled</Button>
          </div>
          <Spec>
            No rounded corners. Default: dashed border. Primary: solid terra
            fill. Green: solid for affirmative actions.
          </Spec>
        </Specimen>
        <Specimen note="ButtonLink (anchor)">
          <ButtonLink href="#">link as button</ButtonLink>
        </Specimen>
      </Section>

      <Section label="Components · DashedPanel" id="panel">
        <Specimen note="Default panel — the basic container">
          <DashedPanel
            title="Panel title"
            sub="Description at 11.5px ink-soft. Padding 18px. 1.5px dashed border."
          >
            Children render here.
          </DashedPanel>
        </Specimen>
      </Section>

      <Section label="Components · HeardCard (reflection)" id="heard">
        <Specimen note="Default · push · gap · filled">
          <HeardCard
            label="if · what you're changing"
            body="Move the plan-picker above the fold."
          />
          <HeardCard
            kind="push"
            label="because · missing"
            body="A then without a because — predicted the effect, not the mechanism."
          />
          <div className="heard heard-gap">
            <div className="heard-k">⚠ what would change your mind?</div>
            <div className="heard-v">
              You never said. Without a fold condition any result can be spun
              as a win.
            </div>
          </div>
          <HeardCard
            kind="filled"
            label="what would change your mind ✓"
            body="under +4% lift."
          />
        </Specimen>
      </Section>

      <Section label="Components · SpineRail" id="rail">
        <Specimen note="Full 6-step lifecycle: done → done → active → reachable → locked → locked">
          <SpineRail
            steps={[
              { n: 1, label: "wager", status: "done", href: "#" },
              { n: 2, label: "instrument", status: "done", href: "#" },
              { n: 3, label: "criteria", status: "active" },
              { n: 4, label: "lock", status: "reachable", href: "#" },
              { n: 5, label: "run", status: "locked" },
              { n: 6, label: "revisit", status: "locked" },
            ]}
          />
        </Specimen>
      </Section>

      <Section label="Components · AnnotationSidebar" id="annot">
        <Specimen note="In-product discipline annotation. Sticky in real flow.">
          <div style={{ maxWidth: 360 }}>
            <AnnotationSidebar
              moment="Insertion moment"
              body={
                <p>
                  Terracotta border + soft fill. The discipline-layer chrome
                  floats above. <em>Genuine product affordance.</em>
                </p>
              }
              path={<>↳ <b>downstream:</b> feeds the next screen.</>}
              margin="↖ a Caveat marginalia."
            />
          </div>
        </Specimen>
      </Section>

      <Section label="Components · Status badges" id="status">
        <Specimen note="Derived. Non-interactive. Chain of custody.">
          <div className="flex gap-[10px] flex-wrap">
            <span className="st st-draft">draft</span>
            <span className="st st-locked">locked</span>
            <span className="st st-running">running</span>
            <span className="st st-won">won</span>
            <span className="st st-lost">lost</span>
          </div>
        </Specimen>
      </Section>

      <Section label="Components · WagerStatic" id="wager-static">
        <Specimen note="Fully populated bet">
          <WagerStatic bet={{
            change: "moving the plan-picker above the fold",
            direction: "lift",
            metric: "checkout-start",
            magnitude: "8%",
            mechanism: "replays show scroll drop-off at the testimonials",
            confidence: "fairly",
            foldIf: "under +4%"
          }} />
        </Specimen>
        <Specimen note="Partially empty bet — em-dash fallback">
          <WagerStatic bet={{
            change: "moving the plan-picker above the fold",
            direction: "lift"
          }} />
        </Specimen>
      </Section>

      <Section label="Components · StepCard" id="step-card">
        <Specimen note="status=active — current step">
          <StepCard n={1} title="Say it" sub="Brain-dump." status="active">
            <div className="text-[10px] text-ink-soft">Current step in the flow.</div>
          </StepCard>
        </Specimen>
        <Specimen note="status=done — completed step">
          <StepCard n={1} title="Say it" sub="Brain-dump." status="done">
            <div className="text-[10px] text-ink-soft">Completed step in the flow.</div>
          </StepCard>
        </Specimen>
        <Specimen note="status=locked — not yet reached">
          <StepCard n={3} title="Make it a wager" sub="Sharpen." status="locked">
            <div className="text-[10px] text-ink-soft">Not yet reached in the flow.</div>
          </StepCard>
        </Specimen>
      </Section>

      <Section label="Components · IntegrityCheck" id="integrity-check">
        <Specimen note="ok · warn · fail states">
          <div className="flex flex-col gap-[10px]">
            <IntegrityCheck status="ok" title="Sample Ratio Mismatch (SRM)" detail="No mismatch detected. Ratio: 0.993." />
            <IntegrityCheck status="warn" title="Peek exposure" detail={<>You viewed intermediate results <b>2 times</b>. Each peek inflates false-positive risk.</>} />
            <IntegrityCheck status="fail" title="Guardrail breach" detail="App crash rate exceeded 0.5% threshold." />
          </div>
        </Specimen>
      </Section>

      <Section label="Components · BucketResult" id="bucket-result">
        <Specimen note="Win bucket">
          <BucketResult outcome="win" why="The primary metric exceeded the fold-if threshold." action="Keep the redesign — roll to 100% this week." />
        </Specimen>
        <Specimen note="Inconclusive bucket">
          <BucketResult outcome="inconclusive" why="Positive but below the fold-if — the smallest effect that would change your mind." action="Hold — sharpen the variant and re-test next quarter." />
        </Specimen>
        <Specimen note="Loss bucket">
          <BucketResult outcome="loss" why="Below zero or guardrail breach." action="Revert — log why in the decision journal." />
        </Specimen>
      </Section>

      <Section label="Components · RuntimeBar" id="runtime-bar">
        <Specimen note="Day 12 of 25">
          <RuntimeBar currentDay={12} committedDays={25} />
        </Specimen>
        <Specimen note="Complete (day 25 of 25)">
          <RuntimeBar currentDay={25} committedDays={25} />
        </Specimen>
      </Section>

      <Section label="Components · GuardrailRow" id="guardrail-row">
        <Specimen note="ok and warn states">
          <div className="flex flex-col">
            <GuardrailRow name="App crash rate" value="0.12%" status="ok" />
            <GuardrailRow name="Page load time (p95)" value="2.4s" status="warn" />
          </div>
        </Specimen>
      </Section>

      <Section label="Components · LockedBetMini" id="locked-bet-mini">
        <Specimen note="Default — with lockedAgo">
          <LockedBetMini
            title="A/B test 3 email bodies"
            foldIf="+4%"
            metric="7-day login"
            lockedAgo="18 days ago"
          />
        </Specimen>
        <Specimen note="Results phase — with extra content">
          <LockedBetMini
            title="A/B test 3 email bodies"
            foldIf="+4%"
            metric="7-day login"
            extra={<span className="font-medium text-terra"> · runtime complete · day 25</span>}
          />
        </Specimen>
      </Section>

      <Section label="Components · PhaseToggle" id="phase-toggle">
        <Specimen note="Two phases — first active">
          <PhaseToggle
            phases={[
              { id: "flight", label: "4a · In-flight" },
              { id: "results", label: "4b · Results" },
            ]}
            activeId="flight"
            onChange={() => {}}
          />
        </Specimen>
      </Section>

      <Section label="Components · EvidenceBar" id="evidence-bar">
        <Specimen note="Qualitative evidence — leans against">
          <EvidenceBar
            segments={["contra", "contra", "neutral", null, null]}
            summary="2 of 4 themes contradict · 1 supports · 1 neutral. The weight of evidence leans against the hypothesis."
          />
        </Specimen>
        <Specimen note="Strongly supports">
          <EvidenceBar
            segments={["support", "support", "support", "support", "neutral"]}
            summary="4 of 5 themes support the hypothesis."
          />
        </Specimen>
      </Section>

      <Section label="Components · ThemeCard" id="theme-card">
        <Specimen note="supports · contradicts · neutral · emergent">
          <ThemeCard name="Willingness to explore" participantCount="3 / 4 participants" direction="supports" quotes="&quot;If you showed me this on the homepage I'd probably click it.&quot;" />
          <ThemeCard name="Awareness of investment products" participantCount="4 / 4 participants" direction="contradicts" quotes="&quot;I didn't even know you had investments.&quot;" />
          <ThemeCard name="Trust in the platform" participantCount="2 / 4 participants" direction="neutral" />
          <ThemeCard name="Pricing sensitivity" participantCount="1 / 4 (P3 only)" direction="neutral" directionLabel="emergent · exploratory" quotes="Surfaced from an off-guide question." />
        </Specimen>
      </Section>
    </div>
  );
}

function Section({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-[40px]">
      <div className="text-[11px] tracking-[2px] uppercase text-terra font-bold mb-[4px]">
        {label}
      </div>
      <hr className="border-0 border-t-[1.5px] border-dashed border-rule-faint my-[8px] mb-[18px]" />
      {children}
    </section>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-ink-soft italic mb-[14px] leading-[1.55]">
      {children}
    </div>
  );
}

function SwatchRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-[14px] mb-[18px]">{children}</div>
  );
}

function Swatch({
  name,
  value,
  var: varName,
}: {
  name: string;
  value: string;
  var: string;
}) {
  return (
    <div style={{ width: 80 }}>
      <div
        className="border-[1.5px] border-dashed border-rule-faint"
        style={{ width: 80, height: 48, background: `var(${varName})` }}
      />
      <div className="text-[10px] font-bold mt-[4px]">{name}</div>
      <div className="text-[9px] text-ink-faint">{value}</div>
    </div>
  );
}

function TypeRow({
  size,
  weight,
  color,
  upper,
  tracking,
  spec,
  children,
}: {
  size: number;
  weight: number;
  color?: string;
  upper?: boolean;
  tracking?: string;
  spec: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[14px]">
      <div
        style={{
          fontSize: `${size}px`,
          fontWeight: weight,
          color,
          textTransform: upper ? "uppercase" : undefined,
          letterSpacing: tracking,
          lineHeight: 1.3,
        }}
      >
        {children}
      </div>
      <div className="text-[10px] text-ink-faint mt-[2px]">{spec}</div>
    </div>
  );
}

function Specimen({
  note,
  children,
}: {
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-[1.5px] border-dashed border-rule-faint bg-paper-veil p-[18px] mb-[14px]">
      <div className="text-[10px] tracking-[1.5px] uppercase text-ink-soft mb-[14px]">
        {note}
      </div>
      {children}
    </div>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-ink-faint mt-[8px] tracking-[0.3px]">
      {children}
    </div>
  );
}
