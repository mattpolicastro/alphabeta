'use client';

/**
 * Pre-submission metric validation panel.
 * Computes lightweight per-metric summary statistics and displays warnings.
 * See requirements.md Section 5.2a.
 */

import { useState } from 'react';
import type { Metric } from '@/lib/db/schema';

export interface MetricSummary {
  metricId: string;
  metricName: string;
  variations: {
    variationKey: string;
    units: number;
    total: number;
    rate: number;
  }[];
}

interface ValidationIssue {
  type: 'error' | 'warning';
  metricId: string;
  message: string;
}

export interface MetricValidationPanelProps {
  summaries: MetricSummary[];
  metrics: Metric[];
  onAcknowledge?: () => void;
}

export function computeMetricSummaries(
  rows: Record<string, string>[],
  mapping: Record<string, { role: string; metricId?: string }>,
  metrics: Metric[],
  variationKeys: string[],
): MetricSummary[] {
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const metricCols = Object.entries(mapping)
    .filter(([, c]) => c.role === 'metric' && c.metricId)
    .map(([col, c]) => ({ col, metricId: c.metricId! }));

  // Filter to "overall" rows (where dimension columns = "all" or no dimensions)
  const dimensionCols = Object.entries(mapping)
    .filter(([, c]) => c.role === 'dimension')
    .map(([col]) => col);

  const overallRows = rows.filter((r) =>
    dimensionCols.every((d) => r[d]?.trim().toLowerCase() === 'all'),
  );

  return metricCols.map(({ col, metricId }) => {
    const metric = metricById.get(metricId);
    return {
      metricId,
      metricName: metric?.name ?? metricId,
      variations: variationKeys.map((varKey) => {
        const varRows = overallRows.filter(
          (r) => r['variation_id']?.trim().toLowerCase() === varKey.toLowerCase(),
        );
        const row = varRows[0];
        const units = row ? Number(row['units']) || 0 : 0;
        const total = row ? Number(row[col]) || 0 : 0;
        const rate = units > 0 ? total / units : 0;
        return { variationKey: varKey, units, total, rate };
      }),
    };
  });
}

function computeIssues(summaries: MetricSummary[], metrics: Metric[]): ValidationIssue[] {
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const issues: ValidationIssue[] = [];

  for (const summary of summaries) {
    const metric = metricById.get(summary.metricId);
    const totalUnits = summary.variations.reduce((s, v) => s + v.units, 0);
    const totalMetric = summary.variations.reduce((s, v) => s + v.total, 0);

    // Error: any variation has zero units
    for (const v of summary.variations) {
      if (v.units === 0) {
        issues.push({
          type: 'error',
          metricId: summary.metricId,
          message: `${summary.metricName}: variation "${v.variationKey}" has 0 units — cannot compute statistics.`,
        });
      }
    }

    // Warning: minSampleSize check
    if (metric?.minSampleSize) {
      for (const v of summary.variations) {
        if (v.units > 0 && v.units < metric.minSampleSize) {
          issues.push({
            type: 'warning',
            metricId: summary.metricId,
            message: `${summary.metricName}: variation "${v.variationKey}" has ${v.units.toLocaleString()} units, below minimum sample size of ${metric.minSampleSize.toLocaleString()}.`,
          });
        }
      }
    }

    // Warning: metric total is 0 across all variations
    if (totalMetric === 0 && totalUnits > 0) {
      issues.push({
        type: 'warning',
        metricId: summary.metricId,
        message: `${summary.metricName}: no events recorded across all variations — is this the right column?`,
      });
    }

    // Warning: degenerate rate (0% or 100%)
    for (const v of summary.variations) {
      if (v.units > 0 && (v.rate === 0 || v.rate === 1)) {
        issues.push({
          type: 'warning',
          metricId: summary.metricId,
          message: `${summary.metricName}: variation "${v.variationKey}" has a ${v.rate === 0 ? '0%' : '100%'} rate — no variance, test will be meaningless.`,
        });
      }
    }

    // Warning: rate imbalance (control vs treatment > 5×)
    const rates = summary.variations.filter((v) => v.units > 0 && v.rate > 0).map((v) => v.rate);
    if (rates.length >= 2) {
      const maxRate = Math.max(...rates);
      const minRate = Math.min(...rates);
      if (minRate > 0 && maxRate / minRate > 5) {
        issues.push({
          type: 'warning',
          metricId: summary.metricId,
          message: `${summary.metricName}: very large observed difference between variations (${(maxRate * 100).toFixed(1)}% vs ${(minRate * 100).toFixed(1)}%) — check your data.`,
        });
      }
    }

    // Warning: units balance (any variation < 10% of total)
    if (totalUnits > 0) {
      for (const v of summary.variations) {
        if (v.units > 0 && v.units / totalUnits < 0.1) {
          issues.push({
            type: 'warning',
            metricId: summary.metricId,
            message: `${summary.metricName}: variation "${v.variationKey}" has only ${((v.units / totalUnits) * 100).toFixed(1)}% of total units — likely a mapping error.`,
          });
        }
      }
    }
  }

  return issues;
}

export function MetricValidationPanel({ summaries, metrics, onAcknowledge }: MetricValidationPanelProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (summaries.length === 0) return null;

  const issues = computeIssues(summaries, metrics);
  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const hasIssues = issues.length > 0;

  function handleAcknowledge() {
    setAcknowledged(true);
    onAcknowledge?.();
  }

  return (
    <div className="mb-3">
      <h5>Data Validation</h5>

      {/* Summary table */}
      <div className="table-responsive mb-3">
        <table className="table table-sm table-bordered align-middle">
          <thead>
            <tr>
              <th>Metric</th>
              {summaries[0]?.variations.map((v) => (
                <th key={v.variationKey} className="text-center">{v.variationKey}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const metricIssueIds = new Set(
                issues.filter((i) => i.metricId === s.metricId).map((i) => i.type),
              );
              const rowClass = metricIssueIds.has('error')
                ? 'table-danger'
                : metricIssueIds.has('warning')
                  ? 'table-warning'
                  : '';

              return (
                <tr key={s.metricId} className={rowClass}>
                  <td className="fw-medium">{s.metricName}</td>
                  {s.variations.map((v) => (
                    <td key={v.variationKey} className="text-center small">
                      {v.units > 0 ? (
                        <>
                          {(v.rate * 100).toFixed(2)}%
                          <br />
                          <span className="text-muted">n={v.units.toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="text-danger">no data</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Issues */}
      {errors.length > 0 && (
        <div className="alert alert-danger py-2">
          <strong>Errors (blocking):</strong>
          <ul className="mb-0 mt-1">
            {errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="alert alert-warning py-2">
          <strong>Warnings:</strong>
          <ul className="mb-0 mt-1">
            {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
          {!acknowledged && (
            <button
              className="btn btn-sm btn-outline-warning mt-2"
              onClick={handleAcknowledge}
            >
              I&apos;ve reviewed these warnings — proceed
            </button>
          )}
        </div>
      )}

      {!hasIssues && (
        <div className="alert alert-success py-2">
          All metrics look good — no data quality issues detected.
        </div>
      )}
    </div>
  );
}

/** Returns true if there are blocking errors that should prevent submission. */
export function hasBlockingValidationErrors(summaries: MetricSummary[], metrics: Metric[]): boolean {
  return computeIssues(summaries, metrics).some((i) => i.type === 'error');
}
