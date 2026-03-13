#!/usr/bin/env python3
"""
Synthetic data generator for demo and development testing.
Generates pre-aggregated A/B test CSVs matching the app's expected schema.
See requirements.md Section 5.1a.

Usage:
    python generate-demo-data.py --p-control 0.05 --mde 0.15 --n 10000 --seed 42
    python generate-demo-data.py --output apps/web/public/demo/demo-data.csv
"""

import argparse
import csv
import sys

import numpy as np


def generate(p_control: float, mde: float, n_per_variation: int, seed: int):
    """Generate synthetic pre-aggregated experiment data.

    Args:
        p_control: Baseline conversion rate for control
        mde: Minimum detectable effect (relative, e.g. 0.15 = 15% lift)
        n_per_variation: Sample size per variation
        seed: Random seed for reproducibility
    """
    rng = np.random.default_rng(seed)
    p_treatment = p_control * (1 + mde)
    rows = []

    for variation, p in [("control", p_control), ("variant_a", p_treatment)]:
        units = n_per_variation

        # Overall row (all dimensions = "all")
        purchases = int(rng.binomial(units, p))
        clicks = int(rng.binomial(units, min(p * 8, 1.0)))
        revenue = round(purchases * rng.uniform(40, 60), 2)
        rows.append({
            "experiment_id": "demo_001",
            "variation_id": variation,
            "device_type": "all",
            "browser": "all",
            "units": units,
            "purchases": purchases,
            "clicks": clicks,
            "revenue": revenue,
        })

        # Device type slices
        for device, share in [("mobile", 0.45), ("desktop", 0.55)]:
            n_slice = round(units * share)
            device_modifier = 0.8 if device == "mobile" else 1.2
            d_purchases = int(rng.binomial(n_slice, p * device_modifier))
            d_clicks = int(rng.binomial(n_slice, min(p * 8 * device_modifier, 1.0)))
            d_revenue = round(d_purchases * rng.uniform(40, 60), 2)
            rows.append({
                "experiment_id": "demo_001",
                "variation_id": variation,
                "device_type": device,
                "browser": "all",
                "units": n_slice,
                "purchases": d_purchases,
                "clicks": d_clicks,
                "revenue": d_revenue,
            })

        # Browser slices
        for browser, share in [("chrome", 0.64), ("safari", 0.22), ("firefox", 0.14)]:
            n_slice = round(units * share)
            b_purchases = int(rng.binomial(n_slice, p))
            b_clicks = int(rng.binomial(n_slice, min(p * 8, 1.0)))
            b_revenue = round(b_purchases * rng.uniform(40, 60), 2)
            rows.append({
                "experiment_id": "demo_001",
                "variation_id": variation,
                "device_type": "all",
                "browser": browser,
                "units": n_slice,
                "purchases": b_purchases,
                "clicks": b_clicks,
                "revenue": b_revenue,
            })

    return rows


def write_csv(rows, output_path):
    fieldnames = [
        "experiment_id", "variation_id", "device_type", "browser",
        "units", "purchases", "clicks", "revenue",
    ]
    with open(output_path, "w", newline="") as f:
        # Schema version header (required by app — see Section 4.2)
        f.write("#schema_version:1\n")
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic A/B test data")
    parser.add_argument("--p-control", type=float, default=0.05, help="Baseline conversion rate")
    parser.add_argument("--mde", type=float, default=0.15, help="Relative MDE (e.g. 0.15 = 15%%)")
    parser.add_argument("--n", type=int, default=10000, help="Sample size per variation")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--output", type=str, default="demo-data.csv", help="Output CSV path")
    args = parser.parse_args()

    rows = generate(args.p_control, args.mde, args.n, args.seed)
    write_csv(rows, args.output)
    print(f"Generated {len(rows)} rows → {args.output}")


if __name__ == "__main__":
    main()
