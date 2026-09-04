/**
 * Group-sequential design and analysis for a two-proportion test — a port of
 * Merritt Aho's "Sequential Testing" R Shiny app (alphanumerritt/
 * sequential-test-app, v3.21, 2022; the same method as its predecessor
 * legacySequentialCalculator, 2020), which is "little more than a highly
 * restrictive GUI" for Keaven Anderson's gsDesign.
 *
 * The method, exactly as the app calls it (`createTest` in
 * sequentialTestingApp.Rmd):
 *
 *   n_fix  = power.prop.test(p1 = base·(1 − margin) [1-tail] | base [2-tail],
 *                            p2 = base·(1 + mde), sig.level = 1 − conf,
 *                            power, alternative)$n                 (per arm)
 *   design = gsDesign(k, test.type = tails > 1 ? 2 : 4,
 *                     alpha = (1 − conf) / tails, beta = 1 − power,
 *                     sfu = sfPower, sfupar = 3,   # Kim-DeMets α(t) = α·t³
 *                     sfl = sfPower, sflpar = 2,   # Kim-DeMets β(t) = β·t²
 *                     n.fix = n_fix [, n.I = revised looks, maxn.IPlan = planned max])
 *
 * test.type 2 is the symmetric two-sided design (both bounds binding, lower =
 * −upper); test.type 4 is one-sided with a binding efficacy bound and a
 * NON-binding futility bound (the efficacy bound is computed with the lower
 * bound ignored, `a = −20`). Boundaries come from the Jennison & Turnbull
 * (2000, §19) recursive numerical integration on gsDesign's r = 18 grid
 * (6r − 1 = 107 points plus Simpson midpoints), with Newton–Raphson per look
 * on the incremental spend — the C routines gsbound / gsbound1 / probrej,
 * ported line for line. Sample size solves power = 1 − β by Brent's zeroin
 * (R's uniroot) on the maximum information, as gsI / gsI1 do.
 *
 * Analysis (per the app's `test_data_observer` and `test_outcome_observer`):
 * the z-statistic is gsDesign::testBinomial on the difference scale
 * (Miettinen–Nurminen restricted MLE variance, delta0 = control rate × margin),
 * sign flipped so treatment > control is positive; entered looks re-time the
 * design (piecewise-linear interpolation of per-arm n across look indices,
 * anchored at 0, every entered look, and the planned maximum — the app's
 * dplyr "renumbering" chain); the adjusted p-value on rejection is
 * gsProbability(theta = 0, n.I = observed n's, a = −20, b = [earlier upper
 * bounds…, observed z]) summed over the upper tail, × tails; the interval is
 * gsDesign::ciBinomial at alpha = 2·(1 − Φ(upper bound at that look)), divided
 * by the control rate.
 *
 * Self-contained on purpose: compiles to one import-free ES module the static
 * /lab page loads directly. Every numeric routine below is named after the R
 * or C function it reproduces.
 */
// ───────────────────────────── normal distribution ─────────────────────────────
const INV_SQRT_2PI = 0.3989422804014327; // gsDesign.h gs_inv_sqrt_2pi
const SQRT_PI = 1.7724538509055159;
/** Standard normal density. */
export function dnorm(x) {
    return Math.exp((-x * x) / 2) * INV_SQRT_2PI;
}
/** erfc(x) for x ≥ 0: scaled Maclaurin series below 2, Lentz continued fraction above. */
function erfcPos(x) {
    if (x < 2) {
        // erf(x) = (2/√π) e^{−x²} Σ 2ⁿ x^{2n+1} / (2n+1)!!  — all terms positive, no cancellation
        let term = x;
        let sum = x;
        const x2 = x * x;
        for (let n = 1; n < 200; n++) {
            term *= (2 * x2) / (2 * n + 1);
            sum += term;
            if (term < sum * 1e-17)
                break;
        }
        return 1 - (2 / SQRT_PI) * Math.exp(-x2) * sum;
    }
    // erfc(x) = e^{−x²}/√π · 1/(x + (1/2)/(x + 1/(x + (3/2)/(x + 2/(x + …)))))
    const tiny = 1e-300;
    let f = x;
    let C = x;
    let D = 0;
    for (let n = 1; n < 500; n++) {
        const a = n / 2;
        D = x + a * D;
        D = D === 0 ? tiny : D;
        C = x + a / C;
        C = C === 0 ? tiny : C;
        D = 1 / D;
        const delta = C * D;
        f *= delta;
        if (Math.abs(delta - 1) < 1e-16)
            break;
    }
    return Math.exp(-x * x) / (SQRT_PI * f);
}
/** Φ(x), lower tail. Accurate in the tail (no 1 − p cancellation for x < 0). */
export function pnorm(x) {
    if (!Number.isFinite(x))
        return x > 0 ? 1 : x < 0 ? 0 : NaN;
    return x < 0 ? erfcPos(-x / Math.SQRT2) / 2 : 1 - erfcPos(x / Math.SQRT2) / 2;
}
/** 1 − Φ(x), upper tail — R's pnorm(x, lower.tail = FALSE). */
export function pnormUpper(x) {
    return pnorm(-x);
}
/**
 * Φ⁻¹(p), lower tail. Acklam's rational start (≈1e-9) then Halley steps
 * against `pnorm`, so the result is exact to double precision — the first
 * look's boundary is `qnorm` directly, so it has to be.
 */
