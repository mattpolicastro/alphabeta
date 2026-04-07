/**
 * Tests for buildAnalysisRequest: payload structure, overall vs. slice routing,
 * and the "all" sentinel sentinel logic.
 */

import { buildAnalysisRequest, buildMergedAnalysisRequest } from '../buildRequest';
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
  schema: 'agg-v1',
  rows: [
    { experiment_id: 'exp1', variation_id: 'control', units: '1000', purchases: '100' },
    { experiment_id: 'exp1', variation_id: 'variant_a', units: '950', purchases: '130' },
  ],
};

// CSV with a country dimension, including both overall ("all") and slice rows
const DIMENSION_PARSED: ParsedCSV = {
  headers: ['experiment_id', 'variation_id', 'units', 'purchases', 'country'],
  schema: 'agg-v1',
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

  it('throws when no rows match the experiment_id and CSV has multiple experiments', () => {
    const multiExpParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp-other-1', variation_id: 'control',   units: '1000', purchases: '100' },
        { experiment_id: 'exp-other-2', variation_id: 'variant_a', units: '950',  purchases: '130' },
      ],
    };
    const experiment = makeExperiment({ id: 'nonexistent' });
    expect(() =>
      buildAnalysisRequest(multiExpParsed, experiment, [makeMetric()], BASE_MAPPING),
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
      schema: 'agg-v1',
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

// ---------------------------------------------------------------------------
// Stale metric ID filtering
// ---------------------------------------------------------------------------
describe('buildAnalysisRequest — stale metric filtering', () => {
  it('ignores mapping entries referencing a metric ID not in the metrics array', () => {
    const staleMapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: 'metric-purchases' },
      revenue:   { role: 'metric', metricId: 'metric-deleted' }, // stale
    };
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases', 'revenue'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', purchases: '100', revenue: '5000' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  purchases: '130', revenue: '6000' },
      ],
    };
    const result = buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], staleMapping);

    // Only the valid metric should be in the request
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].id).toBe('metric-purchases');
    // The stale metric should not appear in variation data
    expect(result.data.overall['control'].metrics).not.toHaveProperty('metric-deleted');
  });

  it('throws when all mapped metrics are stale', () => {
    const allStaleMapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: 'metric-deleted' },
    };
    expect(() =>
      buildAnalysisRequest(OVERALL_PARSED, makeExperiment(), [makeMetric()], allStaleMapping),
    ).toThrow(/metric/i);
  });
});

// ---------------------------------------------------------------------------
// experiment_id fallback
// ---------------------------------------------------------------------------
describe('buildAnalysisRequest — experiment_id fallback', () => {
  it('uses all rows when CSV has a single experiment_id that does not match', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'human-readable-name', variation_id: 'control',   units: '1000', purchases: '100' },
        { experiment_id: 'human-readable-name', variation_id: 'variant_a', units: '950',  purchases: '130' },
      ],
    };
    // experiment.id is 'exp1' (nanoid) — doesn't match 'human-readable-name'
    const result = buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], BASE_MAPPING);

    expect(result.data.overall['control'].units).toBe(1000);
    expect(result.data.overall['variant_a'].units).toBe(950);
  });

  it('throws when CSV has multiple experiment_ids and none match', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'other-exp-1', variation_id: 'control',   units: '500', purchases: '50' },
        { experiment_id: 'other-exp-2', variation_id: 'variant_a', units: '500', purchases: '60' },
      ],
    };
    expect(() =>
      buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], BASE_MAPPING),
    ).toThrow(/multiple experiment IDs/i);
  });

  it('throws when CSV has no experiment_id values at all', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: '', variation_id: 'control',   units: '500', purchases: '50' },
        { experiment_id: '', variation_id: 'variant_a', units: '500', purchases: '60' },
      ],
    };
    expect(() =>
      buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], BASE_MAPPING),
    ).toThrow(/No rows found/i);
  });
});

