/**
 * Special functions shared by results.ts and bayes.ts: log-gamma, the
 * regularized incomplete gamma and beta functions, and the normal and
 * Student-t distribution functions built on them. Numerical Recipes §6.1–6.4
 * (Lanczos, series / Lentz continued fractions), all in double precision.
 *
 * Import-free so it compiles to one ES module; results.js and bayes.js
 * import it by relative path, and `sync:landing` copies it alongside them.
 */
/** log Γ(z) for z > 0 — Lanczos (g = 7, n = 9), ~1e-15 relative. */
export function logGamma(z) {
    const g = 7;
    const coef = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
        1.5056327351493116e-7,
    ];
    if (z < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    z -= 1;
    let x = coef[0];
    for (let i = 1; i < g + 2; i++)
        x += coef[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
/** log B(a, b) = log Γ(a) + log Γ(b) − log Γ(a + b). */
export function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
}
const EPS = 1e-16;
const FPMIN = 1e-300;
/**
 * Regularized upper incomplete gamma Q(a, x) = Γ(a, x) / Γ(a).
 * Series for x < a + 1, Lentz continued fraction otherwise.
 */
export function gammaQ(a, x) {
    if (x < 0 || a <= 0)
        return NaN;
    if (x === 0)
        return 1;
    const prefix = Math.exp(-x + a * Math.log(x) - logGamma(a));
    if (x < a + 1) {
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
        return 1 - sum * prefix;
    }
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
    return prefix * h;
}
/**
 * Regularized incomplete beta I_x(a, b) = B(x; a, b) / B(a, b), i.e. the
 * CDF of Beta(a, b) at x. NR §6.4: the continued fraction converges fast for
 * x < (a + 1)/(a + b + 2); the symmetry I_x(a, b) = 1 − I_{1−x}(b, a) covers
 * the rest. Iterations scale like √max(a, b), so a posterior with 10⁵
 * conversions costs a few hundred terms.
 */
export function betainc(a, b, x) {
    if (!(a > 0) || !(b > 0))
        return NaN;
    if (x <= 0)
        return 0;
    if (x >= 1)
        return 1;
    const front = Math.exp(a * Math.log(x) + b * Math.log1p(-x) - logBeta(a, b));
    if (x < (a + 1) / (a + b + 2))
        return (front * betacf(a, b, x)) / a;
    return 1 - (front * betacf(b, a, 1 - x)) / b;
}
function betacf(a, b, x) {
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN)
        d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 20000; m++) {
        const m2 = 2 * m;
        let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN)
            d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN)
            c = FPMIN;
        d = 1 / d;
        h *= d * c;
        aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN)
            d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN)
            c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < EPS)
            break;
    }
    return h;
}
/** Density of Beta(a, b) at x; 0 outside (0, 1). */
export function betaPdf(x, a, b) {
    if (x <= 0 || x >= 1)
        return 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - logBeta(a, b));
}
/** Quantile of Beta(a, b): bisection on betainc to ~1e-15. */
export function betaQuantile(p, a, b) {
    if (p <= 0)
        return 0;
    if (p >= 1)
        return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 200 && hi - lo > 1e-16; i++) {
        const mid = (lo + hi) / 2;
        if (betainc(a, b, mid) < p)
            lo = mid;
        else
            hi = mid;
    }
    return (lo + hi) / 2;
}
/** Upper tail of the standard normal, P(Z > z), via the incomplete gamma: ~1e-15. */
export function normalSf(z) {
    if (z === 0)
        return 0.5;
    const half = 0.5 * gammaQ(0.5, (z * z) / 2);
    return z > 0 ? half : 1 - half;
}
export function normalCdf(z) {
    return normalSf(-z);
}
/**
 * Inverse normal CDF. Acklam's rational approximation (~1e-9) polished with
 * one Halley step against `normalCdf`, which brings it to double precision.
 * Returns NaN outside (0, 1).
 */
export function normalQuantile(p) {
    if (!(p > 0 && p < 1))
        return NaN;
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const pLow = 0.02425;
    let x;
    if (p < pLow) {
        const q = Math.sqrt(-2 * Math.log(p));
        x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    else if (p > 1 - pLow) {
        const q = Math.sqrt(-2 * Math.log(1 - p));
        x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    else {
        const q = p - 0.5;
        const r = q * q;
        x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    // Halley refinement: e = Φ(x) − p, u = e / φ(x), x ← x − u / (1 + x·u/2).
    const e = normalCdf(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
    return x - u / (1 + (x * u) / 2);
}
/** Density of Student's t with `df` degrees of freedom. */
export function studentTPdf(t, df) {
    return Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log1p((t * t) / df));
}
/** Upper tail of Student's t, P(T > t) = ½ I_{ν/(ν+t²)}(ν/2, ½) for t ≥ 0. */
export function studentTSf(t, df) {
    if (!(df > 0))
        return NaN;
    if (t === 0)
        return 0.5;
    const half = 0.5 * betainc(df / 2, 0.5, df / (df + t * t));
    return t > 0 ? half : 1 - half;
}
export function studentTCdf(t, df) {
    return studentTSf(-t, df);
}
/**
 * Quantile of Student's t: safeguarded Newton on the CDF from the normal
 * quantile, falling back to bisection whenever a step leaves the bracket.
 */
export function studentTQuantile(p, df) {
    if (!(p > 0 && p < 1) || !(df > 0))
        return NaN;
    if (p === 0.5)
        return 0;
    if (p < 0.5)
        return -studentTQuantile(1 - p, df);
    let lo = 0;
    let hi = 1;
    while (studentTCdf(hi, df) < p)
        hi *= 2;
    let x = Math.min(Math.max(normalQuantile(p), lo), hi);
    for (let i = 0; i < 100; i++) {
        const f = studentTCdf(x, df) - p;
        if (f < 0)
            lo = x;
        else
            hi = x;
        if (hi - lo < 1e-15 * Math.max(1, hi))
            break;
        let next = x - f / studentTPdf(x, df);
        if (!(next > lo && next < hi))
            next = (lo + hi) / 2;
        if (Math.abs(next - x) < 1e-15 * Math.max(1, Math.abs(x))) {
            x = next;
            break;
        }
        x = next;
    }
    return x;
}
/**
 * Gauss–Legendre nodes and weights on [−1, 1] (NR `gauleg`), computed once.
 */
export function gaussLegendre(n) {
    const x = new Array(n);
    const w = new Array(n);
    const m = (n + 1) >> 1;
    for (let i = 0; i < m; i++) {
        let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
        let pp = 0;
        for (let it = 0; it < 100; it++) {
            let p1 = 1;
            let p2 = 0;
            for (let j = 0; j < n; j++) {
                const p3 = p2;
                p2 = p1;
                p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
            }
            pp = (n * (z * p1 - p2)) / (z * z - 1);
            const z1 = z;
            z = z1 - p1 / pp;
            if (Math.abs(z - z1) < 1e-15)
                break;
        }
        x[i] = -z;
        x[n - 1 - i] = z;
        w[i] = 2 / ((1 - z * z) * pp * pp);
        w[n - 1 - i] = w[i];
    }
    return { x, w };
}
