/**
 * Web Worker: Pyodide init + gbstats execution (Path A)
 *
 * Validated by the Pyodide compatibility spike (public/pyodide-test.html):
 * - Pyodide 0.26.2 (numpy 1.26.4, scipy 1.12.0, pandas 2.2.0)
 * - gbstats 0.8.0 installed via micropip with deps=False
 * - All 16 numeric assertions match CPython within 1e-6
 *
 * gbstats API (class-based):
 * - Bayesian: EffectBayesianABTest + EffectBayesianConfig
 * - Frequentist: TwoSidedTTest + FrequentistConfig
 * - Input: ProportionStatistic(n, sum)
 * - SRM: check_srm(users, weights) → float
 *
 * Analysis logic mirrors infra/lambda/analysis/handler.py exactly:
 * - Per-metric, per-variation proportion tests
 * - Multiple comparison correction (Holm-Bonferroni, Benjamini-Hochberg)
 * - Dimension slice results
 */

const PYODIDE_VERSION = '0.26.2';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide = null;

function postStatus(message) {
  self.postMessage({ type: 'status', message });
}

async function initPyodide() {
  if (pyodide) return pyodide;

  postStatus('Loading stats engine… (one-time download, ~35 MB)');

  importScripts(`${PYODIDE_CDN}pyodide.js`);
  pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });

  postStatus('Loading scientific packages…');
  await pyodide.loadPackage(['numpy', 'scipy', 'pandas', 'micropip']);

  postStatus('Installing gbstats…');
  await pyodide.runPythonAsync(`
import micropip
await micropip.install(['pydantic', 'packaging', 'nbformat'])
await micropip.install('gbstats', deps=False)
  `);

  postStatus('Stats engine ready.');
  return pyodide;
}

self.onmessage = async (event) => {
  try {
    const py = await initPyodide();

    py.globals.set('request_json', JSON.stringify(event.data));

    const resultJson = await py.runPythonAsync(`
import json
import numpy as np
from gbstats.bayesian.tests import EffectBayesianABTest, EffectBayesianConfig
from gbstats.frequentist.tests import TwoSidedTTest, FrequentistConfig
from gbstats.models.statistics import ProportionStatistic
from gbstats.utils import check_srm

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return super().default(obj)

# --- Helper functions (mirror Lambda handler) ---

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

def _run_tests(variation_data, engine, metrics, control_key, non_controls, alpha):
    results = []
    for metric in metrics:
        mid = metric["id"]
        ctrl = variation_data[control_key]
        n_ctrl = ctrl["units"]
        cv_ctrl = ctrl["metrics"][mid]
        stat_a = ProportionStatistic(n=n_ctrl, sum=cv_ctrl)
        for var in non_controls:
            trt = variation_data[var["key"]]
            n_trt = trt["units"]
            cv_trt = trt["metrics"][mid]
            stat_b = ProportionStatistic(n=n_trt, sum=cv_trt)
            if engine == "bayesian":
                results.append(_run_bayesian(mid, var["id"], stat_a, stat_b, n_ctrl, cv_ctrl, n_trt, cv_trt, alpha))
            else:
                results.append(_run_frequentist(mid, var["id"], stat_a, stat_b, n_ctrl, cv_ctrl, n_trt, cv_trt, alpha))
    return results

def _holm_bonferroni(p_values):
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
    m = len(p_values)
    indexed = sorted(enumerate(p_values), key=lambda x: x[1], reverse=True)
    adjusted = [0.0] * m
    cumulative_min = 1.0
    for rank_desc, (orig_idx, p) in enumerate(indexed):
        rank_asc = m - rank_desc
        corrected = p * m / rank_asc
        cumulative_min = min(cumulative_min, corrected)
        adjusted[orig_idx] = min(cumulative_min, 1.0)
    return adjusted

def _apply_correction(results, metrics, correction):
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
        adjusted = _holm_bonferroni(p_values)
    elif correction == "benjamini-hochberg":
        adjusted = _benjamini_hochberg(p_values)
    else:
        return results
    for i, r in enumerate(results):
        if "pValue" in r and r["pValue"] is not None:
            r["pValue"] = adjusted[i]
            r["significant"] = adjusted[i] < 0.05
        elif "chanceToBeatControl" in r:
            r["significant"] = adjusted[i] < 0.05
    return results

def _compute_slices(slices, engine, metrics, control_key, non_controls, alpha, correction="none"):
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

# --- Main analysis ---

request = json.loads(request_json)
engine = request["engine"]
correction = request.get("correction", "none")
variations = request["variations"]
metrics = request["metrics"]
data = request["data"]
alpha = request.get("alpha", 0.05)
srm_threshold = request.get("srmThreshold", 0.001)

control_key = next(v["key"] for v in variations if v["isControl"])
non_controls = [v for v in variations if not v["isControl"]]
overall = data["overall"]

# 1. SRM check
observed = [overall[v["key"]]["units"] for v in variations]
expected_weights = [v["weight"] for v in variations]
srm_p = check_srm(observed, expected_weights)

# 2. Per-metric, per-variation tests (overall)
results = _run_tests(overall, engine, metrics, control_key, non_controls, alpha)

# 3. Multiple comparison correction (non-guardrail metrics only)
if correction != "none":
    results = _apply_correction(results, metrics, correction)

# 4. Dimension slice results
slice_results = _compute_slices(data.get("slices", {}), engine, metrics, control_key, non_controls, alpha, correction)

multiple_exposure_count = request.get("multipleExposureCount", 0)
total_units = sum(overall[v["key"]]["units"] for v in variations)

response = {
    "srmPValue": srm_p,
    "srmFlagged": srm_p < srm_threshold,
    "multipleExposureFlagged": (multiple_exposure_count / total_units > 0.01) if total_units > 0 else False,
    "overall": results,
    "slices": slice_results,
    "warnings": [],
}

json.dumps(response, cls=NumpyEncoder)
    `);

    const response = JSON.parse(resultJson);
    self.postMessage({ type: 'result', data: response });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
