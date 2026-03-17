/**
 * Generates a template CSV pre-filled with the experiment's variation keys
 * and metric column headers. Includes example rows so the user can see the
 * expected format and fill in real data.
 */

import type { Experiment, Metric } from '@/lib/db/schema';
import { SCHEMA_PREFIX } from './parser';

export type TemplateFormat = 'agg-v1' | 'row-v1';

export function generateTemplateCSV(
  experiment: Experiment,
  metrics: Metric[],
  format: TemplateFormat = 'agg-v1',
): string {
  const variationKeys = experiment.variations.map((v) => v.key);
  const metricNames = metrics.map((m) => m.name.toLowerCase().replace(/\s+/g, '_'));

  if (format === 'row-v1') {
    return generateRowLevelTemplate(experiment.id, variationKeys, metricNames);
  }

  // agg-v1 pre-aggregated template
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

  const lines = [
    `${SCHEMA_PREFIX}agg-v1`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ];

  return lines.join('\n') + '\n';
}

function generateRowLevelTemplate(
  experimentId: string,
  variationKeys: string[],
  metricNames: string[],
): string {
  const headers = ['experiment_id', 'variation_id', 'user_id', ...metricNames];
  const rows: string[][] = [];

  // 3 example rows per variation
  let userNum = 1;
  for (const varKey of variationKeys) {
    for (let i = 0; i < 3; i++) {
      rows.push([
        experimentId,
        varKey,
        `user_${String(userNum++).padStart(3, '0')}`,
        ...metricNames.map(() => '0'),
      ]);
    }
  }

  const lines = [
    `${SCHEMA_PREFIX}row-v1`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ];

  return lines.join('\n') + '\n';
}

export function downloadTemplateCSV(
  experiment: Experiment,
  metrics: Metric[],
  format: TemplateFormat = 'agg-v1',
): void {
  const csv = generateTemplateCSV(experiment, metrics, format);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${experiment.id}-${format}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
