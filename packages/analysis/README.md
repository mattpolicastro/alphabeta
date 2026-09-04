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

## Build

```sh
npm install
npm test            # vitest
npm run build       # tsc → dist/ (ESM + .d.ts)
npm run sync:landing  # build, then copy dist/power.js → apps/landing/lab/sample-size/analysis.js
```

`src/power.ts` is deliberately import-free so its compiled form is a single
file the static landing site can load with `<script type="module">`. The
copy in `apps/landing/lab/sample-size/analysis.js` is checked in — Cloudflare
Pages serves `apps/landing/` with no build step. Re-run `sync:landing` after
any change here.
