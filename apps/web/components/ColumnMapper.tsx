'use client';

/**
 * Column mapping UI — user assigns each CSV column as Dimension, Metric, or Ignore.
 * For metric columns, user selects which Metric from the library or creates a new one inline.
 * See requirements.md Sections 5.3, 4.2 Column Mapping.
 */

import { useState } from 'react';
import type { Metric } from '@/lib/db/schema';
import type { ColumnMappingConfig } from '@/lib/csv/buildRequest';
import { RESERVED_COLUMNS } from '@/lib/csv';
import { createMetric } from '@/lib/db';

export interface ColumnMapperProps {
  headers: string[];
  previewRows: Record<string, string>[];
  availableMetrics: Metric[];
  mapping: ColumnMappingConfig;
  onMappingChange: (mapping: ColumnMappingConfig) => void;
  /** If a saved mapping was loaded, show a banner with this date string */
  savedMappingDate?: string | null;
  /** Columns from the saved mapping (for diff highlighting when schema changes) */
  savedMappingColumns?: string[];
  /** Called after a new metric is created inline, so the parent can refresh its metric list */
  onMetricCreated?: (metric: Metric) => void;
}

type Role = 'dimension' | 'metric' | 'ignore';
const CREATE_NEW_SENTINEL = '__create_new__';

interface InlineMetricForm {
  columnName: string;
  name: string;
  type: Metric['type'];
  normalization: Metric['normalization'];
  higherIsBetter: boolean;
}

