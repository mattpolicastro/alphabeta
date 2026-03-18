import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MetricValidationPanel,
  computeMetricSummaries,
  hasBlockingValidationErrors,
} from '../MetricValidationPanel';
import type { MetricSummary } from '../MetricValidationPanel';
import type { Metric } from '@/lib/db/schema';

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: 'metric-1',
    name: 'Conversion Rate',
    type: 'binomial',
    normalization: 'raw_total',
    higherIsBetter: true,
    isGuardrail: false,
    tags: [],
    createdAt: 0,
    ...overrides,
  };
}

function makeSummary(overrides: Partial<MetricSummary> = {}): MetricSummary {
  return {
    metricId: 'metric-1',
    metricName: 'Conversion Rate',
    variations: [
      { variationKey: 'control', units: 1000, total: 100, rate: 0.1 },
      { variationKey: 'treatment', units: 1000, total: 110, rate: 0.11 },
    ],
    ...overrides,
  };
}

const DEFAULT_METRICS: Metric[] = [makeMetric()];

// ── computeMetricSummaries() pure function tests ───────────────────────────

describe('computeMetricSummaries()', () => {
  const metrics: Metric[] = [makeMetric({ id: 'm1', name: 'Revenue' })];

  const rows: Record<string, string>[] = [
    { variation_id: 'control', units: '500', revenue: '2500' },
    { variation_id: 'treatment', units: '510', revenue: '2600' },
  ];

  const mapping: Record<string, { role: string; metricId?: string }> = {
    revenue: { role: 'metric', metricId: 'm1' },
  };

  it('returns one summary per metric column', () => {
    const result = computeMetricSummaries(rows, mapping, metrics, ['control', 'treatment']);
    expect(result).toHaveLength(1);
    expect(result[0].metricId).toBe('m1');
    expect(result[0].metricName).toBe('Revenue');
  });

  it('computes correct units and totals per variation', () => {
    const result = computeMetricSummaries(rows, mapping, metrics, ['control', 'treatment']);
    const [ctrl, trt] = result[0].variations;
    expect(ctrl.variationKey).toBe('control');
    expect(ctrl.units).toBe(500);
    expect(ctrl.total).toBe(2500);
    expect(ctrl.rate).toBeCloseTo(5.0, 3);
    expect(trt.units).toBe(510);
  });

  it('returns 0 units/rate for missing variation rows', () => {
    const result = computeMetricSummaries(rows, mapping, metrics, ['control', 'treatment', 'missing']);
    const missing = result[0].variations.find((v) => v.variationKey === 'missing');
    expect(missing?.units).toBe(0);
    expect(missing?.rate).toBe(0);
  });

  it('filters out non-"all" dimension rows when dimensions are mapped', () => {
    const rowsWithDim: Record<string, string>[] = [
      { variation_id: 'control', units: '500', revenue: '2500', country: 'all' },
      { variation_id: 'control', units: '300', revenue: '1500', country: 'US' },
      { variation_id: 'treatment', units: '510', revenue: '2600', country: 'all' },
    ];
    const mappingWithDim: Record<string, { role: string; metricId?: string }> = {
      revenue: { role: 'metric', metricId: 'm1' },
      country: { role: 'dimension' },
    };
    const result = computeMetricSummaries(rowsWithDim, mappingWithDim, metrics, ['control', 'treatment']);
    // Only "all" rows used → control should have 500 units, not 800
    expect(result[0].variations[0].units).toBe(500);
  });

  it('uses metricId as name when metric is not in metrics array', () => {
    const result = computeMetricSummaries(rows, mapping, [], ['control']);
    expect(result[0].metricName).toBe('m1');
  });

  it('uses CSV value directly as rate for pre_normalized metrics', () => {
    const preNormMetrics: Metric[] = [
      makeMetric({ id: 'm1', name: 'CTR', normalization: 'pre_normalized' }),
    ];
    // CSV value 0.096 = 9.6% rate, units = 5000
    const preNormRows: Record<string, string>[] = [
      { variation_id: 'control', units: '5000', revenue: '0.096' },
      { variation_id: 'treatment', units: '5100', revenue: '0.12' },
    ];
    const result = computeMetricSummaries(preNormRows, mapping, preNormMetrics, ['control', 'treatment']);
    const [ctrl, trt] = result[0].variations;
    // rate should be the raw value (already a rate), not divided by units
    expect(ctrl.rate).toBeCloseTo(0.096, 6);
    expect(trt.rate).toBeCloseTo(0.12, 6);
    // total should be rate * units (for consistency with raw_total path)
    expect(ctrl.total).toBeCloseTo(480, 1);
    expect(trt.total).toBeCloseTo(612, 1);
  });

  it('divides by units for raw_total (default) normalization', () => {
    const result = computeMetricSummaries(rows, mapping, metrics, ['control', 'treatment']);
    const ctrl = result[0].variations[0];
    // rate = 2500 / 500 = 5.0
    expect(ctrl.rate).toBeCloseTo(5.0, 3);
    expect(ctrl.total).toBe(2500);
  });
});

