/**
 * Two oracles, generated 2026-09-04 (see README "Results"):
 *
 * R 4.5.3 — prop.test(c(x_t, x_c), c(n_t, n_c), alternative, conf.level = 1 − α,
 *   correct = FALSE): z = ±√χ², p, conf.int (treatment − control).
 *   t.test(x, y, alternative, conf.level, var.equal = FALSE) on vectors built
 *   to the exact mean and sd (m + s · scale(1:n)).
 * PY — statsmodels 0.15 proportions_ztest([x_t, x_c], [n_t, n_c]) for z and p
 *   (the CI is the same Wald/unpooled formula, computed by hand); scipy 1.18
 *   ttest_ind_from_stats(equal_var = False) for t, df, p; CI from t.ppf.
 *
 * R and Python agree with each other to all printed digits on every case,
 * so one expected value per case is listed. One-tailed cases use
 * alternative = "greater" / "larger": treatment > control, declared.
 */
import { describe, expect, it } from 'vitest';
import { results, twoProportionTest, welchTest } from '../results.js';

const prop = [
  { id: 'A', c: [10000, 890], t: [10000, 920], tails: 2, alpha: 0.05, z: 0.739401990855, p: 0.459662933739726, lo: -0.00495211760330896, hi: 0.010952117603309 },
  { id: 'B', c: [10000, 890], t: [10000, 920], tails: 1, alpha: 0.05, z: 0.739401990855, p: 0.229831466869863, lo: -0.003673627467097, hi: Infinity },
  { id: 'C', c: [5000, 100], t: [5200, 130], tails: 2, alpha: 0.05, z: 1.700377176771, p: 0.0890600020047467, lo: -0.000750248411949231, hi: 0.0107502484119492 },
  { id: 'D', c: [100000, 2000], t: [100000, 2100], tails: 2, alpha: 0.01, z: 1.577995830956, p: 0.114566567577733, lo: -0.000632332112654807, hi: 0.00263233211265481 },
  { id: 'E', c: [800, 40], t: [750, 30], tails: 2, alpha: 0.05, z: -0.947461554726, p: 0.343403637730075, lo: -0.0306099322924228, hi: 0.0106099322924228 },
  { id: 'F', c: [20000, 1000], t: [20000, 1000], tails: 2, alpha: 0.05, z: 0, p: 1, lo: -0.0042716424707947, hi: 0.0042716424707947 },
  { id: 'G', c: [1500, 300], t: [1500, 345], tails: 1, alpha: 0.1, z: 1.999851868311, p: 0.0227581309060658, lo: 0.010788121463584, hi: Infinity },
  { id: 'H1', c: [10000, 400], t: [10000, 440], tails: 2, alpha: 0.025, z: 1.410060002855, p: 0.158521966192775, lo: -0.00235800265945294, hi: 0.0103580026594529 },
  { id: 'H2', c: [10000, 400], t: [10000, 380], tails: 2, alpha: 0.025, z: -0.730501312351, p: 0.46508381108685, lo: -0.00813653332962818, hi: 0.00413653332962818 },
] as const;

describe('oracle: R prop.test(correct=FALSE) / statsmodels proportions_ztest', () => {
  it.each(prop)('$id', ({ c, t, tails, alpha, z, p, lo, hi }) => {
    const out = twoProportionTest({
      control: { n: c[0], conversions: c[1] },
      treatment: { n: t[0], conversions: t[1] },
      tails,
      alpha,
    });
    expect(Math.abs(out.z - z)).toBeLessThan(1e-11);
    expect(Math.abs(out.pValue - p)).toBeLessThan(1e-9);
    expect(Math.abs(out.absoluteCi[0] - lo)).toBeLessThan(1e-6);
    if (hi === Infinity) expect(out.absoluteCi[1]).toBe(Infinity);
    else expect(Math.abs(out.absoluteCi[1] - hi)).toBeLessThan(1e-6);
  });

  it('relative-lift CI is the delta method (scipy-computed reference, case A and G)', () => {
    const a = twoProportionTest({ control: { n: 10000, conversions: 890 }, treatment: { n: 10000, conversions: 920 }, tails: 2, alpha: 0.05 });
    expect(a.relativeLift).toBeCloseTo(0.0337078651685394, 12);
    expect(a.relativeCi[0]).toBeCloseTo(-0.0571376662319943, 9);
    expect(a.relativeCi[1]).toBeCloseTo(0.124553396569073, 9);
    const g = twoProportionTest({ control: { n: 1500, conversions: 300 }, treatment: { n: 1500, conversions: 345 }, tails: 1, alpha: 0.1 });
    expect(g.relativeCi[0]).toBeCloseTo(0.0468503566681934, 9);
    expect(g.relativeCi[1]).toBe(Infinity);
  });
});

