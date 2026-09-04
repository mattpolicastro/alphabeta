# @alphabeta/analysis

Framework-free stats core. JSON in, JSON out, no DOM, no React. The `/lab/*`
pages on `alphabeta.tools` and the in-bet instrument panels in the app both
call it; it never knows which.

## API

```ts
import { sampleSize, runtimeDays } from '@alphabeta/analysis'

sampleSize({
  baseline: 0.02,        // control rate, proportion in (0,1)
  mde: 0.10,             // relative: +10% lift; absolute: +0.10 = +10 points
  mdeKind: 'relative',   // 'relative' | 'absolute'
  variants: 2,           // arms including control
  tails: 2,              // 1 | 2
  alpha: 0.05,           // family-wise, before the per-comparison split
  power: 0.8,            // 1 − β
})
// → { perVariant: 80682, total: 161364, assumptions: {...} }

runtimeDays({ total: 161364, dailyTraffic: 5000 })  // → 33

detectableLift({          // the inverse: traffic in, smallest detectable lift out
  baseline: 0.02, dailyTraffic: 10000, runtimeDays: 14,
  variants: 2, tails: 2, alpha: 0.05, power: 0.8,
})
// → { mdeRelative: 0.10755, mdeAbsolute: 0.002151, perVariant: 70000, total: 140000, assumptions: {...} }

srm({ expected: [50, 50], observed: [5000, 4800] })   // alpha defaults to 0.001
// → { chi2: 4.0816, df: 1, pValue: 0.04335, verdict: 'ok', deviations: [...], ... }

results({                 // a finished test, every treatment vs arms[0]
  metric: 'binomial',     // | 'continuous' (arms then carry n, mean, sd)
  arms: [{ name: 'control', n: 10000, conversions: 890 }, { name: 'treatment', n: 10000, conversions: 920 }],
  tails: 2, alpha: 0.05,
})
// → { comparisons: [{ z: 0.7394, pValue: 0.4597, absoluteLift: 0.003, absoluteCi: [-0.00495, 0.01095],
//      relativeLift: 0.0337, relativeCi: [-0.0571, 0.1246], verdict: 'inconclusive', ... }],
//     alphaPerComparison: 0.05, correction: 'none', ... }
// twoProportionTest / welchTest are the single-comparison forms.

bayes({                   // the same counts, read as Beta–Binomial posteriors
  arms: [{ name: 'control', n: 10000, conversions: 950 }, { name: 'treatment', n: 10010, conversions: 980 }],
  prior: { a: 1, b: 1 }, threshold: 0.015, level: 0.95,
})
// → { treatments: [{ pBeatsControl: 0.7565, pAboveThreshold: 0.6372, pNotWorse: 0.8519,
//      lossIfChosen: 0.000601, lossIfControlKept: 0.003503, relativeCi: [-0.0532, 0.1218],
//      pBest: 0.7565, read: 'undecided', ... }], control: { pBest: 0.2435, ... }, ... }
```

Out-of-range input throws `RangeError` with a sentence a page can show as-is.

## Method

Two-proportion z-test, equal arms, no continuity correction — exactly R's
`stats::power.prop.test(p1, p2, sig.level, power, alternative)`:

```
n_per_arm = ((z_α · √(2·p̄·q̄) + z_β · √(p₁q₁ + p₂q₂)) / |p₂ − p₁|)²
```

with `p̄ = (p₁+p₂)/2`, `z_α` the upper `α'/tails` quantile and
`α' = α / (variants − 1)` (Bonferroni across the arm-vs-control comparisons;
no-op at two variants). `total = ⌈n⌉ × variants`.

### Why this convention

