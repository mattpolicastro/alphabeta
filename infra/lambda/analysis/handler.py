"""
Lambda entry point — Path B stats engine.
Identical analysis logic to the Pyodide Web Worker (Path A).
See requirements.md Section 6.5.

gbstats 0.8.0 API (class-based):
- Bayesian: EffectBayesianABTest + EffectBayesianConfig
- Frequentist: TwoSidedTTest + FrequentistConfig
- Input: ProportionStatistic(n, sum)
- SRM: check_srm(users, weights) → float
"""

import json

from gbstats.bayesian.tests import EffectBayesianABTest, EffectBayesianConfig
from gbstats.frequentist.tests import TwoSidedTTest, FrequentistConfig
from gbstats.models.statistics import ProportionStatistic, SampleMeanStatistic
from gbstats.utils import check_srm


def handler(event, context):
    """AWS Lambda handler. Receives AnalysisRequest, returns AnalysisResponse."""
    try:
        body = json.loads(event["body"])
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(400, f"Invalid request body: {e}")

    engine = body.get("engine", "bayesian")
    correction = body.get("correction", "none")
    variations = body["variations"]
    metrics = body["metrics"]
    data = body["data"]
    alpha = body.get("alpha", 0.05)
    srm_threshold = body.get("srmThreshold", 0.001)

    control_key = next(v["key"] for v in variations if v["isControl"])
    non_controls = [v for v in variations if not v["isControl"]]
    overall = data["overall"]

    # 1. SRM check (overall units only)
    observed = [overall[v["key"]]["units"] for v in variations]
    expected_weights = [v["weight"] for v in variations]
    srm_p = check_srm(observed, expected_weights)

    # 2. Per-metric, per-variation proportion test (overall)
    results = _run_tests(overall, engine, metrics, control_key, non_controls, alpha)

    # 3. Multiple comparison correction (non-guardrail metrics only)
    if correction != "none":
        results = _apply_correction(results, metrics, correction)

    # 4. Repeat for each dimension slice
    slice_results = _compute_slices(
        data.get("slices", {}), engine, metrics, control_key, non_controls, alpha, correction
    )

    # Multiple exposure flagging
    multiple_exposure_count = body.get("multipleExposureCount", 0)
    total_units = sum(overall[v["key"]]["units"] for v in variations)
    multiple_exposure_flagged = (
        multiple_exposure_count / total_units > 0.01 if total_units > 0 else False
    )

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # TODO: restrict to GitHub Pages domain
        },
        "body": json.dumps({
            "srmPValue": srm_p,
            "srmFlagged": srm_p < srm_threshold,
            "multipleExposureFlagged": multiple_exposure_flagged,
            "overall": results,
            "slices": slice_results,
            "warnings": [],
        }),
    }


def _make_mean_stat(mean, variance, n):
    """Convert mean + Bessel-corrected variance into SampleMeanStatistic(n, sum, sum_squares)."""
    s = mean * n
    ss = variance * (n - 1) + mean ** 2 * n
    return SampleMeanStatistic(n=n, sum=s, sum_squares=ss)


def _run_mean_test(mid, var_id, stat_a, stat_b, ctrl_mean, trt_mean, n_trt, engine, alpha):
    """Run a mean test (continuous metric) for a single variation vs control."""
    if engine == "bayesian":
        config = EffectBayesianConfig(difference_type="relative", alpha=alpha)
        test = EffectBayesianABTest(stat_a=stat_a, stat_b=stat_b, config=config)
        res = test.compute_result()
        return {
            "metricId": mid,
            "variationId": var_id,
            "units": n_trt,
            "rate": trt_mean,
            "mean": trt_mean,
            "chanceToBeatControl": res.chance_to_win,
            "expectedLoss": res.risk[1] if len(res.risk) > 1 else None,
            "credibleIntervalLower": res.ci[0] if res.ci else None,
            "credibleIntervalUpper": res.ci[1] if res.ci else None,
            "relativeUplift": res.expected,
            "absoluteUplift": trt_mean - ctrl_mean if ctrl_mean != 0 else 0,
            "significant": res.chance_to_win > 0.95 if res.chance_to_win is not None else False,
        }
    else:
        config = FrequentistConfig(difference_type="relative", alpha=alpha)
        test = TwoSidedTTest(stat_a=stat_a, stat_b=stat_b, config=config)
        res = test.compute_result()
        return {
            "metricId": mid,
            "variationId": var_id,
            "units": n_trt,
            "rate": trt_mean,
            "mean": trt_mean,
            "pValue": res.p_value,
            "confidenceIntervalLower": res.ci[0] if res.ci else None,
            "confidenceIntervalUpper": res.ci[1] if res.ci else None,
            "relativeUplift": res.expected,
            "absoluteUplift": trt_mean - ctrl_mean if ctrl_mean != 0 else 0,
            "significant": res.p_value < alpha if res.p_value is not None else False,
        }


