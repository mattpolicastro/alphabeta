/**
 * Integration-ish test for the CSV upload flow.
 *
 * Exercises the composed pipeline used by UploadView without mounting the
 * component: parseCSVFile → autoClassifyColumns → validateCSV →
 * buildMergedAnalysisRequest → (mocked) runAnalysis → transformResponse →
 * saveResult. IndexedDB is backed by fake-indexeddb (configured in
 * jest.setup.ts). The stats worker boundary is mocked — this test does not
 * execute any Pyodide/WASM code.
 */

import { nanoid } from 'nanoid';
import {
  parseCSVFile,
  validateCSV,
  autoClassifyColumns,
  getColumnFingerprint,
  type ParsedCSV,
  type ValidationError,
} from '@/lib/csv';
import {
  buildMergedAnalysisRequest,
  type ColumnMappingConfig,
} from '@/lib/csv/buildRequest';
import { transformResponse } from '@/lib/stats/transformResponse';
import type { AnalysisRequest, AnalysisResponse } from '@/lib/stats/types';
import {
  createExperiment,
  createMetric,
  saveResult,
  saveColumnMapping,
  getColumnMapping,
  getLatestResult,
  getResultsForExperiment,
  db,
  type Experiment,
  type Metric,
  type ExperimentResult,
} from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock runAnalysis boundary: produce a canned response shaped to the request. */
function fakeRunAnalysis(request: AnalysisRequest): AnalysisResponse {
  const overall = request.metrics.flatMap((m) =>
    request.variations.map((v) => ({
      metricId: m.id,
      variationId: v.id,
      units: request.data.overall[v.key]?.units ?? 0,
      rate: 0.1,
      relativeUplift: v.isControl ? 0 : 0.05,
      absoluteUplift: v.isControl ? 0 : 0.005,
      significant: false,
    })),
  );
  return {
    srmPValue: 0.5,
    srmFlagged: false,
    multipleExposureFlagged: false,
    overall,
    slices: {},
    warnings: [],
  };
}

function makeCSVFile(contents: string, name = 'upload.csv'): File {
  return new File([contents], name, { type: 'text/csv' });
}

async function seedExperiment(
  variationKeys: string[],
  metricIds: string[],
): Promise<Experiment> {
  return createExperiment({
    name: 'Upload Flow Test',
    hypothesis: 'Treatment lifts conversions',
    status: 'running',
    variations: variationKeys.map((key, i) => ({
      id: `var-${i}`,
      key,
      name: key,
      weight: 1 / variationKeys.length,
      isControl: i === 0,
    })),
    primaryMetricIds: metricIds,
    guardrailMetricIds: [],
    statsEngine: 'frequentist',
    multipleComparisonCorrection: 'none',
    cuped: false,
    tags: [],
  });
}

async function seedMetric(overrides: Partial<Omit<Metric, 'id' | 'createdAt'>> = {}): Promise<Metric> {
  return createMetric({
    name: 'Purchases',
    type: 'count',
    normalization: 'raw_total',
    higherIsBetter: true,
    isGuardrail: false,
    tags: [],
    ...overrides,
  });
}

