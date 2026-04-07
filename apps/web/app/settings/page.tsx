'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useEngineStatusStore } from '@/lib/store/engineStatusStore';
import { useRepoStore } from '@/lib/store/repoStore';
import { exportAllData, importData, type ExportData, previewImport } from '@/lib/db';
import { testLambdaConnection } from '@/lib/stats/lambda';
import { terminateStatsWorker } from '@/lib/stats/runAnalysis';
import { RepoSettings } from '@/components/RepoSettings';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const engineStatus = useEngineStatusStore((s) => s.status);
  const engineMessage = useEngineStatusStore((s) => s.message);
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    quota: number;
  } | null>(null);
  const [lambdaTestResult, setLambdaTestResult] = useState<
    'idle' | 'testing' | 'ok' | 'fail'
  >('idle');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<ExportData | null>(null);
  const repo = useRepoStore();

  useEffect(() => {
    settings.loadFromDB();
    repo.loadFromLocalStorage();
    estimateStorage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function estimateStorage() {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      setStorageUsage({
        used: est.usage ?? 0,
        quota: est.quota ?? 0,
      });
    }
  }

  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ab-tool-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await settings.updateSetting('lastExportedAt', Date.now());
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text) as ExportData;
    const summary = previewImport(data);
    setImportPreview(
      `${summary.experiments} experiments, ${summary.metrics} metrics, ${summary.results} results, ${summary.annotations} annotations`,
    );
    setPendingImport(data);
  }

  async function confirmImport() {
    if (!pendingImport) return;
    await importData(pendingImport, importMode);
    setPendingImport(null);
    setImportPreview(null);
    window.location.reload();
  }

  async function handleTestLambda() {
    setLambdaTestResult('testing');
    const ok = await testLambdaConnection(settings.lambdaUrl);
    setLambdaTestResult(ok ? 'ok' : 'fail');
  }

  const usagePercent =
    storageUsage && storageUsage.quota > 0
      ? (storageUsage.used / storageUsage.quota) * 100
      : 0;
  const usageColor =
    usagePercent > 80 ? 'bg-danger' : usagePercent > 50 ? 'bg-warning' : 'bg-success';

  const lastExport = settings.lastExportedAt
    ? new Date(settings.lastExportedAt).toLocaleDateString()
    : 'Never';
  const daysSinceExport = settings.lastExportedAt
    ? Math.floor((Date.now() - settings.lastExportedAt) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="py-4">
      <h1 className="mb-4">Settings</h1>

      {/* Appearance */}
      <section className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Appearance</h5>
          <div className="mb-3">
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                id="theme-light"
                checked={settings.theme === 'light'}
                onChange={() => settings.updateSetting('theme', 'light')}
              />
              <label className="form-check-label" htmlFor="theme-light">
                Light
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                id="theme-dark"
                checked={settings.theme === 'dark'}
                onChange={() => settings.updateSetting('theme', 'dark')}
              />
              <label className="form-check-label" htmlFor="theme-dark">
                Dark
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                id="theme-auto"
                checked={settings.theme === 'auto'}
                onChange={() => settings.updateSetting('theme', 'auto')}
              />
              <label className="form-check-label" htmlFor="theme-auto">
                Auto (follow system)
              </label>
            </div>
          </div>
          <div className="form-text">Uses your operating system&apos;s color scheme preference.</div>
        </div>
      </section>

      {/* Compute Engine */}
      <section className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Compute Engine</h5>
          <div className="mb-3">
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                id="engine-wasm"
                checked={settings.computeEngine === 'wasm'}
                onChange={() => settings.updateSetting('computeEngine', 'wasm')}
              />
              <label className="form-check-label" htmlFor="engine-wasm">
                Browser (Pyodide WASM) — default, no data leaves your browser
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                id="engine-lambda"
                checked={settings.computeEngine === 'lambda'}
                onChange={() =>
                  settings.updateSetting('computeEngine', 'lambda')
                }
              />
              <label className="form-check-label" htmlFor="engine-lambda">
                Cloud (AWS Lambda) — fallback
              </label>
            </div>
          </div>

          {/* WASM Engine status */}
          <div className="mb-3 d-flex align-items-center gap-2">
            <span className="text-muted">Status:</span>
            <span
              className={`badge ${
                engineStatus === 'ready'
                  ? 'bg-success'
                  : engineStatus === 'error'
                    ? 'bg-danger'
                    : engineStatus === 'loading'
                      ? 'bg-warning text-dark'
                      : 'bg-secondary'
              }`}
            >
              {engineStatus === 'loading' && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {engineStatus}
            </span>
            {engineMessage && (
              <small className="text-muted">{engineMessage}</small>
            )}
            <button
              className="btn btn-sm btn-outline-secondary ms-auto"
              onClick={() => terminateStatsWorker()}
              disabled={engineStatus === 'loading'}
              title="Terminate the current worker and reset engine state"
            >
              Reload Engine
            </button>
          </div>
          {engineStatus === 'error' && engineMessage && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              <small><strong>Error:</strong> {engineMessage}</small>
            </div>
          )}

          {/* Lambda URL */}
          {settings.computeEngine === 'lambda' && (
            <div className="row g-2 align-items-end">
              <div className="col-md-8">
                <label className="form-label">Lambda Function URL</label>
                <input
                  className="form-control"
                  placeholder="https://..."
                  value={settings.lambdaUrl}
                  onChange={(e) =>
                    settings.updateSetting('lambdaUrl', e.target.value)
                  }
                />
              </div>
              <div className="col-auto">
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleTestLambda}
                  disabled={!settings.lambdaUrl || lambdaTestResult === 'testing'}
                >
                  {lambdaTestResult === 'testing'
                    ? 'Testing…'
                    : 'Test Connection'}
                </button>
                {lambdaTestResult === 'ok' && (
                  <span className="ms-2 text-success">Connected</span>
                )}
                {lambdaTestResult === 'fail' && (
                  <span className="ms-2 text-danger">Failed</span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Statistical Defaults */}
      <section className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Statistical Defaults</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Default stats engine</label>
              <select
                className="form-select"
                value={settings.defaultStatsEngine}
                onChange={(e) =>
                  settings.updateSetting(
                    'defaultStatsEngine',
                    e.target.value as 'bayesian' | 'frequentist',
                  )
                }
              >
                <option value="bayesian">Bayesian</option>
                <option value="frequentist">Frequentist</option>
                {/* Sequential (mSPRT) deferred to v2 */}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">
                SRM threshold (p-value)
              </label>
              <input
                type="number"
                step="0.001"
                className="form-control"
                value={settings.srmThreshold}
                onChange={(e) =>
                  settings.updateSetting('srmThreshold', Number(e.target.value))
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">
                Multiple exposure threshold
              </label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={settings.multipleExposureThreshold}
                onChange={(e) =>
                  settings.updateSetting(
                    'multipleExposureThreshold',
                    Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Default α</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={settings.defaultAlpha}
                onChange={(e) =>
                  settings.updateSetting('defaultAlpha', Number(e.target.value))
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Default power (1−β)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={settings.defaultPower}
                onChange={(e) =>
                  settings.updateSetting('defaultPower', Number(e.target.value))
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Dimension warning threshold</label>
              <input
                type="number"
                className="form-control"
                value={settings.dimensionWarningThreshold}
                onChange={(e) =>
                  settings.updateSetting(
                    'dimensionWarningThreshold',
                    Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Backup reminder (days)</label>
              <input
                type="number"
                className="form-control"
                value={settings.backupReminderDays}
                onChange={(e) =>
                  settings.updateSetting(
                    'backupReminderDays',
                    Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Currency symbol</label>
              <input
                type="text"
                className="form-control"
                value={settings.currencySymbol}
                onChange={(e) =>
                  settings.updateSetting('currencySymbol', e.target.value)
                }
                maxLength={5}
                placeholder="$"
              />
              <div className="form-text">Used for revenue metric display</div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Data Management</h5>
          <div className="d-flex gap-3 align-items-center mb-3">
            <button className="btn btn-outline-primary" onClick={handleExport}>
              Export All Data
            </button>
            <label className="btn btn-outline-secondary mb-0">
              Import Data
              <input
                type="file"
                accept=".json"
                className="d-none"
                onChange={handleImportFile}
              />
            </label>
            <span className={`text-muted ${daysSinceExport !== null && daysSinceExport > 30 ? 'text-warning fw-bold' : ''}`}>
              Last export: {lastExport}
              {daysSinceExport !== null && ` (${daysSinceExport}d ago)`}
            </span>
          </div>

          {/* Import preview */}
          {importPreview && pendingImport && (
            <div className="alert alert-info">
              <strong>Import preview:</strong> {importPreview}
              <div className="mt-2 d-flex gap-2 align-items-center">
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    id="import-merge"
                  />
                  <label className="form-check-label" htmlFor="import-merge">
                    Merge (add without overwriting)
                  </label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    id="import-replace"
                  />
                  <label className="form-check-label" htmlFor="import-replace">
                    Replace (wipe and overwrite)
                  </label>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={confirmImport}
                >
                  Confirm Import
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setPendingImport(null);
                    setImportPreview(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <RepoSettings />

      {/* Storage */}
      <section className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Storage</h5>
          {storageUsage ? (
            <>
              <div className="progress mb-2" style={{ height: '1.25rem' }}>
                <div
                  className={`progress-bar ${usageColor}`}
                  role="progressbar"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                >
                  {usagePercent.toFixed(1)}%
                </div>
              </div>
              <small className="text-muted">
                Using {(storageUsage.used / 1024 / 1024).toFixed(1)} MB of{' '}
                {(storageUsage.quota / 1024 / 1024).toFixed(0)} MB available
              </small>
            </>
          ) : (
            <p className="text-muted mb-0">
              Storage estimation not available in this browser.
            </p>
          )}
        </div>
      </section>

      {/* Stats Engine Cache */}
      <section className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Stats Engine Cache</h5>
          <p className="text-muted small">
            Pyodide and scientific packages are cached in your browser for faster loading.
            Clear the cache to force a fresh download on next analysis.
          </p>
          <button
            className="btn btn-outline-warning btn-sm"
            onClick={async () => {
              const deleted = await caches.delete('pyodide-v0.26.2');
              alert(deleted ? 'Stats engine cache cleared.' : 'No cache found.');
            }}
          >
            Clear Stats Cache
          </button>
        </div>
      </section>
    </div>
  );
}
