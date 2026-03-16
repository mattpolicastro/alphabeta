'use client';

/**
 * Primary and guardrail metric checkbox lists.
 * Shared between experiment creation wizard and experiment config panel.
 */

import type { Metric } from '@/lib/db/schema';

export interface MetricPickerProps {
  metrics: Metric[];
  primaryMetricIds: string[];
  guardrailMetricIds: string[];
  onPrimaryChange: (ids: string[]) => void;
  onGuardrailChange: (ids: string[]) => void;
  /** Prefix for input IDs to avoid collisions when rendered multiple times. */
  idPrefix?: string;
  /** Show validation styling when no primary metric selected. Default true. */
  requirePrimary?: boolean;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function MetricPicker({
  metrics,
  primaryMetricIds,
  guardrailMetricIds,
  onPrimaryChange,
  onGuardrailChange,
  idPrefix = 'mp',
  requirePrimary = true,
}: MetricPickerProps) {
  const metricsValid = !requirePrimary || primaryMetricIds.length > 0;

  if (metrics.length === 0) {
    return (
      <div className="alert alert-warning">
        No metrics defined yet.{' '}
        <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/metrics`} target="_blank">Create metrics</a> first, then come back.
      </div>
    );
  }

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <h6 className={!metricsValid ? 'text-danger' : ''}>
          Primary Metrics {requirePrimary && '(select at least 1)'}
        </h6>
        {!metricsValid && (
          <div className="alert alert-warning py-2 small">
            Select at least one primary metric.
          </div>
        )}
        {metrics.map((m) => (
          <div key={m.id} className="form-check">
            <input
              className={`form-check-input ${!metricsValid ? 'is-invalid' : ''}`}
              type="checkbox"
              checked={primaryMetricIds.includes(m.id)}
              onChange={() => onPrimaryChange(toggle(primaryMetricIds, m.id))}
              id={`${idPrefix}-primary-${m.id}`}
            />
            <label className="form-check-label" htmlFor={`${idPrefix}-primary-${m.id}`}>
              {m.name}{' '}
              <span className="badge bg-light text-dark border">{m.type}</span>
            </label>
          </div>
        ))}
      </div>
      <div className="col-md-6">
        <h6>Guardrail Metrics (optional)</h6>
        {metrics.map((m) => (
          <div key={m.id} className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={guardrailMetricIds.includes(m.id)}
              onChange={() => onGuardrailChange(toggle(guardrailMetricIds, m.id))}
              id={`${idPrefix}-guard-${m.id}`}
            />
            <label className="form-check-label" htmlFor={`${idPrefix}-guard-${m.id}`}>
              {m.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
