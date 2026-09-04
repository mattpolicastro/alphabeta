/**
 * Two external oracles, generated 2026-09-04 (see README "Oracles").
 *
 * R  — stats::power.prop.test(p1, p2 = p1·(1+mde), sig.level = alpha/(variants−1),
 *      power, alternative = one.sided|two.sided); perVariant = ceiling(n).
 *      This is the convention of the reference calculator on
 *      forwarddigital.org/tools, so it is the one we match: ±1 visitor.
 *
 * PY — spotify-confidence 4.1.0, SampleSize.binomial(baseline·mde, baseline,
 *      alpha (×2 for one-tailed: the function is two-sided only), power,
 *      treatments, 'control_vs_all', treatment_allocations = equal,
 *      bonferroni_correction = True). It sizes with the baseline variance
 *      p₁(1−p₁) in both arms and both z terms (Duflo et al. 2007), so it is
 *      always smaller than R, by 1–13% on this grid, growing with the MDE.
 *      Rather than widen the tolerance we assert that the whole gap is that
 *      variance choice: our n × (spotify's variance ratio) must land on
 *      spotify's number within 0.5%.
 */
import { describe, expect, it } from 'vitest';
import { probit, sampleSize, type SampleSizeInput } from '../power.js';

interface Oracle {
  id: string;
  input: Omit<SampleSizeInput, 'mdeKind'>;
  r: { perVariant: number; total: number };
  py: { perVariant: number; total: number };
}

const cases: Oracle[] = [
  { id: 'A', input: { baseline: 0.005, mde: 0.3, variants: 2, tails: 2, alpha: 0.05, power: 0.8 }, r: { perVariant: 39885, total: 79770 }, py: { perVariant: 34710, total: 69419 } },
  { id: 'B', input: { baseline: 0.02, mde: 0.1, variants: 2, tails: 2, alpha: 0.05, power: 0.8 }, r: { perVariant: 80682, total: 161364 }, py: { perVariant: 76920, total: 153839 } },
  { id: 'C', input: { baseline: 0.02, mde: 0.1, variants: 2, tails: 1, alpha: 0.05, power: 0.8 }, r: { perVariant: 63553, total: 127106 }, py: { perVariant: 60590, total: 121179 } },
  { id: 'D', input: { baseline: 0.05, mde: 0.05, variants: 3, tails: 2, alpha: 0.05, power: 0.8 }, r: { perVariant: 147893, total: 443679 }, py: { perVariant: 144477, total: 433430 } },
  { id: 'E', input: { baseline: 0.1, mde: 0.02, variants: 2, tails: 2, alpha: 0.05, power: 0.9 }, r: { perVariant: 477030, total: 954060 }, py: { perVariant: 472835, total: 945669 } },
  { id: 'F', input: { baseline: 0.1, mde: 0.2, variants: 4, tails: 1, alpha: 0.05, power: 0.8 }, r: { perVariant: 4316, total: 17264 }, py: { perVariant: 3969, total: 15875 } },
  { id: 'G', input: { baseline: 0.2, mde: 0.05, variants: 3, tails: 2, alpha: 0.01, power: 0.8 }, r: { perVariant: 43392, total: 130176 }, py: { perVariant: 42601, total: 127802 } },
  { id: 'H', input: { baseline: 0.2, mde: 0.3, variants: 2, tails: 2, alpha: 0.05, power: 0.8 }, r: { perVariant: 772, total: 1544 }, py: { perVariant: 698, total: 1396 } },
];

describe('oracle: R power.prop.test (the convention we match)', () => {
  it.each(cases)('$id baseline=$input.baseline mde=$input.mde k=$input.variants tails=$input.tails α=$input.alpha power=$input.power', ({ input, r }) => {
    const out = sampleSize({ ...input, mdeKind: 'relative' });
    expect(Math.abs(out.perVariant - r.perVariant)).toBeLessThanOrEqual(1);
    expect(out.total).toBe(out.perVariant * input.variants);
    expect(Math.abs(out.total - r.total)).toBeLessThanOrEqual(input.variants);
  });
});

describe('oracle: spotify-confidence (baseline-variance convention, reconciled)', () => {
  it.each(cases)('$id: the gap to spotify is exactly the variance choice', ({ input, py }) => {
    const out = sampleSize({ ...input, mdeKind: 'relative' });
    const { zAlpha, zBeta, treatmentRate: p2 } = out.assumptions;
    const p1 = input.baseline;
    const sdNull = Math.sqrt((p1 + p2) * (1 - (p1 + p2) / 2));
    const sdAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    const ours = (zAlpha * sdNull + zBeta * sdAlt) ** 2;
    const theirs = (zAlpha + zBeta) ** 2 * 2 * p1 * (1 - p1);
    const reconciled = out.assumptions.nExact * (theirs / ours);
    expect(Math.abs(reconciled - py.perVariant) / py.perVariant).toBeLessThan(0.005);
    expect(py.perVariant).toBeLessThan(out.perVariant);
  });

  it('shares z quantiles with scipy to 1e-8 (the one-tailed alpha×2 mapping is exact)', () => {
    expect(probit(1 - 0.05 / 2)).toBeCloseTo(1.959963985, 8);
    expect(probit(1 - 0.05)).toBeCloseTo(1.644853627, 8);
  });
});
