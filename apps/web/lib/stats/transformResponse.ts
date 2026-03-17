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

export interface TransformResult {
  overall: MetricResult[];
  slices: Record<string, Record<string, MetricResult[]>>;
}

export function transformResponse(
  response: AnalysisResponse,
  request: AnalysisRequest,
): TransformResult {
  const controlVariation = request.variations.find((v) => v.isControl);
  if (!controlVariation) {
    throw new Error('No control variation found in request');
  }

  const overall = transformSlice(
    response.overall,
    request,
    controlVariation,
    request.data.overall[controlVariation.key],
  );

  const slices: Record<string, Record<string, MetricResult[]>> = {};
  for (const [dimName, dimValues] of Object.entries(response.slices)) {
    slices[dimName] = {};
    for (const [dimValue, mvrList] of Object.entries(dimValues)) {
      const sliceControlData = request.data.slices[dimName]?.[dimValue]?.[controlVariation.key];
      slices[dimName][dimValue] = transformSlice(
        mvrList,
        request,
        controlVariation,
        sliceControlData,
      );
    }
  }

  return { overall, slices };
}

function transformSlice(
  mvrList: MetricVariationResult[],
  request: AnalysisRequest,
  controlVariation: AnalysisRequest['variations'][0],
  controlData: { units: number; metrics: Record<string, number>; continuousMetrics?: Record<string, { mean: number; variance: number; n: number }> } | undefined,
): MetricResult[] {
  // Group response results by metricId
  const byMetric = new Map<string, MetricVariationResult[]>();
  for (const mvr of mvrList) {
    const existing = byMetric.get(mvr.metricId) ?? [];
    existing.push(mvr);
    byMetric.set(mvr.metricId, existing);
  }

  const results: MetricResult[] = [];

  for (const metric of request.metrics) {
    const isContinuous = metric.metricType === 'continuous';
    const treatmentResults = byMetric.get(metric.id) ?? [];
    const variationResults: VariationResult[] = [];

    // Synthesize control row from request data
    if (controlData) {
      if (isContinuous) {
        const cont = controlData.continuousMetrics?.[metric.id];
        const controlMean = cont?.mean ?? 0;
        const controlN = cont?.n ?? 0;
        const controlVar = cont?.variance ?? 0;

        variationResults.push({
          variationId: controlVariation.id,
          users: controlN,
          mean: controlMean,
          stddev: controlN > 0 ? Math.sqrt(controlVar / controlN) : 0,
          relativeUplift: 0,
          absoluteUplift: 0,
          significant: false,
          cupedApplied: false,
        });
      } else {
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
    }

    // Map each treatment result
    const baselineUnits = controlData?.units ?? 0;
    for (const mvr of treatmentResults) {
      variationResults.push(mapToVariationResult(mvr, baselineUnits, isContinuous));
    }

    results.push({
      metricId: metric.id,
      variationResults,
    });
  }

  return results;
}

function mapToVariationResult(mvr: MetricVariationResult, baselineUnits: number, isContinuous: boolean = false): VariationResult {
  // For continuous metrics, use the mean field directly; stddev is not derivable from rate
  const displayMean = isContinuous ? (mvr.mean ?? mvr.rate) : mvr.rate;
  const stddev = isContinuous
    ? 0 // stddev for continuous treatment rows not available from engine output
    : (mvr.units > 0 ? Math.sqrt(mvr.rate * (1 - mvr.rate) / mvr.units) : 0);

  return {
    variationId: mvr.variationId,
    users: mvr.units,
    mean: displayMean,
    stddev,
    chanceToBeatControl: mvr.chanceToBeatControl,
    expectedLoss: mvr.expectedLoss,
    credibleIntervalLower: mvr.credibleIntervalLower,
    credibleIntervalUpper: mvr.credibleIntervalUpper,
    pValue: mvr.pValue,
    confidenceIntervalLower: mvr.confidenceIntervalLower,
    confidenceIntervalUpper: mvr.confidenceIntervalUpper,
    relativeUplift: mvr.relativeUplift,
    absoluteUplift: mvr.absoluteUplift,
    scaledImpact: baselineUnits > 0 ? mvr.absoluteUplift * baselineUnits : undefined,
    significant: mvr.significant,
    cupedApplied: false,
  };
}
