/**
 * Reading a finished test: two-proportion z-test for binomial metrics,
 * Welch's t-test for continuous ones, each treatment against the control
 * with Bonferroni across the comparisons (α / (arms − 1), the same split
 * `sampleSize` uses).
 *
 * Conventions — see README "Results":
 *  - Binomial: pooled-variance z and p exactly as R `prop.test(correct = FALSE)`
 *    / statsmodels `proportions_ztest`; the CI on the difference is Wald with
 *    unpooled SE, which is what `prop.test` reports.
 *  - Continuous: Welch's t with Welch–Satterthwaite df, R `t.test(var.equal = FALSE)`
 *    / scipy `ttest_ind_from_stats(equal_var = False)`.
 *  - Relative lift CI: delta method on p_t / p_c − 1, same quantile as the
 *    difference CI.
 *  - One-tailed means the direction was declared in advance: treatment > control.
 *    The p-value is the upper tail and the CI is one-sided (upper bound +∞).
 */
import { normalQuantile, normalSf, studentTQuantile, studentTSf } from '../analysis/special.js';
function assertFinite(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new RangeError(`${name} must be a finite number`);
    }
}
function assertOptions({ tails, alpha }) {
    if (tails !== 1 && tails !== 2)
        throw new RangeError('tails must be 1 or 2');
    assertFinite('alpha', alpha);
    if (alpha <= 0 || alpha >= 1)
        throw new RangeError('alpha must be strictly between 0 and 1');
}
function assertBinomialArm(label, arm) {
    assertFinite(`${label} visitors`, arm.n);
    assertFinite(`${label} conversions`, arm.conversions);
    if (!Number.isInteger(arm.n) || arm.n < 1)
        throw new RangeError(`${label} visitors must be a positive integer`);
    if (!Number.isInteger(arm.conversions) || arm.conversions < 0)
        throw new RangeError(`${label} conversions must be a non-negative integer`);
    if (arm.conversions > arm.n)
        throw new RangeError(`${label} conversions (${arm.conversions}) exceed visitors (${arm.n})`);
}
function assertContinuousArm(label, arm) {
    assertFinite(`${label} n`, arm.n);
    assertFinite(`${label} mean`, arm.mean);
    assertFinite(`${label} sd`, arm.sd);
    if (!Number.isInteger(arm.n) || arm.n < 2)
        throw new RangeError(`${label} n must be an integer of at least 2`);
    if (arm.sd < 0)
        throw new RangeError(`${label} sd must be non-negative`);
}
function verdictOf(p, alpha, tails, diff) {
    if (!(p < alpha))
        return 'inconclusive';
    if (tails === 1)
        return 'treatment-better';
    return diff > 0 ? 'treatment-better' : 'treatment-worse';
}
function interval(center, se, q, tails) {
    return [center - q * se, tails === 2 ? center + q * se : Infinity];
}
/**
 * Two-proportion z-test, treatment vs control.
 *
 *   z = (p_t − p_c) / √(p̄(1 − p̄)(1/n_t + 1/n_c)),  p̄ = (x_t + x_c)/(n_t + n_c)
 *
 * p is the two-sided tail 2·P(Z > |z|), or P(Z > z) one-tailed. The CI on
 * the difference is p_t − p_c ± q · √(p_t q_t / n_t + p_c q_c / n_c) with q the
 * upper α/tails normal quantile — R `prop.test(correct = FALSE)$conf.int`.
 * The relative-lift CI is the delta method on r = p_t / p_c − 1:
 * Var(r) ≈ Var(p_t)/p_c² + p_t² Var(p_c)/p_c⁴, same quantile.
 */
export function twoProportionTest(input) {
    const { control, treatment, tails, alpha } = input;
    assertOptions(input);
    assertBinomialArm(control.name ?? 'control', control);
    assertBinomialArm(treatment.name ?? 'treatment', treatment);
    const pc = control.conversions / control.n;
    const pt = treatment.conversions / treatment.n;
    const pooled = (control.conversions + treatment.conversions) / (control.n + treatment.n);
    const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / control.n + 1 / treatment.n));
    const seDiff = Math.sqrt((pt * (1 - pt)) / treatment.n + (pc * (1 - pc)) / control.n);
    const diff = pt - pc;
    const z = sePooled > 0 ? diff / sePooled : 0;
    const pValue = tails === 2 ? Math.min(1, 2 * normalSf(Math.abs(z))) : normalSf(z);
    const q = normalQuantile(1 - alpha / tails);
    const absoluteCi = interval(diff, seDiff, q, tails);
    let relativeLift = NaN;
    let relativeCi = [NaN, NaN];
    if (pc > 0) {
        relativeLift = pt / pc - 1;
        const varT = (pt * (1 - pt)) / treatment.n;
        const varC = (pc * (1 - pc)) / control.n;
        const seRel = Math.sqrt(varT / (pc * pc) + (pt * pt * varC) / pc ** 4);
        relativeCi = interval(relativeLift, seRel, q, tails);
    }
    return {
        control: { name: control.name ?? 'control', n: control.n, conversions: control.conversions, rate: pc },
        treatment: { name: treatment.name ?? 'treatment', n: treatment.n, conversions: treatment.conversions, rate: pt },
        tails,
        alpha,
        z,
        pValue,
        absoluteLift: diff,
        absoluteCi,
        relativeLift,
        relativeCi,
        seDiff,
        sePooled,
        verdict: verdictOf(pValue, alpha, tails, diff),
        assumptions: {
            test: 'two-proportion z-test, pooled variance under H₀, no continuity correction (R prop.test(correct=FALSE))',
            ci: `Wald, unpooled SE, ${tails === 2 ? 'two-sided' : 'one-sided (lower bound)'} at ${1 - alpha} (R prop.test conf.int)`,
            relativeCi: 'delta method on p_t / p_c − 1, same normal quantile',
            quantile: q,
        },
    };
}
/**
 * Welch's t-test, treatment vs control, from summary statistics.
 *
 *   t = (m_t − m_c) / √(s_t²/n_t + s_c²/n_c)
 *   ν = (s_t²/n_t + s_c²/n_c)² / ((s_t²/n_t)²/(n_t − 1) + (s_c²/n_c)²/(n_c − 1))
 *
 * p from the Student-t tail at ν; the CI is m_t − m_c ± t_{α/tails, ν} · SE
 * — R `t.test(var.equal = FALSE)`, scipy `ttest_ind_from_stats(equal_var = False)`.
 * Relative lift by the delta method on m_t / m_c − 1 with the same t quantile.
 */