The reference is Kelly Wortham's calculator on
[forwarddigital.org/tools](https://forwarddigital.org/tools) (built by Merritt
Aho). Its repo `alphanumerritt/sample-size-calculator` is empty on GitHub, but
its ancestor `gilliganondata/sample-size-calculator-1` (Tim Wilson, 2018)
is not, and it is `power.prop.test` with `p2 = p1·(1 + lift)`, one- or
two-sided, and — on by default when variants > 2 — `sig.level = α/(variants−1)`.
Total is `n × variants`. That is what we match, to the visitor.

Two things were changed from the quarried `apps/web/lib/stats/powerCalculator.ts`
(`@ d9d8ba2`):

- **Formula.** The legacy code used Cohen's h (arcsine), sized to match
  statsmodels' `NormalIndPower`. That is a different approximation and lands
  a few percent away from `power.prop.test`. `cohensH` is still exported;
  the 120-case statsmodels fixture was not ported because it pinned the
  formula we replaced.
- **Probit.** Abramowitz & Stegun 26.2.23 (≈4.5e-4 error) became Acklam's
  rational approximation (≈1e-9), so `⌈n⌉` agrees with R's `ceiling(n)`
  rather than sitting a few visitors off. A sealed receipt should not
  depend on which side of an integer an approximation error falls.

### Detectable lift

`detectableLift` inverts the same formula: per-arm
`n = ⌈dailyTraffic × runtimeDays / variants⌉`, then bisection on the relative
lift until the bracket is narrower than 1e-12 (the exact n is strictly
decreasing in the lift, so the bracket `(0, (1−p₁)/p₁)` always contains
exactly one root). The reported lift is the upper edge, so sizing it again
lands back on the same integer n. Positive lift only, as R's
`power.prop.test(n=, p1=, …)` solving for `p2` does. If even `p2 → 1` needs
more than the available n, it throws.

### SRM

`srm` is Pearson's chi-square goodness of fit — `Σ (o − e)² / e` with
`e = share × Σo`, `df = arms − 1`, no continuity correction — exactly
`scipy.stats.chisquare(observed, expected)`. Weights are normalised, so
`[50, 50]`, `[0.5, 0.5]` and `[1, 1]` are the same allocation. The p-value is
the upper tail `Q(df/2, χ²/2)`, the regularized upper incomplete gamma,
implemented in `src/srm.ts` from Numerical Recipes §6.2 (series below
`a + 1`, Lentz continued fraction above; Lanczos `lgamma`). The verdict
threshold defaults to **0.001**: SRM checks run continuously over a test's
life, so 0.05 false-alarms constantly.

### Results

`results` reads a finished test, each treatment against `arms[0]` at
`α / (arms − 1)` (Bonferroni; the same split `sampleSize` sizes for; the CI
level follows, `1 − α'`). `pAdjusted = min(1, p · comparisons)` is reported
alongside for anyone who adjusts p instead of α.

- **Binomial** — `twoProportionTest`: pooled-variance z,
  `z = (p_t − p_c) / √(p̄ q̄ (1/n_t + 1/n_c))`, p from the normal tail; the CI
  on the difference is Wald with each arm's own variance. That is exactly R's
  `prop.test(correct = FALSE)` — its χ² is this z², and its `conf.int` is
  this unpooled Wald interval — and statsmodels' `proportions_ztest`.
- **Continuous** — `welchTest`: Welch's t from summary statistics, with
  Welch–Satterthwaite df; the CI uses the t quantile at that df. R
  `t.test(var.equal = FALSE)`, scipy `ttest_ind_from_stats(equal_var = False)`.
- **Relative lift CI** — delta method on `r = p_t/p_c − 1`,
  `Var(r) ≈ Var(p_t)/p_c² + p_t² Var(p_c)/p_c⁴`, same quantile as the
  difference CI. `NaN` when the control rate (or mean) is zero.
- **One-tailed** means the direction was declared in advance, treatment >
  control: the p-value is the upper tail, the CI is one-sided (upper bound
  `+Infinity`), and a worse treatment can only read `inconclusive`.

Departures from the reference tool (Merritt Aho's *Results Analysis Tool*,
`alphanumerritt/abtestanalysis`, on forwarddigital.org/tools), each deliberate:

