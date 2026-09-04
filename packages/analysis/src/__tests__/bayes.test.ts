/**
 * Two oracles, generated 2026-09-04 (see README "Bayes"):
 *
 * PY — scipy 1.18.1: every quantity as a 1-D integral of scipy.stats.beta
 *   pdf × sf/cdf with scipy.integrate.quad (epsabs 1e-13) over the ±25 sd
 *   support; credible bounds by scipy.optimize.brentq on the same integral
 *   (xtol 1e-12). Tolerance 1e-6 as specified; actual agreement ~1e-10.
 *
 * MC — Merritt Aho's app (alphanumerritt/bayesian-exp-app) run verbatim in
 *   R 4.5.3 on its own defaults (A 10000/950, B 10010/980, Beta(1,1)),
 *   set.seed(20260904), at its 100 000 draws and at 10⁷. Its statistics are
 *   binomial proportions, so the tolerance is 4 Monte Carlo standard errors,
 *   4·√(p(1−p)/n): ≈ 0.0055 at 10⁵ and ≈ 0.00055 at 10⁷.
 */
import { describe, expect, it } from 'vitest';
import { bayes, expectedLoss, liftInterval, probBest, probLiftAbove } from '../bayes.js';

const py = [
  { id: 'M', arms: [[10000, 950], [10010, 980]], prior: [1, 1], thr: 0.015, level: 0.95, pBetter: 0.75650854436, pGt: 0.637176810507, pGtNeg: 0.851876864172, lossT: 0.00060143674137, lossC: 0.00350287403281, lo: -0.0532450105, hi: 0.1217600493 },
  { id: 'A', arms: [[10000, 400], [10000, 440]], prior: [1, 1], thr: 0.01, level: 0.95, pBetter: 0.920638786956, pGt: 0.896516864225, pGtNeg: 0.940418767618, lossT: 0.00010199304368, lossC: 0.00410119320365, lo: -0.0364758426, hi: 0.2558026782 },
  { id: 'B', arms: [[5000, 100], [5200, 130]], prior: [1, 1], thr: 0.02, level: 0.9, pBetter: 0.955190496892, pGt: 0.938866930912, pGtNeg: 0.968031001091, lossT: 0.00005443765762, lossC: 0.00504513649535, lo: 0.0068663136, hi: 0.550366676 },
  { id: 'C', arms: [[800, 40], [750, 30]], prior: [1, 1], thr: 0, level: 0.95, pBetter: 0.174327528356, pGt: 0.174327528356, pGtNeg: 0.174327528356, lossT: 0.01090182276387, lossC: 0.00100303250548, lo: -0.494806383, hi: 0.2669173876 },
  { id: 'D', arms: [[100000, 2000], [100000, 2100]], prior: [2, 20], thr: 0.01, level: 0.99, pBetter: 0.942656656774, pGt: 0.895345968268, pGtNeg: 0.971461371453, lossT: 0.00001553369939, lossC: 0.00101531374778, lo: -0.0303789101, hi: 0.1370127733 },
  { id: 'E', arms: [[50, 5], [50, 8]], prior: [1, 1], thr: 0.05, level: 0.95, pBetter: 0.805586438213, pGt: 0.776831149674, pGtNeg: 0.833268359347, lossT: 0.00736504779506, lossC: 0.06505735548736, lo: -0.4159382217, hi: 3.3609262918 },
  { id: 'F', arms: [[20000, 1000], [20000, 1000]], prior: [0.5, 0.5], thr: 0.01, level: 0.95, pBetter: 0.5, pGt: 0.409703728727, pGtNeg: 0.591187889471, lossT: 0.00086952917353, lossC: 0.00086952917353, lo: -0.0818883002, hi: 0.0891920887 },
];

describe('oracle: scipy quad over the Beta posteriors', () => {
  it.each(py)('$id', ({ arms, prior, thr, level, pBetter, pGt, pGtNeg, lossT, lossC, lo, hi }) => {
    const out = bayes({
      arms: arms.map(([n, conversions]) => ({ n, conversions })),
      prior: { a: prior[0], b: prior[1] },
      threshold: thr,
      level,
    });
    const t = out.treatments[0];
    expect(Math.abs(t.pBeatsControl - pBetter)).toBeLessThan(1e-6);
    expect(Math.abs(t.pAboveThreshold - pGt)).toBeLessThan(1e-6);
    expect(Math.abs(t.pNotWorse - pGtNeg)).toBeLessThan(1e-6);
    expect(Math.abs(t.lossIfChosen - lossT)).toBeLessThan(1e-6);
    expect(Math.abs(t.lossIfControlKept - lossC)).toBeLessThan(1e-6);
    expect(Math.abs(t.relativeCi[0] - lo)).toBeLessThan(1e-6);
    expect(Math.abs(t.relativeCi[1] - hi)).toBeLessThan(1e-6);
    // Two arms: P(best) is P(beats control) and its complement.
    expect(t.pBest).toBeCloseTo(pBetter, 9);
    expect(out.control.pBest).toBeCloseTo(1 - pBetter, 9);
  });

  it('three arms: P(best) per arm (control 400, 440, 380 of 10 000)', () => {
    const out = bayes({ arms: [{ n: 10000, conversions: 400 }, { n: 10000, conversions: 440 }, { n: 10000, conversions: 380 }] });
    expect(Math.abs(out.control.pBest - 0.076983685555)).toBeLessThan(1e-6);
    expect(Math.abs(out.treatments[0].pBest - 0.911180851705)).toBeLessThan(1e-6);
    expect(Math.abs(out.treatments[1].pBest - 0.01183546274)).toBeLessThan(1e-6);
    const sum = out.control.pBest + out.treatments[0].pBest + out.treatments[1].pBest;
    expect(sum).toBeCloseTo(1, 9);
  });
});