export function qnorm(p) {
    if (!(p > 0 && p < 1))
        return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
    if (p > 0.5)
        return -qnorm(1 - p);
    let x = acklam(p);
    for (let i = 0; i < 3; i++) {
        const e = pnorm(x) - p;
        const u = e / dnorm(x);
        const step = u / (1 + (x * u) / 2);
        x -= step;
        if (Math.abs(step) < 1e-15 * Math.max(1, Math.abs(x)))
            break;
    }
    return x;
}
/** Φ⁻¹ on the upper tail — R's qnorm(p, lower.tail = FALSE). */
export function qnormUpper(p) {
    return -qnorm(p);
}
function acklam(p) {
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
// ───────────────────────────── root finding (R uniroot) ─────────────────────────────
const DBL_EPSILON = 2.220446049250313e-16;
/**
 * R's `stats::uniroot`: Brent's method as in R_zeroin2 (src/library/stats/src/zeroin.c),
 * same step logic and stopping rule, so a root agrees with R to the same tolerance.
 */
export function uniroot(f, lower, upper, tol = 1.220703125e-4, maxit = 1000) {
    let a = lower;
    let b = upper;
    let fa = f(a);
    let fb = f(b);
    if (!(fa * fb <= 0))
        throw new RangeError('uniroot: f() values at end points not of opposite sign');
    let c = a;
    let fc = fa;
    if (fa === 0)
        return a;
    if (fb === 0)
        return b;
    for (let it = maxit + 1; it > 0; it--) {
        const prevStep = b - a;
        if (Math.abs(fc) < Math.abs(fb)) {
            a = b;
            b = c;
            c = a;
            fa = fb;
            fb = fc;
            fc = fa;
        }
        const tolAct = 2 * DBL_EPSILON * Math.abs(b) + tol / 2;
        let newStep = (c - b) / 2;
        if (Math.abs(newStep) <= tolAct || fb === 0)
            return b;
        if (Math.abs(prevStep) >= tolAct && Math.abs(fa) > Math.abs(fb)) {
            let p;
            let q;
            const cb = c - b;
            if (a === c) {
                const t1 = fb / fa;
                p = cb * t1;
                q = 1 - t1;
            }
            else {
                const q0 = fa / fc;
                const t1 = fb / fc;
                const t2 = fb / fa;
                p = t2 * (cb * q0 * (q0 - t1) - (b - a) * (t1 - 1));
                q = (q0 - 1) * (t1 - 1) * (t2 - 1);
            }
            if (p > 0)
                q = -q;
            else
                p = -p;
            if (p < 0.75 * cb * q - Math.abs(tolAct * q) / 2 && p < Math.abs((prevStep * q) / 2))
                newStep = p / q;
        }
        if (Math.abs(newStep) < tolAct)
            newStep = newStep > 0 ? tolAct : -tolAct;
        a = b;
        fa = fb;
        b += newStep;
        fb = f(b);
        if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
            c = a;
            fc = fa;
        }
    }
    throw new RangeError('uniroot: no convergence');
}
// ───────────────────────────── Jennison & Turnbull grid (gsDesign C) ─────────────────────────────
const EXTREMEZ = 20;
const R_GRID = 18;
/** gridpts.c: integration points (even indices) and Simpson midpoints (odd) between a and b, centred on mu. */
function gridpts(r, mu, a, b) {
    const z = new Float64Array(12 * r - 3);
    const w = new Float64Array(12 * r - 3);
    const r6 = 6 * r;
    const r5 = 5 * r;
    let j = 0;
    let done = false;
    w[0] = 0;
    let ztem = mu - 3 - 4 * Math.log(r);
    if (ztem <= a)
        z[0] = a;
    else if (ztem >= b) {
        z[0] = b;
        done = true;
    }
    else
        z[0] = ztem;
    for (let i = 2; i < r6 && !done; i++) {
        if (i < r)
            ztem = mu - 3 - 4 * Math.log(r / i);
        else if (i <= r5)
            ztem = mu + 3 * (-1 + (i - r) / (2 * r));
        else
            ztem = mu + 3 + 4 * Math.log(r / (r6 - i));
        if (ztem > a) {
            j += 2;
            z[j] = ztem;
            if (ztem >= b) {
                z[j] = b;
                done = true;
            }
            z[j - 1] = (z[j] + z[j - 2]) / 2;
        }
    }
    if (j > 0) {
        w[0] = (z[2] - z[0]) / 6;
        w[j] = (z[j] - z[j - 2]) / 6;
        w[j - 1] = (2 * (z[j] - z[j - 2])) / 3;
    }
    for (let i = 1; i < j - 1; i += 2) {
        w[i] = (2 * (z[i + 1] - z[i - 1])) / 3;
        w[i + 1] = (z[i + 3] - z[i - 1]) / 6;
    }
    return { z, w, m: j };
}
/** h1.c: weighted density at the first analysis. */
function h1(theta, g, I) {
    const h = new Float64Array(g.m + 1);
    const mu = theta * Math.sqrt(I);
    for (let i = 0; i <= g.m; i++)
        h[i] = g.w[i] * dnorm(g.z[i] - mu);
    return h;
}
/** hupdate.c: propagate the weighted sub-density from one analysis to the next. */
function hupdate(theta, g2, g1, h1v, Ikm1, Ik) {
    const hk = new Float64Array(g2.m + 1);
    const deltak = Ik - Ikm1;
    const rtdeltak = Math.sqrt(deltak);
    const rtIk = Math.sqrt(Ik);
    const rtIkm1 = Math.sqrt(Ikm1);
    for (let i = 0; i <= g2.m; i++) {
        let s = 0;
        for (let ii = 0; ii <= g1.m; ii++) {
            const x = (g2.z[i] * rtIk - g1.z[ii] * rtIkm1 - theta * deltak) / rtdeltak;
            s += h1v[ii] * dnorm(x) * (rtIk / rtdeltak);
        }
        hk[i] = s * g2.w[i];
    }
    return hk;
}
/** probrej.c (gsDesign::gsProbability for one theta): boundary-crossing probabilities per look. */
export function probRej(theta, I, a, b, r = R_GRID) {
    const k = I.length;
    const problo = new Array(k);
    const probhi = new Array(k);
    let mu = theta * Math.sqrt(I[0]);
    problo[0] = pnormUpper(mu - a[0]);
    probhi[0] = pnormUpper(b[0] - mu);
    let g = gridpts(r, mu, a[0], b[0]);
    let h = h1(theta, g, I[0]);
    for (let i = 1; i < k; i++) {
        const muInc = theta * (I[i] - I[i - 1]);
        const rtdeltak = Math.sqrt(I[i] - I[i - 1]);
        const rtIk = Math.sqrt(I[i]);
        const rtIkm1 = Math.sqrt(I[i - 1]);
        let phi = 0;
        let plo = 0;
        for (let ii = 0; ii <= g.m; ii++) {
            phi += pnorm((g.z[ii] * rtIkm1 + muInc - b[i] * rtIk) / rtdeltak) * h[ii];
            plo += pnormUpper((g.z[ii] * rtIkm1 + muInc - a[i] * rtIk) / rtdeltak) * h[ii];
        }
        probhi[i] = phi;
        problo[i] = plo;
        if (i < k - 1) {
            mu = theta * Math.sqrt(I[i]);
            const g2 = gridpts(r, mu, a[i], b[i]);
            h = hupdate(theta, g2, g, h, I[i - 1], I[i]);
            g = g2;
        }
    }
    return { problo, probhi };
}
/**
 * gsbound.c (gsDesign::gsBound): lower and upper bounds under theta = 0 that
 * spend `problo` / `probhi` at each look — Newton–Raphson on both bounds at once.
 */