| | reference | here | why |
|---|---|---|---|
| binomial statistic | unpooled z (`SEdiff` from each arm) | pooled z | matches `prop.test` / `proportions_ztest`, the standard H₀ form; the two differ in the third digit of p at typical sizes |
| continuous statistic | pooled-variance SE, normal p-value | Welch t, t-distribution p | the pooled/normal shortcut is only right for equal variances and large n; Welch is what `t.test` does by default |
| relative-lift CI | difference CI ÷ control rate | delta method | the reference treats the control rate as known; the delta method carries its uncertainty |
| one-tailed p | `(1 − Φ(|z|))·1`: direction taken from the data | direction declared: `P(Z > z)` | a one-tailed test whose direction is picked after looking is a two-tailed test at 2α |
| multiple comparisons | user-typed "number of p-values", p multiplied | `α / (arms − 1)` from the arm count, α split | consistent with `sampleSize`; `pAdjusted` still reported |

### Bayes

`bayes` puts a `Beta(a, b)` prior on every arm's rate (default `Beta(1, 1)`,
the reference tool's choice) and reads the posteriors
`Beta(a + conversions, b + visitors − conversions)`. Nothing is sampled:

```
P(lift > t)              = ∫ f_c(x) · [1 − F_t((1 + t) x)] dx
E[loss | choose t]       = E[max(0, p_c − p_t)] = ∫ f_c(x) · [x F_t(x) − μ_t F_{t⁺}(x)] dx,  t⁺ = Beta(a_t + 1, b_t)
P(arm i is best)         = ∫ f_i(x) · Π_{j≠i} F_j(x) dx
```

with `f`, `F` the Beta density and CDF (`betainc`). Each is a 1-D integral
over the outer arm's `[q(1e-15), q(1 − 1e-15)]` quantile range by composite
Gauss–Legendre (96 panels × 12 points). The equal-tailed credible interval
on relative lift inverts `P(lift > t)` by bisection (to 1e-10 in lift). The
**threshold of caring** is a relative lift below which you would not act:
`pAboveThreshold = P(lift > θ)` and `pNotWorse = P(lift > −θ)` are the
reference tool's "improvement is significant" and "not worse than control"
probabilities (its ROPE, symmetric). The one-line `read` walks the same
ladder the reference does — above threshold → beats control → not worse →
control better → undecided — with `level` as the bar (the reference fixes
0.95). Expected loss (absolute, in rate, pairwise against control) is added;
the reference omits it on purpose. P(best) is over all arms.

Numerical caveat: the prior must be positive but a posterior `a` or `b`
below 1 (e.g. `Beta(0.5, 0.5)` with zero conversions) has a density that
diverges at an endpoint, which Gauss–Legendre integrates less accurately.
Case F below (`Beta(0.5, 0.5)`, 1000 conversions) is fine; zero-conversion
arms under a Jeffreys prior are not tested.

### Special functions

`src/special.ts`: Lanczos `logGamma`; `gammaQ`; `betainc` (NR §6.4
continued fraction, symmetric split at `(a+1)/(a+b+2)`, up to 20 000 terms —
iterations scale with `√max(a, b)`); `betaQuantile` by bisection; `normalSf`
via `gammaQ(½, z²/2)`; `normalQuantile` = Acklam polished with one Halley
step (double precision); `studentTSf` = `½ I_{ν/(ν+t²)}(ν/2, ½)`;
`studentTQuantile` by safeguarded Newton; `gaussLegendre(n)` nodes.

## Oracles

`src/__tests__/oracle.test.ts` holds eight cases spanning baseline 0.5–20%,
relative MDE 2–30%, 2–4 variants, one- and two-tailed, α 0.01–0.05, power
0.8–0.9. Two independent implementations produced the expected values on
2026-09-04:

