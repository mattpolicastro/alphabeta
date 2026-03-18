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
 * Metric types that require mean/variance analysis (SampleMeanStatistic path).
 * These cannot be properly analyzed with ProportionStatistic because their variance
 * is not derivable from the rate alone — they need per-user data (row-level CSV).
 */
const CONTINUOUS_METRIC_TYPES: ReadonlySet<string> = new Set(['continuous', 'revenue']);

function isContinuousMetric(metricType: string | undefined): boolean {
  return CONTINUOUS_METRIC_TYPES.has(metricType ?? '');
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
  if (parsed.schema === 'row-v1' && parsed.rowLevelAggregates) {
    return buildAnalysisRequestV2(parsed, experiment, metrics, mapping, multipleExposureCount);
  }

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

  // Identify mapped columns by role, filtering out stale metric references
  // (e.g., a saved mapping referencing a metric that was removed from the experiment)
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const dimensionCols: string[] = [];
  const metricCols: { column: string; metricId: string }[] = [];

  for (const [col, config] of Object.entries(mapping)) {
    if (config.role === 'dimension') dimensionCols.push(col);
    if (config.role === 'metric' && config.metricId && metricById.has(config.metricId)) {
      metricCols.push({ column: col, metricId: config.metricId });
    }
  }

  if (metricCols.length === 0) {
    throw new Error('At least one metric column must be mapped.');
  }

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

/**
 * Build a merged AnalysisRequest from up to two data sources:
 * - Aggregated CSV (proportion/count/revenue metrics with dimension slices)
 * - Row-level CSV (any metric type, overall only)
 *
 * If a metric appears in both sources, the row-level data wins (more granular).
 * Units for SRM come from whichever source provides overall data for that variation;
 * if both provide data, the aggregated source's units are used (explicit sample sizes).
 */
export function buildMergedAnalysisRequest(
  aggParsed: ParsedCSV | null,
  aggMapping: ColumnMappingConfig,
  rowLevelParsed: ParsedCSV | null,
  rowLevelMapping: ColumnMappingConfig,
  experiment: Experiment,
  metrics: Metric[],
  multipleExposureCount: number = 0,
): AnalysisRequest {
  // If only one source, delegate directly
  if (!rowLevelParsed && aggParsed) {
    return buildAnalysisRequest(aggParsed, experiment, metrics, aggMapping, multipleExposureCount);
  }
  if (!aggParsed && rowLevelParsed) {
    return buildAnalysisRequest(rowLevelParsed, experiment, metrics, rowLevelMapping, multipleExposureCount);
  }
  if (!aggParsed && !rowLevelParsed) {
    throw new Error('At least one data source must be provided.');
  }

  // Both sources present — build each independently and merge
  const aggRequest = buildAnalysisRequest(aggParsed!, experiment, metrics, aggMapping, multipleExposureCount);
  const rowRequest = buildAnalysisRequestV2(rowLevelParsed!, experiment, metrics, rowLevelMapping, multipleExposureCount);

  // Collect metric IDs from each source
  const aggMetricIds = new Set(aggRequest.metrics.map((m) => m.id));
  const rowMetricIds = new Set(rowRequest.metrics.map((m) => m.id));

  // Merged metrics list: all from agg + row-level-only metrics
  // If a metric is in both, keep the row-level version (it has metricType info)
  const mergedMetrics = [
    ...aggRequest.metrics.filter((m) => !rowMetricIds.has(m.id)),
    ...rowRequest.metrics,
  ];

  // Merge overall variation data
  const variationKeys = experiment.variations.map((v) => v.key);
  const mergedOverall: Record<string, VariationData> = {};

  for (const varKey of variationKeys) {
    const aggVar = aggRequest.data.overall[varKey];
    const rowVar = rowRequest.data.overall[varKey];

    if (!aggVar && !rowVar) continue;

    // Start from agg data (has explicit units and proportion metrics)
    const mergedPropMetrics: Record<string, number> = {};
    const mergedContMetrics: Record<string, { mean: number; variance: number; n: number }> = {};

    // Proportion metrics from agg (skip any that row-level also covers)
    if (aggVar) {
      for (const [metricId, value] of Object.entries(aggVar.metrics)) {
        if (!rowMetricIds.has(metricId)) {
          mergedPropMetrics[metricId] = value;
        }
      }
    }

    // Proportion metrics from row-level
    if (rowVar) {
      for (const [metricId, value] of Object.entries(rowVar.metrics)) {
        mergedPropMetrics[metricId] = value;
      }
      // Continuous metrics from row-level
      if (rowVar.continuousMetrics) {
        for (const [metricId, stats] of Object.entries(rowVar.continuousMetrics)) {
          mergedContMetrics[metricId] = stats;
        }
      }
    }

    mergedOverall[varKey] = {
      units: aggVar?.units ?? rowVar!.units,
      metrics: mergedPropMetrics,
      ...(Object.keys(mergedContMetrics).length > 0 ? { continuousMetrics: mergedContMetrics } : {}),
    };
  }

  // Merge slices from both sources. Agg slices use dimension names from the
  // aggregated CSV; row-level slices use column names classified as dimensions
  // by the csv-worker. If the same dimension name appears in both, merge the
  // dimension values (row-level wins on overlap).
  const mergedSlices: AnalysisRequest['data']['slices'] = { ...aggRequest.data.slices };
  for (const [dimName, dimValues] of Object.entries(rowRequest.data.slices)) {
    if (!mergedSlices[dimName]) {
      mergedSlices[dimName] = dimValues;
    } else {
      mergedSlices[dimName] = { ...mergedSlices[dimName], ...dimValues };
    }
  }

  return {
    engine: experiment.statsEngine,
    correction: experiment.multipleComparisonCorrection,
    alpha: 0.05,
    srmThreshold: 0.001,
    variations: aggRequest.variations,
    metrics: mergedMetrics,
    data: {
      overall: mergedOverall,
      slices: mergedSlices,
    },
    multipleExposureCount,
  };
}

/**
 * Build an AnalysisRequest from row-level CSV aggregates.
 * Supports both overall and per-dimension-slice data from the CSV worker.
 */
function buildAnalysisRequestV2(
  parsed: ParsedCSV,
  experiment: Experiment,
  metrics: Metric[],
  mapping: ColumnMappingConfig,
  multipleExposureCount: number,
): AnalysisRequest {
  const v2Agg = parsed.rowLevelAggregates!;

  // Identify mapped columns by role, filtering out stale metric references
  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const metricCols: { column: string; metricId: string }[] = [];
  const dimensionCols: string[] = [];
  for (const [col, config] of Object.entries(mapping)) {
    if (config.role === 'metric' && config.metricId && metricById.has(config.metricId)) {
      metricCols.push({ column: col, metricId: config.metricId });
    }
    if (config.role === 'dimension') {
      dimensionCols.push(col);
    }
  }
  if (metricCols.length === 0) {
    throw new Error('At least one metric column must be mapped.');
  }
  const variationKeys = experiment.variations.map((v) => v.key);

  // Helper: build variation data from a set of aggregates (reused for overall + slices)
  function extractVariationDataFromAgg(
    aggByVariation: Record<string, Record<string, { mean: number; variance: number; n: number }>>,
  ): Record<string, VariationData> {
    const result: Record<string, VariationData> = {};
    for (const varKey of variationKeys) {
      const normalizedKey = varKey.toLowerCase();
      const varAgg = aggByVariation[normalizedKey];
      if (!varAgg) continue;

      const firstMetricCol = metricCols[0].column;
      const n = varAgg[firstMetricCol]?.n ?? 0;

      const metricValues: Record<string, number> = {};
      const continuousMetrics: Record<string, { mean: number; variance: number; n: number }> = {};

      for (const { column, metricId } of metricCols) {
        const agg = varAgg[column];
        if (!agg) continue;

        const metricDef = metricById.get(metricId);
        if (isContinuousMetric(metricDef?.type)) {
          continuousMetrics[metricId] = { mean: agg.mean, variance: agg.variance, n: agg.n };
        } else {
          metricValues[metricId] = agg.mean * agg.n;
        }
      }

      result[varKey] = {
        units: n,
        metrics: metricValues,
        ...(Object.keys(continuousMetrics).length > 0 ? { continuousMetrics } : {}),
      };
    }
    return result;
  }

  // Overall
  const overall = extractVariationDataFromAgg(v2Agg);

  // Dimension slices
  const slices: AnalysisRequest['data']['slices'] = {};
  if (parsed.rowLevelSliceAggregates && dimensionCols.length > 0) {
    for (const dim of dimensionCols) {
      const dimData = parsed.rowLevelSliceAggregates[dim];
      if (!dimData) continue;
      slices[dim] = {};
      for (const [dimVal, variationAggs] of Object.entries(dimData)) {
        slices[dim][dimVal] = extractVariationDataFromAgg(variationAggs);
      }
    }
  }

  const requestMetrics = metricCols.map(({ metricId }) => {
    const metricDef = metricById.get(metricId);
    return {
      id: metricId,
      name: metricDef?.name ?? metricId,
      isGuardrail: experiment.guardrailMetricIds.includes(metricId),
      metricType: (isContinuousMetric(metricDef?.type) ? 'continuous' : 'proportion') as 'proportion' | 'continuous',
    };
  });

  const requestVariations = experiment.variations.map((v) => ({
    id: v.id,
    key: v.key,
    weight: v.weight,
    isControl: v.isControl,
  }));

  return {
    engine: experiment.statsEngine,
    correction: experiment.multipleComparisonCorrection,
    alpha: 0.05,
    srmThreshold: 0.001,
    variations: requestVariations,
    metrics: requestMetrics,
    data: { overall, slices },
    multipleExposureCount,
  };
}
