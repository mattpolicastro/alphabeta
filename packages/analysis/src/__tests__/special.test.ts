/**
 * Oracle: scipy 1.18.1 (`uv run --with scipy python`), generated 2026-09-04 —
 * scipy.special.betainc / gammaln, scipy.stats.t.sf / t.ppf, norm.sf / norm.ppf.
 */
import { describe, expect, it } from 'vitest';
import {
  betaQuantile, betainc, gaussLegendre, logGamma, normalQuantile, normalSf, studentTQuantile, studentTSf,
} from '../special.js';

describe('betainc vs scipy.special.betainc', () => {
  it.each([
    [0.5, 0.5, 0.5, 0.50000000000000011],
    [1, 1, 0.3, 0.29999999999999999],
    [2, 3, 0.4, 0.52479999999999993],
    [0.5, 2, 1e-6, 0.0014999994999999996],
    [2, 0.5, 0.999999, 0.99850000049997845],
    [10, 10, 0.5, 0.5],
    [100, 100, 0.45, 0.078387932712220235],
    [1000, 9000, 0.1, 0.5035462207518282],
    [951, 9051, 0.09, 0.039918427786820476],
    [5, 5000, 0.0005, 0.10903923233053542],
    [2000, 50, 0.99, 0.99999997898758297],
    [1e4, 1e4, 0.49, 0.0023370593301101656],
    [1e5, 9e5, 0.1005, 0.95205291918810875],
    [0.1, 0.1, 0.01, 0.32030825037562638],
    [3, 7, 0.999, 1],
    [400, 9600, 0.035, 0.0040746830252621343],
  ])('I_%f(%f, %f)', (a, b, x, expected) => {
    const got = betainc(a, b, x);
    // Agreement is ~1e-15 relative for small parameters. For large a + b the
    // prefactor exp(a·ln x + b·ln(1−x) − ln B(a, b)) cancels three numbers of
    // size ~(a+b)·ln(a+b), each carrying Lanczos's ~1e-15 relative error, so
    // the relative error grows like ε·(a+b)·ln(a+b): ~1e-11 at a+b = 10⁴,
    // ~2e-11 at 10⁶ (measured). The tolerance is that model, not a widening;
    // the pages need 1e-6.
    const tol = 1e-13 + 2e-15 * (a + b) * Math.log(a + b) * expected;
    expect(Math.abs(got - expected)).toBeLessThan(tol);
  });

  it('is 0 at 0, 1 at 1, and symmetric', () => {
    expect(betainc(3, 4, 0)).toBe(0);
    expect(betainc(3, 4, 1)).toBe(1);
    expect(betainc(3, 4, 0.3) + betainc(4, 3, 0.7)).toBeCloseTo(1, 14);
  });

  it('betaQuantile inverts it', () => {
    for (const [a, b, p] of [[951, 9051, 0.025], [2, 3, 0.9], [1, 1, 0.3], [1e4, 1e4, 1e-15]]) {
      expect(betainc(a, b, betaQuantile(p, a, b))).toBeCloseTo(p, 13);
    }
  });
});

describe('logGamma vs scipy.special.gammaln', () => {
  it.each([
    [0.5, 0.57236494292469997],
    [1, 0],
    [1.5, -0.12078223763524526],
    [10, 12.801827480081469],
    [100.5, 361.43554046777757],
    [1000, 5905.2204232091808],
    [20000.5, 178070.66998717241],
  ])('lgamma(%f)', (z, expected) => {
    expect(Math.abs(logGamma(z) - expected)).toBeLessThan(1e-13 * Math.max(1, Math.abs(expected)));
  });
});

describe('Student t vs scipy.stats.t', () => {
  it.each([
    [1, 2, 0.14758361765043326],
    [5, 2.5, 0.027245049671188112],
    [30, 1.7, 0.049738937794258427],
    [46.83, 1.658, 0.052001085678541697],
    [1000, 3, 0.0013833545221190948],
    [18997.77, 1.3394, 0.09022825626168296],
    [2, 0.1, 0.4647327192070701],
    [10, 10, 7.9477658779820646e-07],
  ])('sf(t=%f, df=%f)', (df, t, sf) => {
    // Same log-gamma cancellation as betainc: the error grows with df·ln(df).
    expect(Math.abs(studentTSf(t, df) - sf)).toBeLessThan(1e-13 + 2e-15 * df * Math.log(df + 2) * sf);
  });

  it.each([
    [1, 0.975, 12.706204736174694],
    [5, 0.95, 2.0150483733330229],
    [46.834752295107, 0.975, 2.0119278998572883],
    [1000, 0.995, 2.5807546980659506],
    [18997.768933795287, 0.975, 1.9600888634042852],
    [3, 0.9, 1.6377443536962093],
  ])('ppf(df=%f, p=%f)', (df, p, q) => {
    expect(Math.abs(studentTQuantile(p, df) - q)).toBeLessThan(1e-11 * q);
    expect(studentTQuantile(1 - p, df)).toBeCloseTo(-q, 10);
  });
});

describe('normal vs scipy.stats.norm', () => {
  it.each([
    [0.5, 0.30853753872598688],
    [1.96, 0.024997895148220435],
    [3, 0.0013498980316300931],
    [5, 2.8665157187919344e-07],
    [-1, 0.84134474606854293],
    [8, 6.2209605742717405e-16],
  ])('sf(%f)', (z, sf) => {
    expect(Math.abs(normalSf(z) - sf)).toBeLessThan(1e-13 * sf);
  });

  it.each([
    [0.975, 1.959963984540054],
    [0.95, 1.644853626951472],
    [0.995, 2.5758293035489004],
    [0.9, 1.2815515655446004],
    [0.5, 0],
    [0.01, -2.3263478740408408],
    [1e-6, -4.7534243088228987],
  ])('ppf(%f)', (p, q) => {
    expect(Math.abs(normalQuantile(p) - q)).toBeLessThan(1e-13);
  });
});

describe('gaussLegendre', () => {
  it('integrates polynomials of degree 2n − 1 exactly', () => {
    const { x, w } = gaussLegendre(12);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(2, 13);
    const int = x.reduce((acc, xi, i) => acc + w[i] * xi ** 22, 0);
    expect(int).toBeCloseTo(2 / 23, 14);
  });
});