function gsBound(I, problo, probhi, tol = 1e-6, r = R_GRID) {
    const k = I.length;
    const a = new Array(k);
    const b = new Array(k);
    a[0] = problo[0] <= 0 ? -EXTREMEZ : qnorm(problo[0]);
    b[0] = probhi[0] <= 0 ? EXTREMEZ : qnormUpper(probhi[0]);
    let g = gridpts(r, 0, a[0], b[0]);
    let h = h1(0, g, I[0]);
    let rtIk = Math.sqrt(I[0]);
    for (let i = 1; i < k; i++) {
        const rtIkm1 = rtIk;
        rtIk = Math.sqrt(I[i]);
        const rtdeltak = Math.sqrt(I[i] - I[i - 1]);
        let atem2 = problo[i] <= 0 ? -EXTREMEZ : qnorm(problo[i]);
        let btem2 = probhi[i] <= 0 ? EXTREMEZ : qnormUpper(probhi[i]);
        let atem = atem2;
        let btem = btem2;
        let adelta = 1;
        let bdelta = 1;
        let j = 0;
        while ((adelta > tol || bdelta > tol) && j++ < EXTREMEZ) {
            let plo = 0;
            let phi = 0;
            let dplo = 0;
            let dphi = 0;
            atem = atem2;
            btem = btem2;
            for (let ii = 0; ii <= g.m; ii++) {
                const xlo = (g.z[ii] * rtIkm1 - atem * rtIk) / rtdeltak;
                const xhi = (g.z[ii] * rtIkm1 - btem * rtIk) / rtdeltak;
                plo += h[ii] * pnormUpper(xlo);
                phi += h[ii] * pnorm(xhi);
                dplo += h[ii] * dnorm(xlo) * (rtIk / rtdeltak);
                dphi -= h[ii] * dnorm(xhi) * (rtIk / rtdeltak);
            }
            adelta = problo[i] - plo;
            if (adelta > dplo)
                atem2 = atem + 1;
            else if (adelta < -dplo)
                atem2 = atem - 1;
            else
                atem2 = atem + (problo[i] - plo) / dplo;
            if (atem2 > EXTREMEZ)
                atem2 = EXTREMEZ;
            else if (atem2 < -EXTREMEZ)
                atem2 = -EXTREMEZ;
            bdelta = probhi[i] - phi;
            if (bdelta < dphi)
                btem2 = btem + 1;
            else if (bdelta > -dphi)
                btem2 = btem - 1;
            else
                btem2 = btem + (probhi[i] - phi) / dphi;
            if (btem2 > EXTREMEZ)
                btem2 = EXTREMEZ;
            else if (btem2 < -EXTREMEZ)
                btem2 = -EXTREMEZ;
            if (atem2 > btem2)
                atem2 = btem2;
            adelta = Math.abs(atem2 - atem);
            bdelta = Math.abs(btem2 - btem);
        }
        a[i] = atem;
        b[i] = btem;
        if (adelta > tol || bdelta > tol)
            throw new RangeError(`gsBound: no convergence for boundary at look ${i + 1}`);
        if (i < k - 1) {
            const g2 = gridpts(r, 0, a[i], b[i]);
            h = hupdate(0, g2, g, h, I[i - 1], I[i]);
            g = g2;
        }
    }
    return { a, b };
}
/**
 * gsbound1.c (gsDesign::gsBound1): upper bounds under drift `theta`, given
 * fixed lower bounds `a`, that spend `probhi` at each look.
 */
