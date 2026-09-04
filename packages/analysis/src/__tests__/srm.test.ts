/**
 * Oracle: scipy.stats.chisquare(observed, expected) with
 * expected = weights / sum(weights) × sum(observed), generated 2026-09-04
 * (`uv run --with scipy python`). p-values within 1e-6 as specified; the
 * survival function itself is checked against scipy.stats.chi2.sf to 1e-12.
 */
import { describe, expect, it } from 'vitest';
import { chiSquareSf, logGamma, srm } from '../srm.js';

const oracle = [
  { id: 'A', expected: [0.5, 0.5], observed: [5000, 4800], chi2: 4.08163265306, p: 0.0433517512609, df: 1 },
  { id: 'B', expected: [1, 1, 1], observed: [3400, 3300, 3300], chi2: 2, p: 0.367879441171, df: 2 },
  { id: 'C', expected: [25, 25, 25, 25], observed: [1000, 1000, 1000, 1100], chi2: 7.31707317073, p: 0.0624496827654, df: 3 },
  { id: 'D', expected: [1, 3], observed: [2500, 7600], chi2: 0.3300330033, p: 0.565639655182, df: 1 },
  { id: 'E', expected: [0.9, 0.1], observed: [90200, 9800], chi2: 4.44444444444, p: 0.0350149810197, df: 1 },
  { id: 'F', expected: [0.5, 0.5], observed: [50000, 49000], chi2: 10.101010101, p: 0.00148188077472, df: 1 },
  { id: 'G', expected: [0.2, 0.3, 0.5], observed: [2003, 3011, 4986], chi2: 0.0840333333333, p: 0.958853799543, df: 2 },
  { id: 'H', expected: [0.5, 0.5], observed: [7000, 7000], chi2: 0, p: 1, df: 1 },
];

describe('oracle: scipy.stats.chisquare', () => {
  it.each(oracle)('$id observed=$observed vs $expected', ({ expected, observed, chi2, p, df }) => {
    const out = srm({ expected, observed });
    expect(out.df).toBe(df);
    expect(Math.abs(out.chi2 - chi2)).toBeLessThan(1e-9);
    expect(Math.abs(out.pValue - p)).toBeLessThan(1e-6);
  });
});

describe('chiSquareSf vs scipy.stats.chi2.sf', () => {
  it.each([
    [1, 4.0816326530612, 0.0433517512608633],
    [2, 1.8, 0.406569659740599],
    [3, 6.0, 0.111610225094713],
    [1, 0.001, 0.97477287936996],
    [5, 30.0, 1.4748581038443e-5],
    [10, 3.0, 0.981424063777859],
    [4, 60.0, 2.90086312034046e-12],
  ])('df=%i x=%f', (df, x, sf) => {
    expect(Math.abs(chiSquareSf(x, df) - sf) / sf).toBeLessThan(1e-12);
  });

  it('is 1 at x ≤ 0 and closed-form at df = 2 (exp(−x/2))', () => {
    expect(chiSquareSf(0, 3)).toBe(1);
    expect(chiSquareSf(-1, 3)).toBe(1);
    expect(chiSquareSf(2, 2)).toBeCloseTo(Math.exp(-1), 14);
    expect(chiSquareSf(9, 2)).toBeCloseTo(Math.exp(-4.5), 14);
  });

  it('logGamma matches known values', () => {
    expect(logGamma(1)).toBeCloseTo(0, 14);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 14);
    expect(logGamma(10)).toBeCloseTo(Math.log(362880), 12);
  });
});

describe('srm — verdict and shape', () => {
  it('the textbook case: 5000 vs 4800 at 50/50', () => {
    const out = srm({ expected: [50, 50], observed: [5000, 4800] });
    expect(out.chi2).toBeCloseTo(4.0816, 3);
    expect(out.pValue).toBeCloseTo(0.0434, 3);
    expect(out.expectedShares).toEqual([0.5, 0.5]);
    expect(out.expectedCounts).toEqual([4900, 4900]);
    expect(out.deviations[0]).toEqual({ observed: 5000, expected: 4900, diff: 100, pct: 100 / 4900 });
    expect(out.deviations[1].diff).toBe(-100);
    expect(out.total).toBe(9800);
    // p = 0.043 is not a mismatch at the 0.001 alarm level — but is at 0.05.
    expect(out.threshold).toBe(0.001);
    expect(out.verdict).toBe('ok');
    expect(srm({ expected: [50, 50], observed: [5000, 4800], alpha: 0.05 }).verdict).toBe('mismatch');
  });

  it('flags a real mismatch at the default 0.001', () => {
    expect(srm({ expected: [0.5, 0.5], observed: [50000, 48500] }).verdict).toBe('mismatch');
  });

  it('accepts weights as shares, percents, or ratios', () => {
    const a = srm({ expected: [0.25, 0.75], observed: [260, 740] });
    const b = srm({ expected: [25, 75], observed: [260, 740] });
    const c = srm({ expected: [1, 3], observed: [260, 740] });
    expect(a.chi2).toBe(b.chi2);
    expect(b.chi2).toBe(c.chi2);
  });

  it('rejects malformed input with a readable sentence', () => {
    expect(() => srm({ expected: [1], observed: [10] })).toThrow(/two arms/);
    expect(() => srm({ expected: [1, 1], observed: [10] })).toThrow(/2 arms but observed has 1/);
    expect(() => srm({ expected: [1, 0], observed: [10, 10] })).toThrow(/positive/);
    expect(() => srm({ expected: [1, 1], observed: [10, -1] })).toThrow(/non-negative/);
    expect(() => srm({ expected: [1, 1], observed: [0, 0] })).toThrow(/more than zero/);
    expect(() => srm({ expected: [1, 1], observed: [10, 10], alpha: 1 })).toThrow(/alpha/);
  });
});