| id | baseline | mde | k | tails | α | power | R per arm | spotify per arm |
|---|---|---|---|---|---|---|---|---|
| A | 0.005 | 0.30 | 2 | 2 | 0.05 | 0.8 | 39 885 | 34 710 |
| B | 0.02 | 0.10 | 2 | 2 | 0.05 | 0.8 | 80 682 | 76 920 |
| C | 0.02 | 0.10 | 2 | 1 | 0.05 | 0.8 | 63 553 | 60 590 |
| D | 0.05 | 0.05 | 3 | 2 | 0.05 | 0.8 | 147 893 | 144 477 |
| E | 0.10 | 0.02 | 2 | 2 | 0.05 | 0.9 | 477 030 | 472 835 |
| F | 0.10 | 0.20 | 4 | 1 | 0.05 | 0.8 | 4 316 | 3 969 |
| G | 0.20 | 0.05 | 3 | 2 | 0.01 | 0.8 | 43 392 | 42 601 |
| H | 0.20 | 0.30 | 2 | 2 | 0.05 | 0.8 | 772 | 698 |

- **R** (`power.prop.test`, R 4.x): matched within **±1 visitor per arm**.
- **spotify-confidence 4.1.0** (`SampleSize.binomial`, equal allocation,
  `control_vs_all`, `bonferroni_correction=True`; the function is two-sided
  only, so one-tailed cases pass `alpha × 2`): always **1–13% lower**,
  growing with the MDE. It uses the baseline variance `p₁(1−p₁)` for both
  arms and both z terms (Duflo, Glennerster & Kremer 2007), where
  `power.prop.test` uses pooled variance under H₀ and per-arm variance
  under H₁. The test does not widen the tolerance; it asserts that our `n`
  rescaled by that variance ratio lands on spotify's number within 0.5%,
  i.e. the whole gap is the variance convention and nothing else (not
  tails, not Bonferroni, not the quantile).

To regenerate: R is `power.prop.test(p1, p1*(1+mde), sig.level=alpha/(k-1),
power, alternative)`; Python is
`uv venv; uv pip install spotify-confidence "bokeh<3.4"` (chartify breaks on
newer bokeh) then `SampleSize.binomial(baseline*mde, baseline, alpha, power,
k, 'control_vs_all', treatment_allocations=np.ones(k)/k, bonferroni_correction=True)`.

### Detectable lift — R

`src/__tests__/detectable-lift.test.ts`. Round-trip against `sampleSize` on
eight cases (lift → n → lift within 0.1%; the recovered lift re-sizes to the
same integer n), and four cases against R 4.5.3
`power.prop.test(n=ceiling(daily*days/k), p1, sig.level=alpha/(k-1), power,
alternative, tol=1e-12)$p2`, generated 2026-09-04:

| id | baseline | daily | days | k | tails | α | power | n per arm | R p2 |
|---|---|---|---|---|---|---|---|---|---|
| A | 0.02 | 10 000 | 14 | 2 | 2 | 0.05 | 0.8 | 70 000 | 0.0221509456 |
| B | 0.05 | 3 000 | 21 | 3 | 2 | 0.05 | 0.8 | 21 000 | 0.0567631979 |
| C | 0.10 | 2 000 | 28 | 2 | 1 | 0.05 | 0.9 | 28 000 | 0.1075422977 |
| D | 0.005 | 50 000 | 30 | 4 | 2 | 0.01 | 0.8 | 375 000 | 0.0056343179 |

Specified tolerance ±0.05 points on p2; actual agreement is to the 8th decimal.

### Results — R and scipy/statsmodels

`src/__tests__/results.test.ts`, generated 2026-09-04. Nine two-proportion
cases (R 4.5.3 `prop.test(correct = FALSE)` vs statsmodels 0.15
`proportions_ztest`) and eight Welch cases (R `t.test(var.equal = FALSE)` on
vectors built to the exact mean/sd vs scipy 1.18 `ttest_ind_from_stats`).
The two oracles agree with each other to every printed digit, so one column
is listed. Asserted: z / t within 1e-11, df within 1e-8, p within 1e-9, CI
bounds within 1e-6 (actual: ~1e-13). A, B and the Welch A, B are the
reference tool's default examples.

