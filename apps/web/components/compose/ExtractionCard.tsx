"use client";

import type { Extraction, ExtractionField } from "@/lib/compose/types";

const FIELD_LABELS: Record<string, { label: string; dotColor: string }> = {
  change: { label: "change", dotColor: "var(--color-terra)" },
  direction: { label: "direction", dotColor: "var(--color-terra)" },
  metric: { label: "metric", dotColor: "var(--color-green)" },
  magnitude: { label: "magnitude", dotColor: "var(--color-green)" },
  mechanism: { label: "mechanism", dotColor: "var(--color-plinth)" },
  confidence: { label: "confidence", dotColor: "var(--color-ink-soft)" },
  foldIf: { label: "fold condition", dotColor: "var(--color-amber)" },
  instrument: { label: "instrument", dotColor: "var(--color-plinth)" },
  winAction: { label: "win action", dotColor: "var(--color-green)" },
  lossAction: { label: "loss action", dotColor: "var(--color-terra)" },
  inconAction: { label: "inconclusive action", dotColor: "var(--color-amber)" },
};

function Slot({ field, meta }: { field: ExtractionField; meta: { label: string; dotColor: string } }) {
  const isMissing = field.status === "missing";
  return (
    <div
      className="compose-ext-slot"
      style={isMissing ? { borderColor: "var(--color-terra-line)", background: "var(--color-terra-soft)" } : undefined}
    >
      <div className="compose-ext-key">
        <span
          className="compose-ext-dot"
          style={{ background: meta.dotColor }}
        />
        {meta.label}
      </div>
      <div
        className="compose-ext-val"
        style={isMissing ? { color: "var(--color-terra)", fontStyle: "italic" } : undefined}
      >
        {field.value}
      </div>
    </div>
  );
}

export function ExtractionCard({ extractions }: { extractions: Extraction }) {
  const entries = Object.entries(extractions) as [string, ExtractionField][];
  if (entries.length === 0) return null;

  return (
    <div className="compose-ext">
      {entries.map(([key, field]) => {
        const meta = FIELD_LABELS[key] ?? {
          label: key,
          dotColor: "var(--color-ink-faint)",
        };
        return <Slot key={key} field={field} meta={meta} />;
      })}
    </div>
  );
}