describe("oracle: Merritt's Monte Carlo app on its own example", () => {
  const out = bayes({ arms: [{ n: 10000, conversions: 950 }, { n: 10010, conversions: 980 }], threshold: 0.015 });
  const t = out.treatments[0];
  const mcse = (p: number, n: number) => 4 * Math.sqrt((p * (1 - p)) / n);

  it('at its 100 000 draws (the app as shipped; it rounds to whole percents)', () => {
    const n = 1e5;
    expect(Math.abs(t.pBeatsControl - 0.75554)).toBeLessThan(mcse(0.7565, n));
    expect(Math.abs(t.pAboveThreshold - 0.63666)).toBeLessThan(mcse(0.6372, n));
    expect(Math.abs(t.pNotWorse - 0.85084)).toBeLessThan(mcse(0.8519, n));
    expect(Math.round(t.pBeatsControl * 100)).toBe(76);
  });

  it('at 10⁷ draws (noise ≈ 5e-4)', () => {
    const n = 1e7;
    expect(Math.abs(t.pBeatsControl - 0.756551)).toBeLessThan(mcse(0.7565, n));
    expect(Math.abs(t.pAboveThreshold - 0.637212)).toBeLessThan(mcse(0.6372, n));
    expect(Math.abs(t.pNotWorse - 0.851937)).toBeLessThan(mcse(0.8519, n));
    // Sample quantiles of the lift and the sample mean of the loss, same draws.
    expect(Math.abs(t.relativeCi[0] - -0.05325361)).toBeLessThan(5e-4);
    expect(Math.abs(t.relativeCi[1] - 0.12176181)).toBeLessThan(5e-4);
    expect(Math.abs(t.lossIfChosen - 0.0006015284)).toBeLessThan(5e-6);
    expect(Math.abs(t.lossIfControlKept - 0.0035035978)).toBeLessThan(5e-6);
  });
});

describe('bayes — shape, read, validation', () => {
  it('defaults: Beta(1,1), threshold 0, level 0.95; posterior parameters', () => {
    const out = bayes({ arms: [{ n: 100, conversions: 10 }, { n: 100, conversions: 15 }] });
    expect(out.prior).toEqual({ a: 1, b: 1 });
    expect(out.threshold).toBe(0);
    expect(out.level).toBe(0.95);
    expect(out.control.posterior).toMatchObject({ a: 11, b: 91 });
    expect(out.treatments[0].posterior).toMatchObject({ a: 16, b: 86 });
    expect(out.treatments[0].relativeLift).toBeCloseTo(0.5, 12);
    expect(out.treatments[0].pAboveThreshold).toBe(out.treatments[0].pBeatsControl);
  });

  it('the credible interval brackets the lift with the stated mass', () => {
    const c = { a: 401, b: 9601 };
    const t = { a: 441, b: 9561 };
    const [lo, hi] = liftInterval(c, t, 0.9);
    expect(probLiftAbove(c, t, lo)).toBeCloseTo(0.95, 8);
    expect(probLiftAbove(c, t, hi)).toBeCloseTo(0.05, 8);
    expect(expectedLoss(c, t)).toBeGreaterThan(0);
    expect(probBest([c, t], 0) + probBest([c, t], 1)).toBeCloseTo(1, 9);
  });

  it('reads', () => {
    const clear = bayes({ arms: [{ n: 10000, conversions: 400 }, { n: 10000, conversions: 520 }], threshold: 0.05 });
    expect(clear.treatments[0].read).toBe('beats-control-above-threshold');
    const beats = bayes({ arms: [{ n: 10000, conversions: 400 }, { n: 10000, conversions: 470 }], threshold: 0.2 });
    expect(beats.treatments[0].read).toBe('beats-control');
    const worse = bayes({ arms: [{ n: 10000, conversions: 520 }, { n: 10000, conversions: 400 }] });
    expect(worse.treatments[0].read).toBe('control-better');
    const flat = bayes({ arms: [{ n: 100000, conversions: 5000 }, { n: 100000, conversions: 5010 }], threshold: 0.05 });
    expect(flat.treatments[0].read).toBe('not-worse');
    const meh = bayes({ arms: [{ n: 100, conversions: 10 }, { n: 100, conversions: 11 }] });
    expect(meh.treatments[0].read).toBe('undecided');
  });

  it('rejects impossible inputs with a sentence', () => {
    expect(() => bayes({ arms: [{ n: 10, conversions: 11 }, { n: 10, conversions: 1 }] })).toThrow(/exceed/);
    expect(() => bayes({ arms: [{ n: 10, conversions: 1 }] })).toThrow(/two arms/);
    expect(() => bayes({ arms: [{ n: 10, conversions: 1 }, { n: 10, conversions: 1 }], prior: { a: 0, b: 1 } })).toThrow(/prior/);
    expect(() => bayes({ arms: [{ n: 10, conversions: 1 }, { n: 10, conversions: 1 }], threshold: 1 })).toThrow(/threshold/);
    expect(() => bayes({ arms: [{ n: 10, conversions: 1 }, { n: 10, conversions: 1 }], level: 1 })).toThrow(/level/);
  });
});