| id | control | treatment | tails | α | z | p | CI on difference |
|---|---|---|---|---|---|---|---|
| A | 890 / 10 000 | 920 / 10 000 | 2 | 0.05 | 0.7394 | 0.45966 | [−0.004952, 0.010952] |
| B | same | same | 1 | 0.05 | 0.7394 | 0.22983 | [−0.003674, ∞) |
| C | 100 / 5 000 | 130 / 5 200 | 2 | 0.05 | 1.7004 | 0.08906 | [−0.000750, 0.010750] |
| D | 2 000 / 100 000 | 2 100 / 100 000 | 2 | 0.01 | 1.5780 | 0.11457 | [−0.000632, 0.002632] |
| E | 40 / 800 | 30 / 750 | 2 | 0.05 | −0.9475 | 0.34340 | [−0.030610, 0.010610] |
| F | 1 000 / 20 000 | 1 000 / 20 000 | 2 | 0.05 | 0 | 1 | [−0.004272, 0.004272] |
| G | 300 / 1 500 | 345 / 1 500 | 1 | 0.1 | 1.9999 | 0.02276 | [0.010788, ∞) |
| H1 | 400 / 10 000 | 440 / 10 000 | 2 | 0.025 | 1.4101 | 0.15852 | [−0.002358, 0.010358] |
| H2 | 400 / 10 000 | 380 / 10 000 | 2 | 0.025 | −0.7305 | 0.46508 | [−0.008137, 0.004137] |

| id | control (n, mean, sd) | treatment | tails | α | t | df | p | CI |
|---|---|---|---|---|---|---|---|---|
| A | 10 000, 2.57, 19 | 10 000, 2.98, 24 | 2 | 0.05 | 1.3394 | 18 997.77 | 0.18045 | [−0.18999, 1.00999] |
| B | same | same | 1 | 0.05 | 1.3394 | 18 997.77 | 0.09023 | [−0.09352, ∞) |
| C | 30, 50, 10 | 25, 55, 12 | 2 | 0.05 | 1.6581 | 46.83 | 0.10398 | [−1.06700, 11.06700] |
| D | 500, 100, 30 | 480, 98, 28 | 2 | 0.01 | −1.0794 | 977.23 | 0.28069 | [−6.78216, 2.78216] |
| E | 200, 3.2, 1.1 | 210, 3.2, 1.3 | 2 | 0.05 | 0 | 402.47 | 1 | [−0.23342, 0.23342] |
| F | 50 000, 0.5, 2 | 51 000, 0.52, 2.1 | 1 | 0.05 | 1.5501 | 100 913.31 | 0.06056 | [−0.00122, ∞) |
| G1 | 1 000, 40, 15 | 1 000, 42, 16 | 2 | 0.025 | 2.8837 | 1 989.74 | 0.00397 | [0.44432, 3.55568] |
| G2 | 1 000, 40, 15 | 1 000, 39.5, 14 | 2 | 0.025 | −0.7706 | 1 988.56 | 0.44104 | [−1.95543, 0.95543] |

H1/H2 and G1/G2 are the three-arm cases: `results` with α = 0.05 must
reproduce them at the per-comparison 0.025.

### Bayes — scipy and the reference tool's Monte Carlo

`src/__tests__/bayes.test.ts`, generated 2026-09-04. Seven two-arm cases
plus one three-arm P(best) case against scipy: each quantity as
`scipy.integrate.quad` over `scipy.stats.beta` pdf × sf/cdf (epsabs 1e-13),
credible bounds by `brentq` on the same integral. Specified tolerance 1e-6;
actual agreement ~1e-10. Priors Beta(1,1), Beta(2,20), Beta(0.5,0.5);
levels 0.9–0.99; thresholds 0–5%; n from 50 to 100 000.

