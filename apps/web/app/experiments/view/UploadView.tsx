'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { getExperimentById, getMetricsByIds, getColumnMapping, saveColumnMapping, saveResult, type Experiment, type Metric, type ExperimentResult } from '@/lib/db';
import { parseCSVFile, validateCSV, validateMetricColumns, getColumnFingerprint, autoClassifyColumns, getVariationNormalization, type ParsedCSV, type ValidationError } from '@/lib/csv';
import { buildAnalysisRequest, type ColumnMappingConfig } from '@/lib/csv/buildRequest';
import { runAnalysis } from '@/lib/stats/runAnalysis';
import { transformResponse } from '@/lib/stats/transformResponse';
import { downloadTemplateCSV } from '@/lib/csv/generateTemplate';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { ColumnMapper } from '@/components/ColumnMapper';
import { MetricValidationPanel, computeMetricSummaries, hasBlockingValidationErrors, type MetricSummary } from '@/components/MetricValidationPanel';

type UploadStep = 'upload' | 'mapping' | 'analyzing';

export default function UploadView({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [step, setStep] = useState<UploadStep>('upload');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [mapping, setMapping] = useState<ColumnMappingConfig>({});
  const [savedMappingDate, setSavedMappingDate] = useState<string | null>(null);
  const [savedMappingColumns, setSavedMappingColumns] = useState<string[]>([]);
  const [variationNorm, setVariationNorm] = useState<Array<{ original: string; normalized: string }>>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [metricSummaries, setMetricSummaries] = useState<MetricSummary[]>([]);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const settings = useSettingsStore();

  useEffect(() => {
    async function load() {
      await settings.loadFromDB();
      const exp = await getExperimentById(experimentId);
      if (!exp) return;
      setExperiment(exp);
      const ids = [...exp.primaryMetricIds, ...exp.guardrailMetricIds, ...(exp.activationMetricId ? [exp.activationMetricId] : [])];
      setMetrics(await getMetricsByIds(ids));
    }
    load();
  }, [experimentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (file: File) => {
    if (!experiment) return;
    try {
      setErrors([]);
      const result = await parseCSVFile(file);
      setParsed(result);
      const classification = autoClassifyColumns(result.headers, result.rows);
      const initial: ColumnMappingConfig = {};
      for (const [col, role] of Object.entries(classification)) { if (role !== 'reserved') initial[col] = { role }; }
      const fp = getColumnFingerprint(result.headers);
      const saved = await getColumnMapping(experiment.id, fp);
      const activeMapping = saved ? saved.mapping as ColumnMappingConfig : initial;
      if (saved) { setMapping(activeMapping); setSavedMappingDate(new Date(saved.savedAt).toLocaleDateString()); setSavedMappingColumns(Object.keys(saved.mapping)); }
      else { setMapping(activeMapping); setSavedMappingDate(null); setSavedMappingColumns([]); }
      setWarningsAcknowledged(false);
      const variationKeys = experiment.variations.map((v) => v.key);
      setMetricSummaries(computeMetricSummaries(result.rows, activeMapping, metrics, variationKeys));
      setVariationNorm(getVariationNormalization(result.rows));
      setErrors(validateCSV(result, experiment.variations.map((v) => v.key), settings.dimensionWarningThreshold));
      setStep('mapping');
    } catch (err) { setErrors([{ type: 'error', message: err instanceof Error ? err.message : 'Failed to parse CSV' }]); }
  }, [experiment, settings.dimensionWarningThreshold]);

  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }

  async function handleSubmit() {
    if (!experiment || !parsed) return;
    const metricCols = Object.entries(mapping).filter(([, c]) => c.role === 'metric' && c.metricId).map(([col]) => col);
    const metricErrors = validateMetricColumns(parsed.rows, metricCols);
    const allErrors = [...errors, ...metricErrors];
    if (allErrors.some((e) => e.type === 'error')) { setErrors(allErrors); return; }
    await saveColumnMapping(experiment.id, getColumnFingerprint(parsed.headers), mapping);
    setStep('analyzing'); setAnalyzing(true); setAnalyzeError(null);
    try {
      const request = buildAnalysisRequest(parsed, experiment, metrics, mapping);
      const response = await runAnalysis(request);
      const resultRecord: ExperimentResult = {
        id: nanoid(), experimentId: experiment.id, computedAt: Date.now(),
        srmPValue: response.srmPValue, srmFlagged: response.srmFlagged,
        multipleExposureCount: request.multipleExposureCount, multipleExposureFlagged: response.multipleExposureFlagged,
        perMetricResults: transformResponse(response, request), rawRequest: request, status: 'complete',
      };
      await saveResult(resultRecord);
      router.push(`/experiments/view?id=${experiment.id}`);
    } catch (err) { setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed'); setStep('mapping'); }
    finally { setAnalyzing(false); }
  }

  function handleMappingChange(newMapping: ColumnMappingConfig) {
    setMapping(newMapping);
    setWarningsAcknowledged(false);
    if (parsed && experiment) {
      const variationKeys = experiment.variations.map((v) => v.key);
      setMetricSummaries(computeMetricSummaries(parsed.rows, newMapping, metrics, variationKeys));
    }
  }

  if (!experiment) return <div className="py-4 text-center"><div className="spinner-border" role="status" /></div>;
  const blockingErrors = errors.filter((e) => e.type === 'error');
  const warnings = errors.filter((e) => e.type === 'warning');
  const mappedMetrics = Object.values(mapping).filter((c) => c.role === 'metric' && c.metricId).length;
  const hasValidationErrors = metricSummaries.length > 0 && hasBlockingValidationErrors(metricSummaries, metrics);

  return (
    <div className="py-4">
      <h1 className="mb-1">Upload Data</h1>
      <p className="text-muted mb-4">{experiment.name}</p>
      {analyzeError && <div className="alert alert-danger"><strong>Analysis failed:</strong> {analyzeError}</div>}
      {step === 'analyzing' && <div className="text-center py-5"><div className="spinner-border mb-3" role="status" /><p>Running analysis…</p></div>}

      {/* Parse errors shown on the upload step */}
      {step === 'upload' && blockingErrors.length > 0 && (
        <div className="alert alert-danger">
          <strong>CSV error:</strong>
          <ul className="mb-0 mt-1">{blockingErrors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
        </div>
      )}

      {step === 'upload' && (
        <>
          <div className={`border border-2 rounded p-5 text-center ${dragOver ? 'border-primary bg-light' : 'border-dashed'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
            <input ref={fileInputRef} type="file" accept=".csv" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <h4 className="text-muted">Drop a CSV file here</h4>
            <p className="text-muted small mb-0">or click to browse. Expected: #schema_version:1 header, columns: experiment_id, variation_id, units, plus metric columns.</p>
          </div>
          <div className="text-center mt-3">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={(e) => { e.stopPropagation(); downloadTemplateCSV(experiment, metrics); }}
            >
              Download template CSV
            </button>
            <span className="text-muted small ms-2">
              Pre-filled with your {experiment.variations.length} variations and {metrics.length} metric columns
            </span>
          </div>
        </>
      )}

      {step === 'mapping' && parsed && (
        <>
          {variationNorm.length > 0 && <div className="mb-3"><small className="text-muted">Variation IDs: {variationNorm.map((v) => <span key={v.normalized} className="me-2">&quot;{v.original}&quot; → <strong>{v.normalized}</strong></span>)}</small></div>}

          <ColumnMapper
            headers={parsed.headers}
            previewRows={parsed.rows.slice(0, 5)}
            availableMetrics={metrics}
            mapping={mapping}
            onMappingChange={handleMappingChange}
            savedMappingDate={savedMappingDate}
            savedMappingColumns={savedMappingColumns.length > 0 ? savedMappingColumns : undefined}
            onMetricCreated={(metric) => setMetrics((prev) => [...prev, metric])}
          />

          {mappedMetrics > 0 && metricSummaries.length > 0 && (
            <MetricValidationPanel
              summaries={metricSummaries}
              metrics={metrics}
              onAcknowledge={() => setWarningsAcknowledged(true)}
            />
          )}

          {blockingErrors.length > 0 && <div className="alert alert-danger"><strong>Errors:</strong><ul className="mb-0 mt-1">{blockingErrors.map((e, i) => <li key={i}>{e.message}</li>)}</ul></div>}
          {warnings.length > 0 && <div className="alert alert-warning"><strong>Warnings:</strong><ul className="mb-0 mt-1">{warnings.map((e, i) => <li key={i}>{e.message}</li>)}</ul></div>}

          <div className="d-flex justify-content-between">
            <button className="btn btn-outline-secondary" onClick={() => { setParsed(null); setStep('upload'); setErrors([]); setMetricSummaries([]); }}>Choose Different File</button>
            <button className="btn btn-primary" disabled={blockingErrors.length > 0 || mappedMetrics === 0 || hasValidationErrors || analyzing} onClick={handleSubmit}>{analyzing ? 'Analyzing…' : 'Run Analysis'}</button>
          </div>
        </>
      )}
    </div>
  );
}
