'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getMetrics,
  createMetric,
  updateMetric,
  deleteMetric,
  db,
  type Metric,
} from '@/lib/db';

interface MetricLibraryExport {
  version: 1;
  exportedAt: string;
  metrics: Metric[];
}

type MetricFormData = Omit<Metric, 'id' | 'createdAt'>;

const EMPTY_FORM: MetricFormData = {
  name: '',
  description: '',
  type: 'binomial',
  normalization: 'raw_total',
  higherIsBetter: true,
  isGuardrail: false,
  tags: [],
};

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [typeFilter, setTypeFilter] = useState<Metric['type'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MetricFormData>({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const results = await getMetrics(
      typeFilter !== 'all' ? { type: typeFilter } : undefined,
    );
    setMetrics(results);
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = metrics.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setError(null);
  }

  function openEdit(metric: Metric) {
    setEditingId(metric.id);
    const { id: _, createdAt: __, ...rest } = metric;
    setForm(rest);
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    if (editingId) {
      await updateMetric(editingId, form);
    } else {
      await createMetric(form);
    }

    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    try {
      await deleteMetric(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete metric.');
    }
  }

  async function handleExport() {
    const allMetrics = await db.metrics.toArray();
    const data: MetricLibraryExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      metrics: allMetrics,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metric-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as MetricLibraryExport;

      if (data.version !== 1 || !Array.isArray(data.metrics)) {
        alert('Invalid metric library file. Expected version 1 with a metrics array.');
        return;
      }

      const confirmed = confirm(
        `Import ${data.metrics.length} metric${data.metrics.length === 1 ? '' : 's'}? Existing metrics with matching IDs will be updated.`,
      );
      if (!confirmed) return;

      await db.metrics.bulkPut(data.metrics);
      await load();
    } catch {
      alert('Failed to read or parse the selected file.');
    } finally {
      // Reset file input so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Metric Library</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={handleExport}>
            Export Metrics
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Metrics
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="d-none"
            onChange={handleImportFile}
          />
          <button className="btn btn-primary" onClick={openCreate}>
            Create Metric
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3 g-2">
        <div className="col-auto">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search metrics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <div className="btn-group btn-group-sm">
            {(['all', 'binomial', 'count', 'revenue', 'continuous'] as const).map((t) => (
              <button
                key={t}
                className={`btn ${typeFilter === t ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric form modal */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-body">
            <h5>{editingId ? 'Edit Metric' : 'New Metric'}</h5>
            {error && <div className="alert alert-danger py-1">{error}</div>}

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as Metric['type'] })
                  }
                >
                  <option value="binomial">Binomial</option>
                  <option value="count">Count</option>
                  <option value="revenue">Revenue</option>
                  <option value="continuous">Continuous</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Normalization</label>
                <select
                  className="form-select"
                  value={form.normalization}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      normalization: e.target.value as Metric['normalization'],
                    })
                  }
                >
                  <option value="raw_total">Raw total</option>
                  <option value="pre_normalized">Pre-normalized</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.description ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="col-auto">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.higherIsBetter}
                    onChange={(e) =>
                      setForm({ ...form, higherIsBetter: e.target.checked })
                    }
                    id="higherIsBetter"
                  />
                  <label className="form-check-label" htmlFor="higherIsBetter">
                    Higher is better
                  </label>
                </div>
              </div>
              <div className="col-auto">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.isGuardrail}
                    onChange={(e) =>
                      setForm({ ...form, isGuardrail: e.target.checked })
                    }
                    id="isGuardrail"
                  />
                  <label className="form-check-label" htmlFor="isGuardrail">
                    Guardrail metric
                  </label>
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label">Cap type</label>
                <select
                  className="form-select"
                  value={form.capType ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capType: e.target.value
                        ? (e.target.value as Metric['capType'])
                        : undefined,
                    })
                  }
                >
                  <option value="">None</option>
                  <option value="absolute">Absolute</option>
                  <option value="percentile">Percentile</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Cap value</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.capValue ?? ''}
                  placeholder={form.capType === 'percentile' ? 'e.g. 99' : ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capValue: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Min sample size</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.minSampleSize ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minSampleSize: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Normalization</th>
              <th>Direction</th>
              <th>Guardrail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="fw-medium">{m.name}</td>
                <td>
                  <span className="badge bg-body-secondary border">
                    {m.type}
                  </span>
                </td>
                <td className="text-muted small">{m.normalization}</td>
                <td>{m.higherIsBetter ? '↑ Higher' : '↓ Lower'}</td>
                <td>{m.isGuardrail ? '🛡' : ''}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-secondary me-1"
                    onClick={() => openEdit(m)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(m.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  {metrics.length === 0
                    ? 'No metrics defined yet. Create one to get started.'
                    : 'No metrics match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