const welch = [
  { id: 'A', c: [10000, 2.57, 19], t: [10000, 2.98, 24], tails: 2, alpha: 0.05, t_: 1.339411616789, df: 18997.768933795287, p: 0.180452732849254, lo: -0.189992133801577, hi: 1.00999213380158 },
  { id: 'B', c: [10000, 2.57, 19], t: [10000, 2.98, 24], tails: 1, alpha: 0.05, t_: 1.339411616789, df: 18997.768933795287, p: 0.0902263664246269, lo: -0.0935217444777499, hi: Infinity },
  { id: 'C', c: [30, 50, 10], t: [25, 55, 12], tails: 2, alpha: 0.05, t_: 1.65809133107, df: 46.834752295107, p: 0.103982969632322, lo: -1.06699963432873, hi: 11.0669996343287 },
  { id: 'D', c: [500, 100, 30], t: [480, 98, 28], tails: 2, alpha: 0.01, t_: -1.079374144442, df: 977.22838893614, p: 0.280687302401141, lo: -6.78215954187563, hi: 2.78215954187562 },
  { id: 'E', c: [200, 3.2, 1.1], t: [210, 3.2, 1.3], tails: 2, alpha: 0.05, t_: 0, df: 402.469437485841, p: 1, lo: -0.233415100153786, hi: 0.233415100153784 },
  { id: 'F', c: [50000, 0.5, 2], t: [51000, 0.52, 2.1], tails: 1, alpha: 0.05, t_: 1.550105433551, df: 100913.310375611152, p: 0.0605596740200584, lo: -0.00122266900396139, hi: Infinity },
  { id: 'G1', c: [1000, 40, 15], t: [1000, 42, 16], tails: 2, alpha: 0.025, t_: 2.883749003642, df: 1989.735272595794, p: 0.00397195013989119, lo: 0.44431646956914, hi: 3.55568353043086 },
  { id: 'G2', c: [1000, 40, 15], t: [1000, 39.5, 14], tails: 2, alpha: 0.025, t_: -0.770599914371, df: 1988.564357992386, p: 0.44103565345044, lo: -1.95542542502811, hi: 0.955425425028114 },
] as const;

describe('oracle: R t.test(var.equal=FALSE) / scipy ttest_ind_from_stats(equal_var=False)', () => {
  it.each(welch)('$id', ({ c, t, tails, alpha, t_, df, p, lo, hi }) => {
    const out = welchTest({
      control: { n: c[0], mean: c[1], sd: c[2] },
      treatment: { n: t[0], mean: t[1], sd: t[2] },
      tails,
      alpha,
    });
    expect(Math.abs(out.t - t_)).toBeLessThan(1e-11);
    expect(Math.abs(out.df - df)).toBeLessThan(1e-8);
    expect(Math.abs(out.pValue - p)).toBeLessThan(1e-9);
    expect(Math.abs(out.absoluteCi[0] - lo)).toBeLessThan(1e-6);
    if (hi === Infinity) expect(out.absoluteCi[1]).toBe(Infinity);
    else expect(Math.abs(out.absoluteCi[1] - hi)).toBeLessThan(1e-6);
  });
});

