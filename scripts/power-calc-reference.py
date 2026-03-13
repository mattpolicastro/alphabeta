#!/usr/bin/env python3
"""
Power calculation reference implementation.
Equivalent to R's pwr.2p2n.test using statsmodels.
See requirements.md Section 6.8.

Used as validation fixture — the TypeScript PowerCalculator output
must match this within floating-point tolerance before shipping.

Usage:
    python power-calc-reference.py --baseline 0.05 --mde 0.15
    python power-calc-reference.py --baseline 0.05 --mde 0.15 --alpha 0.05 --power 0.80 --ratio 1.0
"""

import argparse
import math

# TODO: uncomment once statsmodels is installed
# from statsmodels.stats.power import NormalIndPower
# from statsmodels.stats.proportion import proportion_effectsize


def cohens_h(p1: float, p2: float) -> float:
    """Cohen's h effect size for two proportions."""
    return 2 * (math.asin(math.sqrt(p2)) - math.asin(math.sqrt(p1)))


def power_calc(
    p_baseline: float,
    mde_relative: float,
    alpha: float = 0.05,
    power: float = 0.80,
    ratio: float = 1.0,
) -> dict:
    """Calculate required sample size for a two-proportion test.

    Args:
        p_baseline: Baseline (control) conversion rate
        mde_relative: Relative minimum detectable effect (e.g. 0.15 = 15% lift)
        alpha: Significance level (default 0.05)
        power: Statistical power / 1−β (default 0.80)
        ratio: n_treatment / n_control (default 1.0 for equal split)

    Returns:
        dict with n_control, n_treatment, total_n, cohens_h
    """
    p_treatment = p_baseline * (1 + mde_relative)
    h = cohens_h(p_baseline, p_treatment)

    # TODO: uncomment once statsmodels is available
    # h_statsmodels = proportion_effectsize(p_baseline, p_treatment)
    # n = NormalIndPower().solve_power(
    #     effect_size=h_statsmodels,
    #     power=power,
    #     alpha=alpha,
    #     ratio=ratio,
    #     alternative="two-sided",
    # )
    # n_control = math.ceil(n)

    # Fallback: manual calculation using normal approximation
    # z_alpha/2 and z_beta from standard normal
    from scipy.stats import norm  # TODO: remove if using statsmodels

    z_alpha = norm.ppf(1 - alpha / 2)
    z_beta = norm.ppf(power)
    n_control = math.ceil(((z_alpha + z_beta) / h) ** 2) if abs(h) > 1e-10 else float("inf")

    n_treatment = math.ceil(n_control * ratio)

    return {
        "n_control": n_control,
        "n_treatment": n_treatment,
        "total_n": n_control + n_treatment,
        "cohens_h": h,
    }


def main():
    parser = argparse.ArgumentParser(description="Power calculation reference")
    parser.add_argument("--baseline", type=float, required=True, help="Baseline conversion rate")
    parser.add_argument("--mde", type=float, required=True, help="Relative MDE")
    parser.add_argument("--alpha", type=float, default=0.05, help="Significance level")
    parser.add_argument("--power", type=float, default=0.80, help="Statistical power")
    parser.add_argument("--ratio", type=float, default=1.0, help="n_treatment / n_control")
    args = parser.parse_args()

    result = power_calc(args.baseline, args.mde, args.alpha, args.power, args.ratio)
    print(f"Baseline rate:   {args.baseline:.4f}")
    print(f"Treatment rate:  {args.baseline * (1 + args.mde):.4f}")
    print(f"Cohen's h:       {result['cohens_h']:.6f}")
    print(f"n per control:   {result['n_control']}")
    print(f"n per treatment: {result['n_treatment']}")
    print(f"Total n:         {result['total_n']}")

    if abs(result["cohens_h"]) < 0.01:
        print("WARNING: Effect size is very small — experiment will need a very long runtime.")


if __name__ == "__main__":
    main()