function gsBound1(theta, I, a, probhi, tol = 1e-6, r = R_GRID) {
    const k = I.length;
    const b = new Array(k);
    const problo = new Array(k);
    let rtIk = Math.sqrt(I[0]);
    let mu = rtIk * theta;
    problo[0] = pnormUpper(mu - a[0]);
    b[0] = probhi[0] <= 0 ? EXTREMEZ : mu + qnormUpper(probhi[0]);
    if (k === 1)
        return { b, problo };
    let g = gridpts(r, mu, a[0], b[0]);
    let h = h1(theta, g, I[0]);
    for (let i = 1; i < k; i++) {
        const rtIkm1 = rtIk;
        rtIk = Math.sqrt(I[i]);
        mu = rtIk * theta;
        const rtdeltak = Math.sqrt(I[i] - I[i - 1]);
        const dI = I[i] - I[i - 1];
        let btem2 = probhi[i] <= 0 ? EXTREMEZ : mu + qnormUpper(probhi[i]);
        let btem = btem2;
        let plo = 0;
        let bdelta = 1;
        let j = 0;
        while (bdelta > tol && j++ < 20) {
            let phi = 0;
            let dphi = 0;
            plo = 0;
            btem = btem2;
            for (let ii = 0; ii <= g.m; ii++) {
                const xhi = (g.z[ii] * rtIkm1 - btem * rtIk + theta * dI) / rtdeltak;
                phi += pnorm(xhi) * h[ii];
                const xlo = (g.z[ii] * rtIkm1 - a[i] * rtIk + theta * dI) / rtdeltak;
                plo += pnormUpper(xlo) * h[ii];
                dphi -= h[ii] * dnorm(xhi) * (rtIk / rtdeltak);
            }
            bdelta = probhi[i] - phi;
            if (bdelta < dphi)
                btem2 = btem + 1;
            else if (bdelta > -dphi)
                btem2 = btem - 1;
            else
                btem2 = btem + (probhi[i] - phi) / dphi;
            if (btem2 > EXTREMEZ)
                btem2 = EXTREMEZ;
            else if (btem2 < -EXTREMEZ)
                btem2 = -EXTREMEZ;
            bdelta = Math.abs(btem2 - btem);
        }
        b[i] = btem;
        problo[i] = plo;
        if (bdelta > tol)
            throw new RangeError(`gsBound1: no convergence for boundary at look ${i + 1}`);
        if (i < k - 1) {
            const g2 = gridpts(r, mu, a[i], b[i]);
            h = hupdate(theta, g2, g, h, I[i - 1], I[i]);
            g = g2;
        }
    }
    // gsBound1's R wrapper: an upper bound that fell below its lower bound is raised to it.
    for (let i = 0; i < k; i++)
        if (b[i] - a[i] < 0)
            b[i] = a[i];
    return { b, problo };
}
// ───────────────────────────── spending and design (gsDesign R) ─────────────────────────────
/** sfPower: Kim–DeMets cumulative spend α·min(t,1)^ρ, returned as the per-look increments gsDesign uses. */
function sfPowerIncrements(alpha, timing, rho) {
    const cum = timing.map((t) => alpha * Math.min(t, 1) ** rho);
    return cum.map((c, i) => c - (i === 0 ? 0 : cum[i - 1]));
}
/**
 * gsDesign(k, test.type ∈ {2, 4}, alpha, beta, sfu = sfPower(ρu), sfl = sfPower(ρl),
 * n.fix [, n.I, maxn.IPlan]) — the two paths the app takes, ported from
 * gsDType2and5 / gsDType4ss / gsDType4a.
 */