// ---------------------------------------------------------------------------
// buildAnalysisRequestV2 (row-level data path)
// ---------------------------------------------------------------------------
describe('buildAnalysisRequest — row-level (v2) path', () => {
  const ROW_LEVEL_PARSED: ParsedCSV = {
    headers: ['experiment_id', 'variation_id', 'user_id', 'purchases', 'revenue'],
    schema: 'row-v1',
    rows: [], // preview rows not used by v2 path
    rowLevelAggregates: {
      control: {
        purchases: { mean: 0.1, variance: 0.09, n: 1000 },
        revenue:   { mean: 5.0, variance: 20.0, n: 1000 },
      },
      variant_a: {
        purchases: { mean: 0.13, variance: 0.113, n: 950 },
        revenue:   { mean: 5.5, variance: 22.0, n: 950 },
      },
    },
  };

  const ROW_LEVEL_MAPPING: ColumnMappingConfig = {
    purchases: { role: 'metric', metricId: 'metric-purchases' },
    revenue:   { role: 'metric', metricId: 'metric-revenue' },
  };

  const revenueMetric = makeMetric({ id: 'metric-revenue', name: 'Revenue', type: 'revenue' });

  it('routes row-v1 data through the v2 builder', () => {
    const result = buildAnalysisRequest(
      ROW_LEVEL_PARSED,
      makeExperiment(),
      [makeMetric({ type: 'count' }), revenueMetric],
      ROW_LEVEL_MAPPING,
    );

    // Count metric (proportion path): mean * n
    expect(result.data.overall['control'].metrics['metric-purchases']).toBeCloseTo(100);
    // Revenue metric (continuous path): should be in continuousMetrics
    expect(result.data.overall['control'].continuousMetrics?.['metric-revenue']).toBeDefined();
    expect(result.data.overall['control'].continuousMetrics!['metric-revenue'].mean).toBe(5.0);
  });

  it('populates continuousMetrics for revenue/continuous metric types', () => {
    const result = buildAnalysisRequest(
      ROW_LEVEL_PARSED,
      makeExperiment(),
      [revenueMetric],
      { revenue: { role: 'metric', metricId: 'metric-revenue' } },
    );

    const ctrl = result.data.overall['control'];
    expect(ctrl.continuousMetrics?.['metric-revenue']).toEqual({
      mean: 5.0, variance: 20.0, n: 1000,
    });
    const trt = result.data.overall['variant_a'];
    expect(trt.continuousMetrics?.['metric-revenue']).toEqual({
      mean: 5.5, variance: 22.0, n: 950,
    });
  });

  it('sets metricType on request metrics for the v2 path', () => {
    const result = buildAnalysisRequest(
      ROW_LEVEL_PARSED,
      makeExperiment(),
      [makeMetric({ type: 'count' }), revenueMetric],
      ROW_LEVEL_MAPPING,
    );

    const purchasesMeta = result.metrics.find((m) => m.id === 'metric-purchases');
    const revenueMeta = result.metrics.find((m) => m.id === 'metric-revenue');
    expect(purchasesMeta?.metricType).toBe('proportion');
    expect(revenueMeta?.metricType).toBe('continuous');
  });

  it('builds dimension slices from rowLevelSliceAggregates', () => {
    const parsedWithSlices: ParsedCSV = {
      ...ROW_LEVEL_PARSED,
      rowLevelSliceAggregates: {
        country: {
          us: {
            control:   { purchases: { mean: 0.12, variance: 0.1, n: 600 } },
            variant_a: { purchases: { mean: 0.14, variance: 0.12, n: 570 } },
          },
          uk: {
            control:   { purchases: { mean: 0.08, variance: 0.07, n: 400 } },
            variant_a: { purchases: { mean: 0.11, variance: 0.1, n: 380 } },
          },
        },
      },
    };
    const mapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: 'metric-purchases' },
      country:   { role: 'dimension' },
    };
    const result = buildAnalysisRequest(
      parsedWithSlices,
      makeExperiment(),
      [makeMetric({ type: 'count' })],
      mapping,
    );

    expect(result.data.slices['country']).toBeDefined();
    expect(result.data.slices['country']['us']).toBeDefined();
    expect(result.data.slices['country']['uk']).toBeDefined();
    // count metric → proportion path → mean * n
    expect(result.data.slices['country']['us']['control'].metrics['metric-purchases']).toBeCloseTo(72);
  });
});