def _run_tests(variation_data, engine, metrics, control_key, non_controls, alpha):
    """Run per-metric, per-variation tests on a single data slice."""
    results = []

    for metric in metrics:
        mid = metric["id"]
        metric_type = metric.get("metricType", "proportion")
        ctrl = variation_data[control_key]

        if metric_type == "continuous":
            continuous = ctrl.get("continuousMetrics", {}).get(mid, {})
            n_ctrl = continuous.get("n", 0)
            mean_ctrl = continuous.get("mean", 0)
            var_ctrl = continuous.get("variance", 0)
            stat_a = _make_mean_stat(mean_ctrl, var_ctrl, n_ctrl) if n_ctrl > 1 else ProportionStatistic(n=1, sum=0)

            for var in non_controls:
                trt = variation_data[var["key"]]
                trt_cont = trt.get("continuousMetrics", {}).get(mid, {})
                n_trt = trt_cont.get("n", 0)
                mean_trt = trt_cont.get("mean", 0)
                var_trt = trt_cont.get("variance", 0)
                stat_b = _make_mean_stat(mean_trt, var_trt, n_trt) if n_trt > 1 else ProportionStatistic(n=1, sum=0)
                results.append(_run_mean_test(mid, var["id"], stat_a, stat_b, mean_ctrl, mean_trt, n_trt, engine, alpha))
        else:
            n_ctrl = ctrl["units"]
            cv_ctrl = ctrl["metrics"][mid]
            stat_a = ProportionStatistic(n=n_ctrl, sum=cv_ctrl)

            for var in non_controls:
                trt = variation_data[var["key"]]
                n_trt = trt["units"]
                cv_trt = trt["metrics"][mid]
                stat_b = ProportionStatistic(n=n_trt, sum=cv_trt)

                if engine == "bayesian":
                    result = _run_bayesian(mid, var["id"], stat_a, stat_b, n_ctrl, cv_ctrl, n_trt, cv_trt, alpha)
                else:
                    result = _run_frequentist(mid, var["id"], stat_a, stat_b, n_ctrl, cv_ctrl, n_trt, cv_trt, alpha)

                results.append(result)

    return results


def _run_bayesian(mid, var_id, stat_a, stat_b, n_ctrl, cv_ctrl, n_trt, cv_trt, alpha):
    config = EffectBayesianConfig(difference_type="relative", alpha=alpha)
    test = EffectBayesianABTest(stat_a=stat_a, stat_b=stat_b, config=config)
    res = test.compute_result()

    return {
        "metricId": mid,
        "variationId": var_id,
        "units": n_trt,
        "rate": cv_trt / n_trt if n_trt > 0 else 0,
        "chanceToBeatControl": res.chance_to_win,
        "expectedLoss": res.risk[1] if len(res.risk) > 1 else None,
        "credibleIntervalLower": res.ci[0] if res.ci else None,
        "credibleIntervalUpper": res.ci[1] if res.ci else None,
        "relativeUplift": res.expected,
        "absoluteUplift": (cv_trt / n_trt - cv_ctrl / n_ctrl) if n_trt > 0 and n_ctrl > 0 else 0,
        "significant": res.chance_to_win > 0.95 if res.chance_to_win is not None else False,
    }


