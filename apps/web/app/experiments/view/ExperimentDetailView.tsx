'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import {
  getExperimentById,
  getMetricsByIds,
  getMetrics,
  getResultsForExperiment,
  getAnnotations,
  exportExperiment,
  cloneExperiment,
  updateExperiment,
  type Experiment,
  type Metric,
  type Variation,
  type ExperimentResult,
  type Annotation,
} from '@/lib/db';

const STATUS_BADGES: Record<Experiment['status'], string> = {
  draft: 'bg-secondary',
  running: 'bg-primary',
  stopped: 'bg-warning text-dark',
  archived: 'bg-dark',
};

export default function ExperimentDetailView({ experimentId }: { experimentId: string }) {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [allMetrics, setAllMetrics] = useState<Metric[]>([]);
  const [allResults, setAllResults] = useState<ExperimentResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showLift, setShowLift] = useState<'relative' | 'absolute'>('relative');
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [experimentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const exp = await getExperimentById(experimentId);
    if (!exp) { setLoading(false); return; }
    setExperiment(exp);
    const metricIds = [...exp.primaryMetricIds, ...exp.guardrailMetricIds, ...(exp.activationMetricId ? [exp.activationMetricId] : [])];
    const [m, all, results, annot] = await Promise.all([
      getMetricsByIds(metricIds),
      getMetrics(),
      getResultsForExperiment(exp.id),
      getAnnotations(exp.id),
    ]);
    setMetrics(m); setAllMetrics(all); setAllResults(results); setAnnotations(annot);
    if (results.length > 0) setSelectedResultId(results[0].id);
    setLoading(false);
  }

  const activeResult = allResults.find((r) => r.id === selectedResultId) ?? allResults[0] ?? null;
  const metricById = new Map(metrics.map((m) => [m.id, m]));

  async function handleExport() {
    if (!experiment) return;
    const data = await exportExperiment(experiment.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `experiment-${experiment.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleClone() {
    if (!experiment) return;
    const clone = await cloneExperiment(experiment.id);
    window.location.href = `/experiments/view?id=${clone.id}`;
  }

  async function handleStatusChange(status: Experiment['status']) {
    if (!experiment) return;
    await updateExperiment(experiment.id, { status });
    setExperiment({ ...experiment, status });
  }

  async function handleConfigSave(patch: Partial<Experiment>) {
    if (!experiment) return;
    await updateExperiment(experiment.id, patch);
    setExperiment({ ...experiment, ...patch });
    // Refresh metrics if metric IDs changed
    const newMetricIds = [
      ...(patch.primaryMetricIds ?? experiment.primaryMetricIds),
      ...(patch.guardrailMetricIds ?? experiment.guardrailMetricIds),
      ...((patch.activationMetricId ?? experiment.activationMetricId) ? [patch.activationMetricId ?? experiment.activationMetricId!] : []),
    ];
    const m = await getMetricsByIds(newMetricIds);
    setMetrics(m);
  }

  if (loading) return <div className="py-4 text-center"><div className="spinner-border" role="status" /></div>;
  if (!experiment) return <div className="py-4"><div className="alert alert-danger">Experiment not found.</div><Link href="/">Back to experiments</Link></div>;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 className="mb-1">{experiment.name} <span className={`badge ${STATUS_BADGES[experiment.status]} fs-6`}>{experiment.status}</span></h1>
          <p className="text-muted mb-0">
            {experiment.variations.length} variations · {experiment.statsEngine} · {activeResult ? `Last analyzed ${new Date(activeResult.computedAt).toLocaleString()}` : 'No results yet'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link href={`/experiments/view?id=${experiment.id}&view=upload`} className="btn btn-primary">{activeResult ? 'Re-run Analysis' : 'Upload Data'}</Link>
          <div className="btn-group">
            <button className="btn btn-outline-secondary" onClick={() => setShowConfig(!showConfig)}>Configure</button>
            <button className="btn btn-outline-secondary" onClick={handleClone}>Clone</button>
            <button className="btn btn-outline-secondary" onClick={handleExport}>Export</button>
            {experiment.status === 'running' && <button className="btn btn-outline-warning" onClick={() => handleStatusChange('stopped')}>Stop</button>}
            {experiment.status !== 'archived' && <button className="btn btn-outline-danger" onClick={() => handleStatusChange('archived')}>Archive</button>}
          </div>
        </div>
      </div>

      {/* Hypothesis */}
      {experiment.hypothesis && !showConfig && <div className="card mb-3"><div className="card-body py-2"><strong>Hypothesis:</strong> {experiment.hypothesis}</div></div>}

      {/* Configuration panel */}
      {showConfig && (
        <ConfigPanel
          experiment={experiment}
          allMetrics={allMetrics}
          onSave={handleConfigSave}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Warnings */}
      {activeResult?.srmFlagged && <div className="alert alert-danger"><strong>Sample Ratio Mismatch detected</strong> (p={activeResult.srmPValue.toExponential(3)}). Results may be unreliable.</div>}
      {activeResult?.multipleExposureFlagged && <div className="alert alert-warning"><strong>Multiple exposures detected.</strong> {activeResult.multipleExposureCount} users in more than one variation.</div>}

      {/* No results */}
      {!activeResult && !showConfig && (
        <div className="text-center py-5">
          <h4 className="text-muted">No results yet</h4>
          <p className="text-muted">Upload a CSV file to run your first analysis.</p>
          <Link href={`/experiments/view?id=${experiment.id}&view=upload`} className="btn btn-primary">Upload Data to Analyze</Link>
        </div>
      )}

      {/* Results */}
      {activeResult && (
        <>
          {allResults.length > 1 && (
            <div className="mb-3">
              <label className="form-label small text-muted">Result snapshot:</label>
              <select className="form-select form-select-sm d-inline-block w-auto ms-2" value={selectedResultId ?? ''} onChange={(e) => setSelectedResultId(e.target.value)}>
                {allResults.map((r, i) => <option key={r.id} value={r.id}>{new Date(r.computedAt).toLocaleString()}{i === 0 ? ' (latest)' : ''}</option>)}
              </select>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">Primary Metrics</h4>
            <div className="btn-group btn-group-sm">
              <button className={`btn ${showLift === 'relative' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setShowLift('relative')}>Relative</button>
              <button className={`btn ${showLift === 'absolute' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setShowLift('absolute')}>Absolute</button>
            </div>
          </div>
          <ResultsTable result={activeResult} experiment={experiment} metricIds={experiment.primaryMetricIds} metricById={metricById} showLift={showLift} />

          {experiment.guardrailMetricIds.length > 0 && (
            <>
              <h4 className="mt-4 mb-2">Guardrail Metrics</h4>
              <ResultsTable result={activeResult} experiment={experiment} metricIds={experiment.guardrailMetricIds} metricById={metricById} showLift={showLift} />
            </>
          )}
        </>
      )}

      {/* Annotations */}
      {annotations.length > 0 && (
        <div className="mt-4">
          <h5>Notes</h5>
          {annotations.map((a) => <div key={a.id} className="card mb-2"><div className="card-body py-2"><small className="text-muted">{new Date(a.createdAt).toLocaleString()}</small><p className="mb-0 mt-1">{a.body}</p></div></div>)}
        </div>
      )}
    </div>
  );
}

// ----- Configuration Panel -----

function ConfigPanel({
  experiment,
  allMetrics,
  onSave,
  onClose,
}: {
  experiment: Experiment;
  allMetrics: Metric[];
  onSave: (patch: Partial<Experiment>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(experiment.name);
  const [hypothesis, setHypothesis] = useState(experiment.hypothesis);
  const [description, setDescription] = useState(experiment.description ?? '');
  const [tags, setTags] = useState(experiment.tags.join(', '));
  const [variations, setVariations] = useState<Variation[]>(experiment.variations);
  const [statsEngine, setStatsEngine] = useState(experiment.statsEngine);
  const [correction, setCorrection] = useState(experiment.multipleComparisonCorrection);
  const [cuped, setCuped] = useState(experiment.cuped);
  const [primaryMetricIds, setPrimaryMetricIds] = useState(experiment.primaryMetricIds);
  const [guardrailMetricIds, setGuardrailMetricIds] = useState(experiment.guardrailMetricIds);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalWeight = variations.reduce((s, v) => s + v.weight, 0);
  const weightPct = Math.round(totalWeight * 100);
  const weightsValid = Math.abs(totalWeight - 1) < 0.001;
  const metricsValid = primaryMetricIds.length > 0;
  const canSave = !!name.trim() && weightsValid && metricsValid;

  function updateVariation(id: string, patch: Partial<Variation>) {
    setVariations((prev) => prev.map((v) => v.id === id ? { ...v, ...patch } : v));
  }

  function addVariation() {
    if (variations.length >= 5) return;
    const idx = variations.length;
    setVariations([...variations, {
      id: nanoid(),
      name: `Variant ${String.fromCharCode(64 + idx)}`,
      key: `variant_${String.fromCharCode(96 + idx)}`,
      weight: 0,
      isControl: false,
    }]);
  }

  function removeVariation(id: string) {
    if (variations.length <= 2) return;
    setVariations((prev) => prev.filter((v) => v.id !== id));
  }

  function setControl(id: string) {
    setVariations((prev) => prev.map((v) => ({ ...v, isControl: v.id === id })));
  }

  function toggleMetric(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function handleSave() {
    setSaving(true);
    await onSave({
      name,
      hypothesis,
      description: description || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      variations,
      statsEngine,
      multipleComparisonCorrection: correction,
      cuped,
      primaryMetricIds,
      guardrailMetricIds,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">Experiment Configuration</h5>
          <button className="btn-close" onClick={onClose} />
        </div>

        {/* Basic info */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-control" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">Hypothesis</label>
            <textarea className="form-control" rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {/* Variations */}
        <h6>Variations</h6>
        <div className="mb-3">
          <span className="small text-muted me-2">
            Weight total: <strong className={weightsValid ? 'text-success' : 'text-danger'}>{weightPct}%</strong>
          </span>
          <button className="btn btn-sm btn-outline-primary" onClick={addVariation} disabled={variations.length >= 5}>Add</button>
        </div>
        {!weightsValid && (
          <div className="alert alert-warning py-2 small">Variation weights must sum to exactly 100%. Currently {weightPct}%.</div>
        )}
        {variations.map((v) => (
          <div key={v.id} className="row g-2 align-items-center mb-2">
            <div className="col-md-3">
              <input className="form-control form-control-sm" value={v.name} onChange={(e) => updateVariation(v.id, { name: e.target.value })} placeholder="Name" />
            </div>
            <div className="col-md-3">
              <input className="form-control form-control-sm" value={v.key} onChange={(e) => updateVariation(v.id, { key: e.target.value })} placeholder="Key" />
            </div>
            <div className="col-md-2">
              <div className="input-group input-group-sm">
                <input type="number" className={`form-control ${!weightsValid ? 'is-invalid' : ''}`} value={Math.round(v.weight * 100)} onChange={(e) => updateVariation(v.id, { weight: Number(e.target.value) / 100 })} />
                <span className="input-group-text">%</span>
              </div>
            </div>
            <div className="col-md-2">
              <div className="form-check">
                <input className="form-check-input" type="radio" checked={v.isControl} onChange={() => setControl(v.id)} />
                <label className="form-check-label small">Control</label>
              </div>
            </div>
            <div className="col-md-2 text-end">
              <button className="btn btn-sm btn-outline-danger" onClick={() => removeVariation(v.id)} disabled={variations.length <= 2}>Remove</button>
            </div>
          </div>
        ))}

        {/* Stats config */}
        <h6 className="mt-4">Stats Configuration</h6>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Engine</label>
            <select className="form-select" value={statsEngine} onChange={(e) => setStatsEngine(e.target.value as Experiment['statsEngine'])}>
              <option value="bayesian">Bayesian</option>
              <option value="frequentist">Frequentist</option>
              <option value="sequential">Sequential</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Correction</label>
            <select className="form-select" value={correction} onChange={(e) => setCorrection(e.target.value as Experiment['multipleComparisonCorrection'])}>
              <option value="none">None</option>
              <option value="holm-bonferroni">Holm-Bonferroni</option>
              <option value="benjamini-hochberg">Benjamini-Hochberg</option>
            </select>
          </div>
          {/* CUPED disabled for v1 */}
        </div>

        {/* Metrics */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <h6 className={!metricsValid ? 'text-danger' : ''}>Primary Metrics</h6>
            {!metricsValid && (
              <div className="alert alert-warning py-2 small">Select at least one primary metric.</div>
            )}
            {allMetrics.map((m) => (
              <div key={m.id} className="form-check">
                <input className={`form-check-input ${!metricsValid ? 'is-invalid' : ''}`} type="checkbox" checked={primaryMetricIds.includes(m.id)}
                  onChange={() => setPrimaryMetricIds(toggleMetric(primaryMetricIds, m.id))} id={`cfg-primary-${m.id}`} />
                <label className="form-check-label" htmlFor={`cfg-primary-${m.id}`}>
                  {m.name} <span className="badge bg-light text-dark border">{m.type}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="col-md-6">
            <h6>Guardrail Metrics</h6>
            {allMetrics.map((m) => (
              <div key={m.id} className="form-check">
                <input className="form-check-input" type="checkbox" checked={guardrailMetricIds.includes(m.id)}
                  onChange={() => setGuardrailMetricIds(toggleMetric(guardrailMetricIds, m.id))} id={`cfg-guard-${m.id}`} />
                <label className="form-check-label" htmlFor={`cfg-guard-${m.id}`}>{m.name}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
          {saved && <span className="text-success small">Saved</span>}
        </div>
      </div>
    </div>
  );
}

// ----- Results Table -----

function ResultsTable({ result, experiment, metricIds, metricById, showLift }: {
  result: ExperimentResult; experiment: Experiment; metricIds: string[]; metricById: Map<string, Metric>; showLift: 'relative' | 'absolute';
}) {
  const control = experiment.variations.find((v) => v.isControl);
  const metricResults = result.perMetricResults.filter((mr) => metricIds.includes(mr.metricId));
  if (metricResults.length === 0) return <p className="text-muted">No result data available. Re-run analysis to populate.</p>;

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead><tr>
          <th>Metric</th><th>Baseline ({control?.name ?? 'Control'})</th>
          {experiment.variations.filter((v) => !v.isControl).map((v) => <th key={v.id}>{v.name}</th>)}
          <th>{showLift === 'relative' ? 'Relative Uplift' : 'Absolute Uplift'}</th><th>Evidence</th><th>Interval</th>
        </tr></thead>
        <tbody>
          {metricResults.flatMap((mr) => {
            const metric = metricById.get(mr.metricId);
            const controlVR = mr.variationResults.find((vr) => vr.variationId === control?.id);
            return mr.variationResults.filter((vr) => vr.variationId !== control?.id).map((vr) => {
              const lift = showLift === 'relative' ? vr.relativeUplift : vr.absoluteUplift;
              const isPositive = metric?.higherIsBetter ? lift > 0 : lift < 0;
              return (
                <tr key={`${mr.metricId}-${vr.variationId}`} className={vr.significant ? (isPositive ? 'table-success' : 'table-danger') : ''}>
                  <td><span className="fw-medium">{metric?.name ?? mr.metricId}</span><br /><span className="badge bg-light text-dark border">{metric?.type}</span></td>
                  <td>{controlVR ? `${(controlVR.mean * 100).toFixed(2)}% (n=${controlVR.users.toLocaleString()})` : '—'}</td>
                  <td>{`${(vr.mean * 100).toFixed(2)}% (n=${vr.users.toLocaleString()})`}</td>
                  <td><span className={isPositive ? 'text-success' : 'text-danger'}>{lift > 0 ? '+' : ''}{showLift === 'relative' ? `${(lift * 100).toFixed(2)}%` : `${(lift * 100).toFixed(3)}pp`}</span></td>
                  <td>{vr.chanceToBeatControl != null ? <span>{(vr.chanceToBeatControl * 100).toFixed(1)}% CTW{vr.significant && <span className="badge bg-success ms-1">sig</span>}</span> : vr.pValue != null ? <span>p={vr.pValue.toFixed(4)}{vr.significant && <span className="badge bg-success ms-1">sig</span>}</span> : '—'}</td>
                  <td className="small text-muted">{vr.credibleIntervalLower != null ? `[${(vr.credibleIntervalLower * 100).toFixed(2)}%, ${(vr.credibleIntervalUpper! * 100).toFixed(2)}%]` : vr.confidenceIntervalLower != null ? `[${(vr.confidenceIntervalLower * 100).toFixed(2)}%, ${(vr.confidenceIntervalUpper! * 100).toFixed(2)}%]` : '—'}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
