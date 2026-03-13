'use client';

/**
 * Pre-submission metric validation panel.
 * Computes lightweight per-metric summary statistics and displays warnings.
 * See requirements.md Section 5.2a.
 */

import type { Metric } from '@/lib/db/schema';

interface MetricSummary {
  metricId: string;
  metricName: string;
  variations: {
    variationKey: string;
    units: number;
    total: number;
    rate: number;
  }[];
}

interface MetricValidationPanelProps {
  summaries: MetricSummary[];
  metrics: Metric[];
}

export function MetricValidationPanel({ summaries, metrics }: MetricValidationPanelProps) {
  // TODO: render compact table: one row per metric, one column per variation, showing rate and units
  // TODO: compute and display warnings per Section 5.2a:
  //   - Warn if any variation has fewer units than metric.minSampleSize
  //   - Warn if metric total is 0 across all variations
  //   - Warn if rate = 0% or rate = 100% (degenerate)
  //   - Warn if control rate differs from treatment rate by > 5×
  //   - Warn if any variation has < 10% of total units
  // TODO: blocking errors (e.g. zero units) prevent submission
  // TODO: warnings are non-blocking with acknowledgement

  void summaries;
  void metrics;

  return (
    <div>
      <h3>Data Validation</h3>
      {/* TODO: summary table */}
      {/* TODO: warnings list */}
      <p className="text-muted">MetricValidationPanel component stub</p>
    </div>
  );
}
