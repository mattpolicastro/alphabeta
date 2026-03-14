import React from 'react';
import { render, screen } from '@testing-library/react';
import { GuardrailSection } from '../GuardrailSection';
import type { MetricResult, Metric, VariationResult } from '@/lib/db/schema';

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: 'guardrail-1',
    name: 'Error Rate',
    type: 'binomial',
    normalization: 'raw_total',
    higherIsBetter: false, // lower error rate is better
    isGuardrail: true,
    tags: [],
    createdAt: 0,
    ...overrides,
  };
}

function makeVariationResult(overrides: Partial<VariationResult> = {}): VariationResult {
  return {
    variationId: 'treatment',
    users: 1000,
    mean: 0.05,
    stddev: 0.01,
    relativeUplift: 0,
    absoluteUplift: 0,
    significant: false,
    cupedApplied: false,
    ...overrides,
  };
}

function makeMetricResult(overrides: Partial<MetricResult> = {}): MetricResult {
  return {
    metricId: 'guardrail-1',
    variationResults: [makeVariationResult()],
    ...overrides,
  };
}

// ── GuardrailSection render tests ─────────────────────────────────────────

describe('GuardrailSection', () => {
  it('renders null when guardrailResults is empty', () => {
    const { container } = render(
      <GuardrailSection guardrailResults={[]} metrics={[makeMetric()]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the "Guardrails:" label when results are present', () => {
    const mr = makeMetricResult({ variationResults: [makeVariationResult()] });
    render(<GuardrailSection guardrailResults={[mr]} metrics={[makeMetric()]} />);
    expect(screen.getByText(/guardrails:/i)).toBeInTheDocument();
  });

  it('shows "safe" badge and green border when no significant negative movement', () => {
    // higherIsBetter: true metric with positive lift — safe
    const mr = makeMetricResult({
      metricId: 'rev-1',
      variationResults: [
        makeVariationResult({ relativeUplift: 0.05, significant: false }),
      ],
    });
    const metric = makeMetric({ id: 'rev-1', name: 'Revenue', higherIsBetter: true });
    const { container } = render(
      <GuardrailSection guardrailResults={[mr]} metrics={[metric]} />,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
    // Card should have border-success class
    const card = container.querySelector('.card');
    expect(card).toHaveClass('border-success');
  });

  it('shows "violated" badge and red border: significant + negative lift (higherIsBetter: true)', () => {
    const mr = makeMetricResult({
      metricId: 'rev-1',
      variationResults: [
        makeVariationResult({ relativeUplift: -0.1, significant: true }),
      ],
    });
    const metric = makeMetric({ id: 'rev-1', name: 'Revenue', higherIsBetter: true });
    const { container } = render(
      <GuardrailSection guardrailResults={[mr]} metrics={[metric]} />,
    );
    expect(screen.getByText('violated')).toBeInTheDocument();
    const card = container.querySelector('.card');
    expect(card).toHaveClass('border-danger');
  });

  it('shows "safe" when significant negative lift but higherIsBetter: false (negative is good)', () => {
    // higherIsBetter: false means lower is better.
    // lift < 0 means metric went down → that is GOOD direction → safe.
    const mr = makeMetricResult({
      metricId: 'err-1',
      variationResults: [
        makeVariationResult({ relativeUplift: -0.1, significant: true }),
      ],
    });
    const metric = makeMetric({ id: 'err-1', name: 'Error Rate', higherIsBetter: false });
    const { container } = render(
      <GuardrailSection guardrailResults={[mr]} metrics={[metric]} />,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
    const card = container.querySelector('.card');
    expect(card).toHaveClass('border-success');
  });

  it('shows "violated" when higherIsBetter: false and lift is positive + significant', () => {
    // higherIsBetter: false, lift > 0 → error rate went UP → violated
    const mr = makeMetricResult({
      metricId: 'err-1',
      variationResults: [
        makeVariationResult({ relativeUplift: 0.15, significant: true }),
      ],
    });
    const metric = makeMetric({ id: 'err-1', name: 'Error Rate', higherIsBetter: false });
    const { container } = render(
      <GuardrailSection guardrailResults={[mr]} metrics={[metric]} />,
    );
    expect(screen.getByText('violated')).toBeInTheDocument();
    const card = container.querySelector('.card');
    expect(card).toHaveClass('border-danger');
  });

  it('shows "borderline" badge and yellow border: Bayesian chanceToBeatControl < 0.2 with negative direction', () => {
    // higherIsBetter: true, negative lift (bad direction), not significant but low chanceToBeatControl
    const mr = makeMetricResult({
      metricId: 'rev-1',
      variationResults: [
        makeVariationResult({
          relativeUplift: -0.05,
          significant: false,
          chanceToBeatControl: 0.15,
        }),
      ],
    });
    const metric = makeMetric({ id: 'rev-1', name: 'Revenue', higherIsBetter: true });
    const { container } = render(
      <GuardrailSection guardrailResults={[mr]} metrics={[metric]} />,
    );
    expect(screen.getByText('borderline')).toBeInTheDocument();
    const card = container.querySelector('.card');
    expect(card).toHaveClass('border-warning');
  });

  it('shows "borderline" badge: frequentist p-value < 0.1 and not significant with negative direction', () => {
    const mr = makeMetricResult({
      metricId: 'rev-1',
      variationResults: [
        makeVariationResult({
          relativeUplift: -0.04,
          significant: false,
          pValue: 0.07,
        }),
      ],
    });
    const metric = makeMetric({ id: 'rev-1', name: 'Revenue', higherIsBetter: true });
    render(<GuardrailSection guardrailResults={[mr]} metrics={[metric]} />);
    expect(screen.getByText('borderline')).toBeInTheDocument();
  });

  it('displays metric name in the guardrail status', () => {
    const mr = makeMetricResult({ metricId: 'rev-1' });
    const metric = makeMetric({ id: 'rev-1', name: 'Revenue Per User', higherIsBetter: true });
    render(<GuardrailSection guardrailResults={[mr]} metrics={[metric]} />);
    expect(screen.getByText('Revenue Per User')).toBeInTheDocument();
  });

  it('uses metricId as fallback name when metric is not found in metrics array', () => {
    const mr = makeMetricResult({ metricId: 'unknown-metric' });
    render(<GuardrailSection guardrailResults={[mr]} metrics={[]} />);
    expect(screen.getByText('unknown-metric')).toBeInTheDocument();
  });

  it('renders multiple guardrail metrics', () => {
    const mr1 = makeMetricResult({ metricId: 'm1' });
    const mr2 = makeMetricResult({
      metricId: 'm2',
      variationResults: [makeVariationResult({ relativeUplift: -0.2, significant: true })],
    });
    const metric1 = makeMetric({ id: 'm1', name: 'Latency', higherIsBetter: false });
    const metric2 = makeMetric({ id: 'm2', name: 'Revenue', higherIsBetter: true });
    render(
      <GuardrailSection guardrailResults={[mr1, mr2]} metrics={[metric1, metric2]} />,
    );
    expect(screen.getByText('Latency')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    // One safe, one violated → card should be border-danger
    const { container } = render(
      <GuardrailSection guardrailResults={[mr1, mr2]} metrics={[metric1, metric2]} />,
    );
    expect(container.querySelector('.card')).toHaveClass('border-danger');
  });
});
