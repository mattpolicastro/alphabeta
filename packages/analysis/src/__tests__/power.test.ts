// ported from apps/web/lib/stats/__tests__/powerCalculator.test.ts @ d9d8ba2
// The statsmodels fixture parity block is not ported: it pinned the Cohen's-h
// formula, which this package replaced with power.prop.test (see oracle.test.ts).
import { describe, expect, it } from 'vitest';
import { cohensH, probit, runtimeDays, sampleSize } from '../power.js';

const base = { baseline: 0.02, mde: 0.1, mdeKind: 'relative', variants: 2, tails: 2, alpha: 0.05, power: 0.8 } as const;

describe('cohensH', () => {
  it('returns 0 for identical proportions', () => {
    expect(cohensH(0.2, 0.2)).toBe(0);
  });

  it('is symmetric in magnitude under swap', () => {
    expect(Math.abs(cohensH(0.1, 0.2))).toBeCloseTo(Math.abs(cohensH(0.2, 0.1)), 12);
  });

  it('matches the arcsine-transform definition exactly', () => {
    const expected = 2 * (Math.asin(Math.sqrt(0.45)) - Math.asin(Math.sqrt(0.3)));
    expect(cohensH(0.3, 0.45)).toBe(expected);
  });
});

describe('probit', () => {
  it('is 0 at p = 0.5', () => {
    expect(probit(0.5)).toBeCloseTo(0, 9);
  });

  it('matches R qnorm to 8 decimals', () => {
    expect(probit(0.975)).toBeCloseTo(1.959963985, 8);
    expect(probit(0.995)).toBeCloseTo(2.575829304, 8);
    expect(probit(0.8)).toBeCloseTo(0.841621234, 8);
    expect(probit(0.9)).toBeCloseTo(1.281551566, 8);
    expect(probit(0.01)).toBeCloseTo(-2.326347874, 8);
  });

  it('returns NaN outside (0, 1)', () => {
    expect(Number.isNaN(probit(0))).toBe(true);
    expect(Number.isNaN(probit(1))).toBe(true);
    expect(Number.isNaN(probit(-0.1))).toBe(true);
  });
});

describe('sampleSize — edge cases', () => {
  it('rejects a baseline outside (0, 1)', () => {
    expect(() => sampleSize({ ...base, baseline: 0 })).toThrow(RangeError);
    expect(() => sampleSize({ ...base, baseline: 1 })).toThrow(RangeError);
  });

  it('rejects an MDE that pushes the treatment rate out of (0, 1)', () => {
    expect(() => sampleSize({ ...base, baseline: 0.9, mde: 0.5 })).toThrow(/outside/);
  });

  it('rejects a zero effect', () => {
    expect(() => sampleSize({ ...base, mde: 0 })).toThrow(/non-zero/);
  });

  it('rejects fewer than two variants', () => {
    expect(() => sampleSize({ ...base, variants: 1 })).toThrow(/variants/);
  });

  it('absolute and relative MDE agree when they describe the same treatment rate', () => {
    const rel = sampleSize({ ...base, baseline: 0.05, mde: 0.15, mdeKind: 'relative' });
    const abs = sampleSize({ ...base, baseline: 0.05, mde: 0.0075, mdeKind: 'absolute' });
    expect(abs.assumptions.treatmentRate).toBeCloseTo(rel.assumptions.treatmentRate, 12);
    expect(abs.perVariant).toBe(rel.perVariant);
    expect(abs.assumptions.relativeMde).toBeCloseTo(0.15, 12);
    expect(rel.assumptions.absoluteMde).toBeCloseTo(0.0075, 12);
  });

  it('a one-tailed test needs fewer visitors than two-tailed', () => {
    expect(sampleSize({ ...base, tails: 1 }).perVariant).toBeLessThan(sampleSize(base).perVariant);
  });

  it('a negative MDE sizes the same as its positive mirror around the same pair of rates', () => {
    const up = sampleSize({ ...base, baseline: 0.2, mde: 0.02, mdeKind: 'absolute' });
    const down = sampleSize({ ...base, baseline: 0.22, mde: -0.02, mdeKind: 'absolute' });
    expect(down.perVariant).toBe(up.perVariant);
  });

  it('spreads alpha across variants − 1 comparisons and reports it', () => {
    const two = sampleSize(base);
    const three = sampleSize({ ...base, variants: 3 });
    expect(two.assumptions.correction).toBe('none');
    expect(two.assumptions.alphaPerComparison).toBe(0.05);
    expect(three.assumptions.correction).toBe('bonferroni');
    expect(three.assumptions.alphaPerComparison).toBeCloseTo(0.025, 12);
    expect(three.perVariant).toBeGreaterThan(two.perVariant);
    expect(three.total).toBe(three.perVariant * 3);
  });
});

describe('runtimeDays', () => {
  it('rounds up to whole days', () => {
    expect(runtimeDays({ total: 161364, dailyTraffic: 5000 })).toBe(33);
    expect(runtimeDays({ total: 10000, dailyTraffic: 5000 })).toBe(2);
  });

  it('rejects non-positive traffic', () => {
    expect(() => runtimeDays({ total: 100, dailyTraffic: 0 })).toThrow(RangeError);
  });
});