| id | control | treatment | prior | θ | P(t > c) | P(lift > θ) | P(lift > −θ) | loss if chosen | lift CI |
|---|---|---|---|---|---|---|---|---|---|
| M | 950 / 10 000 | 980 / 10 010 | 1, 1 | 1.5% | 0.756509 | 0.637177 | 0.851877 | 6.014e-4 | [−0.05325, 0.12176] |
| A | 400 / 10 000 | 440 / 10 000 | 1, 1 | 1% | 0.920639 | 0.896517 | 0.940419 | 1.020e-4 | [−0.03648, 0.25580] |
| B | 100 / 5 000 | 130 / 5 200 | 1, 1 | 2% | 0.955190 | 0.938867 | 0.968031 | 5.444e-5 | [0.00687, 0.55037] |
| C | 40 / 800 | 30 / 750 | 1, 1 | 0 | 0.174328 | — | — | 1.090e-2 | [−0.49481, 0.26692] |
| D | 2 000 / 100 000 | 2 100 / 100 000 | 2, 20 | 1% | 0.942657 | 0.895346 | 0.971461 | 1.553e-5 | [−0.03038, 0.13701] |
| E | 5 / 50 | 8 / 50 | 1, 1 | 5% | 0.805586 | 0.776831 | 0.833268 | 7.365e-3 | [−0.41594, 3.36093] |
| F | 1 000 / 20 000 | 1 000 / 20 000 | 0.5, 0.5 | 1% | 0.5 | 0.409704 | 0.591188 | 8.695e-4 | [−0.08189, 0.08919] |

Case M is the reference tool's own default example (A 950/10 000, B
980/10 010). Its `bayesian-ab-app.Rmd` posterior block was run verbatim in R
(`rbeta(n, 1 + conv, 1 + n − conv)`, `set.seed(20260904)`) at its shipped
100 000 draws — P(B > A) 0.75554, P(lift > 1.5%) 0.63666, P(lift > −1.5%)
0.85084 — and at 10⁷ — 0.756551, 0.637212, 0.851937. The test asserts the
exact values sit within 4 Monte Carlo standard errors of each
(≈ 0.0055 at 10⁵, ≈ 0.00055 at 10⁷), and that both round to the same whole
percent, which is all the reference displays. Its sample quantiles of the
lift and sample means of the loss at 10⁷ match within 5e-4 and 5e-6.

To regenerate: the R and Python scripts are in the test-file headers; scipy
via `uv run --with scipy --with statsmodels python`.

### Special functions — scipy

`src/__tests__/special.test.ts`: `betainc` at 16 points (a, b from 0.1 to
9×10⁵; x down to 1e-6 and up to 1 − 1e-6) vs `scipy.special.betainc`;
`logGamma` at 7 vs `gammaln`; `studentTSf` at 8 and `studentTQuantile` at 6
vs `scipy.stats.t`; `normalSf` at 6 (to z = 8, sf 6e-16) and `normalQuantile`
at 7 vs `scipy.stats.norm`. Agreement is ~1e-15 relative except where a + b
is large: the incomplete-beta prefactor cancels three log-gammas of size
~(a+b)·ln(a+b), so relative error grows like ε·(a+b)·ln(a+b) — measured
1e-11 at a + b = 10⁴ and 2e-11 at 10⁶. The test's tolerance is that model
(`1e-13 + 2e-15·(a+b)·ln(a+b)·I`), not a widened constant; the pages need 1e-6.

### SRM — scipy

`src/__tests__/srm.test.ts`. Eight cases against `scipy.stats.chisquare`
(`uv run --with scipy python`), p within 1e-6 (actual: 1e-12), df 1–3,
weights as shares, percents and ratios, one exact match (χ² = 0, p = 1), and
seven direct checks of `chiSquareSf` against `scipy.stats.chi2.sf` at
df 1–10 down to p ≈ 3e-12.

