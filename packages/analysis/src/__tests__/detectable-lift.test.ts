/**
 * detectableLift is the inverse of sampleSize, so it is checked two ways:
 *
 *  1. Round-trip: lift → sampleSize → perVariant → detectableLift → lift′,
 *     within 0.1% relative. The gap is only the ceiling on n (a fraction of
 *     one visitor), so the recovered lift is never above the original.
 *
 *  2. R oracle, generated 2026-09-04 with R 4.5.3:
 *       n <- ceiling(daily * days / k)
 *       power.prop.test(n=n, p1=baseline, sig.level=alpha/(k-1), power,
 *                       alternative=one.sided|two.sided, tol=1e-12)$p2
 *     R searches upward from p1 as we do. Tolerance ±0.05 percentage points
 *     on p2, as specified; the values actually agree far more tightly.
 */
import { describe, expect, it } from 'vitest';
import { detectableLift, sampleSize } from '../power.js';

const roundTrip = [
  { baseline: 0.02, mde: 0.1, variants: 2, tails: 2, alpha: 0.05, power: 0.8 },
  { baseline: 0.005, mde: 0.3, variants: 2, tails: 2, alpha: 0.05, power: 0.8 },
  { baseline: 0.05, mde: 0.05, variants: 3, tails: 2, alpha: 0.05, power: 0.8 },
  { baseline: 0.1, mde: 0.02, variants: 2, tails: 2, alpha: 0.05, power: 0.9 },
  { baseline: 0.1, mde: 0.2, variants: 4, tails: 1, alpha: 0.05, power: 0.8 },
  { baseline: 0.2, mde: 0.05, variants: 3, tails: 2, alpha: 0.01, power: 0.8 },
  { baseline: 0.02, mde: 0.1, variants: 2, tails: 1, alpha: 0.05, power: 0.8 },
  { baseline: 0.5, mde: 0.04, variants: 2, tails: 2, alpha: 0.05, power: 0.8 },
] as const;

describe('detectableLift round-trips sampleSize', () => {
  it.each(roundTrip)('baseline=$baseline mde=$mde k=$variants tails=$tails', (c) => {
    const sized = sampleSize({ ...c, mdeKind: 'relative' });
    // Express the per-arm n as one day of traffic across all arms.
    const out = detectableLift({
      baseline: c.baseline, dailyTraffic: sized.total, runtimeDays: 1,
      variants: c.variants, tails: c.tails, alpha: c.alpha, power: c.power,
    });
    expect(out.perVariant).toBe(sized.perVariant);
    expect(out.total).toBe(sized.total);
    expect(Math.abs(out.mdeRelative - c.mde) / c.mde).toBeLessThan(0.001);
    expect(out.mdeRelative).toBeLessThanOrEqual(c.mde);
    expect(out.mdeAbsolute).toBeCloseTo(out.mdeRelative * c.baseline, 12);
    // Sizing the recovered lift lands back on the same integer n.
    expect(sampleSize({ ...c, mde: out.mdeRelative, mdeKind: 'relative' }).perVariant).toBe(sized.perVariant);
  });
});

const oracle = [
  { id: 'A', input: { baseline: 0.02, dailyTraffic: 10000, runtimeDays: 14, variants: 2, tails: 2, alpha: 0.05, power: 0.8 }, n: 70000, p2: 0.0221509456 },
  { id: 'B', input: { baseline: 0.05, dailyTraffic: 3000, runtimeDays: 21, variants: 3, tails: 2, alpha: 0.05, power: 0.8 }, n: 21000, p2: 0.0567631979 },
  { id: 'C', input: { baseline: 0.1, dailyTraffic: 2000, runtimeDays: 28, variants: 2, tails: 1, alpha: 0.05, power: 0.9 }, n: 28000, p2: 0.1075422977 },
  { id: 'D', input: { baseline: 0.005, dailyTraffic: 50000, runtimeDays: 30, variants: 4, tails: 2, alpha: 0.01, power: 0.8 }, n: 375000, p2: 0.0056343179 },
] as const;

describe('oracle: R power.prop.test solving for p2', () => {
  it.each(oracle)('$id n=$n', ({ input, n, p2 }) => {
    const out = detectableLift(input);
    expect(out.perVariant).toBe(n);
    const ourP2 = input.baseline + out.mdeAbsolute;
    expect(Math.abs(ourP2 - p2)).toBeLessThan(0.0005);
    // Actual agreement is to the digits R printed.
    expect(ourP2).toBeCloseTo(p2, 8);
    expect(out.assumptions.tolerance).toBeLessThan(1e-12);
  });
});

describe('detectableLift — edge cases', () => {
  const base = { baseline: 0.02, dailyTraffic: 1000, runtimeDays: 10, variants: 2, tails: 2, alpha: 0.05, power: 0.8 } as const;

  it('ceils per-variant n from traffic × days / variants', () => {
    expect(detectableLift({ ...base, dailyTraffic: 1001, runtimeDays: 1, variants: 3 }).perVariant).toBe(334);
  });

  it('rejects non-positive traffic or runtime', () => {
    expect(() => detectableLift({ ...base, dailyTraffic: 0 })).toThrow(RangeError);
    expect(() => detectableLift({ ...base, runtimeDays: -1 })).toThrow(RangeError);
  });

  it('propagates sampleSize validation', () => {
    expect(() => detectableLift({ ...base, baseline: 1 })).toThrow(/baseline/);
    expect(() => detectableLift({ ...base, variants: 1 })).toThrow(/variants/);
  });

  it('refuses when no lift under 100% is detectable', () => {
    expect(() => detectableLift({ ...base, dailyTraffic: 4, runtimeDays: 1 })).toThrow(/cannot detect/);
  });

  it('is monotone: more traffic, smaller lift', () => {
    const a = detectableLift(base).mdeRelative;
    const b = detectableLift({ ...base, runtimeDays: 40 }).mdeRelative;
    expect(b).toBeLessThan(a);
    expect(b).toBeCloseTo(a / 2, 1);
  });
});
