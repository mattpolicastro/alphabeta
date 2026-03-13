/**
 * Transforms a flat AnalysisResponse into the grouped MetricResult[] format
 * stored in ExperimentResult.perMetricResults.
 *
 * The stats engine (both paths) returns results only for treatment variations
 * (each compared against control). This transformer:
 * 1. Groups MetricVariationResult[] by metricId
 * 2. Synthesizes a control VariationResult from the request data
 * 3. Maps the flat response fields to the richer VariationResult schema
 */

import type { AnalysisRequest, AnalysisResponse, MetricVariationResult } from './types';
import type { MetricResult, VariationResult } from '@/lib/db/schema';

export function transformResponse(
  response: AnalysisResponse,
  request: AnalysisRequest,
): MetricResult[] {
  const controlVariation = request.variations.find((v) => v.isControl);
  if (!controlVariation) {
    throw new Error('No control variation found in request');
  }

  const overallData = request.data.overall;
  const controlData = overallData[controlVariation.key];

  // Group response results by metricId
  const byMetric = new Map<string, MetricVariationResult[]>();
  for (const mvr of response.overall) {
    const existing = byMetric.get(mvr.metricId) ?? [];
    existing.push(mvr);
    byMetric.set(mvr.metricId, existing);
  }

  const results: MetricResult[] = [];

  for (const metric of request.metrics) {
    const treatmentResults = byMetric.get(metric.id) ?? [];
    const variationResults: VariationResult[] = [];

    // Synthesize control row from request data
    if (controlData) {
      const controlUnits = controlData.units;
      const controlTotal = controlData.metrics[metric.id] ?? 0;
      const controlRate = controlUnits > 0 ? controlTotal / controlUnits : 0;

      variationResults.push({
        variationId: controlVariation.id,
        users: controlUnits,
        mean: controlRate,
        stddev: controlUnits > 0 ? Math.sqrt(controlRate * (1 - controlRate) / controlUnits) : 0,
        relativeUplift: 0,
        absoluteUplift: 0,
        significant: false,
        cupedApplied: false,
      });
    }

    // Map each treatment result
    for (const mvr of treatmentResults) {
      variationResults.push(mapToVariationResult(mvr));
    }

    results.push({
      metricId: metric.id,
      variationResults,
    });
  }

  return results;
}

function mapToVariationResult(mvr: MetricVariationResult): VariationResult {
  return {
    variationId: mvr.variationId,
    users: mvr.units,
    mean: mvr.rate,
    stddev: mvr.units > 0 ? Math.sqrt(mvr.rate * (1 - mvr.rate) / mvr.units) : 0,
    chanceToBeatControl: mvr.chanceToBeatControl,
    expectedLoss: mvr.expectedLoss,
    credibleIntervalLower: mvr.credibleIntervalLower,
    credibleIntervalUpper: mvr.credibleIntervalUpper,
    pValue: mvr.pValue,
    confidenceIntervalLower: mvr.confidenceIntervalLower,
    confidenceIntervalUpper: mvr.confidenceIntervalUpper,
    relativeUplift: mvr.relativeUplift,
    absoluteUplift: mvr.absoluteUplift,
    significant: mvr.significant,
    cupedApplied: false,
  };
}