async function runFullFlow(
  experiment: Experiment,
  metrics: Metric[],
  parsed: ParsedCSV,
  mapping: ColumnMappingConfig,
): Promise<ExperimentResult> {
  const request = buildMergedAnalysisRequest(
    parsed,
    mapping,
    null,
    {},
    experiment,
    metrics,
  );
  const response = fakeRunAnalysis(request);
  const transformed = transformResponse(response, request);
  const record: ExperimentResult = {
    id: nanoid(),
    experimentId: experiment.id,
    computedAt: Date.now(),
    srmPValue: response.srmPValue,
    srmFlagged: response.srmFlagged,
    multipleExposureCount: request.multipleExposureCount,
    multipleExposureFlagged: response.multipleExposureFlagged,
    perMetricResults: transformed.overall,
    sliceResults:
      Object.keys(transformed.slices).length > 0 ? transformed.slices : undefined,
    rawRequest: request,
    status: 'complete',
  };
  await saveResult(record);
  return record;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Upload flow integration', () => {
  beforeEach(async () => {
    // Wipe fake-indexeddb between tests
    await db.delete();
    await db.open();
  });

  it('happy path: parses an agg-v1 CSV, auto-classifies columns, runs analysis, persists a result', async () => {
    const metric = await seedMetric({ name: 'Purchases' });
    const experiment = await seedExperiment(['control', 'variant_a'], [metric.id]);

    const csv = [
      '#schema:agg-v1',
      'experiment_id,variation_id,units,purchases',
      `${experiment.id},control,1000,100`,
      `${experiment.id},variant_a,950,130`,
    ].join('\n');

    const parsed = await parseCSVFile(makeCSVFile(csv));
    expect(parsed.schema).toBe('agg-v1');
    expect(parsed.rows).toHaveLength(2);

    const classification = autoClassifyColumns(parsed.headers, parsed.rows, 'agg-v1');
    expect(classification['experiment_id']).toBe('reserved');
    expect(classification['variation_id']).toBe('reserved');
    expect(classification['units']).toBe('reserved');
    expect(classification['purchases']).toBe('metric');

    const validationErrors = validateCSV(parsed, experiment.variations.map((v) => v.key));
    expect(validationErrors.filter((e: ValidationError) => e.type === 'error')).toEqual([]);

    const mapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: metric.id },
    };

    const result = await runFullFlow(experiment, [metric], parsed, mapping);
    expect(result.status).toBe('complete');

    const persisted = await getLatestResult(experiment.id);
    expect(persisted).toBeDefined();
    expect(persisted!.id).toBe(result.id);
    expect(persisted!.perMetricResults).toHaveLength(1);
    expect(persisted!.perMetricResults[0].metricId).toBe(metric.id);
    const variationIds = persisted!.perMetricResults[0].variationResults.map(
      (v) => v.variationId,
    );
    expect(variationIds).toContain('var-0');
    expect(variationIds).toContain('var-1');
  });

  it('persists column mapping keyed by fingerprint and reuses it on re-upload of the same schema', async () => {
    const metric = await seedMetric();
    const experiment = await seedExperiment(['control', 'variant_a'], [metric.id]);

    const csv = [
      '#schema:agg-v1',
      'experiment_id,variation_id,units,purchases',
      `${experiment.id},control,1000,100`,
      `${experiment.id},variant_a,950,130`,
    ].join('\n');

    const parsed = await parseCSVFile(makeCSVFile(csv));
    const fingerprint = getColumnFingerprint(parsed.headers);

    const mapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: metric.id },
    };
    await saveColumnMapping(experiment.id, fingerprint, mapping);

    // Re-upload the same file — fingerprint matches, mapping is reused.
    const parsed2 = await parseCSVFile(makeCSVFile(csv));
    const fingerprint2 = getColumnFingerprint(parsed2.headers);
    expect(fingerprint2).toBe(fingerprint);
    const reused = await getColumnMapping(experiment.id, fingerprint2);
    expect(reused).toBeDefined();
    expect(reused!.mapping).toEqual(mapping);

    // Re-upload with a different column set — fingerprint differs, no saved mapping.
    const csvDifferent = [
      '#schema:agg-v1',
      'experiment_id,variation_id,units,purchases,revenue',
      `${experiment.id},control,1000,100,5000`,
      `${experiment.id},variant_a,950,130,6000`,
    ].join('\n');
    const parsed3 = await parseCSVFile(makeCSVFile(csvDifferent));
    const fingerprint3 = getColumnFingerprint(parsed3.headers);
    expect(fingerprint3).not.toBe(fingerprint);
    const missing = await getColumnMapping(experiment.id, fingerprint3);
    expect(missing).toBeUndefined();
  });

  it('validation: rejects a CSV that is missing a required column', async () => {
    const metric = await seedMetric();
    const experiment = await seedExperiment(['control', 'variant_a'], [metric.id]);

    const csv = [
      '#schema:agg-v1',
      // 'units' column intentionally missing
      'experiment_id,variation_id,purchases',
      `${experiment.id},control,100`,
      `${experiment.id},variant_a,130`,
    ].join('\n');
    const parsed = await parseCSVFile(makeCSVFile(csv));
    const errors = validateCSV(parsed, experiment.variations.map((v) => v.key));
    expect(errors.some((e) => e.type === 'error' && /units/.test(e.message))).toBe(true);
  });

  it('validation: flags zero-unit rows as an error', async () => {
    const metric = await seedMetric();
    const experiment = await seedExperiment(['control', 'variant_a'], [metric.id]);

    const csv = [
      '#schema:agg-v1',
      'experiment_id,variation_id,units,purchases',
      `${experiment.id},control,1000,100`,
      `${experiment.id},variant_a,0,0`,
    ].join('\n');
    const parsed = await parseCSVFile(makeCSVFile(csv));
    const errors = validateCSV(parsed, experiment.variations.map((v) => v.key));
    expect(
      errors.some((e) => e.type === 'error' && /units/i.test(e.message)),
    ).toBe(true);
  });

  it('rejects a CSV with an unrecognised schema header', async () => {
    const csv = ['#schema:bogus', 'a,b', '1,2'].join('\n');
    await expect(parseCSVFile(makeCSVFile(csv))).rejects.toThrow(/schema/i);
  });

  it('enforces the max-3-results-per-experiment retention policy through the full flow', async () => {
    const metric = await seedMetric();
    const experiment = await seedExperiment(['control', 'variant_a'], [metric.id]);

    const csv = [
      '#schema:agg-v1',
      'experiment_id,variation_id,units,purchases',
      `${experiment.id},control,1000,100`,
      `${experiment.id},variant_a,950,130`,
    ].join('\n');
    const parsed = await parseCSVFile(makeCSVFile(csv));
    const mapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: metric.id },
    };

    for (let i = 0; i < 4; i++) {
      // Tiny delay so computedAt differs and bulkDelete picks the oldest
      await new Promise((r) => setTimeout(r, 2));
      await runFullFlow(experiment, [metric], parsed, mapping);
    }

    const all = await getResultsForExperiment(experiment.id);
    expect(all.length).toBeLessThanOrEqual(3);
  });
});
