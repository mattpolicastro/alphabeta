/**
 * Pure-math sample-size / power calculation for a two-proportion z-test.
 *
 * Mirrors R's `pwr.2p2n.test` and Python's
 * `statsmodels.stats.power.NormalIndPower(...).solve_power`. The
 * `scripts/power-calc-reference.py` script is the authoritative fixture
 * generator; `powerCalculator.test.ts` checks parity against its output.
 */

export interface PowerCalcInput {
  /** Baseline (control) proportion, in (0, 1). */
  pBaseline: number;
  /**
   * Minimum detectable effect. Relative (e.g. 0.15 = 15% lift over baseline)
   * when `mdeMode` is `'relative'`; absolute rate difference when `'absolute'`.
   */
  mde: number;
  mdeMode?: 'relative' | 'absolute';
  /** Significance level (two-sided). */
  alpha: number;
  /** Desired statistical power (1 − β). */
  power: number;
  /** n_treatment / n_control. Default 1.0 (equal split). */
  ratio?: number;
}

export interface PowerCalcResult {
  nControl: number;
  nTreatment: number;
  totalN: number;
  /** Cohen's h effect size. */
  h: number;
  /** Implied treatment rate used in the calculation. */
  pTreatment: number;
}

/**
 * Cohen's h effect size for two proportions.
 * h = 2 * (arcsin(sqrt(p2)) − arcsin(sqrt(p1)))
 */
export function cohensH(pBaseline: number, pTreatment: number): number {
  return (
    2 *
    (Math.asin(Math.sqrt(pTreatment)) - Math.asin(Math.sqrt(pBaseline)))
  );
}

/**
 * Compute the required per-variation sample size for a two-proportion test.
 * Returns `null` when the inputs are out of range or the effect size is
 * effectively zero (no finite sample can detect it).
 */
export function computePowerCalc(input: PowerCalcInput): PowerCalcResult | null {
  const { pBaseline, alpha, power } = input;
  const ratio = input.ratio ?? 1.0;
  const mdeMode = input.mdeMode ?? 'relative';

  const pTreatment =
    mdeMode === 'relative' ? pBaseline * (1 + input.mde) : pBaseline + input.mde;

  if (
    pBaseline <= 0 ||
    pBaseline >= 1 ||
    pTreatment <= 0 ||
    pTreatment >= 1 ||
    alpha <= 0 ||
    alpha >= 1 ||
    power <= 0 ||
    power >= 1 ||
    ratio <= 0
  ) {
    return null;
  }

  const h = cohensH(pBaseline, pTreatment);
  if (Math.abs(h) < 1e-10) return null;

  const zAlpha = probit(1 - alpha / 2);
  const zBeta = probit(power);

  // Two-sample normal approximation for proportions with unequal n:
  //   n_control = (z_{α/2} + z_β)^2 * (1 + 1/ratio) / h^2
  //   n_treatment = n_control * ratio
  // Matches statsmodels NormalIndPower(alternative='two-sided').solve_power.
  const nControl = Math.ceil(
    ((zAlpha + zBeta) ** 2 * (1 + 1 / ratio)) / (h * h),
  );
  const nTreatment = Math.ceil(nControl * ratio);

  return {
    nControl,
    nTreatment,
    totalN: nControl + nTreatment,
    h,
    pTreatment,
  };
}

/**
 * Inverse normal CDF (probit) — rational approximation from
 * Abramowitz & Stegun 26.2.23. Accurate to ~4.5×10⁻⁴ absolute error.
 */
export function probit(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  if (p < 0.5) return -probit(1 - p);

  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return (
    t -
    (c0 + c1 * t + c2 * t * t) /
      (1 + d1 * t + d2 * t * t + d3 * t * t * t)
  );
}
