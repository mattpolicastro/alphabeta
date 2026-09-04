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

## Build

```sh
npm install
npm test            # vitest
npm run build       # tsc → dist/ (ESM + .d.ts)
npm run sync:landing  # build, then copy dist/power.js → lab/{sample-size,detectable-lift}/analysis.js
                      #                  and dist/srm.js → lab/srm/analysis.js
```

`src/power.ts` and `src/srm.ts` are deliberately import-free so each
compiles to a single file the static landing site can load with
`<script type="module">`. The copies under `apps/landing/lab/*/analysis.js`
are checked in — Cloudflare Pages serves `apps/landing/` with no build step.
Re-run `sync:landing` after any change here.
