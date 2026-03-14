/**
 * Tests for buildAnalysisRequest: payload structure, overall vs. slice routing,
 * and the "all" sentinel sentinel logic.
 */

import { buildAnalysisRequest } from '../buildRequest';
import type { ColumnMappingConfig } from '../buildRequest';
import type { ParsedCSV } from '../parser';
import type { Experiment, Metric } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 'exp1',
    name: 'Test Experiment',
    hypothesis: 'Variant improves purchases',
    status: 'running',
    createdAt: 0,
    updatedAt: 0,
    variations: [
      { id: 'v-ctrl', key: 'control', weight: 0.5, isControl: true },
      { id: 'v-var', key: 'variant_a', weight: 0.5, isControl: false },
    ],
    primaryMetricIds: ['metric-purchases'],
    guardrailMetricIds: [],
    statsEngine: 'frequentist',
    multipleComparisonCorrection: 'none',
    cuped: false,
    tags: [],
    ...overrides,
  };
}

function makeMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: 'metric-purchases',
    name: 'Purchases',
    type: 'count',
    normalization: 'raw_total',
    higherIsBetter: true,
    isGuardrail: false,
    tags: [],
    createdAt: 0,
    ...overrides,
  };
}

const BASE_MAPPING: ColumnMappingConfig = {
  purchases: { role: 'metric', metricId: 'metric-purchases' },
};

// Simple two-variation overall-only CSV (no dimension columns)
const OVERALL_PARSED: ParsedCSV = {
  headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
  schemaVersion: '1',
  rows: [
    { experiment_id: 'exp1', variation_id: 'control', units: '1000', purchases: '100' },
    { experiment_id: 'exp1', variation_id: 'variant_a', units: '950', purchases: '130' },
  ],
};

// CSV with a country dimension, including both overall ("all") and slice rows
const DIMENSION_PARSED: ParsedCSV = {
  headers: ['experiment_id', 'variation_id', 'units', 'purchases', 'country'],
  schemaVersion: '1',
  rows: [
    // Overall rows (country = "all")
    { experiment_id: 'exp1', variation_id: 'control',   units: '1000', purchases: '100', country: 'all' },
    { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  purchases: '130', country: 'all' },
    // Slice rows (country = "US")
    { experiment_id: 'exp1', variation_id: 'control',   units: '600',  purchases: '60',  country: 'US' },
    { experiment_id: 'exp1', variation_id: 'variant_a', units: '570',  purchases: '80',  country: 'US' },
    // Slice rows (country = "UK")
    { experiment_id: 'exp1', variation_id: 'control',   units: '400',  purchases: '40',  country: 'UK' },
    { experiment_id: 'exp1', variation_id: 'variant_a', units: '380',  purchases: '50',  country: 'UK' },
  ],
};

const DIMENSION_MAPPING: ColumnMappingConfig = {
  purchases: { role: 'metric', metricId: 'metric-purchases' },
  country:   { role: 'dimension' },
};

// ---------------------------------------------------------------------------
// Payload structure
// ---------------------------------------------------------------------------
describe('buildAnalysisRequest — overall payload structure', () => {
  it('returns the correct top-level fields', () => {
    const experiment = makeExperiment();
    const metrics = [makeMetric()];
    const result = buildAnalysisRequest(OVERALL_PARSED, experiment, metrics, BASE_MAPPING);

    expect(result.engine).toBe('frequentist');
    expect(result.correction).toBe('none');
    expect(result.alpha).toBe(0.05);
    expect(result.srmThreshold).toBe(0.001);
    expect(result.multipleExposureCount).toBe(0);
  });

  it('includes correct variation entries', () => {
    const experiment = makeExperiment();
    const result = buildAnalysisRequest(OVERALL_PARSED, experiment, [makeMetric()], BASE_MAPPING);

    expect(result.variations).toHaveLength(2);
    const control = result.variations.find((v) => v.key === 'control');
    expect(control).toBeDefined();
    expect(control!.isControl).toBe(true);
    expect(control!.weight).toBe(0.5);
  });

  it('includes correct metric entries', () => {
    const experiment = makeExperiment();
    const result = buildAnalysisRequest(OVERALL_PARSED, experiment, [makeMetric()], BASE_MAPPING);

    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].id).toBe('metric-purchases');
    expect(result.metrics[0].name).toBe('Purchases');
    expect(result.metrics[0].isGuardrail).toBe(false);
  });

  it('marks guardrail metrics correctly', () => {
    const experiment = makeExperiment({ guardrailMetricIds: ['metric-purchases'] });
    const result = buildAnalysisRequest(OVERALL_PARSED, experiment, [makeMetric()], BASE_MAPPING);
    expect(result.metrics[0].isGuardrail).toBe(true);
  });

  it('puts overall variation data in data.overall', () => {
    const experiment = makeExperiment();
    const result = buildAnalysisRequest(OVERALL_PARSED, experiment, [makeMetric()], BASE_MAPPING);

    expect(result.data.overall['control']).toBeDefined();
    expect(result.data.overall['control'].units).toBe(1000);
    expect(result.data.overall['control'].metrics['metric-purchases']).toBe(100);

    expect(result.data.overall['variant_a']).toBeDefined();
    expect(result.data.overall['variant_a'].units).toBe(950);
    expect(result.data.overall['variant_a'].metrics['metric-purchases']).toBe(130);
  });

  it('passes multipleExposureCount through to the request', () => {
    const result = buildAnalysisRequest(
      OVERALL_PARSED, makeExperiment(), [makeMetric()], BASE_MAPPING, 42,
    );
    expect(result.multipleExposureCount).toBe(42);
  });

  it('throws when no rows match the experiment_id', () => {
    const experiment = makeExperiment({ id: 'nonexistent' });
    expect(() =>
      buildAnalysisRequest(OVERALL_PARSED, experiment, [makeMetric()], BASE_MAPPING),
    ).toThrow(/nonexistent/);
  });

  it('throws when no metric columns are mapped', () => {
    const noMetricMapping: ColumnMappingConfig = {
      purchases: { role: 'ignore' },
    };
    expect(() =>
      buildAnalysisRequest(OVERALL_PARSED, makeExperiment(), [makeMetric()], noMetricMapping),
    ).toThrow(/metric/i);
  });
});

