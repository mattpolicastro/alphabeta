/**
 * Sample size for a two-proportion z-test.
 *
 * adapted from apps/web/lib/stats/powerCalculator.ts @ d9d8ba2
 *
 * Two things changed in the adaptation, both deliberate (see README):
 *  - The sample-size formula follows R's `power.prop.test()` (pooled variance
 *    under H0, unpooled under H1, no continuity correction), which is what the
 *    reference calculator on forwarddigital.org/tools uses. The legacy
 *    Cohen's-h / arcsine formula is kept only as the exported `cohensH`.
 *  - `probit` is Acklam's rational approximation (relative error ~1.15e-9)
 *    instead of Abramowitz & Stegun 26.2.23 (~4.5e-4), so the integer result
 *    matches R's `ceiling(n)` rather than landing a few units off.
 *
 * Self-contained on purpose: this file compiles to an import-free ES module
 * that the static /lab pages load directly.
 */
function assertFinite(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new RangeError(`${name} must be a finite number`);
    }
}
function assertOpenUnit(name, v) {
    if (v <= 0 || v >= 1)
        throw new RangeError(`${name} must be strictly between 0 and 1`);
}
/**
 * Required sample size per arm for a two-proportion z-test, following R's
 * `power.prop.test(p1, p2, sig.level, power, alternative)`:
 *
 *   n = ((z_α · √(2·p̄·q̄) + z_β · √(p₁q₁ + p₂q₂)) / |p₂ − p₁|)²
 *
 * where p̄ = (p₁+p₂)/2 and z_α is the upper α'/tails quantile with
 * α' = α / (variants − 1) (Bonferroni across the arm-vs-control comparisons;
 * a no-op at two variants). Arms are sized equally.
 */
export function sampleSize(input) {
    const { baseline, mde, mdeKind, variants, tails, alpha, power } = input;
    assertFinite('baseline', baseline);
    assertFinite('mde', mde);
    assertFinite('variants', variants);
    assertFinite('alpha', alpha);
    assertFinite('power', power);
    assertOpenUnit('baseline', baseline);
    assertOpenUnit('alpha', alpha);
    assertOpenUnit('power', power);
    if (mdeKind !== 'relative' && mdeKind !== 'absolute') {
        throw new RangeError("mdeKind must be 'relative' or 'absolute'");
    }
    if (tails !== 1 && tails !== 2)
        throw new RangeError('tails must be 1 or 2');
    if (!Number.isInteger(variants) || variants < 2) {
        throw new RangeError('variants must be an integer of at least 2 (including control)');
    }
    if (mde === 0)
        throw new RangeError('mde must be non-zero');
    const p1 = baseline;
    const p2 = mdeKind === 'relative' ? p1 * (1 + mde) : p1 + mde;
    if (p2 <= 0 || p2 >= 1) {
        throw new RangeError('mde pushes the treatment rate outside (0, 1)');
    }
    const comparisons = variants - 1;
    const alphaPerComparison = alpha / comparisons;
    if (power <= alphaPerComparison) {
        throw new RangeError('power must exceed the per-comparison alpha');
    }
    const zAlpha = probit(1 - alphaPerComparison / tails);
    const zBeta = probit(power);
    const delta = Math.abs(p2 - p1);
    const pSum = p1 + p2;
    const sdNull = Math.sqrt(pSum * (1 - pSum / 2));
    const sdAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    const nExact = ((zAlpha * sdNull + zBeta * sdAlt) / delta) ** 2;
    const perVariant = Math.ceil(nExact);
    return {
        perVariant,
        total: perVariant * variants,
        assumptions: {
            test: 'two-proportion z-test, equal arms, no continuity correction (R power.prop.test)',
            treatmentRate: p2,
            absoluteMde: p2 - p1,
            relativeMde: (p2 - p1) / p1,
            comparisons,
            correction: comparisons > 1 ? 'bonferroni' : 'none',
            alphaPerComparison,
            zAlpha,
            zBeta,
            nExact,
        },
    };
}
/** Whole days to reach `total` visitors at `dailyTraffic` per day. */
export function runtimeDays({ total, dailyTraffic }) {
    assertFinite('total', total);
    assertFinite('dailyTraffic', dailyTraffic);
    if (total < 0)
        throw new RangeError('total must be non-negative');
    if (dailyTraffic <= 0)
        throw new RangeError('dailyTraffic must be positive');
    return Math.ceil(total / dailyTraffic);
}
/**
 * Cohen's h effect size for two proportions.
 * h = 2 * (arcsin(sqrt(p2)) − arcsin(sqrt(p1)))
 */
export function cohensH(pBaseline, pTreatment) {
    return 2 * (Math.asin(Math.sqrt(pTreatment)) - Math.asin(Math.sqrt(pBaseline)));
}
/**
 * Inverse normal CDF (probit). Acklam's rational approximation, relative
 * error below 1.15e-9 across (0, 1). Returns NaN outside (0, 1).
 */
export function probit(p) {
    if (!(p > 0 && p < 1))
        return NaN;
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const pLow = 0.02425;
    if (p < pLow) {
        const q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - pLow) {
        const q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