// ---------------------------------------------------------------------------
// buildMergedAnalysisRequest
// ---------------------------------------------------------------------------
describe('buildMergedAnalysisRequest', () => {
  const aggParsed: ParsedCSV = {
    headers: ['experiment_id', 'variation_id', 'units', 'clicks'],
    schema: 'agg-v1',
    rows: [
      { experiment_id: 'exp1', variation_id: 'control',   units: '1000', clicks: '200' },
      { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  clicks: '230' },
    ],
  };
  const aggMapping: ColumnMappingConfig = {
    clicks: { role: 'metric', metricId: 'metric-clicks' },
  };

  const rowParsed: ParsedCSV = {
    headers: ['experiment_id', 'variation_id', 'user_id', 'revenue'],
    schema: 'row-v1',
    rows: [],
    rowLevelAggregates: {
      control:   { revenue: { mean: 5.0, variance: 20.0, n: 1000 } },
      variant_a: { revenue: { mean: 5.5, variance: 22.0, n: 950 } },
    },
  };
  const rowMapping: ColumnMappingConfig = {
    revenue: { role: 'metric', metricId: 'metric-revenue' },
  };

  const clicksMetric = makeMetric({ id: 'metric-clicks', name: 'Clicks', type: 'count' });
  const revenueMetric = makeMetric({ id: 'metric-revenue', name: 'Revenue', type: 'revenue' });

  it('delegates to agg-only when rowLevelParsed is null', () => {
    const result = buildMergedAnalysisRequest(
      aggParsed, aggMapping, null, {}, makeExperiment(), [clicksMetric],
    );
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].id).toBe('metric-clicks');
    expect(result.data.overall['control'].metrics['metric-clicks']).toBe(200);
  });

  it('delegates to row-only when aggParsed is null', () => {
    const result = buildMergedAnalysisRequest(
      null, {}, rowParsed, rowMapping, makeExperiment(), [revenueMetric],
    );
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].id).toBe('metric-revenue');
  });

  it('throws when both sources are null', () => {
    expect(() =>
      buildMergedAnalysisRequest(null, {}, null, {}, makeExperiment(), [clicksMetric]),
    ).toThrow(/at least one data source/i);
  });

  it('merges metrics from both sources without duplicates', () => {
    const result = buildMergedAnalysisRequest(
      aggParsed, aggMapping, rowParsed, rowMapping,
      makeExperiment(), [clicksMetric, revenueMetric],
    );

    const metricIds = result.metrics.map((m) => m.id);
    expect(metricIds).toContain('metric-clicks');
    expect(metricIds).toContain('metric-revenue');
    expect(metricIds).toHaveLength(2);
  });

  it('uses agg units when both sources provide data', () => {
    const result = buildMergedAnalysisRequest(
      aggParsed, aggMapping, rowParsed, rowMapping,
      makeExperiment(), [clicksMetric, revenueMetric],
    );
    // Agg source has explicit units=1000 for control
    expect(result.data.overall['control'].units).toBe(1000);
  });

  it('merges slices from both sources', () => {
    const aggWithSlices: ParsedCSV = {
      ...aggParsed,
      headers: [...aggParsed.headers, 'country'],
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', clicks: '200', country: 'all' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  clicks: '230', country: 'all' },
        { experiment_id: 'exp1', variation_id: 'control',   units: '600',  clicks: '120', country: 'US' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '570',  clicks: '140', country: 'US' },
      ],
    };
    const aggMappingWithDim: ColumnMappingConfig = {
      clicks:  { role: 'metric', metricId: 'metric-clicks' },
      country: { role: 'dimension' },
    };

    const rowWithSlices: ParsedCSV = {
      ...rowParsed,
      rowLevelSliceAggregates: {
        browser: {
          chrome: {
            control:   { revenue: { mean: 5.2, variance: 21.0, n: 700 } },
            variant_a: { revenue: { mean: 5.8, variance: 23.0, n: 650 } },
          },
        },
      },
    };
    const rowMappingWithDim: ColumnMappingConfig = {
      revenue: { role: 'metric', metricId: 'metric-revenue' },
      browser: { role: 'dimension' },
    };

    const result = buildMergedAnalysisRequest(
      aggWithSlices, aggMappingWithDim, rowWithSlices, rowMappingWithDim,
      makeExperiment(), [clicksMetric, revenueMetric],
    );

    // Agg slices
    expect(result.data.slices['country']).toBeDefined();
    expect(result.data.slices['country']['us']).toBeDefined();
    // Row-level slices
    expect(result.data.slices['browser']).toBeDefined();
    expect(result.data.slices['browser']['chrome']).toBeDefined();
  });

  it('row-level metric wins when same metric appears in both sources', () => {
    // Both sources have a "purchases" metric mapped to the same metric ID
    const aggMappingDup: ColumnMappingConfig = {
      clicks: { role: 'metric', metricId: 'metric-shared' },
    };
    const rowMappingDup: ColumnMappingConfig = {
      revenue: { role: 'metric', metricId: 'metric-shared' },
    };
    const sharedMetric = makeMetric({ id: 'metric-shared', name: 'Shared', type: 'revenue' });

    const result = buildMergedAnalysisRequest(
      aggParsed, aggMappingDup, rowParsed, rowMappingDup,
      makeExperiment(), [sharedMetric],
    );

    // Should only have one entry for the shared metric
    expect(result.metrics.filter((m) => m.id === 'metric-shared')).toHaveLength(1);
    // The row-level version should win (has metricType)
    expect(result.metrics.find((m) => m.id === 'metric-shared')?.metricType).toBe('continuous');
  });
});

