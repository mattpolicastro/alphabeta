'use client';

/**
 * Results table — one row per metric with uplift, evidence, and intervals.
 * See requirements.md Section 7.2 Results Table.
 */

import type { ExperimentResult } from '@/lib/db/schema';
import type { Metric } from '@/lib/db/schema';

interface ResultsTableProps {
  result: ExperimentResult;
  metrics: Metric[];
}

export function ResultsTable({ result, metrics }: ResultsTableProps) {
  // TODO: render table with columns per Section 7.2:
  //   Metric | Baseline | Variation(s) | Relative Uplift | Absolute Uplift | Evidence | Interval
  // TODO: toggle controls: Relative Lift / Absolute Lift / Scaled Impact
  // TODO: variation filter for multi-variant experiments
  // TODO: expand row → violin plot (Bayesian) or CI bar chart (Frequentist) + debug panel
  // TODO: color coding: green for significant positive, red for significant negative
  // TODO: direction arrows based on metric.higherIsBetter
  // TODO: annotation icons on rows that have attached notes

  void result;
  void metrics;

  return (
    <div>
      {/* TODO: table controls */}
      {/* TODO: results table */}
      <p className="text-muted">ResultsTable component stub</p>
    </div>
  );
}