| id | expected | observed | χ² | p |
|---|---|---|---|---|
| A | 0.5, 0.5 | 5000, 4800 | 4.081633 | 0.0433518 |
| B | 1, 1, 1 | 3400, 3300, 3300 | 2 | 0.3678794 |
| C | 25 ×4 | 1000, 1000, 1000, 1100 | 7.317073 | 0.0624497 |
| D | 1, 3 | 2500, 7600 | 0.330033 | 0.5656397 |
| E | 0.9, 0.1 | 90200, 9800 | 4.444444 | 0.0350150 |
| F | 0.5, 0.5 | 50000, 49000 | 10.101010 | 0.0014819 |
| G | 0.2, 0.3, 0.5 | 2003, 3011, 4986 | 0.084033 | 0.9588538 |
| H | 0.5, 0.5 | 7000, 7000 | 0 | 1 |

### Sequential

`sequentialPlan` / `sequentialAnalyze` in `src/sequential/index.ts` are a port
of Merritt Aho's **Sequential Testing** Shiny app
(`alphanumerritt/sequential-test-app`, v3.21, 2022 — Matt's fork is
byte-identical at the same HEAD; the 2020 `legacySequentialCalculator` uses
the same calls), which is, in its own words, "little more than a highly
restrictive GUI" for Keaven Anderson's **gsDesign**. There is no spending
function to choose; the app fixes it. Exactly what it does (`createTest` in
`sequentialTestingApp.Rmd`):

```r
n_fix  <- power.prop.test(p1 = cvrA, p2 = base*(1+mde), sig.level = 1-conf,
                          power, alternative)$n            # cvrA = base*(1-margin) one-tailed, base two-tailed
design <- gsDesign(k, test.type = if (tails > 1) 2 else 4,
                   alpha = (1-conf)/tails, beta = 1-power,
                   sfu = sfPower, sfupar = 3,               # Kim-DeMets α(t) = α·t³
                   sfl = sfPower, sflpar = 2,               # Kim-DeMets β(t) = β·t²
                   n.fix = n_fix [, n.I = revised, maxn.IPlan = design$n.I[k]])
```

- **One-tailed → `test.type = 4`**: binding efficacy bound, *non-binding*
  futility bound (the efficacy bound is computed with the lower bound
  ignored, so crossing futility and continuing never inflates α).
  **Two-tailed → `test.type = 2`**: symmetric, both binding, lower = −upper.
- **Boundaries** are gsDesign's C routines `gsbound` / `gsbound1` /
  `probrej`, ported line for line: Jennison & Turnbull (2000, §19.2)
  recursive numerical integration on the `r = 18` grid (6r − 1 = 107 points
  with Simpson midpoints, `gridpts.c`), Newton–Raphson per look on the
  incremental spend, `EXTREMEZ = 20` sentinels, tolerance 1e-6. Not
  Lan-DeMets O'Brien-Fleming, not Pocock, not mSPRT.
