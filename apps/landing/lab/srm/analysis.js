/**
 * Sample ratio mismatch: Pearson's chi-square goodness-of-fit test of the
 * observed visitor counts against the intended allocation.
 *
 * Self-contained on purpose (the chi-square survival function is computed
 * here from the regularized incomplete gamma function): this file compiles
 * to an import-free ES module that the static /lab/srm page loads directly.
 */
function assertFinite(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new RangeError(`${name} must be a finite number`);
    }
}
export function srm(input) {
    const { expected, observed } = input;
    const threshold = input.alpha ?? 0.001;
    if (!Array.isArray(expected) || !Array.isArray(observed)) {
        throw new RangeError('expected and observed must be arrays');
    }
    if (expected.length < 2)
        throw new RangeError('at least two arms are needed');
    if (expected.length !== observed.length) {
        throw new RangeError(`expected has ${expected.length} arms but observed has ${observed.length}`);
    }
    expected.forEach((w, i) => {
        assertFinite(`expected[${i}]`, w);
        if (w <= 0)
            throw new RangeError(`expected[${i}] must be positive`);
    });
    observed.forEach((o, i) => {
        assertFinite(`observed[${i}]`, o);
        if (o < 0)
            throw new RangeError(`observed[${i}] must be non-negative`);
    });
    assertFinite('alpha', threshold);
    if (threshold <= 0 || threshold >= 1)
        throw new RangeError('alpha must be strictly between 0 and 1');
    const total = observed.reduce((a, b) => a + b, 0);
    if (total <= 0)
        throw new RangeError('observed visitors must total more than zero');
    const wSum = expected.reduce((a, b) => a + b, 0);
    const expectedShares = expected.map((w) => w / wSum);
    const expectedCounts = expectedShares.map((s) => s * total);
    const deviations = observed.map((o, i) => {
        const e = expectedCounts[i];
        return { observed: o, expected: e, diff: o - e, pct: (o - e) / e };
    });
    const chi2 = deviations.reduce((acc, d) => acc + (d.diff * d.diff) / d.expected, 0);
    const df = observed.length - 1;
    const pValue = chiSquareSf(chi2, df);
    return {
        chi2,
        df,
        pValue,
        expectedShares,
        expectedCounts,
        deviations,
        verdict: pValue < threshold ? 'mismatch' : 'ok',
        threshold,
        total,
        assumptions: { test: "Pearson chi-square goodness of fit, no continuity correction (scipy.stats.chisquare)" },
    };
}
/**
 * Upper tail of the chi-square distribution: P(X > x) for X ~ χ²(df),
 * i.e. the regularized upper incomplete gamma Q(df/2, x/2).
 */
export function chiSquareSf(x, df) {
    assertFinite('x', x);
    assertFinite('df', df);
    if (df <= 0)
        throw new RangeError('df must be positive');
    if (x <= 0)
        return 1;
    return gammaQ(df / 2, x / 2);
}
/**
 * Regularized upper incomplete gamma Q(a, x) = Γ(a, x) / Γ(a).
 * Numerical Recipes §6.2: series for x < a + 1, Lentz continued fraction
 * otherwise. Converges to ~1e-15 relative for the df ≤ 100 this is used at.
 */
export function gammaQ(a, x) {
    if (x < 0 || a <= 0)
        return NaN;
    if (x === 0)
        return 1;
    return x < a + 1 ? 1 - gammaSeriesP(a, x) : gammaCfQ(a, x);
}
const EPS = 1e-16;
const FPMIN = 1e-300;
function gammaSeriesP(a, x) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 1000; n++) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * EPS)
            break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}
function gammaCfQ(a, x) {
    let b = x + 1 - a;
    let c = 1 / FPMIN;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 1000; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < FPMIN)
            d = FPMIN;
        c = b + an / c;
        if (Math.abs(c) < FPMIN)
            c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < EPS)
            break;
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}
/** log Γ(z) for z > 0 — Lanczos (g = 7, n = 9), ~1e-15 relative. */
export function logGamma(z) {
    const g = 7;
    const coef = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    if (z < 0.5) {
        // Reflection: Γ(z)Γ(1−z) = π / sin(πz)
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    z -= 1;
    let x = coef[0];
    for (let i = 1; i < g + 2; i++)
        x += coef[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
