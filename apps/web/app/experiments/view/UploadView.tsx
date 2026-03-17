'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { getExperimentById, getMetricsByIds, getColumnMapping, saveColumnMapping, saveResult, updateExperiment, type Experiment, type Metric, type ExperimentResult } from '@/lib/db';
import { parseCSVFile, validateCSV, validateMetricColumns, getColumnFingerprint, autoClassifyColumns, getVariationNormalization, type ParsedCSV, type ValidationError } from '@/lib/csv';
import { buildMergedAnalysisRequest, type ColumnMappingConfig } from '@/lib/csv/buildRequest';
import { runAnalysis } from '@/lib/stats/runAnalysis';
import type { AnalysisRequest } from '@/lib/stats/types';
import { transformResponse } from '@/lib/stats/transformResponse';
import { downloadTemplateCSV } from '@/lib/csv/generateTemplate';
import type { TemplateFormat } from '@/lib/csv/generateTemplate';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { ColumnMapper } from '@/components/ColumnMapper';
import { MetricValidationPanel, computeMetricSummaries, computeMetricSummariesFromAggregates, hasBlockingValidationErrors, type MetricSummary } from '@/components/MetricValidationPanel';

// Per-section upload state
interface UploadSlot {
  parsed: ParsedCSV | null;
  errors: ValidationError[];
  mapping: ColumnMappingConfig;
  metricSummaries: MetricSummary[];
  savedMappingDate: string | null;
  savedMappingColumns: string[];
  variationNorm: Array<{ original: string; normalized: string }>;
  warningsAcknowledged: boolean;
}

function emptySlot(): UploadSlot {
  return {
    parsed: null,
    errors: [],
    mapping: {},
    metricSummaries: [],
    savedMappingDate: null,
    savedMappingColumns: [],
    variationNorm: [],
    warningsAcknowledged: false,
  };
}

