// Free-text dump panel for /bet/wager. The user pastes context (a slack
// thread, a meeting note, an LLM brain-dump) and gets back the original
// Bet Front Door reflection: magnitude detected, hedge words, mechanism,
// fold-if. A "Fill into wager" button merges the recoverable bits of the
// analysis into the structured wager fields below.
//
// Two facts about the analyze engine that shape this UI:
//   1. Free-text source only recovers magnitude / mechanism / confidence
//      level / falsifier clause confidently — it doesn't try to infer
//      change/metric from prose. So "Fill into wager" sets at most four
//      fields. Change/metric/direction stay manual.
//   2. The labeled strategy-card source (used by elevation, not this
//      panel) recovers the full Articulation up-front, so a card-elevated
//      bet lands with structured fields already populated and this panel
//      stays empty unless the user wants to paste more context.

"use client";

import { useMemo, useState } from "react";
import { analyzeDump, type DumpAnalysis } from "@/lib/bet/analyze";
import type { AbBet } from "@/lib/bet/storage";

type Props = {
  onFill: (patch: Partial<AbBet>) => void;
};

export function WagerDumpPanel({ onFill }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const analysis: DumpAnalysis | null = useMemo(
    () => (text.trim() ? analyzeDump(text) : null),
    [text],
  );

  function handleFill() {
    if (!analysis) return;
    const patch: Partial<AbBet> = {};
    if (analysis.magnitude) patch.magnitude = analysis.magnitude;
    if (analysis.mechanism.found && analysis.mechanism.text) {
      patch.mechanism = analysis.mechanism.text;
    }
    patch.confidence = analysis.confidence.level;
    if (analysis.falsifier.clause) patch.foldIf = analysis.falsifier.clause;
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
                only the parts the analyzer recovered — change/metric/direction
                stay yours.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DumpReflection({ analysis }: { analysis: DumpAnalysis }) {
  return (
    <ul className="mt-[8px] flex flex-col gap-[4px] text-[12px]" data-dump-panel-reflection>
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
