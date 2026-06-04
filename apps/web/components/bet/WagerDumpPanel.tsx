// Free-text dump panel for /bet/wager. The user pastes context (a slack
// thread, a meeting note, an LLM brain-dump, a stringified strategy
// card) and gets back the original Bet Front Door reflection: magnitude
// detected, hedge words, mechanism, fold-if. The "Fill into wager"
// button merges the recovered fields into the structured wager below.
//
// Analyze always runs with `source: "strategy-card"` — label extraction
// kicks in only if labels are present (Change:, Metric:, etc.), and
// free-text heuristics fall through underneath for anything unlabeled.
// One analyzer, two input shapes.
//
// `initialText` is the elevation-handoff path: CardShell stashes a
// cardToDump() payload before navigating; /bet/wager reads it from
// localStorage and passes it here. When present, the panel opens
// automatically with the textarea pre-filled — the user sees the source
// text behind any subsequent Fill action.

"use client";

import { useMemo, useState } from "react";
import { analyzeDump, type DumpAnalysis } from "@/lib/bet/analyze";
import type { AbBet } from "@/lib/bet/storage";

type Props = {
  onFill: (patch: Partial<AbBet>) => void;
  initialText?: string;
};

export function WagerDumpPanel({ onFill, initialText = "" }: Props) {
  const [text, setText] = useState(initialText);
  const [open, setOpen] = useState(initialText.length > 0);

  const analysis: DumpAnalysis | null = useMemo(
    () =>
      text.trim() ? analyzeDump(text, { source: "strategy-card" }) : null,
    [text],
  );

  function handleFill() {
    if (!analysis) return;
    const patch: Partial<AbBet> = {};
    // Labeled (strategy-card) fields the analyzer pulled.
    if (analysis.articulation.change) patch.change = analysis.articulation.change;
    if (analysis.articulation.direction) patch.direction = analysis.articulation.direction;
    if (analysis.articulation.metric) patch.metric = analysis.articulation.metric;
    if (analysis.articulation.magnitude) patch.magnitude = analysis.articulation.magnitude;
    if (analysis.articulation.mechanism) patch.mechanism = analysis.articulation.mechanism;
    if (analysis.articulation.foldIf) patch.foldIf = analysis.articulation.foldIf;
    if (analysis.articulation.confidence) patch.confidence = analysis.articulation.confidence;
    // Free-text fallbacks for anything the labels missed.
    if (!patch.magnitude && analysis.magnitude) patch.magnitude = analysis.magnitude;
    if (
      !patch.mechanism &&
      analysis.mechanism.found &&
      analysis.mechanism.text
    ) {
      patch.mechanism = analysis.mechanism.text;
    }
    if (!patch.confidence) patch.confidence = analysis.confidence.level;
    if (!patch.foldIf && analysis.falsifier.clause) {
      patch.foldIf = analysis.falsifier.clause;
    }
    onFill(patch);
  }

  return (
    <div className="dashed-panel mt-[12px]">
      <button
        type="button"
        className="dashed-panel-title flex w-full items-center justify-between"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-dump-panel-toggle
      >
        <span>Paste context — get a quick read</span>
        <span aria-hidden className="text-ink-soft">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <>
          <textarea
            className="mt-[8px] w-full min-h-[120px] resize-y rounded border border-rule-faint bg-paper-veil p-[8px] text-[13px] font-mono"
            placeholder="paste a slack thread, a note, an LLM brain-dump…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-dump-panel-textarea
          />
          {analysis && <DumpReflection analysis={analysis} />}
          {analysis && (
            <div className="mt-[8px] flex items-center gap-[8px]">
              <button
                type="button"
                className="btn-primary"
                onClick={handleFill}
                data-dump-panel-fill
              >
                Fill into wager
              </button>
              <span className="text-[11px] text-ink-faint">
                only the parts the analyzer recovered — anything missing
                stays yours.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DumpReflection({ analysis }: { analysis: DumpAnalysis }) {
  const a = analysis.articulation;
  return (
    <ul
      className="mt-[8px] flex flex-col gap-[4px] text-[12px]"
      data-dump-panel-reflection
    >
      {a.change && (
        <li>
          <span className="text-ink-soft">change — </span>
          <b className="text-ink">{a.change}</b>
        </li>
      )}
      {a.metric && (
        <li>
          <span className="text-ink-soft">metric — </span>
          <b className="text-ink">{a.metric}</b>
        </li>
      )}
      <li>
        <span className="text-ink-soft">magnitude — </span>
        {analysis.magnitude ? (
          <b className="text-ink">{analysis.magnitude}</b>
        ) : (
          <em className="text-ink-faint">no number phrased</em>
        )}
      </li>
      <li>
        <span className="text-ink-soft">confidence reads as — </span>
        <b className="text-ink">{analysis.confidence.label}</b>
        {analysis.confidence.hedges.length > 0 && (
          <span className="text-ink-faint">
            {" "}
            (hedges: {analysis.confidence.hedges.join(", ")})
          </span>
        )}
      </li>
      <li>
        <span className="text-ink-soft">mechanism — </span>
        {analysis.mechanism.found && analysis.mechanism.text ? (
          <b className="text-ink">{analysis.mechanism.text}</b>
        ) : (
          <em className="text-ink-faint">none found</em>
        )}
      </li>
      <li>
        <span className="text-ink-soft">fold-if — </span>
        {analysis.falsifier.found ? (
          analysis.falsifier.clause ? (
            <b className="text-ink">{analysis.falsifier.clause}</b>
          ) : (
            <b className="text-ink">phrased, not extracted</b>
          )
        ) : (
          <em className="text-ink-faint">none — the bet can&apos;t lose yet</em>
        )}
      </li>
    </ul>
  );
}
