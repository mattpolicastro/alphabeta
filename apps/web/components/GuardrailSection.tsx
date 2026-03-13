'use client';

/**
 * Guardrail metrics section — rendered separately below primary metrics.
 * See requirements.md Section 7.2 Guardrail Metrics Section.
 *
 * Displays per-metric status: Safe / Borderline / Violated
 */

import type { MetricResult } from '@/lib/db/schema';
import type { Metric } from '@/lib/db/schema';

interface GuardrailSectionProps {
  guardrailResults: MetricResult[];
  metrics: Metric[];
}

export function GuardrailSection({ guardrailResults, metrics }: GuardrailSectionProps) {
  // TODO: for each guardrail metric, determine status:
  //   - Safe (green): no significant negative movement
  //   - Borderline (yellow): approaching significance threshold
  //   - Violated (red): statistically significant negative movement
  // TODO: render status badges with metric names

  void guardrailResults;
  void metrics;

  return (
    <div>
      <h3>Guardrail Metrics</h3>
      {/* TODO: guardrail status list */}
      <p className="text-muted">GuardrailSection component stub</p>
    </div>
  );
}
