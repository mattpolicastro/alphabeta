/**
 * Generates a template CSV pre-filled with the experiment's variation keys
 * and metric column headers. Includes example rows so the user can see the
 * expected format and fill in real data.
 */

import type { Experiment, Metric } from '@/lib/db/schema';
import { SCHEMA_VERSION_PREFIX, CURRENT_SCHEMA_VERSION } from './parser';

export function generateTemplateCSV(
  experiment: Experiment,
  metrics: Metric[],
): string {
  const variationKeys = experiment.variations.map((v) => v.key);
  const metricNames = metrics.map((m) => m.name.toLowerCase().replace(/\s+/g, '_'));

  // Build header
  const dimensions = ['dimension_1'];
  const headers = ['experiment_id', 'variation_id', ...dimensions, 'units', ...metricNames];

  const rows: string[][] = [];

  // Overall rows (all dimensions = "all")
  for (const varKey of variationKeys) {
    rows.push([experiment.id, varKey, 'all', '', ...metricNames.map(() => '')]);
  }

  // One example dimension slice
  for (const varKey of variationKeys) {
    rows.push([experiment.id, varKey, 'example_slice', '', ...metricNames.map(() => '')]);
  }

  // Assemble CSV
  const lines = [
    `${SCHEMA_VERSION_PREFIX}${CURRENT_SCHEMA_VERSION}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ];

  return lines.join('\n') + '\n';
}

export function downloadTemplateCSV(
  experiment: Experiment,
  metrics: Metric[],
): void {
  const csv = generateTemplateCSV(experiment, metrics);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${experiment.id}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