export function ColumnMapper({
  headers,
  previewRows,
  availableMetrics,
  mapping,
  onMappingChange,
  savedMappingDate,
  savedMappingColumns,
  onMetricCreated,
}: ColumnMapperProps) {
  const [inlineForm, setInlineForm] = useState<InlineMetricForm | null>(null);
  const [creating, setCreating] = useState(false);

  const mappableHeaders = headers.filter(
    (h) => !(RESERVED_COLUMNS as readonly string[]).includes(h),
  );

  // Diff detection: columns added or removed since the saved mapping
  const addedColumns = savedMappingColumns
    ? mappableHeaders.filter((h) => !savedMappingColumns.includes(h))
    : [];
  const removedColumns = savedMappingColumns
    ? savedMappingColumns.filter(
        (h) =>
          !headers.includes(h) &&
          !(RESERVED_COLUMNS as readonly string[]).includes(h),
      )
    : [];
  const hasSchemaChanges = addedColumns.length > 0 || removedColumns.length > 0;

  function setRole(col: string, role: Role) {
    onMappingChange({
      ...mapping,
      [col]: {
        ...mapping[col],
        role,
        metricId: role === 'metric' ? mapping[col]?.metricId : undefined,
      },
    });
  }

  function setMetricId(col: string, metricId: string) {
    if (metricId === CREATE_NEW_SENTINEL) {
      setInlineForm({
        columnName: col,
        name: col.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'binomial',
        normalization: 'raw_total',
        higherIsBetter: true,
      });
      return;
    }
    onMappingChange({
      ...mapping,
      [col]: { ...mapping[col], role: 'metric', metricId },
    });
  }

  async function handleCreateMetric() {
    if (!inlineForm) return;
    setCreating(true);
    try {
      const metric = await createMetric({
        name: inlineForm.name,
        type: inlineForm.type,
        normalization: inlineForm.normalization,
        higherIsBetter: inlineForm.higherIsBetter,
        isGuardrail: false,
        tags: [],
      });
      // Update mapping for this column
      onMappingChange({
        ...mapping,
        [inlineForm.columnName]: { role: 'metric', metricId: metric.id },
      });
      onMetricCreated?.(metric);
      setInlineForm(null);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Saved mapping banner */}
      {savedMappingDate && (
        <div className="alert alert-info py-2">
          Using saved column mapping from {savedMappingDate}.
          {hasSchemaChanges
            ? ' The CSV schema has changed — review highlighted columns below.'
            : ' Edit below if your columns have changed.'}
        </div>
      )}

      {/* Schema diff warning */}
      {hasSchemaChanges && (
        <div className="alert alert-warning py-2">
          <strong>Column changes detected:</strong>
          {addedColumns.length > 0 && (
            <span>
              {' '}
              Added: {addedColumns.map((c) => (
                <span key={c} className="badge bg-success text-white ms-1">{c}</span>
              ))}
            </span>
          )}
          {removedColumns.length > 0 && (
            <span>
              {' '}
              Removed: {removedColumns.map((c) => (
                <span key={c} className="badge bg-danger text-white ms-1">{c}</span>
              ))}
            </span>
          )}
        </div>
      )}

      {/* Data preview table */}
      <div className="table-responsive mb-3">
        <table className="table table-sm table-bordered">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`small ${addedColumns.includes(h) ? 'table-success' : ''}`}
                >
                  {h}
                  {addedColumns.includes(h) && (
                    <span className="badge bg-success ms-1" style={{ fontSize: '0.6rem' }}>NEW</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.slice(0, 5).map((row, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h} className={`small ${addedColumns.includes(h) ? 'table-success' : ''}`}>
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column mapping controls */}
      <h5>Column Mapping</h5>
      <div className="table-responsive mb-3">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Column</th>
              <th>Role</th>
              <th>Metric</th>
            </tr>
          </thead>
          <tbody>
            {mappableHeaders.map((col) => (
              <tr key={col} className={addedColumns.includes(col) ? 'table-success' : ''}>
                <td className="fw-medium">
                  {col}
                  {addedColumns.includes(col) && (
                    <span className="badge bg-success ms-1" style={{ fontSize: '0.6rem' }}>NEW</span>
                  )}
                </td>
                <td>
                  <select
                    className="form-select form-select-sm"
                    value={mapping[col]?.role ?? 'ignore'}
                    onChange={(e) => setRole(col, e.target.value as Role)}
                  >
                    <option value="dimension">Dimension</option>
                    <option value="metric">Metric</option>
                    <option value="ignore">Ignore</option>
                  </select>
                </td>
                <td>
                  {mapping[col]?.role === 'metric' && (
                    <select
                      className="form-select form-select-sm"
                      value={mapping[col]?.metricId ?? ''}
                      onChange={(e) => setMetricId(col, e.target.value)}
                    >
                      <option value="">Select metric…</option>
                      {availableMetrics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type})
                        </option>
                      ))}
                      <option value={CREATE_NEW_SENTINEL}>+ Create new metric…</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline metric creation form */}
      {inlineForm && (
        <div className="card mb-3 border-primary">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="card-title mb-0">
                Create new metric for column &ldquo;{inlineForm.columnName}&rdquo;
              </h6>
              <button
                className="btn-close"
                onClick={() => setInlineForm(null)}
              />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Name</label>
                <input
                  className="form-control form-control-sm"
                  value={inlineForm.name}
                  onChange={(e) =>
                    setInlineForm({ ...inlineForm, name: e.target.value })
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Type</label>
                <select
                  className="form-select form-select-sm"
                  value={inlineForm.type}
                  onChange={(e) =>
                    setInlineForm({
                      ...inlineForm,
                      type: e.target.value as Metric['type'],
                    })
                  }
                >
                  <option value="binomial">Binomial</option>
                  <option value="count">Count</option>
                  <option value="revenue">Revenue</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Normalization</label>
                <select
                  className="form-select form-select-sm"
                  value={inlineForm.normalization}
                  onChange={(e) =>
                    setInlineForm({
                      ...inlineForm,
                      normalization: e.target.value as Metric['normalization'],
                    })
                  }
                >
                  <option value="raw_total">Raw total (sum ÷ units)</option>
                  <option value="pre_normalized">Pre-normalized (rate/mean)</option>
                </select>
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={inlineForm.higherIsBetter}
                    onChange={(e) =>
                      setInlineForm({
                        ...inlineForm,
                        higherIsBetter: e.target.checked,
                      })
                    }
                    id="inline-higher-is-better"
                  />
                  <label
                    className="form-check-label"
                    htmlFor="inline-higher-is-better"
                  >
                    Higher is better
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateMetric}
                  disabled={creating || !inlineForm.name.trim()}
                >
                  {creating ? 'Creating…' : 'Create & Map'}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm ms-2"
                  onClick={() => setInlineForm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
