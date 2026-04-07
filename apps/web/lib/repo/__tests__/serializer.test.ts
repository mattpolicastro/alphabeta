import {
  serializeToFileMap,
  deserializeFromFileMap,
  buildManifest,
} from '../serializer';
import type { ExportData } from '@/lib/db';
import type { Experiment, Metric, ExperimentResult, Annotation, ColumnMapping } from '@/lib/db/schema';

const BASE = '.alphabeta';

function makeExperiment(id: string): Experiment {
  return {
    id,
    name: `Experiment ${id}`,
    hypothesis: 'Test hypothesis',
    status: 'draft',
    createdAt: 1000,
    updatedAt: 1000,
    variations: [
      { id: 'v1', name: 'Control', key: 'control', weight: 0.5, isControl: true },
      { id: 'v2', name: 'Treatment', key: 'treatment', weight: 0.5, isControl: false },
    ],
    primaryMetricIds: ['m1'],
    guardrailMetricIds: [],
    statsEngine: 'bayesian',
    multipleComparisonCorrection: 'none',
    cuped: false,
    tags: [],
  };
}

function makeMetric(id: string): Metric {
  return {
    id,
    name: `Metric ${id}`,
    type: 'binomial',
    normalization: 'raw_total',
    higherIsBetter: true,
    isGuardrail: false,
    tags: [],
    createdAt: 1000,
  };
}

function makeResult(id: string, experimentId: string): ExperimentResult {
  return {
    id,
    experimentId,
    computedAt: 2000,
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

function makeAnnotation(id: number, experimentId: string): Annotation {
  return {
    id,
    experimentId,
    body: 'Test note',
    createdAt: 3000,
    updatedAt: 3000,
  };
}

function makeColumnMapping(experimentId: string, fingerprint: string): ColumnMapping {
  return {
    id: `${experimentId}:${fingerprint}`,
    experimentId,
    columnFingerprint: fingerprint,
    savedAt: 4000,
    mapping: { col1: { role: 'metric', metricId: 'm1' } },
  };
}

function makeSampleData(): ExportData {
  return {
    exportedAt: '2026-03-25T00:00:00.000Z',
    version: 1,
    experiments: [makeExperiment('e1'), makeExperiment('e2')],
    metrics: [makeMetric('m1'), makeMetric('m2')],
    results: [makeResult('r1', 'e1'), makeResult('r2', 'e2')],
    columnMappings: [makeColumnMapping('e1', 'col1,col2')],
    annotations: [makeAnnotation(1, 'e1')],
  };
}

describe('buildManifest', () => {
  it('lists all experiment and metric IDs', () => {
    const data = makeSampleData();
    const manifest = buildManifest(data);

    expect(manifest.version).toBe(1);
    expect(manifest.exportedAt).toBe(data.exportedAt);
    expect(manifest.experimentIds).toEqual(['e1', 'e2']);
    expect(manifest.metricIds).toEqual(['m1', 'm2']);
  });
});

describe('serializeToFileMap', () => {
  it('produces expected file paths', () => {
    const data = makeSampleData();
    const files = serializeToFileMap(data, BASE);
    const paths = Array.from(files.keys()).sort();

    expect(paths).toContain(`${BASE}/manifest.json`);
    expect(paths).toContain(`${BASE}/metrics/m1.json`);
    expect(paths).toContain(`${BASE}/metrics/m2.json`);
    expect(paths).toContain(`${BASE}/experiments/e1/experiment.json`);
    expect(paths).toContain(`${BASE}/experiments/e2/experiment.json`);
    expect(paths).toContain(`${BASE}/experiments/e1/results/r1.json`);
    expect(paths).toContain(`${BASE}/experiments/e2/results/r2.json`);
    expect(paths).toContain(`${BASE}/experiments/e1/annotations/1.json`);
    expect(paths).toContain(`${BASE}/experiments/e1/column-mappings/col1,col2.json`);
  });

  it('produces valid JSON for each file', () => {
    const data = makeSampleData();
    const files = serializeToFileMap(data, BASE);

    for (const [_path, content] of files) {
      expect(() => JSON.parse(content)).not.toThrow();
    }
  });

  it('uses pretty-printed JSON', () => {
    const data = makeSampleData();
    const files = serializeToFileMap(data, BASE);
    const manifest = files.get(`${BASE}/manifest.json`)!;
    expect(manifest).toContain('\n');
  });
});

describe('deserializeFromFileMap', () => {
  it('round-trips all entity types', () => {
    const original = makeSampleData();
    const files = serializeToFileMap(original, BASE);
    const restored = deserializeFromFileMap(files, BASE);

    expect(restored.experiments).toHaveLength(2);
    expect(restored.metrics).toHaveLength(2);
    expect(restored.results).toHaveLength(2);
    expect(restored.annotations).toHaveLength(1);
    expect(restored.columnMappings).toHaveLength(1);
    expect(restored.exportedAt).toBe(original.exportedAt);
  });

  it('preserves entity content through round-trip', () => {
    const original = makeSampleData();
    const files = serializeToFileMap(original, BASE);
    const restored = deserializeFromFileMap(files, BASE);

    const exp = restored.experiments.find((e) => e.id === 'e1')!;
    expect(exp.name).toBe('Experiment e1');
    expect(exp.variations).toHaveLength(2);

    const metric = restored.metrics.find((m) => m.id === 'm1')!;
    expect(metric.type).toBe('binomial');
  });

  it('throws when manifest is missing', () => {
    const files: Map<string, string> = new Map();
    files.set(`${BASE}/metrics/m1.json`, JSON.stringify(makeMetric('m1')));

    expect(() => deserializeFromFileMap(files, BASE)).toThrow(/manifest/i);
  });

  it('ignores stale files not listed in manifest', () => {
    const original = makeSampleData();
    const files = serializeToFileMap(original, BASE);

    // Add a stale experiment file not in the manifest
    files.set(
      `${BASE}/experiments/stale-exp/experiment.json`,
      JSON.stringify(makeExperiment('stale-exp')),
    );
    files.set(
      `${BASE}/metrics/stale-metric.json`,
      JSON.stringify(makeMetric('stale-metric')),
    );

    const restored = deserializeFromFileMap(files, BASE);
    expect(restored.experiments).toHaveLength(2); // not 3
    expect(restored.metrics).toHaveLength(2); // not 3
  });

  it('handles empty export data', () => {
    const empty: ExportData = {
      exportedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
      experiments: [],
      metrics: [],
      results: [],
      columnMappings: [],
      annotations: [],
    };
    const files = serializeToFileMap(empty, BASE);
    const restored = deserializeFromFileMap(files, BASE);

    expect(restored.experiments).toHaveLength(0);
    expect(restored.metrics).toHaveLength(0);
    expect(restored.results).toHaveLength(0);
  });

  it('handles unicode in entity content', () => {
    const data = makeSampleData();
    data.experiments[0].name = 'Expérience avec des émojis 🧪';
    data.experiments[0].hypothesis = '日本語テスト';

    const files = serializeToFileMap(data, BASE);
    const restored = deserializeFromFileMap(files, BASE);

    const exp = restored.experiments.find((e) => e.id === 'e1')!;
    expect(exp.name).toBe('Expérience avec des émojis 🧪');
    expect(exp.hypothesis).toBe('日本語テスト');
  });
});
