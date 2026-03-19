/**
 * Exports experiment analysis results as a downloadable CSV file.
 */

import type { Experiment, ExperimentResult, Metric } from '@/lib/db/schema';

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '';
  return String(n);
}

export function generateResultsCSV(
  result: ExperimentResult,
  experiment: Experiment,
  metrics: Metric[],
): string {
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const variationById = new Map(experiment.variations.map((v) => [v.id, v]));
  const isBayesian = experiment.statsEngine === 'bayesian';

  const headers = [
    'Metric',
    'Metric Type',
    'Variation',
    'Units',
    'Mean',
    'Relative Uplift',
    'Absolute Uplift',
    'Evidence',
    'CI Lower',
    'CI Upper',
    'Significant',
  ];

  const rows: string[][] = [];

  for (const mr of result.perMetricResults) {
    const metric = metricById.get(mr.metricId);
    const metricName = metric?.name ?? mr.metricId;
    const metricType = metric?.type ?? '';

    for (const vr of mr.variationResults) {
      const variation = variationById.get(vr.variationId);
      const variationName = variation?.name ?? vr.variationId;

      const evidence = isBayesian
        ? formatNumber(vr.chanceToBeatControl)
        : formatNumber(vr.pValue);

      const ciLower = isBayesian
        ? formatNumber(vr.credibleIntervalLower)
        : formatNumber(vr.confidenceIntervalLower);

      const ciUpper = isBayesian
        ? formatNumber(vr.credibleIntervalUpper)
        : formatNumber(vr.confidenceIntervalUpper);

      rows.push([
        escapeCSVField(metricName),
        metricType,
        escapeCSVField(variationName),
        String(vr.users),
        formatNumber(vr.mean),
        formatNumber(vr.relativeUplift),
        formatNumber(vr.absoluteUplift),
        evidence,
        ciLower,
        ciUpper,
        vr.significant ? 'Yes' : 'No',
      ]);
    }
  }

  const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
  return lines.join('\n') + '\n';
}

export function exportResultsCSV(
  result: ExperimentResult,
  experiment: Experiment,
  metrics: Metric[],
): void {
  const csv = generateResultsCSV(result, experiment, metrics);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `results-${experiment.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