describe('results — multi-arm, verdicts, validation', () => {
  it('three binomial arms run each treatment vs control at α/2 (oracle cases H1, H2)', () => {
    const out = results({
      metric: 'binomial',
      arms: [{ n: 10000, conversions: 400 }, { n: 10000, conversions: 440 }, { n: 10000, conversions: 380 }],
      tails: 2,
      alpha: 0.05,
    });
    expect(out.correction).toBe('bonferroni');
    expect(out.alphaPerComparison).toBe(0.025);
    expect(out.comparisons).toHaveLength(2);
    expect(out.comparisons[0].pValue).toBeCloseTo(0.158521966192775, 9);
    expect(out.comparisons[0].absoluteCi[1]).toBeCloseTo(0.0103580026594529, 6);
    expect(out.comparisons[1].pValue).toBeCloseTo(0.46508381108685, 9);
    expect(out.comparisons[0].pAdjusted).toBeCloseTo(2 * 0.158521966192775, 9);
    expect(out.comparisons[0].alpha).toBe(0.025);
  });

  it('three continuous arms (oracle cases G1, G2)', () => {
    const out = results({
      metric: 'continuous',
      arms: [{ n: 1000, mean: 40, sd: 15 }, { n: 1000, mean: 42, sd: 16 }, { n: 1000, mean: 39.5, sd: 14 }],
      tails: 2,
      alpha: 0.05,
    });
    expect(out.comparisons[0].verdict).toBe('treatment-better');
    expect(out.comparisons[1].verdict).toBe('inconclusive');
    expect(out.comparisons[0].absoluteCi[0]).toBeCloseTo(0.44431646956914, 6);
  });

  it('two arms is uncorrected', () => {
    const out = results({ metric: 'binomial', arms: [{ n: 100, conversions: 10 }, { n: 100, conversions: 12 }], tails: 2, alpha: 0.05 });
    expect(out.correction).toBe('none');
    expect(out.comparisons[0].pAdjusted).toBe(out.comparisons[0].pValue);
  });

  it('verdicts: worse two-tailed, inconclusive one-tailed when treatment is worse', () => {
    const worse2 = twoProportionTest({ control: { n: 10000, conversions: 500 }, treatment: { n: 10000, conversions: 400 }, tails: 2, alpha: 0.05 });
    expect(worse2.verdict).toBe('treatment-worse');
    const worse1 = twoProportionTest({ control: { n: 10000, conversions: 500 }, treatment: { n: 10000, conversions: 400 }, tails: 1, alpha: 0.05 });
    expect(worse1.verdict).toBe('inconclusive');
    expect(worse1.pValue).toBeGreaterThan(0.99);
    const better = twoProportionTest({ control: { n: 10000, conversions: 400 }, treatment: { n: 10000, conversions: 500 }, tails: 1, alpha: 0.05 });
    expect(better.verdict).toBe('treatment-better');
  });

  it('rejects impossible inputs with a sentence', () => {
    expect(() => twoProportionTest({ control: { n: 100, conversions: 101 }, treatment: { n: 100, conversions: 1 }, tails: 2, alpha: 0.05 })).toThrow(/exceed/);
    expect(() => welchTest({ control: { n: 1, mean: 1, sd: 1 }, treatment: { n: 10, mean: 1, sd: 1 }, tails: 2, alpha: 0.05 })).toThrow(/at least 2/);
    expect(() => results({ metric: 'binomial', arms: [{ n: 10, conversions: 1 }], tails: 2, alpha: 0.05 })).toThrow(/two arms/);
    expect(() => results({ metric: 'binomial', arms: Array(5).fill({ n: 10, conversions: 1 }), tails: 2, alpha: 0.05 })).toThrow(/four/);
    expect(() => twoProportionTest({ control: { n: 10, conversions: 1 }, treatment: { n: 10, conversions: 1 }, tails: 2, alpha: 1 })).toThrow(/alpha/);
  });

  it('relative lift is NaN when the control rate is zero', () => {
    const out = twoProportionTest({ control: { n: 100, conversions: 0 }, treatment: { n: 100, conversions: 5 }, tails: 2, alpha: 0.05 });
    expect(Number.isNaN(out.relativeLift)).toBe(true);
    expect(out.absoluteLift).toBe(0.05);
  });
});
