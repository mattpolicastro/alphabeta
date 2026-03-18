'use client';

/**
 * Results table — one row per metric, expandable detail panel per variation.
 * See requirements.md Section 7.2 Results Table.
 */

import { useState } from 'react';
import type { ExperimentResult, Experiment, Metric, Annotation } from '@/lib/db/schema';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { PValueTip, CTWTip, CredibleIntervalTip, ConfidenceIntervalTip, ExpectedLossTip, CUPEDTip } from '@/components/StatTooltip';

export interface ResultsTableProps {
  result: ExperimentResult;
  experiment: Experiment;
  metricIds: string[];
  metricById: Map<string, Metric>;
  showLift: 'relative' | 'absolute';
  annotations?: Annotation[];
  selectedVariationIds?: string[];
}

export function ResultsTable({ result, experiment, metricIds, metricById, showLift, annotations = [], selectedVariationIds }: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const currencySymbol = useSettingsStore((s) => s.currencySymbol);
  const control = experiment.variations.find((v) => v.isControl);
  const allTreatmentVariations = experiment.variations.filter((v) => !v.isControl);
  const treatmentVariations = selectedVariationIds
    ? allTreatmentVariations.filter((v) => selectedVariationIds.includes(v.id))
    : allTreatmentVariations;
  const metricResults = result.perMetricResults.filter((mr) => metricIds.includes(mr.metricId));

  if (metricResults.length === 0) {
    return <p className="text-muted">No result data available. Re-run analysis to populate.</p>;
  }

  function toggleRow(key: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build a set of metricIds that have annotations
  const annotatedMetricIds = new Set(annotations.filter((a) => a.metricId).map((a) => a.metricId));

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th style={{ width: '2rem' }} />
            <th>Metric</th>
            <th>Baseline ({control?.name ?? 'Control'})</th>
            {treatmentVariations.map((v) => (
              <th key={v.id}>{v.name}</th>
            ))}
            <th>{showLift === 'relative' ? 'Relative Uplift' : 'Absolute Uplift'}</th>
            <th>Evidence</th>
            <th>Interval</th>
          </tr>
        </thead>
        <tbody>
          {metricResults.flatMap((mr) => {
            const metric = metricById.get(mr.metricId);
            const controlVR = mr.variationResults.find((vr) => vr.variationId === control?.id);
            const hasAnnotation = annotatedMetricIds.has(mr.metricId);

            return mr.variationResults
              .filter((vr) => vr.variationId !== control?.id && (!selectedVariationIds || selectedVariationIds.includes(vr.variationId)))
              .flatMap((vr) => {
                const rowKey = `${mr.metricId}-${vr.variationId}`;
                const isExpanded = expandedRows.has(rowKey);
                const lift = showLift === 'relative' ? vr.relativeUplift : vr.absoluteUplift;
                const isPositive = metric?.higherIsBetter ? lift > 0 : lift < 0;
                const directionArrow = lift === 0 ? '—' : (isPositive ? '↑' : '↓');

                const rows = [
                  <tr
                    key={rowKey}
                    className={vr.significant ? (isPositive ? 'table-success' : 'table-danger') : ''}
                    onClick={() => toggleRow(rowKey)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="text-muted small">{isExpanded ? '▾' : '▸'}</td>
                    <td>
                      <span className="fw-medium">{metric?.name ?? mr.metricId}</span>
                      {hasAnnotation && <span className="ms-1" title="Has annotations">📝</span>}
                      <br />
                      <span className="badge bg-body-secondary border">{metric?.type}</span>
                      {metric && (
                        <span className="badge bg-body-secondary border ms-1">
                          {metric.higherIsBetter ? '↑ higher is better' : '↓ lower is better'}
                        </span>
                      )}
                    </td>
                    <td>
                      {controlVR
                        ? `${formatValue(controlVR.mean, metric?.type, currencySymbol)} (n=${controlVR.users.toLocaleString()})`
                        : '—'}
                    </td>
                    <td>
                      {`${formatValue(vr.mean, metric?.type, currencySymbol)} (n=${vr.users.toLocaleString()})`}
                    </td>
                    <td>
                      <span className={isPositive ? 'text-success' : 'text-danger'}>
                        {directionArrow}{' '}
                        {showLift === 'relative'
                          ? `${lift > 0 ? '+' : ''}${(lift * 100).toFixed(2)}%`
                          : `${lift > 0 ? '+' : ''}${(lift * 100).toFixed(3)}pp`}
                      </span>
                    </td>
                    <td>{formatEvidence(vr)}</td>
                    <td className="small text-muted">{formatInterval(vr)}</td>
                  </tr>,
                ];

                if (isExpanded) {
                  rows.push(
                    <tr key={`${rowKey}-detail`} className="bg-body-secondary">
                      <td />
                      <td colSpan={5 + treatmentVariations.length}>
                        <DetailPanel
                          variationResult={vr}
                          controlResult={controlVR}
                          metric={metric}
                          controlName={control?.name ?? 'Control'}
                          treatmentName={treatmentVariations.find((v) => v.id === vr.variationId)?.name ?? vr.variationId}
                          currencySymbol={currencySymbol}
                        />
                      </td>
                    </tr>,
                  );
                }

                return rows;
              });
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Metric types that display as raw values (mean) rather than percentages (rate). */
function isContinuousDisplay(metricType: string | undefined): boolean {
  return metricType === 'continuous' || metricType === 'revenue';
}

// ----- Detail Panel -----

function DetailPanel({
  variationResult: vr,
  controlResult: controlVR,
  metric: _metric,
  controlName,
  treatmentName,
  currencySymbol,
}: {
  variationResult: ExperimentResult['perMetricResults'][0]['variationResults'][0];
  controlResult: ExperimentResult['perMetricResults'][0]['variationResults'][0] | undefined;
  metric: Metric | undefined;
  controlName: string;
  treatmentName: string;
  currencySymbol: string;
}) {
  const isBayesian = vr.chanceToBeatControl != null;
  const lower = vr.credibleIntervalLower ?? vr.confidenceIntervalLower ?? 0;
  const upper = vr.credibleIntervalUpper ?? vr.confidenceIntervalUpper ?? 0;

  // Compute bar chart bounds — center on 0, extend to cover the interval with padding
  const absMax = Math.max(Math.abs(lower), Math.abs(upper), 0.001);
  const bound = absMax * 1.3;

  function toPercent(val: number) {
    return ((val + bound) / (2 * bound)) * 100;
  }

  return (
    <div className="py-2 px-3">
      <div className="row g-4">
        {/* Stats summary */}
        <div className="col-md-5">
          <table className="table table-sm table-borderless mb-0 small">
            <tbody>
              <tr>
                <td className="text-muted">Variation</td>
                <td className="fw-medium">{treatmentName}</td>
              </tr>
              <tr>
                <td className="text-muted">Sample size</td>
                <td>
                  {treatmentName}: {vr.users.toLocaleString()}
                  {controlVR && <> · {controlName}: {controlVR.users.toLocaleString()}</>}
                </td>
              </tr>
              <tr>
                <td className="text-muted">{isContinuousDisplay(_metric?.type) ? 'Mean' : 'Rate'}</td>
                <td>
                  {treatmentName}: {formatValue(vr.mean, _metric?.type, currencySymbol)}
                  {controlVR && <> · {controlName}: {formatValue(controlVR.mean, _metric?.type, currencySymbol)}</>}
                </td>
              </tr>
              <tr>
                <td className="text-muted">Relative uplift</td>
                <td>{(vr.relativeUplift * 100).toFixed(3)}%</td>
              </tr>
              <tr>
                <td className="text-muted">Absolute uplift</td>
                <td>{(vr.absoluteUplift * 100).toFixed(4)}pp</td>
              </tr>
              {vr.scaledImpact != null && (
                <tr>
                  <td className="text-muted">Scaled impact</td>
                  <td>{vr.scaledImpact.toLocaleString()}</td>
                </tr>
              )}
              {isBayesian ? (
                <>
                  <tr>
                    <td className="text-muted"><CTWTip /> (chance to win)</td>
                    <td>{(vr.chanceToBeatControl! * 100).toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><ExpectedLossTip /></td>
                    <td>{(vr.expectedLoss! * 100).toFixed(4)}%</td>
                  </tr>
                  <tr>
                    <td className="text-muted"><CredibleIntervalTip /></td>
                    <td>[{(lower * 100).toFixed(3)}%, {(upper * 100).toFixed(3)}%]</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr>
                    <td className="text-muted"><PValueTip />{vr.rawPValue != null && vr.rawPValue !== vr.pValue ? ' (adjusted)' : ''}</td>
                    <td>{vr.pValue?.toFixed(6) ?? '—'}</td>
                  </tr>
                  {vr.rawPValue != null && vr.rawPValue !== vr.pValue && (
                    <tr>
                      <td className="text-muted"><PValueTip /> (raw)</td>
                      <td>{vr.rawPValue.toFixed(6)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted"><ConfidenceIntervalTip /></td>
                    <td>[{(lower * 100).toFixed(3)}%, {(upper * 100).toFixed(3)}%]</td>
                  </tr>
                </>
              )}
              {vr.cupedApplied && (
                <tr>
                  <td className="text-muted"><CUPEDTip /></td>
                  <td><span className="badge bg-info-subtle text-info-emphasis">Applied</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Interval visualization */}
        <div className="col-md-7">
          <div className="small text-muted mb-1">
            {isBayesian ? <CredibleIntervalTip /> : <ConfidenceIntervalTip />} (relative uplift)
          </div>
          <div
            className="position-relative bg-body border rounded"
            style={{ height: '3rem' }}
          >
            {/* Zero line */}
            <div
              className="position-absolute top-0 bottom-0 border-start border-secondary"
              style={{ left: `${toPercent(0)}%` }}
            />
            <div
              className="position-absolute"
              style={{ left: `${toPercent(0)}%`, top: '-1.2rem', transform: 'translateX(-50%)' }}
            >
              <span className="small text-muted">0</span>
            </div>

            {/* Interval bar */}
            <div
              className={`position-absolute rounded ${vr.significant ? (lower > 0 ? 'bg-success' : upper < 0 ? 'bg-danger' : 'bg-secondary') : 'bg-secondary'}`}
              style={{
                left: `${toPercent(lower)}%`,
                width: `${toPercent(upper) - toPercent(lower)}%`,
                top: '35%',
                height: '30%',
                opacity: 0.5,
              }}
            />

            {/* Point estimate */}
            <div
              className={`position-absolute rounded-circle ${vr.significant ? (vr.relativeUplift > 0 ? 'bg-success' : 'bg-danger') : 'bg-dark'}`}
              style={{
                left: `${toPercent(vr.relativeUplift)}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '0.5rem',
                height: '0.5rem',
              }}
            />

            {/* Labels */}
            <div
              className="position-absolute small text-muted"
              style={{ left: `${toPercent(lower)}%`, bottom: '-1.2rem', transform: 'translateX(-50%)' }}
            >
              {(lower * 100).toFixed(2)}%
            </div>
            <div
              className="position-absolute small text-muted"
              style={{ left: `${toPercent(upper)}%`, bottom: '-1.2rem', transform: 'translateX(-50%)' }}
            >
              {(upper * 100).toFixed(2)}%
            </div>
          </div>
          <div className="mt-4 small text-muted">
            Point estimate: {(vr.relativeUplift * 100).toFixed(3)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Formatting helpers -----

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatValue(value: number, metricType?: string, currencySymbol: string = '$'): string {
  if (metricType === 'revenue') {
    return `${currencySymbol}${value.toFixed(2)}`;
  }
  if (isContinuousDisplay(metricType)) {
    return value.toFixed(2);
  }
  return formatRate(value);
}

function formatEvidence(vr: { chanceToBeatControl?: number; pValue?: number; rawPValue?: number; significant: boolean }): React.ReactNode {
  if (vr.chanceToBeatControl != null) {
    return (
      <span>
        {(vr.chanceToBeatControl * 100).toFixed(1)}% <CTWTip />
        {vr.significant && <span className="badge bg-success ms-1">sig</span>}
      </span>
    );
  }
  if (vr.pValue != null) {
    const hasCorrection = vr.rawPValue != null && vr.rawPValue !== vr.pValue;
    return (
      <span>
        <PValueTip />={vr.pValue.toFixed(4)}
        {hasCorrection && (
          <span className="text-muted ms-1" title={`Raw (uncorrected): ${vr.rawPValue!.toFixed(6)}`}>
            (raw: {vr.rawPValue!.toFixed(4)})
          </span>
        )}
        {vr.significant && <span className="badge bg-success ms-1">sig</span>}
      </span>
    );
  }
  return '—';
}

function formatInterval(vr: {
  credibleIntervalLower?: number;
  credibleIntervalUpper?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
}): string {
  const lower = vr.credibleIntervalLower ?? vr.confidenceIntervalLower;
  const upper = vr.credibleIntervalUpper ?? vr.confidenceIntervalUpper;
  if (lower == null || upper == null) return '—';
  return `[${(lower * 100).toFixed(2)}%, ${(upper * 100).toFixed(2)}%]`;
}
