import {
  welfordUpdate,
  finalizeAccumulators,
  type AccByMetric,
  type VariationAccumulators,
} from '../welford';

/** Batch reference: sample mean and Bessel-corrected sample variance. */
function batchStats(values: number[]): { mean: number; variance: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance =
    n > 1
      ? values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1)
      : 0;
  return { mean, variance };
}

function runWelford(values: number[]): { mean: number; variance: number; n: number } {
  const acc: AccByMetric = {};
  for (const v of values) welfordUpdate(acc, 'm', v);
  const wrapped: VariationAccumulators = { v: acc };
  return finalizeAccumulators(wrapped).v.m;
}

describe('welfordUpdate / finalizeAccumulators', () => {
  it('matches hand-computed mean and sample variance for a small sequence', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] — classic textbook example
    // mean = 5, sample variance = 32/7 ≈ 4.571428571
    const { mean, variance, n } = runWelford([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(n).toBe(8);
    expect(mean).toBeCloseTo(5, 12);
    expect(variance).toBeCloseTo(32 / 7, 12);
  });

  it('returns variance 0 for a single value', () => {
    const { mean, variance, n } = runWelford([42]);
    expect(n).toBe(1);
    expect(mean).toBe(42);
    expect(variance).toBe(0);
  });

  it('returns variance 0 for all-identical values', () => {
    const { mean, variance, n } = runWelford([7, 7, 7, 7, 7]);
    expect(n).toBe(5);
    expect(mean).toBe(7);
    expect(variance).toBe(0);
  });

  it('handles negative, zero, and mixed values', () => {
    const vals = [-3, 0, 3, -1, 1, 2, -2];
    const { mean, variance } = runWelford(vals);
    const batch = batchStats(vals);
    expect(mean).toBeCloseTo(batch.mean, 12);
    expect(variance).toBeCloseTo(batch.variance, 12);
  });

  it('is numerically stable for large magnitudes with small deltas', () => {
    // Naive E[X^2] - E[X]^2 catastrophically cancels here.
    const base = 1e9;
    const vals = [base + 4, base + 7, base + 13, base + 16];
    const { mean, variance } = runWelford(vals);
    // Centered: [4, 7, 13, 16] → mean 10, sample variance 30
    expect(mean).toBeCloseTo(base + 10, 6);
    expect(variance).toBeCloseTo(30, 6);
  });

  it('incremental updates match batch computation at every step', () => {
    const vals = [1.5, -2.3, 4.7, 0, 9.1, -5.2, 3.3, 2.2];
    const acc: AccByMetric = {};
    for (let i = 0; i < vals.length; i++) {
      welfordUpdate(acc, 'm', vals[i]);
      const got = finalizeAccumulators({ v: acc }).v.m;
      const expected = batchStats(vals.slice(0, i + 1));
      expect(got.n).toBe(i + 1);
      expect(got.mean).toBeCloseTo(expected.mean, 12);
      expect(got.variance).toBeCloseTo(expected.variance, 12);
    }
  });

  it('tracks multiple metrics independently', () => {
    const acc: AccByMetric = {};
    welfordUpdate(acc, 'a', 1);
    welfordUpdate(acc, 'a', 3);
    welfordUpdate(acc, 'b', 10);
    welfordUpdate(acc, 'b', 20);
    welfordUpdate(acc, 'b', 30);
    const out = finalizeAccumulators({ v: acc }).v;
    expect(out.a).toEqual({ mean: 2, variance: 2, n: 2 });
    expect(out.b.mean).toBeCloseTo(20, 12);
    expect(out.b.variance).toBeCloseTo(100, 12); // sample variance of [10,20,30]
    expect(out.b.n).toBe(3);
  });

  it('finalizes across multiple variations independently', () => {
    const va: VariationAccumulators = { control: {}, treatment: {} };
    [1, 2, 3].forEach((v) => welfordUpdate(va.control, 'rev', v));
    [10, 20, 30, 40].forEach((v) => welfordUpdate(va.treatment, 'rev', v));
    const out = finalizeAccumulators(va);
    expect(out.control.rev).toEqual({ mean: 2, variance: 1, n: 3 });
    expect(out.treatment.rev.mean).toBeCloseTo(25, 12);
    expect(out.treatment.rev.variance).toBeCloseTo(500 / 3, 12);
    expect(out.treatment.rev.n).toBe(4);
  });
});