export function gsDesign(input) {
    const { k, testType, alpha, beta, nFix } = input;
    const rhoUpper = input.rhoUpper ?? 3;
    const rhoLower = input.rhoLower ?? 2;
    const tol = input.tol ?? 1e-6;
    if (!Number.isInteger(k) || k < 2)
        throw new RangeError('k must be an integer of at least 2');
    if (!(alpha > 0 && alpha < 1))
        throw new RangeError('alpha must be strictly between 0 and 1');
    if (testType === 2 && alpha > 0.5)
        throw new RangeError('alpha must be at most 0.5 for a two-sided design');
    if (!(beta > 0 && beta < 1 - alpha))
        throw new RangeError('beta must be strictly between 0 and 1 − alpha');
    if (!(nFix > 0))
        throw new RangeError('n.fix must be positive');
    // gsDErrorCheck
    const delta = Math.abs(qnorm(alpha) + qnorm(beta)) / Math.sqrt(nFix);
    let timing;
    let nIGiven;
    if (input.nI && input.nI.length) {
        nIGiven = input.nI.slice();
        if (nIGiven.length !== k)
            throw new RangeError('n.I must have one entry per look');
        for (let i = 0; i < k; i++) {
            if (!(nIGiven[i] > 0) || (i > 0 && nIGiven[i] <= nIGiven[i - 1])) {
                throw new RangeError('n.I must be an increasing, positive sequence');
            }
        }
        const maxPlan = input.maxnIPlan && input.maxnIPlan > 0 ? input.maxnIPlan : nIGiven[k - 1];
        timing = nIGiven.map((n) => n / maxPlan);
    }
    else {
        timing = Array.from({ length: k }, (_, i) => (i + 1) / k);
    }
    const falsepos = sfPowerIncrements(alpha, timing, rhoUpper);
    let lower;
    let upper;
    let nI;
    if (testType === 2) {
        // gsDType2and5, symmetric: trueneg = falsepos.
        const trueneg = falsepos;
        if (!nIGiven) {
            // gsI
            const bnd = gsBound(timing, trueneg, falsepos, tol);
            const alphaTot = falsepos.reduce((s, v) => s + v, 0);
            const I0 = ((qnorm(alphaTot) + qnorm(beta)) / delta) ** 2;
            const betadiff = (Imax) => {
                const I = timing.map((t) => t * Imax);
                const p = probRej(delta, I, bnd.a, bnd.b);
                return beta - 1 + p.probhi.reduce((s, v) => s + v, 0);
            };
            const root = uniroot(betadiff, I0, 10 * I0, tol);
            nI = timing.map((t) => root * t);
            lower = bnd.a;
            upper = bnd.b;
        }
        else {
            const bnd = gsBound(nIGiven, trueneg, falsepos, tol);
            nI = nIGiven;
            lower = bnd.a;
            upper = bnd.b;
        }
    }
    else if (testType === 4) {
        const falseneg = sfPowerIncrements(beta, timing, rhoLower);
        if (!nIGiven) {
            // gsDType4ss: efficacy bound ignores the (non-binding) futility bound.
            const noLower = new Array(k).fill(-EXTREMEZ);
            const x0 = gsBound1(0, timing, noLower, falsepos, tol);
            const negB = x0.b.map((v) => -v);
            const betadiff1 = (Imax) => {
                const I = timing.map((t) => t * Imax);
                const x = gsBound1(-delta, I, negB, falseneg, tol);
                const p = probRej(delta, I, x.b.map((v) => -v), x0.b);
                return falseneg.reduce((s, v) => s + v, 0) - 1 + p.probhi.reduce((s, v) => s + v, 0);
            };
            let Ilow = 0.98 * nFix;
            let Ihigh = 1.2 * nFix;
            while (betadiff1(Ihigh) < 0) {
                if (Ihigh > 5 * nFix)
                    throw new RangeError('Unable to derive sample size');
                Ilow = Ihigh;
                Ihigh *= 1.2;
            }
            // gsI1
            const root = uniroot(betadiff1, Ilow, Ihigh, tol);
            nI = timing.map((t) => root * t);
            const x = gsBound1(-delta, nI, negB, falseneg, tol);
            const bneg = x.b.slice();
            bneg[k - 1] = -x0.b[k - 1];
            lower = bneg.map((v) => -v);
            upper = x0.b;
        }
        else {
            // gsDType4a
            const noLower = new Array(k).fill(-EXTREMEZ);
            const x1 = gsBound1(0, nIGiven, noLower, falsepos, tol);
            const x2 = gsBound1(-delta, nIGiven, x1.b.map((v) => -v), falseneg, tol);
            const b2 = x2.b.slice();
            if (-b2[k - 1] > x1.b[k - 1] - tol)
                b2[k - 1] = -x1.b[k - 1];
            nI = nIGiven;
            upper = x1.b;
            lower = b2.map((v) => -v);
        }
    }
    else {
        throw new RangeError('testType must be 2 or 4');
    }
    const pNull = probRej(0, nI, lower, upper);
    const pAlt = probRej(delta, nI, lower, upper);
    return {
        k,
        testType,
        nI,
        timing,
        lower,
        upper,
        delta,
        nFix,
        prob: { null: pNull, alt: pAlt },
        power: pAlt.probhi.reduce((s, v) => s + v, 0),
        alphaSpent: pNull.probhi.reduce((s, v) => s + v, 0),
    };
}
// ───────────────────────────── binomial statistics (gsDesign R) ─────────────────────────────
/**
 * gsDesign::testBinomial(x1, x2, n1, n2, delta0, scale = "Difference"): z for
 * H0: p1 − p2 = delta0 with the Miettinen & Nurminen (1985, eqn 9) restricted-MLE variance.
 */
