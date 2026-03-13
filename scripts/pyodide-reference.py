#!/usr/bin/env python3
"""
CPython reference for the Pyodide compatibility spike.
Runs gbstats Bayesian, Frequentist, and SRM tests with fixture data
and prints expected values. The Pyodide test page must match these within 1e-9.

See requirements.md Section 13.1.

NOTE: gbstats uses a class-based API (not bare functions as the requirements doc assumed).
- Bayesian: EffectBayesianABTest + EffectBayesianConfig
- Frequentist: TwoSidedTTest + FrequentistConfig
- Stats input: ProportionStatistic(n, sum)
- SRM: check_srm(users, weights) → float

Usage:
    pip install gbstats
    python pyodide-reference.py
"""

import json

from gbstats.bayesian.tests import EffectBayesianABTest, EffectBayesianConfig
from gbstats.frequentist.tests import TwoSidedTTest, FrequentistConfig
from gbstats.models.statistics import ProportionStatistic
from gbstats.utils import check_srm

# ---- Fixture data ----
# Control: 5000 users, 480 conversions (9.6%)
# Treatment: 5100 users, 551 conversions (10.8%)
N_CTRL = 5000
CV_CTRL = 480
N_TRT = 5100
CV_TRT = 551


def run_bayesian():
    stat_a = ProportionStatistic(n=N_CTRL, sum=CV_CTRL)
    stat_b = ProportionStatistic(n=N_TRT, sum=CV_TRT)
    config = EffectBayesianConfig(difference_type="relative", alpha=0.05)
    test = EffectBayesianABTest(stat_a=stat_a, stat_b=stat_b, config=config)
    result = test.compute_result()

    return {
        "chance_to_win": result.chance_to_win,
        "expected": result.expected,
        "ci": result.ci,
        "risk": result.risk,
        "uplift_mean": result.uplift.mean,
        "uplift_stddev": result.uplift.stddev,
        "error_message": result.error_message,
    }


def run_frequentist():
    stat_a = ProportionStatistic(n=N_CTRL, sum=CV_CTRL)
    stat_b = ProportionStatistic(n=N_TRT, sum=CV_TRT)
    config = FrequentistConfig(difference_type="relative", alpha=0.05)
    test = TwoSidedTTest(stat_a=stat_a, stat_b=stat_b, config=config)
    result = test.compute_result()

    return {
        "expected": result.expected,
        "ci": result.ci,
        "p_value": result.p_value,
        "uplift_mean": result.uplift.mean,
        "uplift_stddev": result.uplift.stddev,
        "error_message": result.error_message,
    }


def run_srm():
    p_balanced = check_srm([5000, 5100], [0.5, 0.5])
    p_imbalanced = check_srm([5000, 3000], [0.5, 0.5])

    return {
        "balanced_p": p_balanced,
        "imbalanced_p": p_imbalanced,
    }


def main():
    print("=" * 60)
    print("gbstats CPython Reference Values")
    print(f"Fixture: ctrl={N_CTRL}n/{CV_CTRL}cv, trt={N_TRT}n/{CV_TRT}cv")
    print("=" * 60)

    print("\n--- Bayesian (EffectBayesianABTest) ---")
    bayesian = run_bayesian()
    for k, v in bayesian.items():
        print(f"  {k}: {v}")

    print("\n--- Frequentist (TwoSidedTTest) ---")
    freq = run_frequentist()
    for k, v in freq.items():
        print(f"  {k}: {v}")

    print("\n--- SRM (check_srm) ---")
    srm = run_srm()
    for k, v in srm.items():
        print(f"  {k}: {v}")

    all_results = {
        "fixture": {
            "n_ctrl": N_CTRL,
            "cv_ctrl": CV_CTRL,
            "n_trt": N_TRT,
            "cv_trt": CV_TRT,
        },
        "bayesian": bayesian,
        "frequentist": freq,
        "srm": srm,
    }

    print("\n--- JSON (for pyodide-test.html EXPECTED values) ---")
    print(json.dumps(all_results, indent=2))


if __name__ == "__main__":
    main()
