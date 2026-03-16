"""Multiple comparison correction functions.

Extracted from handler.py / stats-worker.js so they can be unit tested
independently of Pyodide or the Lambda runtime.
"""


def holm_bonferroni(p_values):
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


def benjamini_hochberg(p_values):
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


def apply_correction(results, metrics, correction):
    """Apply multiple comparison correction to all metrics.

    Args:
        results: list of result dicts, each with either "pValue" or
                 "chanceToBeatControl".
        metrics: list of metric dicts (with "id" and optional "isGuardrail").
        correction: "holm-bonferroni", "benjamini-hochberg", or "none".

    Returns:
        The results list with adjusted p-values and recalculated significance.
    """
    if not results:
        return results

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
        adjusted = holm_bonferroni(p_values)
    elif correction == "benjamini-hochberg":
        adjusted = benjamini_hochberg(p_values)
    else:
        return results

    for i, r in enumerate(results):
        if "pValue" in r and r["pValue"] is not None:
            r["pValue"] = adjusted[i]
            r["significant"] = adjusted[i] < 0.05
        elif "chanceToBeatControl" in r:
            r["significant"] = adjusted[i] < 0.05

    return results
