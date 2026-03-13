/**
 * Web Worker: Pyodide init + gbstats execution (Path A)
 * See requirements.md Section 6.5a.
 *
 * Validated by the Pyodide compatibility spike (public/pyodide-test.html):
 * - Pyodide 0.26.2 (numpy 1.26.4, scipy 1.12.0, pandas 2.2.0)
 * - gbstats 0.8.0 installed via micropip with deps=False
 * - All 16 numeric assertions match CPython within 1e-6
 *
 * gbstats API (class-based, NOT bare functions as requirements.md assumed):
 * - Bayesian: EffectBayesianABTest + EffectBayesianConfig
 * - Frequentist: TwoSidedTTest + FrequentistConfig
 * - Input: ProportionStatistic(n, sum)
 * - SRM: check_srm(users, weights) → float
 */

import type { AnalysisRequest, WorkerMessage } from './types';

// Worker global types
declare function importScripts(...urls: string[]): void;
declare function loadPyodide(config: { indexURL: string }): Promise<PyodideInterface>;
interface PyodideInterface {
  loadPackage(packages: string | string[]): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
  globals: { set(key: string, value: unknown): void };
}

const PYODIDE_VERSION = '0.26.2';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide: PyodideInterface | null = null;

function postStatus(message: string): void {
  const msg: WorkerMessage = { type: 'status', message };
  self.postMessage(msg);
}

async function initPyodide(): Promise<PyodideInterface> {
  if (pyodide) return pyodide;

  postStatus('Loading stats engine… (one-time download, ~35 MB)');

  // Load Pyodide runtime — importScripts loads the bootstrap synchronously in the worker
  importScripts(`${PYODIDE_CDN}pyodide.js`);
  pyodide = await loadPyodide({ indexURL: PYODIDE_CDN });

  // TODO: implement Cache API caching for Pyodide assets (see Section 10.2)

  postStatus('Loading scientific packages…');
  await pyodide.loadPackage(['numpy', 'scipy', 'pandas', 'micropip']);

  postStatus('Installing gbstats…');
  await pyodide.runPythonAsync(`
import micropip
# gbstats 0.8.0 has overly-conservative upper-bound pins (numpy<2, pandas<2).
# Pyodide 0.26.2's versions work fine — install pure-Python deps first,
# then gbstats with deps=False to skip the resolver.
await micropip.install(['pydantic', 'packaging', 'nbformat'])
await micropip.install('gbstats', deps=False)
  `);

  postStatus('Stats engine ready.');
  return pyodide;
}

self.onmessage = async (event: MessageEvent<AnalysisRequest>) => {
  try {
    const py = await initPyodide();

    // Pass request payload into Python namespace
    py.globals.set('request_json', JSON.stringify(event.data));

    // TODO: implement full analysis logic matching Lambda handler
    // The Python code below should mirror infra/lambda/analysis/handler.py
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

request = json.loads(request_json)
engine = request["engine"]
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

# 2. Per-metric, per-variation tests
results = []
for metric in metrics:
    mid = metric["id"]
    ctrl = overall[control_key]
    n_ctrl = ctrl["units"]
    cv_ctrl = ctrl["metrics"][mid]

    for var in non_controls:
        trt = overall[var["key"]]
        n_trt = trt["units"]
        cv_trt = trt["metrics"][mid]

        stat_a = ProportionStatistic(n=n_ctrl, sum=cv_ctrl)
        stat_b = ProportionStatistic(n=n_trt, sum=cv_trt)

        if engine == "bayesian":
            config = EffectBayesianConfig(difference_type="relative", alpha=alpha)
            test = EffectBayesianABTest(stat_a=stat_a, stat_b=stat_b, config=config)
            res = test.compute_result()
            result = {
                "metricId": mid,
                "variationId": var["id"],
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
        else:
            config = FrequentistConfig(difference_type="relative", alpha=alpha)
            test = TwoSidedTTest(stat_a=stat_a, stat_b=stat_b, config=config)
            res = test.compute_result()
            result = {
                "metricId": mid,
                "variationId": var["id"],
                "units": n_trt,
                "rate": cv_trt / n_trt if n_trt > 0 else 0,
                "pValue": res.p_value,
                "confidenceIntervalLower": res.ci[0] if res.ci else None,
                "confidenceIntervalUpper": res.ci[1] if res.ci else None,
                "relativeUplift": res.expected,
                "absoluteUplift": (cv_trt / n_trt - cv_ctrl / n_ctrl) if n_trt > 0 and n_ctrl > 0 else 0,
                "significant": res.p_value < alpha if res.p_value is not None else False,
            }
        results.append(result)

# 3. TODO: apply multiple comparison correction (non-guardrail metrics only)
# 4. TODO: compute dimension slice results (same tests per slice)

multiple_exposure_count = request.get("multipleExposureCount", 0)
total_units = sum(overall[v["key"]]["units"] for v in variations)

response = {
    "srmPValue": srm_p,
    "srmFlagged": srm_p < srm_threshold,
    "multipleExposureFlagged": (multiple_exposure_count / total_units > 0.01) if total_units > 0 else False,
    "overall": results,
    "slices": {},
    "warnings": [],
}

json.dumps(response, cls=NumpyEncoder)
    `);

    const response = JSON.parse(resultJson as string);
    const msg: WorkerMessage = { type: 'result', data: response };
    self.postMessage(msg);
  } catch (err) {
    const msg: WorkerMessage = {
      type: 'error',
      message: String(err),
    };
    self.postMessage(msg);
  }
};