// ---------------------------------------------------------------------------
// Edge cases across agg-v1, row-v1, and merged paths (coverage gap #2)
// ---------------------------------------------------------------------------
describe('buildRequest — edge cases', () => {
  const clicksMetric = makeMetric({ id: 'metric-clicks', name: 'Clicks', type: 'count' });
  const revenueMetric = makeMetric({ id: 'metric-revenue', name: 'Revenue', type: 'revenue' });
  const binomialMetric = makeMetric({
    id: 'metric-conv',
    name: 'Conv',
    type: 'binomial',
    normalization: 'pre_normalized',
  });

  it('agg-v1: ignores unmapped extra columns', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases', 'noise', 'extra'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', purchases: '100', noise: 'zzz', extra: '9999' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  purchases: '130', noise: 'zzz', extra: '9999' },
      ],
    };
    const result = buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], BASE_MAPPING);
    expect(Object.keys(result.data.overall['control'].metrics)).toEqual(['metric-purchases']);
    expect(result.data.overall['control'].metrics['metric-purchases']).toBe(100);
  });

  it('agg-v1: tolerates zero-units variation without crashing', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', purchases: '100' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '0',    purchases: '0' },
      ],
    };
    const result = buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], BASE_MAPPING);
    expect(result.data.overall['variant_a'].units).toBe(0);
    expect(result.data.overall['variant_a'].metrics['metric-purchases']).toBe(0);
  });

  it('agg-v1: skips variations that have no rows in the CSV', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'purchases'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control', units: '1000', purchases: '100' },
        // variant_a missing entirely
      ],
    };
    const result = buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], BASE_MAPPING);
    expect(result.data.overall['control']).toBeDefined();
    expect(result.data.overall['variant_a']).toBeUndefined();
    // The request variation list still includes both (from experiment config)
    expect(result.variations).toHaveLength(2);
  });

  it('agg-v1: binomial + pre_normalized rate is scaled back to raw totals', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'conv_rate'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', conv_rate: '0.05' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  conv_rate: '0.06' },
      ],
    };
    const result = buildAnalysisRequest(
      parsed,
      makeExperiment(),
      [binomialMetric],
      { conv_rate: { role: 'metric', metricId: 'metric-conv' } },
    );
    expect(result.data.overall['control'].metrics['metric-conv']).toBeCloseTo(50);
    expect(result.data.overall['variant_a'].metrics['metric-conv']).toBeCloseTo(57);
    expect(result.metrics[0].metricType).toBe('proportion');
  });

  it('row-v1: drops columns whose mapping targets a missing metric ID', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'user_id', 'purchases'],
      schema: 'row-v1',
      rows: [],
      rowLevelAggregates: {
        control:   { purchases: { mean: 0.1,  variance: 0.09,  n: 1000 } },
        variant_a: { purchases: { mean: 0.13, variance: 0.113, n: 950  } },
      },
    };
    const mapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: 'metric-purchases' },
      ghost:     { role: 'metric', metricId: 'metric-ghost' }, // not in metrics array
    };
    const result = buildAnalysisRequest(
      parsed,
      makeExperiment(),
      [makeMetric({ type: 'count' })],
      mapping,
    );
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].id).toBe('metric-purchases');
    expect(result.data.overall['control'].metrics['metric-purchases']).toBeCloseTo(100);
  });

  it('row-v1: throws when no valid metric columns remain', () => {
    const parsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'user_id', 'purchases'],
      schema: 'row-v1',
      rows: [],
      rowLevelAggregates: {
        control:   { purchases: { mean: 0.1,  variance: 0.09,  n: 1000 } },
        variant_a: { purchases: { mean: 0.13, variance: 0.113, n: 950  } },
      },
    };
    const mapping: ColumnMappingConfig = {
      purchases: { role: 'metric', metricId: 'metric-deleted' },
    };
    expect(() =>
      buildAnalysisRequest(parsed, makeExperiment(), [makeMetric()], mapping),
    ).toThrow(/metric/i);
  });

  it('merged: preserves row-level continuousMetrics alongside agg proportion metrics', () => {
    const aggParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'clicks'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', clicks: '200' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  clicks: '230' },
      ],
    };
    const rowParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'user_id', 'revenue'],
      schema: 'row-v1',
      rows: [],
      rowLevelAggregates: {
        control:   { revenue: { mean: 5.0, variance: 20.0, n: 1000 } },
        variant_a: { revenue: { mean: 5.5, variance: 22.0, n: 950  } },
      },
    };
    const result = buildMergedAnalysisRequest(
      aggParsed,
      { clicks: { role: 'metric', metricId: 'metric-clicks' } },
      rowParsed,
      { revenue: { role: 'metric', metricId: 'metric-revenue' } },
      makeExperiment(),
      [clicksMetric, revenueMetric],
    );

    const ctrl = result.data.overall['control'];
    // Proportion metric from agg
    expect(ctrl.metrics['metric-clicks']).toBe(200);
    // Continuous metric from row-level
    expect(ctrl.continuousMetrics?.['metric-revenue']).toEqual({
      mean: 5.0,
      variance: 20.0,
      n: 1000,
    });
    // Units come from agg (explicit sample sizes)
    expect(ctrl.units).toBe(1000);
  });

  it('merged: variation present only in row-level source still makes it into overall', () => {
    const aggParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'clicks'],
      schema: 'agg-v1',
      rows: [
        // Only control in agg
        { experiment_id: 'exp1', variation_id: 'control', units: '1000', clicks: '200' },
      ],
    };
    const rowParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'user_id', 'revenue'],
      schema: 'row-v1',
      rows: [],
      rowLevelAggregates: {
        control:   { revenue: { mean: 5.0, variance: 20.0, n: 1000 } },
        variant_a: { revenue: { mean: 5.5, variance: 22.0, n: 950  } },
      },
    };
    const result = buildMergedAnalysisRequest(
      aggParsed,
      { clicks: { role: 'metric', metricId: 'metric-clicks' } },
      rowParsed,
      { revenue: { role: 'metric', metricId: 'metric-revenue' } },
      makeExperiment(),
      [clicksMetric, revenueMetric],
    );
    expect(result.data.overall['variant_a']).toBeDefined();
    // variant_a has no agg data, so units fall back to row-level n
    expect(result.data.overall['variant_a'].units).toBe(950);
    expect(
      result.data.overall['variant_a'].continuousMetrics?.['metric-revenue'].mean,
    ).toBe(5.5);
  });

  it('merged: propagates multipleExposureCount through both-source path', () => {
    const aggParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'units', 'clicks'],
      schema: 'agg-v1',
      rows: [
        { experiment_id: 'exp1', variation_id: 'control',   units: '1000', clicks: '200' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950',  clicks: '230' },
      ],
    };
    const rowParsed: ParsedCSV = {
      headers: ['experiment_id', 'variation_id', 'user_id', 'revenue'],
      schema: 'row-v1',
      rows: [],
      rowLevelAggregates: {
        control:   { revenue: { mean: 5.0, variance: 20.0, n: 1000 } },
        variant_a: { revenue: { mean: 5.5, variance: 22.0, n: 950  } },
      },
    };
    const result = buildMergedAnalysisRequest(
      aggParsed,
      { clicks: { role: 'metric', metricId: 'metric-clicks' } },
      rowParsed,
      { revenue: { role: 'metric', metricId: 'metric-revenue' } },
      makeExperiment(),
      [clicksMetric, revenueMetric],
      17,
    );
    expect(result.multipleExposureCount).toBe(17);
  });
});
