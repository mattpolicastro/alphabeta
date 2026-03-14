import {
  exportAllData,
  importData,
  createExperiment,
  createMetric,
  saveResult,
} from '../index';
import { db } from '../index';
import { resetDb } from './helpers';
import type { ExperimentResult } from '../schema';

afterEach(async () => {
  await resetDb();
});

const baseExperiment = {
  name: 'Export Test Experiment',
  hypothesis: 'Testing export.',
  status: 'draft' as const,
  variations: [
    { id: 'v1', name: 'Control', key: 'control', weight: 0.5, isControl: true },
  ],
  primaryMetricIds: [] as string[],
  guardrailMetricIds: [] as string[],
  statsEngine: 'bayesian' as const,
  multipleComparisonCorrection: 'none' as const,
  cuped: false,
  tags: [] as string[],
};

const baseMetric = {
  name: 'Revenue',
  type: 'revenue' as const,
  normalization: 'raw_total' as const,
  higherIsBetter: true,
  isGuardrail: false,
  tags: [] as string[],
};

function makeResult(
  id: string,
  experimentId: string,
): ExperimentResult {
  return {
    id,
    experimentId,
    computedAt: Date.now(),
    srmPValue: 0.5,
    srmFlagged: false,
    multipleExposureCount: 0,
    multipleExposureFlagged: false,
    perMetricResults: [],
    rawRequest: {
      engine: 'bayesian',
      correction: 'none',
      alpha: 0.05,
      srmThreshold: 0.001,
      variations: [],
      metrics: [],
      data: { overall: {}, slices: {} },
      multipleExposureCount: 0,
    },
    status: 'complete',
  };
}

describe('exportAllData', () => {
  it('produces a valid envelope with required fields', async () => {
    await createExperiment(baseExperiment);
    await createMetric(baseMetric);

    const exported = await exportAllData();

    expect(exported.version).toBe(1);
    expect(typeof exported.exportedAt).toBe('string');
    expect(Array.isArray(exported.experiments)).toBe(true);
    expect(Array.isArray(exported.metrics)).toBe(true);
    expect(Array.isArray(exported.results)).toBe(true);
    expect(Array.isArray(exported.columnMappings)).toBe(true);
    expect(Array.isArray(exported.annotations)).toBe(true);
    expect(exported.experiments.length).toBe(1);
    expect(exported.metrics.length).toBe(1);
  });
});

describe('exportAllData / importData round-trip', () => {
  it('export → clear DB → import replace → re-export produces matching data', async () => {
    const exp = await createExperiment(baseExperiment);
    const metric = await createMetric(baseMetric);
    await saveResult(makeResult('round-trip-result', exp.id));

    const firstExport = await exportAllData();

    // Clear the DB by resetting
    await Promise.all([
      db.experiments.clear(),
      db.metrics.clear(),
      db.results.clear(),
      db.columnMappings.clear(),
      db.annotations.clear(),
    ]);

    await importData(firstExport, 'replace');

    const secondExport = await exportAllData();

    expect(secondExport.experiments.map((e) => e.id)).toEqual(
      expect.arrayContaining(firstExport.experiments.map((e) => e.id)),
    );
    expect(secondExport.metrics.map((m) => m.id)).toEqual(
      expect.arrayContaining(firstExport.metrics.map((m) => m.id)),
    );
    expect(secondExport.results.map((r) => r.id)).toEqual(
      expect.arrayContaining(firstExport.results.map((r) => r.id)),
    );
    expect(secondExport.experiments.length).toBe(firstExport.experiments.length);
    expect(secondExport.metrics.length).toBe(firstExport.metrics.length);
    expect(secondExport.results.length).toBe(firstExport.results.length);
    expect(metric.id).toBeDefined();
  });
});

describe('importData merge mode', () => {
  it('adds data without overwriting existing records', async () => {
    const exp1 = await createExperiment({ ...baseExperiment, name: 'Existing Exp' });

    // Export the current state
    const snapshot = await exportAllData();

    // Add a new experiment
    await createExperiment({ ...baseExperiment, name: 'New Exp' });

    // Import in merge mode — should not remove the existing experiments
    await importData(snapshot, 'merge');

    const afterMerge = await exportAllData();
    // Should have at least exp1 plus the new one
    const ids = afterMerge.experiments.map((e) => e.id);
    expect(ids).toContain(exp1.id);
    // Total count should be 2 (existing exp + new exp)
    expect(afterMerge.experiments.length).toBe(2);
  });
});

describe('importData version check', () => {
  it('rejects unsupported version', async () => {
    const badData = {
      exportedAt: new Date().toISOString(),
      version: 99 as unknown as 1,
      experiments: [],
      metrics: [],
      results: [],
      columnMappings: [],
      annotations: [],
    };
    await expect(importData(badData, 'replace')).rejects.toThrow(
      /Unsupported export version/,
    );
  });
});
