'use client';

/**
 * Guardrail metrics status summary — rendered above the guardrail results table.
 * See requirements.md Section 7.2 Guardrail Metrics Section.
 *
 * Displays per-metric status: Safe / Borderline / Violated
 */

import type { MetricResult, Metric } from '@/lib/db/schema';

export interface GuardrailSectionProps {
  guardrailResults: MetricResult[];
  metrics: Metric[];
  selectedVariationIds?: string[];
}

export type GuardrailStatus = 'safe' | 'borderline' | 'violated';

interface GuardrailMetricStatus {
  metricId: string;
  metricName: string;
  status: GuardrailStatus;
  detail: string;
}

export const STATUS_CONFIG: Record<GuardrailStatus, { badge: string; icon: string }> = {
  safe: { badge: 'bg-success', icon: '\u2705' },
  borderline: { badge: 'bg-warning text-dark', icon: '\u26A0\uFE0F' },
  violated: { badge: 'bg-danger', icon: '\uD83D\uDED1' },
};

export function determineStatus(mr: MetricResult, metric: Metric | undefined): GuardrailMetricStatus {
  const name = metric?.name ?? mr.metricId;
  const higherIsBetter = metric?.higherIsBetter ?? true;

  // Check all treatment variations
  for (const vr of mr.variationResults) {
    const lift = vr.relativeUplift;
    const isNegativeMovement = higherIsBetter ? lift < 0 : lift > 0;

    if (vr.significant && isNegativeMovement) {
      return {
        metricId: mr.metricId,
        metricName: name,
        status: 'violated',
        detail: `Significant ${higherIsBetter ? 'decrease' : 'increase'} detected (${(lift * 100).toFixed(2)}%)`,
      };
    }
  }

  // Check for borderline: approaching significance with negative direction
  for (const vr of mr.variationResults) {
    const lift = vr.relativeUplift;
    const isNegativeMovement = higherIsBetter ? lift < 0 : lift > 0;

    if (!isNegativeMovement) continue;

    // Bayesian: chance to beat control < 20% (i.e. 80%+ chance of being worse)
    if (vr.chanceToBeatControl != null && vr.chanceToBeatControl < 0.2) {
      return {
        metricId: mr.metricId,
        metricName: name,
        status: 'borderline',
        detail: `${(vr.chanceToBeatControl * 100).toFixed(1)}% chance to win — approaching violation`,
      };
    }

    // Frequentist: p-value < 0.1 but not significant (< alpha)
    if (vr.pValue != null && vr.pValue < 0.1 && !vr.significant) {
      return {
        metricId: mr.metricId,
        metricName: name,
        status: 'borderline',
        detail: `p=${vr.pValue.toFixed(4)} — approaching significance`,
      };
    }
  }

  return {
    metricId: mr.metricId,
    metricName: name,
    status: 'safe',
    detail: 'No significant negative movement',
  };
}

export function GuardrailSection({ guardrailResults, metrics, selectedVariationIds }: GuardrailSectionProps) {
  if (guardrailResults.length === 0) return null;

  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const filteredResults = selectedVariationIds
    ? guardrailResults.map((mr) => ({
        ...mr,
        variationResults: mr.variationResults.filter(
          (vr) => selectedVariationIds.includes(vr.variationId)
        ),
      }))
    : guardrailResults;
  const statuses = filteredResults.map((mr) => determineStatus(mr, metricById.get(mr.metricId)));

  const anyViolated = statuses.some((s) => s.status === 'violated');
  const anyBorderline = statuses.some((s) => s.status === 'borderline');

  return (
    <div className={`card mb-3 ${anyViolated ? 'border-danger' : anyBorderline ? 'border-warning' : 'border-success'}`}>
      <div className="card-body py-2">
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <strong className="me-1">Guardrails:</strong>
          {statuses.map((s) => {
            const config = STATUS_CONFIG[s.status];
            return (
              <span key={s.metricId} title={s.detail}>
                <span className={`badge ${config.badge} me-1`}>
                  {s.status}
                </span>
                {s.metricName}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
