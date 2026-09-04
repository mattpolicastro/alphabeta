/**
 * Bayesian A/B reading of conversion counts: Beta–Binomial with a Beta(a, b)
 * prior per arm (default Beta(1, 1), uniform), every quantity computed by
 * numerical integration of the posterior Beta densities — no Monte Carlo,
 * so the same inputs always give the same digits.
 *
 *   P(lift > t) = ∫ f_c(x) · [1 − F_t((1 + t) x)] dx
 *   E[loss | choose treatment] = E[max(0, p_c − p_t)]
 *                              = ∫ f_c(x) · [x F_t(x) − μ_t F_{t⁺}(x)] dx,  t⁺ = Beta(a_t + 1, b_t)
 *   P(arm i is best) = ∫ f_i(x) · Π_{j ≠ i} F_j(x) dx
 *
 * with f, F the Beta density and CDF (regularized incomplete beta). The
 * equal-tailed credible interval on relative lift inverts P(lift > t) by
 * bisection. Integrals are composite Gauss–Legendre over the quantile range
 * [q(1e-15), q(1 − 1e-15)] of the outer density.
 *
 * Reference: Merritt Aho's Bayesian tool on forwarddigital.org/tools
 * (alphanumerritt/bayesian-exp-app): Beta(1, 1) prior, 100 000 unseeded
 * rbeta draws, P(B > A), P(lift > ROPE upper), P(lift > ROPE lower). We match
 * its prior and its three probabilities exactly (its numbers land within its
 * own Monte Carlo noise of ours) and add expected loss and a credible
 * interval on lift, which it deliberately omits.
 */
import { betaPdf, betaQuantile, betainc, gaussLegendre } from './special.js';

export interface BayesArm {
  name?: string;
  n: number;
  conversions: number;
}

export interface BayesInput {
  /** arms[0] is the control; 2–4 arms. */
  arms: BayesArm[];
  /** Beta(a, b) prior shared by every arm. Default Beta(1, 1). */
  prior?: { a: number; b: number };
  /**
   * Threshold of caring: a relative lift below which you would not act,
   * as a proportion (0.015 = 1.5%). Default 0.
   */
  threshold?: number;
  /** Credible level for the interval on lift, and the bar for the one-line read. Default 0.95. */
  level?: number;
}

export interface Posterior {
  a: number;
  b: number;
  mean: number;
  /** Equal-tailed credible interval on the arm's rate at `level`. */
  ci: [number, number];
}

export interface BayesArmResult {
  name: string;
  n: number;
  conversions: number;
  rate: number;
  posterior: Posterior;
  /** Probability this arm has the highest rate of all arms. */
  pBest: number;
}

export interface BayesComparison extends BayesArmResult {
  /** Observed relative lift, rate / control rate − 1. */
  relativeLift: number;
  /** Equal-tailed credible interval on relative lift at `level`. */
  relativeCi: [number, number];
  /** P(p_t > p_c). */
  pBeatsControl: number;
  /** P(lift > threshold). */
  pAboveThreshold: number;
  /** P(lift > −threshold): not worse than control by more than the threshold. */
  pNotWorse: number;
  /** E[max(0, p_c − p_t)]: rate you expect to give up by choosing this arm when control was better. */
  lossIfChosen: number;
  /** E[max(0, p_t − p_c)]: rate you expect to give up by keeping control when this arm was better. */
  lossIfControlKept: number;
  read: BayesRead;
}

export type BayesRead = 'beats-control-above-threshold' | 'beats-control' | 'not-worse' | 'control-better' | 'undecided';

export interface BayesResult {
  control: BayesArmResult;
  treatments: BayesComparison[];
  prior: { a: number; b: number };
  threshold: number;
  level: number;
  assumptions: {
    model: string;
    method: string;
    prior: string;
    loss: string;
    interval: string;
  };
}

function assertFinite(name: string, v: unknown): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}

const GL = gaussLegendre(12);
const PANELS = 96;
const TAIL = 1e-15;

/** ∫_lo^hi f(x) dx by composite 12-point Gauss–Legendre on `PANELS` equal panels. */
function integrate(f: (x: number) => number, lo: number, hi: number): number {
  if (!(hi > lo)) return 0;
  const h = (hi - lo) / PANELS;
  let sum = 0;
  for (let p = 0; p < PANELS; p++) {
    const c = lo + h * (p + 0.5);
    const r = h / 2;
    for (let i = 0; i < GL.x.length; i++) sum += GL.w[i] * f(c + r * GL.x[i]);
  }
  return (sum * h) / 2;
}

function support(a: number, b: number): [number, number] {
  return [betaQuantile(TAIL, a, b), betaQuantile(1 - TAIL, a, b)];
}

/** P(p_t > (1 + t) · p_c) for independent Beta posteriors. */
export function probLiftAbove(c: { a: number; b: number }, t: { a: number; b: number }, lift: number): number {
  if (lift <= -1) return 1;
  const [lo, hi] = support(c.a, c.b);
  const k = 1 + lift;
  return integrate((x) => betaPdf(x, c.a, c.b) * (1 - betainc(t.a, t.b, k * x)), lo, Math.min(hi, 1 / k));
}

/** E[max(0, p_x − p_y)] — the expected loss of picking y when x turns out better. */
export function expectedLoss(x: { a: number; b: number }, y: { a: number; b: number }): number {
  const [lo, hi] = support(x.a, x.b);
  const meanY = y.a / (y.a + y.b);
  return integrate(
    (v) => betaPdf(v, x.a, x.b) * (v * betainc(y.a, y.b, v) - meanY * betainc(y.a + 1, y.b, v)),
    lo,
    hi,
  );
}