export function testBinomial(x1, x2, n1, n2, delta0 = 0) {
    const ntot = n1 + n2;
    const xtot = x1 + x2;
    const L2 = (n1 + 2 * n2) * delta0 - ntot - xtot;
    const L1 = (n2 * delta0 - ntot - 2 * x2) * delta0 + xtot;
    const L0 = x2 * delta0 * (1 - delta0);
    const q = (L2 / (3 * ntot)) ** 3 - (L1 * L2) / 6 / ntot ** 2 + L0 / 2 / ntot;
    const p = (Math.sign(q) + (q === 0 ? 1 : 0)) * Math.sqrt((L2 / (3 * ntot)) ** 2 - L1 / (3 * ntot));
    let a = q / p ** 3;
    if (a > 1)
        a = 1;
    a = (Math.PI + Math.acos(a)) / 3;
    const R0 = 2 * p * Math.cos(a) - L2 / 3 / ntot;
    const R1 = R0 + delta0;
    let V = (R1 * (1 - R1)) / n1 + (R0 * (1 - R0)) / n2;
    if (V <= 1e-11)
        V = 1;
    return (x1 / n1 - x2 / n2 - delta0) / Math.sqrt(V);
}
/**
 * gsDesign::ciBinomial(x1, x2, n1, n2, alpha, scale = "Difference"): the
 * interval on p1 − p2 found by inverting testBinomial with uniroot (R's
 * default tolerance, so the endpoints agree with R to ~1e-4).
 */
export function ciBinomial(x1, x2, n1, n2, alpha) {
    const delta = x1 / n1 - x2 / n2;
    const bp = (d, lowerTail) => {
        const z = testBinomial(x1, x2, n1, n2, d);
        return (lowerTail ? pnorm(z) : pnormUpper(z)) - alpha / 2;
    };
    let lower;
    let upper;
    if (delta === -1)
        lower = -1;
    else if (testBinomial(x1, x2, n1, n2, -0.9999) < qnorm(alpha / 2))
        lower = -1;
    else
        lower = uniroot((d) => bp(d, false), -0.9999, delta);
    if (delta === 1)
        upper = 1;
    else if (testBinomial(x1, x2, n1, n2, 0.9999) > -qnorm(alpha / 2))
        upper = 1;
    else
        upper = uniroot((d) => bp(d, true), delta, 0.9999);
    return { lower, upper };
}
/**
 * stats::power.prop.test(p1, p2, sig.level, power, alternative)$n, closed form
 * (the same formula as `sampleSize` in power.ts; duplicated so this module
 * stays import-free).
 */
export function powerPropTest(p1, p2, sigLevel, power, tails) {
    const zAlpha = qnormUpper(sigLevel / tails);
    const zBeta = qnorm(power);
    const pSum = p1 + p2;
    const sdNull = Math.sqrt(pSum * (1 - pSum / 2));
    const sdAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    return ((zAlpha * sdNull + zBeta * sdAlt) / Math.abs(p2 - p1)) ** 2;
}
function assertFinite(name, v) {
    if (typeof v !== 'number' || !Number.isFinite(v))
        throw new RangeError(`${name} must be a finite number`);
}
function validatePlanInput(input) {
    const { baseline, mde, tails, alpha, power, k } = input;
    const margin = input.margin ?? 0;
    const variants = input.variants ?? 2;
    assertFinite('baseline', baseline);
    assertFinite('mde', mde);
    assertFinite('alpha', alpha);
    assertFinite('power', power);
    assertFinite('k', k);
    assertFinite('margin', margin);
    if (baseline <= 0 || baseline >= 1)
        throw new RangeError('baseline must be strictly between 0 and 1');
    if (mde <= 0)
        throw new RangeError('mde must be positive');
    if (tails !== 1 && tails !== 2)
        throw new RangeError('tails must be 1 or 2');
    if (alpha <= 0 || alpha >= 1)
        throw new RangeError('alpha must be strictly between 0 and 1');
    if (power <= 0 || power >= 1)
        throw new RangeError('power must be strictly between 0 and 1');
    if (!Number.isInteger(k) || k < 2 || k > 20)
        throw new RangeError('k (number of looks) must be an integer from 2 to 20');
    if (margin < 0 || margin >= 1)
        throw new RangeError('margin must be at least 0 and below 1');
    if (margin > 0 && tails === 2)
        throw new RangeError('a non-inferiority margin applies to one-tailed tests only');
    if (!Number.isInteger(variants) || variants < 2)
        throw new RangeError('variants must be an integer of at least 2 (including control)');
    if (input.traffic != null && !(input.traffic > 0))
        throw new RangeError('traffic must be positive when given');
    const treatmentRate = baseline * (1 + mde);
    if (treatmentRate >= 1)
        throw new RangeError('mde pushes the treatment rate to 100% or beyond');
    const alphaPerSide = alpha / tails;
    if (1 - power >= 1 - alphaPerSide)
        throw new RangeError('power must exceed the per-side alpha');
    return { margin, variants, treatmentRate, alphaPerSide };
}
/** The app's Multiple Comparisons table: Holm-adjusted efficacy bounds per look, by rank of |z|. */
export function holmBounds(upper, comparisons) {
    return upper.map((u) => {
        const p = pnormUpper(u);
        const row = [];
        for (let i = 1; i <= comparisons; i++)
            row.push(Math.abs(qnorm(p / (comparisons - i + 1))));
        return row;
    });
}
function planFromDesign(input, design, nFix, meta) {
    const traffic = input.traffic ?? null;
    const days = (total) => (traffic ? Math.ceil(total / traffic) : null);
    const alphaCum = [];
    const betaCum = [];
    let ac = 0;
    let bc = 0;
    for (let i = 0; i < design.k; i++) {
        ac += design.prob.null.probhi[i];
        bc += design.testType === 4 ? design.prob.alt.problo[i] : design.prob.alt.problo[i];
        alphaCum.push(ac);
        betaCum.push(bc);
    }
    const looks = design.nI.map((n, i) => ({
        index: i + 1,
        timing: design.timing[i],
        perVariant: n,
        total: n * 2,
        lower: design.lower[i],
        upper: design.upper[i],
        alphaSpent: alphaCum[i],
        betaSpent: betaCum[i],
        days: days(n * 2),
    }));
    const maxPerVariant = design.nI[design.k - 1];
    const en = (p) => {
        let s = 0;
        let stopped = 0;
        for (let i = 0; i < design.k - 1; i++) {
            const q = p.probhi[i] + p.problo[i];
            s += q * design.nI[i];
            stopped += q;
        }
        return s + (1 - stopped) * maxPerVariant;
    };
    const alphaSpent = design.testType === 4
        ? probRej(0, design.nI, new Array(design.k).fill(-EXTREMEZ), design.upper).probhi.reduce((s, v) => s + v, 0)
        : design.alphaSpent;
    return {
        fixed: { perVariant: Math.ceil(nFix), total: Math.ceil(nFix) * 2, nExact: nFix, days: days(nFix * 2) },
        looks,
        maxPerVariant,
        maxTotal: maxPerVariant * 2,
        increase: maxPerVariant / nFix - 1,
        power: design.power,
        alphaSpent,
        expected: { null: en(design.prob.null), alt: en(design.prob.alt) },
        holm: meta.variants > 2 ? holmBounds(design.upper, meta.variants - 1) : null,
        assumptions: {
            method: design.testType === 4
                ? 'gsDesign test.type=4: one-sided, binding efficacy bound, non-binding futility bound; Kim-DeMets power spending ρ=3 (α) / ρ=2 (β)'
                : 'gsDesign test.type=2: two-sided symmetric, both bounds binding; Kim-DeMets power spending ρ=3',
            testType: design.testType,
            alphaPerSide: meta.alphaPerSide,
            controlRate: input.tails === 1 ? input.baseline * (1 - meta.margin) : input.baseline,
            treatmentRate: meta.treatmentRate,
            delta: design.delta,
            rhoUpper: 3,
            rhoLower: 2,
            zAlpha: qnormUpper(meta.alphaPerSide),
            zBeta: qnorm(input.power),
        },
        design,
    };
}
/**
 * The Plan half: fixed-horizon n, then the group-sequential design with
 * evenly spaced looks — exactly the app's `createTest(...)` without results.
 */
