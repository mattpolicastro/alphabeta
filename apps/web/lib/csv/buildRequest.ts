/**
 * Transforms parsed + mapped CSV data into an AnalysisRequest payload.
 * See requirements.md Sections 5.4 and 6.3.
 */

import type { AnalysisRequest, VariationData } from '@/lib/stats/types';
import type { Experiment, Metric } from '@/lib/db/schema';
import type { ParsedCSV } from './parser';

export interface ColumnMappingConfig {
  [columnName: string]: {
    role: 'dimension' | 'metric' | 'ignore';
    metricId?: string;
  };
}

/**
 * Build an AnalysisRequest from parsed CSV data, experiment config, and column mapping.
 *
 * Steps:
 * 1. Filter rows to the current experiment_id
 * 2. Identify dimension and metric columns from mapping
 * 3. Build overall data: rows where all dimension columns = "all"
 * 4. Build slices data: rows where exactly one dimension has a real value
 * 5. For each metric, apply normalization based on Metric.normalization
 */
export function buildAnalysisRequest(
  parsed: ParsedCSV,
  experiment: Experiment,
  metrics: Metric[],
  mapping: ColumnMappingConfig,
  multipleExposureCount: number = 0,
): AnalysisRequest {
  const experimentId = experiment.id;

  // Filter rows to this experiment
  const rows = parsed.rows.filter(
    (r) => r['experiment_id']?.trim() === experimentId,
  );
  if (rows.length === 0) {
    throw new Error(
      `No rows found for experiment_id "${experimentId}". Check that the CSV contains matching data.`,
    );
  }

  // Identify mapped columns by role
  const dimensionCols: string[] = [];
  const metricCols: { column: string; metricId: string }[] = [];

  for (const [col, config] of Object.entries(mapping)) {
    if (config.role === 'dimension') dimensionCols.push(col);
    if (config.role === 'metric' && config.metricId) {
      metricCols.push({ column: col, metricId: config.metricId });
    }
  }

  if (metricCols.length === 0) {
    throw new Error('At least one metric column must be mapped.');
  }

  // Build metric lookup for normalization
  const metricById = new Map(metrics.map((m) => [m.id, m]));

  // Variation keys from experiment config (normalized)
  const variationKeys = experiment.variations.map((v) => v.key);

  // Helper: extract variation data from a set of rows
  function extractVariationData(
    rowSubset: Record<string, string>[],
  ): Record<string, VariationData> {
    const result: Record<string, VariationData> = {};

    for (const varKey of variationKeys) {
      const varRows = rowSubset.filter(
        (r) => r['variation_id']?.trim().toLowerCase() === varKey.toLowerCase(),
      );

      if (varRows.length === 0) continue;

      // Use first matching row (should be exactly one per variation per slice)
      const row = varRows[0];
      const units = Number(row['units']) || 0;

      const metricValues: Record<string, number> = {};
      for (const { column, metricId } of metricCols) {
        const rawValue = Number(row[column]) || 0;
        const metricDef = metricById.get(metricId);

        if (metricDef?.normalization === 'pre_normalized') {
          // Value is already a rate — multiply back by units so the stats engine
          // can divide by units consistently (it always does total / units)
          metricValues[metricId] = rawValue * units;
        } else {
          // raw_total: use as-is
          metricValues[metricId] = rawValue;
        }
      }

      result[varKey] = { units, metrics: metricValues };
    }

    return result;
  }

  // Overall: rows where all dimension columns = "all"
  const overallRows = rows.filter((r) =>
    dimensionCols.every(
      (d) => r[d]?.trim().toLowerCase() === 'all',
    ),
  );
  const overall = extractVariationData(overallRows);

  // Slices: for each dimension, group by dimension value (excluding "all")
  const slices: AnalysisRequest['data']['slices'] = {};
  for (const dim of dimensionCols) {
    const dimValues = new Set<string>();
    for (const row of rows) {
      const val = row[dim]?.trim().toLowerCase();
      if (val && val !== 'all') dimValues.add(val);
    }

    if (dimValues.size === 0) continue;

    slices[dim] = {};
    for (const val of dimValues) {
      // Slice rows: this dimension = val, all other dimensions = "all"
      const sliceRows = rows.filter((r) => {
        if (r[dim]?.trim().toLowerCase() !== val) return false;
        return dimensionCols
          .filter((d) => d !== dim)
          .every((d) => r[d]?.trim().toLowerCase() === 'all');
      });

      slices[dim][val] = extractVariationData(sliceRows);
    }
  }

  // Build the request metric list
  const requestMetrics = metricCols.map(({ metricId }) => {
    const metricDef = metricById.get(metricId);
    return {
      id: metricId,
      name: metricDef?.name ?? metricId,
      isGuardrail: experiment.guardrailMetricIds.includes(metricId),
    };
  });

  // Build the request variation list
  const requestVariations = experiment.variations.map((v) => ({
    id: v.id,
    key: v.key,
    weight: v.weight,
    isControl: v.isControl,
  }));

  return {
    engine: experiment.statsEngine,
    correction: experiment.multipleComparisonCorrection,
    alpha: 0.05, // TODO: read from settings
    srmThreshold: 0.001, // TODO: read from settings
    variations: requestVariations,
    metrics: requestMetrics,
    data: { overall, slices },
    multipleExposureCount,
  };
}
