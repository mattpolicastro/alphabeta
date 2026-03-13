'use client';

/**
 * Power Calculator — runs entirely in the browser.
 * Implements two-proportions power calculation equivalent to R's pwr.2p2n.test.
 * See requirements.md Section 6.8.
 */

import { useState, useMemo } from 'react';
import { MDETip, AlphaTip, PowerTip, CohensHTip } from '@/components/StatTooltip';

interface PowerCalculatorProps {
  defaultSplitRatio?: number;
}

export function PowerCalculator({ defaultSplitRatio = 1.0 }: PowerCalculatorProps) {
  const [baseline, setBaseline] = useState(5);       // percentage
  const [mdeValue, setMdeValue] = useState(15);       // percentage
  const [mdeMode, setMdeMode] = useState<'relative' | 'absolute'>('relative');
  const [alpha, setAlpha] = useState(5);               // percentage
  const [power, setPower] = useState(80);              // percentage
  const [dailyUsers, setDailyUsers] = useState(1000);
  const [showDetails, setShowDetails] = useState(false);

  const result = useMemo(() => {
    const pBaseline = baseline / 100;
    const a = alpha / 100;
    const pow = power / 100;

    let pTreatment: number;
    if (mdeMode === 'relative') {
      pTreatment = pBaseline * (1 + mdeValue / 100);
    } else {
      pTreatment = pBaseline + mdeValue / 100;
    }

    if (pBaseline <= 0 || pBaseline >= 1 || pTreatment <= 0 || pTreatment >= 1) {
      return null;
    }

    // Cohen's h
    const h = 2 * (Math.asin(Math.sqrt(pTreatment)) - Math.asin(Math.sqrt(pBaseline)));

    if (Math.abs(h) < 1e-10) return null;

    // Inverse normal CDF approximation (Abramowitz & Stegun 26.2.23)
    const zAlpha = probit(1 - a / 2);
    const zBeta = probit(pow);

    // Sample size per control group
    const ratio = defaultSplitRatio;
    const nControl = Math.ceil(
      ((zAlpha + zBeta) ** 2 * (1 + 1 / ratio)) / (h ** 2),
    );
    const nTreatment = Math.ceil(nControl * ratio);
    const totalN = nControl + nTreatment;

    const estimatedDays =
      dailyUsers > 0 ? Math.ceil(totalN / dailyUsers) : null;

    return { nControl, nTreatment, totalN, h, estimatedDays, pTreatment };
  }, [baseline, mdeValue, mdeMode, alpha, power, dailyUsers, defaultSplitRatio]);

  return (
    <div className="card mt-3">
      <div className="card-body">
        <h5 className="card-title">Power Calculator</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small">Baseline rate (%)</label>
            <input
              type="number"
              step="0.1"
              className="form-control form-control-sm"
              value={baseline}
              onChange={(e) => setBaseline(Number(e.target.value))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">
              <MDETip /> (%)
              <button
                className="btn btn-link btn-sm p-0 ms-1"
                onClick={() =>
                  setMdeMode(mdeMode === 'relative' ? 'absolute' : 'relative')
                }
              >
                [{mdeMode}]
              </button>
            </label>
            <input
              type="number"
              step="0.1"
              className="form-control form-control-sm"
              value={mdeValue}
              onChange={(e) => setMdeValue(Number(e.target.value))}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small">Daily users</label>
            <input
              type="number"
              className="form-control form-control-sm"
              value={dailyUsers}
              onChange={(e) => setDailyUsers(Number(e.target.value))}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small"><AlphaTip label={'\u03B1 (%)'} /></label>
            <input
              type="number"
              step="0.5"
              className="form-control form-control-sm"
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small"><PowerTip label="Power (%)" /></label>
            <input
              type="number"
              step="1"
              className="form-control form-control-sm"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
            />
          </div>
        </div>

        {result && (
          <div className="mt-3">
            <div className="row text-center">
              <div className="col">
                <div className="fs-4 fw-bold">{result.nControl.toLocaleString()}</div>
                <small className="text-muted">per control</small>
              </div>
              <div className="col">
                <div className="fs-4 fw-bold">{result.nTreatment.toLocaleString()}</div>
                <small className="text-muted">per treatment</small>
              </div>
              <div className="col">
                <div className="fs-4 fw-bold">{result.totalN.toLocaleString()}</div>
                <small className="text-muted">total users</small>
              </div>
              {result.estimatedDays != null && (
                <div className="col">
                  <div className="fs-4 fw-bold">{result.estimatedDays}</div>
                  <small className="text-muted">days</small>
                </div>
              )}
            </div>

            {Math.abs(result.h) < 0.01 && (
              <div className="alert alert-warning mt-2 py-1 small mb-0">
                Effect size is very small — experiment will need a very long
                runtime to detect this difference.
              </div>
            )}

            <button
              className="btn btn-link btn-sm p-0 mt-2"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
            {showDetails && (
              <div className="mt-1 small text-muted">
                <CohensHTip /> = {result.h.toFixed(6)} · Treatment rate ={' '}
                {(result.pTreatment * 100).toFixed(2)}% · Split ratio ={' '}
                {defaultSplitRatio.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {!result && baseline > 0 && (
          <p className="text-muted mt-2 mb-0 small">
            Enter valid parameters to calculate sample size.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Inverse normal CDF (probit) approximation.
 * Rational approximation from Abramowitz & Stegun (26.2.23).
 * Accurate to ~4.5e-4 absolute error.
 */
function probit(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  if (p < 0.5) return -probit(1 - p);

  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}