export function sequentialPlan(input) {
    const meta = validatePlanInput(input);
    const { baseline, mde, tails, alpha, power, k } = input;
    const controlRate = tails === 1 ? baseline * (1 - meta.margin) : baseline;
    const nFix = powerPropTest(controlRate, baseline * (1 + mde), alpha, power, tails);
    const design = gsDesign({ k, testType: tails === 2 ? 2 : 4, alpha: meta.alphaPerSide, beta: 1 - power, nFix });
    return planFromDesign(input, design, nFix, meta);
}
const ADVICE = {
    complete_upper: 'Maximum sample size has been reached. End the test and reject the null hypothesis.',
    complete_lower_2tail: 'Maximum sample size has been reached. End the test and reject the null hypothesis — in the other direction.',
    complete_lower_1tail: 'Maximum sample size has been reached. End the test. The result is inconclusive; the null cannot be rejected.',
    complete_middle: 'Maximum sample size has been reached. End the test. The result is inconclusive; the null cannot be rejected.',
    early_upper: 'The test has crossed the efficacy boundary early. End the test and reject the null hypothesis.',
    early_lower_1tail: 'The test has crossed the futility boundary early. It is non-binding: you may end the test now (power at the MDE is preserved) or continue, which only adds power.',
    early_lower_2tail: 'The test has crossed the lower boundary early. End the test and reject the null hypothesis — in the other direction.',
    early_middle: 'No boundary crossed yet. Continue to the next look to reach the planned power.',
};
const OUTCOME = {
    complete_upper: 'reject',
    complete_lower_2tail: 'reject',
    complete_lower_1tail: 'inconclusive',
    complete_middle: 'inconclusive',
    early_upper: 'reject',
    early_lower_1tail: 'option',
    early_lower_2tail: 'reject',
    early_middle: 'continue',
};
/**
 * The app's checkpoint re-timing (the dplyr chain in `createTest`): per-arm n
 * at every look is the piecewise-linear interpolation, over look index, through
 * (0, 0), every entered look's observed per-arm n, and — unless the final look
 * was entered — (k, planned max n); rounded to whole visitors. Entered looks
 * are never moved; only the un-entered ones between them are re-spaced.
 */
