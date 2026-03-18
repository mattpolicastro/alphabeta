'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  getExperimentById,
  getMetricsByIds,
  getMetrics,
  getResultsForExperiment,
  getAnnotations,
  hideAnnotation,
  exportExperiment,
  cloneExperiment,
  updateExperiment,
  type Experiment,
  type Metric,
  type ExperimentResult,
  type Annotation,
} from '@/lib/db';
import { ResultsTable } from '@/components/ResultsTable';
import { GuardrailSection } from '@/components/GuardrailSection';
import { VariationEditor, variationsValid } from '@/components/VariationEditor';
import { StatsConfigEditor } from '@/components/StatsConfigEditor';
import { MetricPicker } from '@/components/MetricPicker';
import { SRMTip, StatTooltip } from '@/components/StatTooltip';
import { exportResultsCSV } from '@/lib/csv/exportResults';

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
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [selectedDimensionValue, setSelectedDimensionValue] = useState<string>('');
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => { load(); }, [experimentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!experiment) return;
    getAnnotations(experiment.id, { includeHidden: showHidden }).then(setAnnotations);
  }, [showHidden, experiment]);

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
            {activeResult && <button className="btn btn-outline-secondary" onClick={() => exportResultsCSV(activeResult, experiment, metrics)}>Export Results CSV</button>}
            {experiment.status === 'draft' && <button className="btn btn-outline-success" onClick={() => handleStatusChange('running')}>Launch</button>}
            {experiment.status === 'running' && <button className="btn btn-outline-warning" onClick={() => handleStatusChange('stopped')}>Stop</button>}
            {experiment.status === 'stopped' && <button className="btn btn-outline-success" onClick={() => handleStatusChange('running')}>Resume</button>}
            {experiment.status === 'archived' && <button className="btn btn-outline-secondary" onClick={() => handleStatusChange('stopped')}>Unarchive</button>}
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
      {activeResult?.srmFlagged && (
        <div className="alert alert-danger">
          <strong><SRMTip /> detected</strong> (p={activeResult.srmPValue.toExponential(3)}). Results may be unreliable.
        </div>
      )}
      {activeResult?.multipleExposureFlagged && (
        <div className="alert alert-warning">
          <strong><StatTooltip term="Multiple exposures" definition="Users who appeared in more than one variation, which can dilute treatment effects and bias results." /> detected.</strong> {activeResult.multipleExposureCount} users in more than one variation.
        </div>
      )}

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
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                title="Download the raw analysis request payload for reproducibility"
                onClick={() => {
                  if (!activeResult.rawRequest) return;
                  const blob = new Blob([JSON.stringify(activeResult.rawRequest, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const date = new Date(activeResult.computedAt).toISOString().slice(0, 10);
                  const a = document.createElement('a'); a.href = url; a.download = `analysis-request-${experimentId}-${date}.json`; a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download Request JSON
              </button>
              <div className="btn-group btn-group-sm">
                <button className={`btn ${showLift === 'relative' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setShowLift('relative')}>Relative</button>
                <button className={`btn ${showLift === 'absolute' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setShowLift('absolute')}>Absolute</button>
              </div>
            </div>
          </div>
          <ResultsTable result={activeResult} experiment={experiment} metricIds={experiment.primaryMetricIds} metricById={metricById} showLift={showLift} annotations={annotations} />

          {experiment.guardrailMetricIds.length > 0 && (
            <>
              <h4 className="mt-4 mb-2">Guardrail Metrics</h4>
              <GuardrailSection
                guardrailResults={activeResult.perMetricResults.filter((mr) => experiment.guardrailMetricIds.includes(mr.metricId))}
                metrics={metrics}
              />
              <ResultsTable result={activeResult} experiment={experiment} metricIds={experiment.guardrailMetricIds} metricById={metricById} showLift={showLift} annotations={annotations} />
            </>
          )}

          {/* Dimension Slices */}
          {activeResult.sliceResults && Object.keys(activeResult.sliceResults).length > 0 && (
            <DimensionSliceSection
              activeResult={activeResult}
              experiment={experiment}
              metricById={metricById}
              showLift={showLift}
              annotations={annotations}
              selectedDimension={selectedDimension}
              selectedDimensionValue={selectedDimensionValue}
              onDimensionChange={(dim) => { setSelectedDimension(dim); setSelectedDimensionValue(''); }}
              onDimensionValueChange={setSelectedDimensionValue}
            />
          )}
        </>
      )}

      {/* Annotations */}
      {annotations.length > 0 && (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Notes</h5>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="showHiddenToggle" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
              <label className="form-check-label small text-muted" htmlFor="showHiddenToggle">Show audit trail</label>
            </div>
          </div>
          {annotations.map((a) => (
            <div key={a.id} className={`card mb-2 ${a.hidden ? 'opacity-50' : ''}`}>
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">{new Date(a.createdAt).toLocaleString()}</small>
                  <div className="d-flex align-items-center gap-2">
                    {a.hidden && <span className="badge bg-secondary">Hidden</span>}
                    {!a.hidden && (
                      <button className="btn btn-outline-secondary btn-sm" onClick={async () => { await hideAnnotation(a.id!); const updated = await getAnnotations(experiment!.id, { includeHidden: showHidden }); setAnnotations(updated); }}>Hide</button>
                    )}
                  </div>
                </div>
                <div className="mt-1"><ReactMarkdown>{a.body}</ReactMarkdown></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Dimension Slice Section -----

function DimensionSliceSection({
  activeResult,
  experiment,
  metricById,
  showLift,
  annotations,
  selectedDimension,
  selectedDimensionValue,
  onDimensionChange,
  onDimensionValueChange,
}: {
  activeResult: ExperimentResult;
  experiment: Experiment;
  metricById: Map<string, Metric>;
  showLift: 'relative' | 'absolute';
  annotations: Annotation[];
  selectedDimension: string;
  selectedDimensionValue: string;
  onDimensionChange: (dim: string) => void;
  onDimensionValueChange: (val: string) => void;
}) {
  const sliceResults = activeResult.sliceResults!;
  const dimensionNames = Object.keys(sliceResults).sort();
  const activeDim = selectedDimension || dimensionNames[0] || '';
  const dimensionValues = activeDim ? Object.keys(sliceResults[activeDim] ?? {}).sort() : [];
  const activeValue = selectedDimensionValue || dimensionValues[0] || '';
  const sliceMetricResults = activeDim && activeValue ? sliceResults[activeDim]?.[activeValue] : undefined;

  // Build a synthetic ExperimentResult-like object for the slice
  const sliceResult: ExperimentResult | null = sliceMetricResults
    ? { ...activeResult, perMetricResults: sliceMetricResults }
    : null;

  return (
    <div className="mt-4">
      <h4 className="mb-3">Dimension Slices</h4>
      <div className="row g-2 mb-3">
        <div className="col-auto">
          <label className="form-label small text-muted mb-1">Dimension</label>
          <select
            className="form-select form-select-sm"
            value={activeDim}
            onChange={(e) => onDimensionChange(e.target.value)}
          >
            {dimensionNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label small text-muted mb-1">Value</label>
          <select
            className="form-select form-select-sm"
            value={activeValue}
            onChange={(e) => onDimensionValueChange(e.target.value)}
          >
            {dimensionValues.map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
      </div>

      {sliceResult ? (
        <>
          <ResultsTable
            result={sliceResult}
            experiment={experiment}
            metricIds={experiment.primaryMetricIds}
            metricById={metricById}
            showLift={showLift}
            annotations={annotations}
          />
          {experiment.guardrailMetricIds.length > 0 && (
            <ResultsTable
              result={sliceResult}
              experiment={experiment}
              metricIds={experiment.guardrailMetricIds}
              metricById={metricById}
              showLift={showLift}
              annotations={annotations}
            />
          )}
        </>
      ) : (
        <p className="text-muted">No slice data available for this selection.</p>
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
  const [experimentId, setExperimentId] = useState(experiment.experimentId ?? '');
  const [hypothesis, setHypothesis] = useState(experiment.hypothesis);
  const [description, setDescription] = useState(experiment.description ?? '');
  const [tags, setTags] = useState(experiment.tags.join(', '));
  const [variations, setVariations] = useState(experiment.variations);
  const [statsEngine, setStatsEngine] = useState(experiment.statsEngine);
  const [correction, setCorrection] = useState(experiment.multipleComparisonCorrection);
  const [primaryMetricIds, setPrimaryMetricIds] = useState(experiment.primaryMetricIds);
  const [guardrailMetricIds, setGuardrailMetricIds] = useState(experiment.guardrailMetricIds);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const metricsValid = primaryMetricIds.length > 0;
  const canSave = !!name.trim() && variationsValid(variations) && metricsValid;

  async function handleSave() {
    setSaving(true);
    await onSave({
      name,
      experimentId: experimentId || undefined,
      hypothesis,
      description: description || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      variations,
      statsEngine,
      multipleComparisonCorrection: correction,
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
            <label className="form-label">Experiment ID</label>
            <input className="form-control" value={experimentId} onChange={(e) => setExperimentId(e.target.value)} placeholder="Platform experiment ID" />
            <div className="form-text">Matches <code>experiment_id</code> in CSV uploads.</div>
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
        <VariationEditor variations={variations} onChange={setVariations} />

        {/* Stats config */}
        <h6 className="mt-4">Stats Configuration</h6>
        <StatsConfigEditor
          engine={statsEngine}
          correction={correction}
          onEngineChange={setStatsEngine}
          onCorrectionChange={setCorrection}
        />

        {/* Metrics */}
        <div className="mt-4 mb-3">
          <MetricPicker
            metrics={allMetrics}
            primaryMetricIds={primaryMetricIds}
            guardrailMetricIds={guardrailMetricIds}
            onPrimaryChange={setPrimaryMetricIds}
            onGuardrailChange={setGuardrailMetricIds}
            idPrefix="cfg"
          />
        </div>

        {/* Save */}
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving\u2026' : 'Save Changes'}
          </button>
          <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
          {saved && <span className="text-success small">Saved</span>}
        </div>
      </div>
    </div>
  );
}