// ── hasBlockingValidationErrors() pure function tests ─────────────────────

describe('hasBlockingValidationErrors()', () => {
  it('returns false when all variations have units', () => {
    const summaries = [makeSummary()];
    expect(hasBlockingValidationErrors(summaries, DEFAULT_METRICS)).toBe(false);
  });

  it('returns true when any variation has 0 units', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 0, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 1000, total: 100, rate: 0.1 },
        ],
      }),
    ];
    expect(hasBlockingValidationErrors(summaries, DEFAULT_METRICS)).toBe(true);
  });

  it('returns true when both variations have 0 units', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 0, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 0, total: 0, rate: 0 },
        ],
      }),
    ];
    expect(hasBlockingValidationErrors(summaries, DEFAULT_METRICS)).toBe(true);
  });

  it('returns false when no summaries', () => {
    expect(hasBlockingValidationErrors([], DEFAULT_METRICS)).toBe(false);
  });
});

// ── MetricValidationPanel render tests ────────────────────────────────────

describe('MetricValidationPanel', () => {
  it('renders null when summaries is empty', () => {
    const { container } = render(
      <MetricValidationPanel summaries={[]} metrics={DEFAULT_METRICS} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Data Validation" heading with valid data', () => {
    render(
      <MetricValidationPanel summaries={[makeSummary()]} metrics={DEFAULT_METRICS} />,
    );
    expect(screen.getByText('Data Validation')).toBeInTheDocument();
  });

  it('renders error alert for blocking errors (zero units variation)', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 0, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 1000, total: 100, rate: 0.1 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByText(/errors \(blocking\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0 units/i)).toBeInTheDocument();
  });

  it('renders warning alert when total metric events are zero across all variations', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 1000, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 1000, total: 0, rate: 0 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByText('Warnings:')).toBeInTheDocument();
    expect(screen.getByText(/no events recorded/i)).toBeInTheDocument();
  });

  it('renders warning for degenerate rate (0%)', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 1000, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 1000, total: 100, rate: 0.1 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByText(/0% rate/i)).toBeInTheDocument();
  });

  it('renders warning for degenerate rate (100%)', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 1000, total: 1000, rate: 1 },
          { variationKey: 'treatment', units: 1000, total: 100, rate: 0.1 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByText(/100% rate/i)).toBeInTheDocument();
  });

  it('renders warning for rate imbalance > 5x', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 1000, total: 10, rate: 0.01 },
          { variationKey: 'treatment', units: 1000, total: 600, rate: 0.6 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByText(/very large observed difference/i)).toBeInTheDocument();
  });

  it('renders warning when a variation has < 10% of total units', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 10000, total: 1000, rate: 0.1 },
          { variationKey: 'treatment', units: 100, total: 10, rate: 0.1 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByText(/likely a mapping error/i)).toBeInTheDocument();
  });

  it('renders acknowledge button in warning alert', () => {
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 1000, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 1000, total: 0, rate: 0 },
        ],
      }),
    ];
    render(<MetricValidationPanel summaries={summaries} metrics={DEFAULT_METRICS} />);
    expect(screen.getByRole('button', { name: /proceed/i })).toBeInTheDocument();
  });

  it('calls onAcknowledge and hides button after clicking acknowledge', () => {
    const onAcknowledge = jest.fn();
    const summaries = [
      makeSummary({
        variations: [
          { variationKey: 'control', units: 1000, total: 0, rate: 0 },
          { variationKey: 'treatment', units: 1000, total: 0, rate: 0 },
        ],
      }),
    ];
    render(
      <MetricValidationPanel
        summaries={summaries}
        metrics={DEFAULT_METRICS}
        onAcknowledge={onAcknowledge}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /proceed/i }));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /proceed/i })).toBeNull();
  });

  it('renders success alert when there are no issues', () => {
    render(
      <MetricValidationPanel summaries={[makeSummary()]} metrics={DEFAULT_METRICS} />,
    );
    expect(screen.getByText(/all metrics look good/i)).toBeInTheDocument();
  });
});