export function reviseLooks(k, plannedMax, entered) {
    const anchors = new Map();
    anchors.set(0, 0);
    for (const e of entered)
        anchors.set(e.index, e.perVariant);
    if (!anchors.has(k))
        anchors.set(k, plannedMax);
    const idx = [...anchors.keys()].sort((a, b) => a - b);
    const out = [];
    for (let i = 1; i <= k; i++) {
        if (anchors.has(i)) {
            out.push(Math.round(anchors.get(i)));
            continue;
        }
        let lo = 0;
        let hi = k;
        for (const j of idx) {
            if (j < i)
                lo = j;
            if (j > i) {
                hi = j;
                break;
            }
        }
        const nLo = anchors.get(lo);
        const nHi = anchors.get(hi);
        out.push(Math.round(nLo + ((nHi - nLo) * (i - lo)) / (hi - lo)));
    }
    return out;
}
/**
 * The Analyze half: re-time the design to the observed looks, score each
 * entered checkpoint against its boundaries in look order, stop at the first
 * rejection, and — on rejection — compute the sequential p-value and the
 * boundary-adjusted interval, as the app does.
 */
export function sequentialAnalyze(input, checkpoints) {
    const meta = validatePlanInput(input);
    const planned = sequentialPlan(input);
    const { k, tails } = input;
    const seen = new Set();
    const cps = checkpoints.slice().sort((a, b) => a.index - b.index);
    let prevN = 0;
    for (const c of cps) {
        if (!Number.isInteger(c.index) || c.index < 1 || c.index > k)
            throw new RangeError(`checkpoint index must be from 1 to ${k}`);
        if (seen.has(c.index))
            throw new RangeError(`checkpoint ${c.index} is entered twice`);
        seen.add(c.index);
        for (const [arm, d] of [['control', c.control], ['treatment', c.treatment]]) {
            assertFinite(`${arm} visitors`, d.visitors);
            assertFinite(`${arm} conversions`, d.conversions);
            if (!Number.isInteger(d.visitors) || d.visitors < 1)
                throw new RangeError(`checkpoint ${c.index}: ${arm} visitors must be a positive integer`);
            if (!Number.isInteger(d.conversions) || d.conversions < 0 || d.conversions > d.visitors) {
                throw new RangeError(`checkpoint ${c.index}: ${arm} conversions must be an integer from 0 to visitors`);
            }
        }
        const n = c.control.visitors + c.treatment.visitors;
        if (n <= prevN)
            throw new RangeError(`checkpoint ${c.index}: total visitors must exceed the earlier checkpoint's`);
        prevN = n;
    }
    if (cps.length === 0) {
        return { plan: planned, revisedPerVariant: planned.design.nI.slice(), checkpoints: [], verdict: null };
    }
    const plannedMax = planned.design.nI[k - 1];
    const revised = reviseLooks(k, plannedMax, cps.map((c) => ({ index: c.index, perVariant: (c.control.visitors + c.treatment.visitors) / 2 })));
    const design = gsDesign({
        k,
        testType: tails === 2 ? 2 : 4,
        alpha: meta.alphaPerSide,
        beta: 1 - input.power,
        nFix: planned.fixed.nExact,
        nI: revised,
        maxnIPlan: plannedMax,
    });
    const plan = planFromDesign(input, design, planned.fixed.nExact, meta);
    const analyzed = [];
    let deciding = null;
    for (const c of cps) {
        const i = c.index - 1;
        const controlRate = c.control.conversions / c.control.visitors;
        const treatmentRate = c.treatment.conversions / c.treatment.visitors;
        const z = -testBinomial(c.control.conversions, c.treatment.conversions, c.control.visitors, c.treatment.visitors, controlRate * meta.margin);
        const boundary = z > design.upper[i] ? 'upper' : z < design.lower[i] ? 'lower' : 'middle';
        const complete = c.index === k ? 'complete' : 'early';
        const status = boundary === 'lower' ? `${complete}_lower_${tails}tail` : `${complete}_${boundary}`;
        const row = {
            ...c,
            perVariant: (c.control.visitors + c.treatment.visitors) / 2,
            controlRate,
            treatmentRate,
            lift: treatmentRate / controlRate - 1,
            z,
            lower: design.lower[i],
            upper: design.upper[i],
            boundary,
            status,
            outcome: OUTCOME[status],
            fractionOfPlan: (c.control.visitors + c.treatment.visitors) / (plannedMax * 2),
        };
        analyzed.push(row);
        if (!deciding || deciding.outcome !== 'reject')
            deciding = row;
        if (row.outcome === 'reject')
            break;
    }
    const d = deciding;
    const i = d.index - 1;
    let pValue = null;
    let confidence = null;
    if (d.outcome === 'reject') {
        const Ns = design.nI.slice(0, d.index);
        const Zs = [...design.upper.slice(0, i), d.z];
        const probs = probRej(0, Ns, new Array(d.index).fill(-EXTREMEZ), Zs);
        pValue = probs.probhi.reduce((s, v) => s + v, 0) * tails;
        confidence = 1 - pValue;
    }
    const ciZ = design.upper[i];
    const raw = ciBinomial(d.treatment.conversions, d.control.conversions, d.treatment.visitors, d.control.visitors, 2 * pnormUpper(ciZ));
    const ci = { lower: raw.lower / d.controlRate, upper: raw.upper / d.controlRate, mean: d.lift };
    return {
        plan,
        revisedPerVariant: revised,
        checkpoints: analyzed,
        verdict: { checkpoint: d.index, outcome: d.outcome, status: d.status, pValue, confidence, ci, advice: ADVICE[d.status] },
    };
}