/** P(arm i has the highest rate) for independent Beta posteriors. */
export function probBest(arms: { a: number; b: number }[], i: number): number {
  const [lo, hi] = support(arms[i].a, arms[i].b);
  return integrate((x) => {
    let f = betaPdf(x, arms[i].a, arms[i].b);
    for (let j = 0; j < arms.length && f > 0; j++) if (j !== i) f *= betainc(arms[j].a, arms[j].b, x);
    return f;
  }, lo, hi);
}

/**
 * Equal-tailed credible interval on relative lift: the t with
 * P(lift > t) = 1 − q and = q, q = (1 − level)/2, each by bisection to 1e-10.
 */
export function liftInterval(c: { a: number; b: number }, t: { a: number; b: number }, level: number): [number, number] {
  const q = (1 - level) / 2;
  let top = 1;
  while (probLiftAbove(c, t, top) > q && top < 1e6) top *= 2;
  const solve = (target: number): number => {
    let lo = -1;
    let hi = top;
    for (let i = 0; i < 80 && hi - lo > 1e-10; i++) {
      const mid = (lo + hi) / 2;
      if (probLiftAbove(c, t, mid) > target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  return [solve(1 - q), solve(q)];
}

export function bayes(input: BayesInput): BayesResult {
  const { arms } = input;
  const prior = input.prior ?? { a: 1, b: 1 };
  const threshold = input.threshold ?? 0;
  const level = input.level ?? 0.95;
  if (!Array.isArray(arms) || arms.length < 2) throw new RangeError('at least two arms are needed');
  if (arms.length > 4) throw new RangeError('at most four arms (a control and three treatments)');
  arms.forEach((arm, i) => {
    const label = arm.name ?? (i === 0 ? 'control' : `arm ${i + 1}`);
    assertFinite(`${label} visitors`, arm.n);
    assertFinite(`${label} conversions`, arm.conversions);
    if (!Number.isInteger(arm.n) || arm.n < 1) throw new RangeError(`${label} visitors must be a positive integer`);
    if (!Number.isInteger(arm.conversions) || arm.conversions < 0) throw new RangeError(`${label} conversions must be a non-negative integer`);
    if (arm.conversions > arm.n) throw new RangeError(`${label} conversions (${arm.conversions}) exceed visitors (${arm.n})`);
  });
  assertFinite('prior a', prior.a);
  assertFinite('prior b', prior.b);
  if (prior.a <= 0 || prior.b <= 0) throw new RangeError('prior a and b must be positive');
  assertFinite('threshold', threshold);
  if (threshold < 0 || threshold >= 1) throw new RangeError('threshold must be between 0 and 1 (0.015 for 1.5%)');
  assertFinite('level', level);
  if (level <= 0 || level >= 1) throw new RangeError('level must be strictly between 0 and 1');

  const posts = arms.map((arm) => ({ a: prior.a + arm.conversions, b: prior.b + arm.n - arm.conversions }));
  const describe = (arm: BayesArm, i: number): BayesArmResult => {
    const p = posts[i];
    const q = (1 - level) / 2;
    return {
      name: arm.name ?? (i === 0 ? 'control' : `arm ${i + 1}`),
      n: arm.n,
      conversions: arm.conversions,
      rate: arm.conversions / arm.n,
      posterior: { a: p.a, b: p.b, mean: p.a / (p.a + p.b), ci: [betaQuantile(q, p.a, p.b), betaQuantile(1 - q, p.a, p.b)] },
      pBest: probBest(posts, i),
    };
  };
  const control = describe(arms[0], 0);
  const c = posts[0];
  const treatments = arms.slice(1).map((arm, k): BayesComparison => {
    const i = k + 1;
    const t = posts[i];
    const base = describe(arm, i);
    const pBeatsControl = probLiftAbove(c, t, 0);
    const pAboveThreshold = threshold > 0 ? probLiftAbove(c, t, threshold) : pBeatsControl;
    const pNotWorse = threshold > 0 ? probLiftAbove(c, t, -threshold) : pBeatsControl;
    let read: BayesRead = 'undecided';
    if (pAboveThreshold >= level) read = threshold > 0 ? 'beats-control-above-threshold' : 'beats-control';
    else if (pBeatsControl >= level) read = 'beats-control';
    else if (pNotWorse >= level) read = 'not-worse';
    else if (1 - pBeatsControl >= level) read = 'control-better';
    return {
      ...base,
      relativeLift: control.rate > 0 ? base.rate / control.rate - 1 : NaN,
      relativeCi: liftInterval(c, t, level),
      pBeatsControl,
      pAboveThreshold,
      pNotWorse,
      lossIfChosen: expectedLoss(c, t),
      lossIfControlKept: expectedLoss(t, c),
      read,
    };
  });

  return {
    control,
    treatments,
    prior,
    threshold,
    level,
    assumptions: {
      model: 'independent Beta–Binomial per arm; posterior Beta(a + conversions, b + visitors − conversions)',
      method: 'exact: numerical integration of the posterior densities (composite Gauss–Legendre, 96 × 12 points over the 1e-15 quantile range); no sampling, no seed',
      prior: `Beta(${prior.a}, ${prior.b}) on every arm`,
      loss: 'E[max(0, p_c − p_t)] in rate, pairwise against control',
      interval: `equal-tailed ${level} credible interval on p_t / p_c − 1, by inverting P(lift > t)`,
    },
  };
}