export function welchTest(input) {
    const { control, treatment, tails, alpha } = input;
    assertOptions(input);
    assertContinuousArm(control.name ?? 'control', control);
    assertContinuousArm(treatment.name ?? 'treatment', treatment);
    const vt = (treatment.sd * treatment.sd) / treatment.n;
    const vc = (control.sd * control.sd) / control.n;
    const seDiff = Math.sqrt(vt + vc);
    if (!(seDiff > 0))
        throw new RangeError('both arms have zero variance — nothing to test');
    const df = ((vt + vc) * (vt + vc)) / ((vt * vt) / (treatment.n - 1) + (vc * vc) / (control.n - 1));
    const diff = treatment.mean - control.mean;
    const t = diff / seDiff;
    const pValue = tails === 2 ? Math.min(1, 2 * studentTSf(Math.abs(t), df)) : studentTSf(t, df);
    const q = studentTQuantile(1 - alpha / tails, df);
    const absoluteCi = interval(diff, seDiff, q, tails);
    let relativeLift = NaN;
    let relativeCi = [NaN, NaN];
    if (control.mean !== 0) {
        const mc = control.mean;
        const mt = treatment.mean;
        relativeLift = mt / mc - 1;
        const seRel = Math.sqrt(vt / (mc * mc) + (mt * mt * vc) / mc ** 4);
        relativeCi = interval(relativeLift, seRel, q, tails);
    }
    return {
        control: { name: control.name ?? 'control', n: control.n, mean: control.mean, sd: control.sd },
        treatment: { name: treatment.name ?? 'treatment', n: treatment.n, mean: treatment.mean, sd: treatment.sd },
        tails,
        alpha,
        t,
        df,
        pValue,
        absoluteLift: diff,
        absoluteCi,
        relativeLift,
        relativeCi,
        seDiff,
        verdict: verdictOf(pValue, alpha, tails, diff),
        assumptions: {
            test: "Welch's t-test, unequal variances, Welch–Satterthwaite df (R t.test(var.equal=FALSE))",
            ci: `t interval on the mean difference, ${tails === 2 ? 'two-sided' : 'one-sided (lower bound)'} at ${1 - alpha}`,
            relativeCi: 'delta method on m_t / m_c − 1, same t quantile',
            quantile: q,
        },
    };
}
/**
 * Every treatment (arms[1..]) against the control (arms[0]). With more than
 * two arms each comparison runs at α / (arms − 1) — Bonferroni, the split
 * `sampleSize` sizes for — and `pAdjusted = min(1, p · comparisons)` is
 * reported alongside the raw p for anyone who prefers to adjust p instead.
 */
export function results(input) {
    assertOptions(input);
    const { arms, tails, alpha } = input;
    if (!Array.isArray(arms) || arms.length < 2)
        throw new RangeError('at least two arms are needed');
    if (arms.length > 4)
        throw new RangeError('at most four arms (a control and three treatments)');
    const comparisons = arms.length - 1;
    const alphaPerComparison = alpha / comparisons;
    const meta = {
        arms: arms.length,
        comparisonCount: comparisons,
        correction: comparisons > 1 ? 'bonferroni' : 'none',
        alpha,
        alphaPerComparison,
        tails,
    };
    const adjust = (p) => Math.min(1, p * comparisons);
    if (input.metric === 'binomial') {
        const [control, ...treatments] = input.arms;
        return {
            metric: 'binomial',
            ...meta,
            comparisons: treatments.map((treatment) => {
                const r = twoProportionTest({ control, treatment, tails, alpha: alphaPerComparison });
                return { ...r, pAdjusted: adjust(r.pValue) };
            }),
        };
    }
    if (input.metric === 'continuous') {
        const [control, ...treatments] = input.arms;
        return {
            metric: 'continuous',
            ...meta,
            comparisons: treatments.map((treatment) => {
                const r = welchTest({ control, treatment, tails, alpha: alphaPerComparison });
                return { ...r, pAdjusted: adjust(r.pValue) };
            }),
        };
    }
    throw new RangeError("metric must be 'binomial' or 'continuous'");
}
