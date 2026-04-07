#!/usr/bin/env python3
"""
Power calculation reference implementation.

Mirrors R's pwr.2p2n.test via statsmodels. Used as the ground-truth fixture
for the TypeScript PowerCalculator implementation
(apps/web/lib/stats/powerCalculator.ts) — the TS output must match this
script within a tight tolerance.

Two modes:

  1. Single calculation:
       python scripts/power-calc-reference.py \
           --baseline 0.05 --mde 0.15 --alpha 0.05 --power 0.80 --ratio 1.0

  2. Generate the Jest test fixture JSON (written to the path below):
       python scripts/power-calc-reference.py --emit-fixtures
"""

import argparse
import json
import math
from pathlib import Path

from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize


FIXTURES_PATH = Path(__file__).parent / "power-calc-fixtures.json"


def cohens_h(p1: float, p2: float) -> float:
    """Cohen's h effect size for two proportions (arcsine transform)."""
    return 2 * (math.asin(math.sqrt(p2)) - math.asin(math.sqrt(p1)))


def power_calc(
    p_baseline: float,
    mde_relative: float,
    alpha: float = 0.05,
    power: float = 0.80,
    ratio: float = 1.0,
) -> dict:
    """Calculate required sample size for a two-proportion test.

    Uses statsmodels' NormalIndPower, which solves for n_control such that
    a two-sided two-sample test of proportions detects effect size `h` at
    the given alpha and power, with n_treatment = n_control * ratio.
    """
    p_treatment = p_baseline * (1 + mde_relative)
    if p_treatment <= 0 or p_treatment >= 1 or p_baseline <= 0 or p_baseline >= 1:
        raise ValueError(
            f"baseline/treatment rates must be in (0, 1): "
            f"baseline={p_baseline}, treatment={p_treatment}"
        )

    h = cohens_h(p_baseline, p_treatment)
    # statsmodels uses arcsine-transformed effect size; for two proportions
    # this is exactly Cohen's h. We use proportion_effectsize to document
    # intent (it matches cohens_h to machine precision).
    h_sm = proportion_effectsize(p_treatment, p_baseline)
    # Sanity: the two should agree up to sign. statsmodels takes
    # (prop1, prop2) where effect_size = 2*(arcsin(sqrt(p1)) - arcsin(sqrt(p2))).
    assert math.isclose(abs(h), abs(h_sm), rel_tol=1e-12), (h, h_sm)

    n = NormalIndPower().solve_power(
        effect_size=abs(h_sm),
        power=power,
        alpha=alpha,
        ratio=ratio,
        alternative="two-sided",
    )
    n_control = math.ceil(n)
    n_treatment = math.ceil(n_control * ratio)

    return {
        "n_control": n_control,
        "n_treatment": n_treatment,
        "total_n": n_control + n_treatment,
        "cohens_h": h,
        "p_treatment": p_treatment,
    }


def _emit_fixtures() -> None:
    """Produce a deterministic grid of fixtures for Jest parity tests."""
    baselines = [0.01, 0.05, 0.10, 0.25, 0.50]
    mdes = [0.05, 0.10, 0.20]  # relative
    alphas = [0.05, 0.01]
    powers = [0.80, 0.90]
    ratios = [1.0, 0.5]

    cases: list[dict] = []
    for b in baselines:
        for m in mdes:
            for a in alphas:
                for p in powers:
                    for r in ratios:
                        result = power_calc(b, m, a, p, r)
                        cases.append(
                            {
                                "input": {
                                    "p_baseline": b,
                                    "mde_relative": m,
                                    "alpha": a,
                                    "power": p,
                                    "ratio": r,
                                },
                                "expected": {
                                    "cohens_h": result["cohens_h"],
                                    "n_control": result["n_control"],
                                    "n_treatment": result["n_treatment"],
                                    "total_n": result["total_n"],
                                },
                            }
                        )

    payload = {
        "generated_by": "scripts/power-calc-reference.py",
        "source": "statsmodels.stats.power.NormalIndPower (two-sided)",
        "cases": cases,
    }
    FIXTURES_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {len(cases)} fixtures to {FIXTURES_PATH}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Power calculation reference")
    parser.add_argument(
        "--emit-fixtures",
        action="store_true",
        help="Write the Jest fixture JSON and exit",
    )
    parser.add_argument("--baseline", type=float, help="Baseline conversion rate")
    parser.add_argument("--mde", type=float, help="Relative MDE")
    parser.add_argument("--alpha", type=float, default=0.05, help="Significance level")
    parser.add_argument("--power", type=float, default=0.80, help="Statistical power")
    parser.add_argument("--ratio", type=float, default=1.0, help="n_treatment / n_control")
    args = parser.parse_args()

    if args.emit_fixtures:
        _emit_fixtures()
        return

    if args.baseline is None or args.mde is None:
        parser.error("--baseline and --mde are required unless --emit-fixtures is set")

    result = power_calc(args.baseline, args.mde, args.alpha, args.power, args.ratio)
    print(f"Baseline rate:   {args.baseline:.4f}")
    print(f"Treatment rate:  {result['p_treatment']:.4f}")
    print(f"Cohen's h:       {result['cohens_h']:.6f}")
    print(f"n per control:   {result['n_control']}")
    print(f"n per treatment: {result['n_treatment']}")
    print(f"Total n:         {result['total_n']}")


if __name__ == "__main__":
    main()