export default function UploadView({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const aggFileRef = useRef<HTMLInputElement>(null);
  const rowFileRef = useRef<HTMLInputElement>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aggDragOver, setAggDragOver] = useState(false);
  const [rowDragOver, setRowDragOver] = useState(false);
  const lastRequestRef = useRef<AnalysisRequest | null>(null);
  const settings = useSettingsStore();

  const [agg, setAgg] = useState<UploadSlot>(emptySlot());
  const [row, setRow] = useState<UploadSlot>(emptySlot());

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

  // ---------- Aggregated upload ----------

  const handleAggFile = useCallback(async (file: File) => {
    if (!experiment) return;
    try {
      const result = await parseCSVFile(file);
      if (result.schema !== 'agg-v1') {
        setAgg({ ...emptySlot(), errors: [{ type: 'error', message: 'This section expects Aggregated (agg-v1) data. Drop row-level files in the other section.' }] });
        return;
      }

      const classification = autoClassifyColumns(result.headers, result.rows, result.schema);
      const initial: ColumnMappingConfig = {};
      for (const [col, role] of Object.entries(classification)) {
        if (role !== 'reserved') initial[col] = { role };
      }

      const fp = getColumnFingerprint(result.headers);
      const saved = await getColumnMapping(experiment.id, fp);
      const activeMapping = saved ? saved.mapping as ColumnMappingConfig : initial;
      const variationKeys = experiment.variations.map((v) => v.key);

      setAgg({
        parsed: result,
        errors: validateCSV(result, variationKeys, settings.dimensionWarningThreshold),
        mapping: activeMapping,
        metricSummaries: computeMetricSummaries(result.rows, activeMapping, metrics, variationKeys),
        savedMappingDate: saved ? new Date(saved.savedAt).toLocaleDateString() : null,
        savedMappingColumns: saved ? Object.keys(saved.mapping) : [],
        variationNorm: getVariationNormalization(result.rows),
        warningsAcknowledged: false,
      });
    } catch (err) {
      setAgg({ ...emptySlot(), errors: [{ type: 'error', message: err instanceof Error ? err.message : 'Failed to parse CSV' }] });
    }
  }, [experiment, metrics, settings.dimensionWarningThreshold]);

  function handleAggMappingChange(newMapping: ColumnMappingConfig) {
    if (!experiment || !agg.parsed) return;
    const variationKeys = experiment.variations.map((v) => v.key);
    setAgg((prev) => ({
      ...prev,
      mapping: newMapping,
      warningsAcknowledged: false,
      metricSummaries: computeMetricSummaries(prev.parsed!.rows, newMapping, metrics, variationKeys),
    }));
  }

  // ---------- Row-level upload ----------

  const handleRowFile = useCallback(async (file: File) => {
    if (!experiment) return;
    try {
      const result = await parseCSVFile(file);
      if (result.schema !== 'row-v1') {
        setRow({ ...emptySlot(), errors: [{ type: 'error', message: 'This section expects Row-level (row-v1) data. Drop aggregated files in the other section.' }] });
        return;
      }

      // Auto-map columns to metrics by name
      const autoMapping: ColumnMappingConfig = {};
      const metricNameMap = new Map(metrics.map((m) => [m.name.toLowerCase().replace(/\s+/g, '_'), m.id]));
      for (const header of result.headers) {
        if (['experiment_id', 'variation_id', 'user_id'].includes(header)) continue;
        const matchedId = metricNameMap.get(header.toLowerCase());
        autoMapping[header] = matchedId
          ? { role: 'metric', metricId: matchedId }
          : { role: 'metric' }; // unmatched — shown as needing attention
      }

      const variationKeys = experiment.variations.map((v) => v.key);
      const summaries = result.rowLevelAggregates
        ? computeMetricSummariesFromAggregates(result.rowLevelAggregates, autoMapping, metrics, variationKeys)
        : [];

      setRow({
        parsed: result,
        errors: validateCSV(result, variationKeys),
        mapping: autoMapping,
        metricSummaries: summaries,
        savedMappingDate: null,
        savedMappingColumns: [],
        variationNorm: [],
        warningsAcknowledged: false,
      });
    } catch (err) {
      setRow({ ...emptySlot(), errors: [{ type: 'error', message: err instanceof Error ? err.message : 'Failed to parse CSV' }] });
    }
  }, [experiment, metrics]);

  // ---------- Analysis ----------

  async function executeAnalysis(request: AnalysisRequest) {
    if (!experiment) return;
    lastRequestRef.current = request;
    setAnalyzing(true); setAnalyzeError(null);
    try {
      const response = await runAnalysis(request);
      const transformed = transformResponse(response, request);
      const resultRecord: ExperimentResult = {
        id: nanoid(), experimentId: experiment.id, computedAt: Date.now(),
        srmPValue: response.srmPValue, srmFlagged: response.srmFlagged,
        multipleExposureCount: request.multipleExposureCount, multipleExposureFlagged: response.multipleExposureFlagged,
        perMetricResults: transformed.overall,
        sliceResults: Object.keys(transformed.slices).length > 0 ? transformed.slices : undefined,
        rawRequest: request, status: 'complete',
      };
      await saveResult(resultRecord);
      if (experiment.status === 'draft') {
        const shouldLaunch = window.confirm('This experiment is still a draft. Launch it now?');
        if (shouldLaunch) {
          await updateExperiment(experiment.id, { status: 'running' });
        }
      }
      router.push(`/experiments/view?id=${experiment.id}`);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    if (!experiment) return;

    // Validate agg metric columns if present
    if (agg.parsed) {
      const metricCols = Object.entries(agg.mapping).filter(([, c]) => c.role === 'metric' && c.metricId).map(([col]) => col);
      const metricErrors = validateMetricColumns(agg.parsed.rows, metricCols);
      if (metricErrors.length > 0) {
        setAgg((prev) => ({ ...prev, errors: [...prev.errors, ...metricErrors] }));
        if (metricErrors.some((e) => e.type === 'error')) return;
      }
      await saveColumnMapping(experiment.id, getColumnFingerprint(agg.parsed.headers), agg.mapping);
    }

    // Check for blocking errors in either source
    if (agg.errors.some((e) => e.type === 'error') || row.errors.some((e) => e.type === 'error')) return;

    const request = buildMergedAnalysisRequest(
      agg.parsed, agg.mapping,
      row.parsed, row.mapping,
      experiment, metrics,
    );
    await executeAnalysis(request);
  }

  async function handleRetry() {
    if (!lastRequestRef.current) return;
    await executeAnalysis(lastRequestRef.current);
  }

  // ---------- Metric coverage ----------

  const metricById = new Map(metrics.map((m) => [m.id, m]));
  const aggMappedIds = new Set(
    Object.values(agg.mapping).filter((c) => c.role === 'metric' && c.metricId).map((c) => c.metricId!),
  );
  const rowMappedIds = new Set(
    Object.values(row.mapping).filter((c) => c.role === 'metric' && c.metricId).map((c) => c.metricId!),
  );
  const allCoveredIds = new Set([...aggMappedIds, ...rowMappedIds]);
  const uncoveredMetrics = metrics.filter((m) => !allCoveredIds.has(m.id));
  const totalMapped = allCoveredIds.size;
  const hasAnyData = agg.parsed != null || row.parsed != null;

  const aggBlockingErrors = agg.errors.filter((e) => e.type === 'error');
  const rowBlockingErrors = row.errors.filter((e) => e.type === 'error');
  const anyBlockingErrors = aggBlockingErrors.length > 0 || rowBlockingErrors.length > 0;
  const aggValidationErrors = agg.metricSummaries.length > 0 && hasBlockingValidationErrors(agg.metricSummaries, metrics);
  const rowValidationErrors = row.metricSummaries.length > 0 && hasBlockingValidationErrors(row.metricSummaries, metrics);

  // ---------- Render ----------

  if (!experiment) return <div className="py-4 text-center"><div className="spinner-border" role="status" /></div>;

  if (analyzing) {
    return (
      <div className="py-4">
        <h1 className="mb-1">Upload Data</h1>
        <p className="text-muted mb-4">{experiment.name}</p>
        <div className="text-center py-5"><div className="spinner-border mb-3" role="status" /><p>Running analysis…</p></div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <h1 className="mb-1">Upload Data</h1>
      <p className="text-muted mb-4">{experiment.name}</p>

      {analyzeError && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span><strong>Analysis failed:</strong> {analyzeError}</span>
          {lastRequestRef.current && (
            <button className="btn btn-outline-danger btn-sm ms-3 flex-shrink-0" onClick={handleRetry} disabled={analyzing}>Retry</button>
          )}
        </div>
      )}

      <div className="row g-4">
        {/* Aggregated section */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">Aggregated Data</h5>
              <small className="text-muted">Pre-aggregated with one row per variation. Supports dimension slices.</small>
            </div>
            <div className="card-body">
              {renderAggSection()}
            </div>
          </div>
        </div>

        {/* Row-level section */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">Row-level Data</h5>
              <small className="text-muted">One row per user. Required for continuous metrics.</small>
            </div>
            <div className="card-body">
              {renderRowSection()}
            </div>
          </div>
        </div>
      </div>

      {/* Metric coverage + submit */}
      {hasAnyData && (
        <div className="mt-4">
          {renderMetricCoverage()}

          <div className="d-flex justify-content-end mt-3">
            <button
              className="btn btn-primary"
              disabled={anyBlockingErrors || totalMapped === 0 || aggValidationErrors || rowValidationErrors || analyzing}
              onClick={handleSubmit}
            >
              Run Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ---------- Sub-renders ----------

  function renderUploadZone(
    format: TemplateFormat,
    fileRef: React.RefObject<HTMLInputElement | null>,
    isDragOver: boolean,
    setDrag: (v: boolean) => void,
    onFile: (f: File) => void,
    slotErrors: ValidationError[],
  ) {
    const blockingErrs = slotErrors.filter((e) => e.type === 'error');
    return (
      <>
        {blockingErrs.length > 0 && (
          <div className="alert alert-danger py-2">
            <ul className="mb-0">{blockingErrs.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
          </div>
        )}
        <div
          className={`border border-2 rounded p-4 text-center ${isDragOver ? 'border-primary bg-light' : 'border-dashed'}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          onClick={() => fileRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          <input ref={fileRef} type="file" accept=".csv" className="d-none" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <p className="mb-1 text-muted">Drop CSV here or click to browse</p>
        </div>
        <div className="text-center mt-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={(e) => { e.stopPropagation(); downloadTemplateCSV(experiment!, metrics, format); }}
          >
            Download template
          </button>
        </div>
      </>
    );
  }

  function renderAggSection() {
    if (!agg.parsed) {
      return renderUploadZone('agg-v1', aggFileRef, aggDragOver, setAggDragOver, handleAggFile, agg.errors);
    }

    const blockingErrs = agg.errors.filter((e) => e.type === 'error');
    const warns = agg.errors.filter((e) => e.type === 'warning');
    const mapped = Object.values(agg.mapping).filter((c) => c.role === 'metric' && c.metricId).length;

    return (
      <>
        {agg.variationNorm.length > 0 && (
          <div className="mb-2">
            <small className="text-muted">
              Variations: {agg.variationNorm.map((v) => (
                <span key={v.normalized} className="me-2">&quot;{v.original}&quot; → <strong>{v.normalized}</strong></span>
              ))}
            </small>
          </div>
        )}

        <ColumnMapper
          headers={agg.parsed.headers}
          previewRows={agg.parsed.rows.slice(0, 5)}
          availableMetrics={metrics}
          mapping={agg.mapping}
          onMappingChange={handleAggMappingChange}
          savedMappingDate={agg.savedMappingDate}
          savedMappingColumns={agg.savedMappingColumns.length > 0 ? agg.savedMappingColumns : undefined}
          onMetricCreated={(metric) => setMetrics((prev) => [...prev, metric])}
        />

        {mapped > 0 && agg.metricSummaries.length > 0 && (
          <MetricValidationPanel
            summaries={agg.metricSummaries}
            metrics={metrics}
            onAcknowledge={() => setAgg((prev) => ({ ...prev, warningsAcknowledged: true }))}
          />
        )}

        {blockingErrs.length > 0 && <div className="alert alert-danger py-2"><ul className="mb-0">{blockingErrs.map((e, i) => <li key={i}>{e.message}</li>)}</ul></div>}
        {warns.length > 0 && <div className="alert alert-warning py-2"><ul className="mb-0">{warns.map((e, i) => <li key={i}>{e.message}</li>)}</ul></div>}

        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setAgg(emptySlot())}>Remove</button>
      </>
    );
  }

  function renderRowSection() {
    if (!row.parsed) {
      return renderUploadZone('row-v1', rowFileRef, rowDragOver, setRowDragOver, handleRowFile, row.errors);
    }

    const blockingErrs = row.errors.filter((e) => e.type === 'error');
    const warns = row.errors.filter((e) => e.type === 'warning');
    const mapped = Object.values(row.mapping).filter((c) => c.role === 'metric' && c.metricId).length;
    const unmappedCols = Object.entries(row.mapping).filter(([, c]) => c.role === 'metric' && !c.metricId).map(([col]) => col);

    return (
      <>
        {row.parsed.rowLevelTotalRows != null && (
          <div className="alert alert-info py-2">
            <strong>{row.parsed.rowLevelTotalRows.toLocaleString()}</strong> rows across{' '}
            <strong>{row.parsed.rowLevelAggregates ? Object.keys(row.parsed.rowLevelAggregates).length : 0}</strong> variations.
          </div>
        )}

        {/* Auto-mapped column summary */}
        <table className="table table-sm table-bordered align-middle mb-2">
          <thead><tr><th>CSV Column</th><th>Metric</th></tr></thead>
          <tbody>
            {Object.entries(row.mapping).map(([col, config]) => {
              const metric = config.metricId ? metrics.find((m) => m.id === config.metricId) : null;
              return (
                <tr key={col} className={!config.metricId ? 'table-warning' : ''}>
                  <td className="font-monospace small">{col}</td>
                  <td>
                    {metric ? (
                      <span>{metric.name} <span className="badge bg-secondary ms-1">{metric.type}</span></span>
                    ) : (
                      <span className="text-warning">Not matched — ignored</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {unmappedCols.length > 0 && (
          <p className="text-muted small">Unmatched columns are ignored. Create metrics with matching names to include them.</p>
        )}

        {mapped > 0 && row.metricSummaries.length > 0 && (
          <MetricValidationPanel
            summaries={row.metricSummaries}
            metrics={metrics}
            onAcknowledge={() => setRow((prev) => ({ ...prev, warningsAcknowledged: true }))}
          />
        )}

        {blockingErrs.length > 0 && <div className="alert alert-danger py-2"><ul className="mb-0">{blockingErrs.map((e, i) => <li key={i}>{e.message}</li>)}</ul></div>}
        {warns.length > 0 && <div className="alert alert-warning py-2"><ul className="mb-0">{warns.map((e, i) => <li key={i}>{e.message}</li>)}</ul></div>}

        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setRow(emptySlot())}>Remove</button>
      </>
    );
  }

  function renderMetricCoverage() {
    // Detect overlapping metrics
    const overlapIds = [...aggMappedIds].filter((id) => rowMappedIds.has(id));

    return (
      <div className="card">
        <div className="card-header"><h5 className="mb-0">Metric Coverage</h5></div>
        <div className="card-body p-0">
          <table className="table table-sm mb-0 align-middle">
            <thead><tr><th>Metric</th><th>Type</th><th>Source</th></tr></thead>
            <tbody>
              {metrics.map((m) => {
                const inAgg = aggMappedIds.has(m.id);
                const inRow = rowMappedIds.has(m.id);
                const isOverlap = overlapIds.includes(m.id);
                let source: string;
                let badgeClass: string;
                if (inAgg && inRow) { source = 'Both (row-level used)'; badgeClass = 'bg-info'; }
                else if (inAgg) { source = 'Aggregated'; badgeClass = 'bg-primary'; }
                else if (inRow) { source = 'Row-level'; badgeClass = 'bg-success'; }
                else { source = 'Not covered'; badgeClass = 'bg-danger'; }

                return (
                  <tr key={m.id} className={!inAgg && !inRow ? 'table-danger' : isOverlap ? 'table-info' : ''}>
                    <td>{m.name}</td>
                    <td><span className="badge bg-secondary">{m.type}</span></td>
                    <td><span className={`badge ${badgeClass}`}>{source}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {uncoveredMetrics.length > 0 && (
          <div className="card-footer text-muted small">
            {uncoveredMetrics.length} metric{uncoveredMetrics.length > 1 ? 's' : ''} not covered by any upload. Analysis will proceed without {uncoveredMetrics.length === 1 ? 'it' : 'them'}.
          </div>
        )}
        {overlapIds.length > 0 && (
          <div className="card-footer text-muted small">
            {overlapIds.length} metric{overlapIds.length > 1 ? 's appear' : ' appears'} in both uploads. Row-level data will be used.
          </div>
        )}
      </div>
    );
  }
}