- **Sample size**: `gsI` (type 2) / `gsDType4ss` + `gsI1` (type 4) — Brent's
  zeroin (R's `uniroot`, ported from `zeroin.c` with the same stopping rule)
  on the maximum information until power at the MDE is 1 − β.
  `delta = |z_α + z_β| / √n.fix` as `gsDErrorCheck` defines it, so `n.I` is in
  per-arm visitors.
- **Analysis**: z is `−testBinomial(control, treatment, delta0 = control
  rate × margin)` — Miettinen & Nurminen (1985, eqn 9) restricted-MLE
  variance; entered looks re-time the design (per-arm n at every look is the
  piecewise-linear interpolation over look index through (0, 0), each entered
  look, and the planned maximum — the app's dplyr chain, `reviseLooks`), then
  `gsDesign(…, n.I = revised, maxn.IPlan = planned max)`; looks are scored in
  look order against their bounds and scoring stops at the first rejection.
  On rejection the sequential p-value is `gsProbability(theta = 0, n.I =
  observed n's, a = −20, b = [earlier efficacy bounds…, observed z])` summed
  over the upper tail × tails. The interval is `ciBinomial` at
  `alpha = 2·(1 − Φ(efficacy bound at that look))`, divided by the control rate.
- **Normal primitives**: `pnorm` from a scaled Maclaurin series (|x| < 2√2)
  and a Lentz continued fraction above, `qnorm` = Acklam + Halley refinement.
  Both match R to ≤ 1e-13.

Two deliberate departures, both stated in the registry gap: the app rounds z
to two decimals *before* comparing it to the bound (a display habit that leaks
into the decision); we score the exact z. And the app evaluates results in
entry order; we evaluate in look order. Everything else — including `holm`,
the app's Holm-adjusted efficacy table for `variants > 2` — is the app's.

#### Oracle — R

`src/__tests__/sequential.test.ts`. R 4.5.3 + gsDesign 3.11.0 (installed to
a scratch lib), sourcing the app's own `createTest()` verbatim from the Rmd,
plus the app's z / p / CI calls exactly as its observers issue them. The
script also calls `gsDesign()` directly with the same parameters and asserts
`createTest` adds nothing (it doesn't). Eight planning cases:

| id | tails | k | baseline | mde | margin | α | power | n.fix | max n per arm |
|---|---|---|---|---|---|---|---|---|---|
| A | 1 | 4 | 0.10 | 0.10 | — | 0.05 | 0.80 | 11 619.07 | 12 742.71 |
| B | 2 | 5 | 0.02 | 0.10 | — | 0.05 | 0.80 | 80 681.38 | 83 266.48 |
| C | 1 | 3 | 0.05 | 0.05 | — | 0.10 | 0.90 | — | 110 504 |
| D | 2 | 10 | 0.20 | 0.03 | — | 0.01 | 0.80 | — | 110 088 |
| E | 1 | 8 | 0.005 | 0.30 | 0.02 | 0.05 | 0.80 | — | 31 184 |
| F | 2 | 6 | 0.10 | 0.20 | — | 0.10 | 0.90 | — | 4 319 |
| G | 1 | 7 | 0.03 | 0.08 | — | 0.05 | 0.85 | — | 85 504 |
| H | 1 | 3 | 0.50 | 0.04 | — | 0.20 | 0.80 | — | 3 879 |

and eight analysis cases over them (early efficacy stop, in-order and
out-of-order entry, final look entered at a non-planned n, a two-tailed
negative lift, a one-tailed futility crossing, complete-and-inconclusive).
Specified tolerance: bounds 1e-6, per-look n ±1. Actual: bounds ≤ 4e-14
(plans) / 2e-9 (re-timed), n ≤ 2e-5 (R's `uniroot` residue inside
`power.prop.test`), sequential p ≤ 1e-12, interval endpoints ≤ 1e-11,
statuses identical.

## Build

```sh
npm install
npm test            # vitest
npm run build       # tsc → dist/ (ESM + .d.ts)
npm run sync:landing  # build, then copy dist/power.js → lab/{sample-size,detectable-lift}/analysis.js,
                      #   dist/srm.js → lab/srm/analysis.js,
                      #   dist/results.js + dist/special.js → lab/results/, dist/bayes.js + dist/special.js → lab/bayes/
```

`src/power.ts` and `src/srm.ts` are deliberately import-free so each
compiles to a single file the static landing site can load with
`<script type="module">`. `results.ts` and `bayes.ts` share `special.ts`
and import it as `./special.js`, so `sync:landing` copies that file next to
each of them; the browser resolves the relative import. The copies under `apps/landing/lab/*/analysis.js`
are checked in — Cloudflare Pages serves `apps/landing/` with no build step.
Re-run `sync:landing` after any change here.