// ---------------------------------------------------------------------------
// Dimension slices
// ---------------------------------------------------------------------------
describe('buildAnalysisRequest — dimension slices', () => {
  it('routes "all" rows to data.overall', () => {
    const result = buildAnalysisRequest(
      DIMENSION_PARSED, makeExperiment(), [makeMetric()], DIMENSION_MAPPING,
    );
    expect(result.data.overall['control'].units).toBe(1000);
    expect(result.data.overall['variant_a'].units).toBe(950);
  });

  it('routes non-"all" rows to data.slices under the correct dimension name', () => {
    const result = buildAnalysisRequest(
      DIMENSION_PARSED, makeExperiment(), [makeMetric()], DIMENSION_MAPPING,
    );
    expect(result.data.slices['country']).toBeDefined();
    expect(result.data.slices['country']['us']).toBeDefined();
    expect(result.data.slices['country']['uk']).toBeDefined();
  });

  it('populates slice variation data correctly', () => {
    const result = buildAnalysisRequest(
      DIMENSION_PARSED, makeExperiment(), [makeMetric()], DIMENSION_MAPPING,
    );
    const usSlice = result.data.slices['country']['us'];
    expect(usSlice['control'].units).toBe(600);
    expect(usSlice['control'].metrics['metric-purchases']).toBe(60);
    expect(usSlice['variant_a'].units).toBe(570);
    expect(usSlice['variant_a'].metrics['metric-purchases']).toBe(80);
  });

  it('does not include the dimension name in data.overall', () => {
    const result = buildAnalysisRequest(
      DIMENSION_PARSED, makeExperiment(), [makeMetric()], DIMENSION_MAPPING,
    );
    // overall should not contain "country" as a key
    expect(Object.keys(result.data.overall)).not.toContain('country');
  });

  it('normalises dimension values to lower-case', () => {
    const parsedUppercase: ParsedCSV = {
      ...DIMENSION_PARSED,
      rows: DIMENSION_PARSED.rows.map((r) => ({
        ...r,
        country: r.country === 'US' ? 'US' : r.country === 'UK' ? 'UK' : r.country,
      })),
    };
    const result = buildAnalysisRequest(
      parsedUppercase, makeExperiment(), [makeMetric()], DIMENSION_MAPPING,
    );
    // Slice keys should be lower-cased
    expect(result.data.slices['country']['us']).toBeDefined();
    expect(result.data.slices['country']['uk']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// pre_normalized metric handling
// ---------------------------------------------------------------------------
describe('buildAnalysisRequest — pre_normalized metrics', () => {
  it('multiplies pre_normalized values back by units', () => {
    const preNormMetric = makeMetric({ normalization: 'pre_normalized' });
    // CSV value is 0.1 (10% rate), units = 1000 → stored value should be 100
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schemaVersion: '1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', purchases: '0.1' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  purchases: '0.12' },
      ],
    };
    const result = buildAnalysisRequest(parsed, makeExperiment(), [preNormMetric], BASE_MAPPING);
    expect(result.data.overall['control'].metrics['metric-purchases']).toBeCloseTo(100);
    expect(result.data.overall['variant_a'].metrics['metric-purchases']).toBeCloseTo(114);
  });
});