def _run_frequentist(mid, var_id, stat_a, stat_b, n_ctrl, cv_ctrl, n_trt, cv_trt, alpha):
    config = FrequentistConfig(difference_type="relative", alpha=alpha)
    test = TwoSidedTTest(stat_a=stat_a, stat_b=stat_b, config=config)
    res = test.compute_result()

    return {
        "metricId": mid,
        "variationId": var_id,
        "units": n_trt,
        "rate": cv_trt / n_trt if n_trt > 0 else 0,
        "pValue": res.p_value,
        "confidenceIntervalLower": res.ci[0] if res.ci else None,
        "confidenceIntervalUpper": res.ci[1] if res.ci else None,
        "relativeUplift": res.expected,
        "absoluteUplift": (cv_trt / n_trt - cv_ctrl / n_ctrl) if n_trt > 0 and n_ctrl > 0 else 0,
        "significant": res.p_value < alpha if res.p_value is not None else False,
    }


def _apply_correction(results, metrics, correction):
    """Apply multiple comparison correction to all metrics (primary and guardrail).
    See requirements.md Section 6.6."""
    if not results:
        return results

    # Extract p-values (Bayesian: use 1 - chanceToBeatControl as proxy)
    p_values = []
    for r in results:
        if "pValue" in r and r["pValue"] is not None:
            p_values.append(r["pValue"])
        elif "chanceToBeatControl" in r and r["chanceToBeatControl"] is not None:
            p_values.append(1 - r["chanceToBeatControl"])
        else:
            p_values.append(1.0)

    m = len(p_values)
    if m <= 1:
        return results

    if correction == "holm-bonferroni":
        adjusted = _holm_bonferroni(p_values)
    elif correction == "benjamini-hochberg":
        adjusted = _benjamini_hochberg(p_values)
    else:
        return results

    # Update significance based on adjusted p-values
    for i, r in enumerate(results):
        if "pValue" in r and r["pValue"] is not None:
            r["rawPValue"] = r["pValue"]
            r["pValue"] = adjusted[i]
            r["significant"] = adjusted[i] < (r.get("alpha", 0.05) if "alpha" in r else 0.05)
        elif "chanceToBeatControl" in r:
            # For Bayesian, adjust the proxy back
            r["significant"] = adjusted[i] < 0.05

    return results


def _holm_bonferroni(p_values):
    """Holm-Bonferroni step-down correction (controls FWER)."""
    m = len(p_values)
    indexed = sorted(enumerate(p_values), key=lambda x: x[1])
    adjusted = [0.0] * m
    cumulative_max = 0.0
    for rank, (orig_idx, p) in enumerate(indexed):
        corrected = p * (m - rank)
        cumulative_max = max(cumulative_max, corrected)
        adjusted[orig_idx] = min(cumulative_max, 1.0)
    return adjusted


def _benjamini_hochberg(p_values):
    """Benjamini-Hochberg step-up correction (controls FDR)."""
    m = len(p_values)
    indexed = sorted(enumerate(p_values), key=lambda x: x[1], reverse=True)
    adjusted = [0.0] * m
    cumulative_min = 1.0
    for rank_desc, (orig_idx, p) in enumerate(indexed):
        rank_asc = m - rank_desc  # 1-based ascending rank
        corrected = p * m / rank_asc
        cumulative_min = min(cumulative_min, corrected)
        adjusted[orig_idx] = min(cumulative_min, 1.0)
    return adjusted


def _compute_slices(slices, engine, metrics, control_key, non_controls, alpha, correction="none"):
    """Compute per-dimension-slice results. See requirements.md Section 6.5 step 4."""
    slice_results = {}
    for dimension_name, dimension_values in slices.items():
        slice_results[dimension_name] = {}
        for slice_value, variation_data in dimension_values.items():
            results = _run_tests(
                variation_data, engine, metrics, control_key, non_controls, alpha
            )
            if correction != "none":
                results = _apply_correction(results, metrics, correction)
            slice_results[dimension_name][slice_value] = results
    return slice_results


def _error_response(status_code, message):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({"error": message, "message": message}),
    }
