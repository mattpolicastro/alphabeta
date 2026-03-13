'use client';

/**
 * Experiment Creation Wizard — 5-step form.
 * See requirements.md Section 7.1.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import {
  createExperiment,
  getMetrics,
  type Metric,
  type Variation,
} from '@/lib/db';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { PowerCalculator } from '@/components/PowerCalculator';

type StatsEngine = 'bayesian' | 'frequentist' | 'sequential';
type Correction = 'none' | 'holm-bonferroni' | 'benjamini-hochberg';

interface WizardState {
  name: string;
  hypothesis: string;
  description: string;
  tags: string;
  variations: Variation[];
  primaryMetricIds: string[];
  guardrailMetricIds: string[];
  activationMetricId: string;
  statsEngine: StatsEngine;
  correction: Correction;
  cuped: boolean;
}

const DEFAULT_VARIATIONS: Variation[] = [
  { id: nanoid(), name: 'Control', key: 'control', weight: 0.5, isControl: true },
  { id: nanoid(), name: 'Variant A', key: 'variant_a', weight: 0.5, isControl: false },
];

export default function NewExperimentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const defaultEngine = useSettingsStore((s) => s.defaultStatsEngine);

  const [form, setForm] = useState<WizardState>({
    name: '',
    hypothesis: '',
    description: '',
    tags: '',
    variations: DEFAULT_VARIATIONS,
    primaryMetricIds: [],
    guardrailMetricIds: [],
    activationMetricId: '',
    statsEngine: defaultEngine,
    correction: 'none',
    cuped: false,
  });

  useEffect(() => {
    getMetrics().then(setMetrics);
  }, []);

  const totalWeight = form.variations.reduce((s, v) => s + v.weight, 0);
  const weightPct = Math.round(totalWeight * 100);

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return form.name.trim().length > 0;
      case 2:
        return (
          form.variations.length >= 2 &&
          form.variations.some((v) => v.isControl) &&
          Math.abs(totalWeight - 1) < 0.001
        );
      case 3:
        return form.primaryMetricIds.length >= 1;
      case 4:
        return true;
      default:
        return true;
    }
  }

  function addVariation() {
    if (form.variations.length >= 5) return;
    const idx = form.variations.length;
    setForm({
      ...form,
      variations: [
        ...form.variations,
        {
          id: nanoid(),
          name: `Variant ${String.fromCharCode(65 + idx - 1)}`,
          key: `variant_${String.fromCharCode(97 + idx - 1)}`,
          weight: 0,
          isControl: false,
        },
      ],
    });
  }

  function removeVariation(id: string) {
    if (form.variations.length <= 2) return;
    setForm({
      ...form,
      variations: form.variations.filter((v) => v.id !== id),
    });
  }

  function updateVariation(id: string, patch: Partial<Variation>) {
    setForm({
      ...form,
      variations: form.variations.map((v) =>
        v.id === id ? { ...v, ...patch } : v,
      ),
    });
  }

  function setControl(id: string) {
    setForm({
      ...form,
      variations: form.variations.map((v) => ({
        ...v,
        isControl: v.id === id,
      })),
    });
  }

  function toggleMetric(
    list: 'primaryMetricIds' | 'guardrailMetricIds',
    metricId: string,
  ) {
    const current = form[list];
    const next = current.includes(metricId)
      ? current.filter((id) => id !== metricId)
      : [...current, metricId];
    setForm({ ...form, [list]: next });
  }

  async function handleSave(status: 'draft' | 'running') {
    await createExperiment({
      name: form.name,
      hypothesis: form.hypothesis,
      description: form.description || undefined,
      status,
      variations: form.variations,
      primaryMetricIds: form.primaryMetricIds,
      guardrailMetricIds: form.guardrailMetricIds,
      activationMetricId: form.activationMetricId || undefined,
      statsEngine: form.statsEngine,
      multipleComparisonCorrection: form.correction,
      cuped: form.cuped,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    router.push('/');
  }

  return (
    <div className="py-4" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h1 className="mb-4">Create Experiment</h1>

      {/* Step indicator */}
      <div className="d-flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`flex-fill text-center py-1 small rounded ${
              s === step
                ? 'bg-primary text-white'
                : s < step
                  ? 'bg-success text-white'
                  : 'bg-light text-muted'
            }`}
          >
            {['Hypothesis', 'Variations', 'Metrics', 'Stats Config', 'Review'][
              s - 1
            ]}
          </div>
        ))}
      </div>

      {/* Step 1: Hypothesis */}
      {step === 1 && (
        <div>
          <div className="mb-3">
            <label className="form-label">
              Experiment Name <span className="text-danger">*</span>
            </label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Hypothesis</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.hypothesis}
              onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
              placeholder="Changing X will cause Y because Z…"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              className="form-control"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="homepage, cta, q1"
            />
          </div>
        </div>
      )}

      {/* Step 2: Variations */}
      {step === 2 && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span>
              Weight total:{' '}
              <strong className={Math.abs(totalWeight - 1) < 0.001 ? 'text-success' : 'text-danger'}>
                {weightPct}%
              </strong>
              {Math.abs(totalWeight - 1) >= 0.001 && (
                <span className="text-danger ms-2">
                  ({weightPct < 100 ? `${100 - weightPct}% remaining` : 'exceeds 100%'})
                </span>
              )}
            </span>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={addVariation}
              disabled={form.variations.length >= 5}
            >
              Add Variation
            </button>
          </div>
          {form.variations.map((v) => (
            <div key={v.id} className="card mb-2">
              <div className="card-body py-2">
                <div className="row g-2 align-items-center">
                  <div className="col-md-3">
                    <input
                      className="form-control form-control-sm"
                      value={v.name}
                      onChange={(e) =>
                        updateVariation(v.id, { name: e.target.value })
                      }
                      placeholder="Name"
                    />
                  </div>
                  <div className="col-md-3">
                    <input
                      className="form-control form-control-sm"
                      value={v.key}
                      onChange={(e) =>
                        updateVariation(v.id, { key: e.target.value })
                      }
                      placeholder="Key"
                    />
                  </div>
                  <div className="col-md-2">
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        className="form-control"
                        value={Math.round(v.weight * 100)}
                        onChange={(e) =>
                          updateVariation(v.id, {
                            weight: Number(e.target.value) / 100,
                          })
                        }
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        checked={v.isControl}
                        onChange={() => setControl(v.id)}
                      />
                      <label className="form-check-label small">Control</label>
                    </div>
                  </div>
                  <div className="col-md-2 text-end">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeVariation(v.id)}
                      disabled={form.variations.length <= 2}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Metrics */}
      {step === 3 && (
        <div>
          {metrics.length === 0 ? (
            <div className="alert alert-warning">
              No metrics defined yet.{' '}
              <a href="/metrics" target="_blank">
                Create metrics
              </a>{' '}
              first, then come back.
            </div>
          ) : (
            <>
              <h6>Primary Metrics (select at least 1)</h6>
              {metrics.map((m) => (
                <div key={m.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.primaryMetricIds.includes(m.id)}
                    onChange={() => toggleMetric('primaryMetricIds', m.id)}
                    id={`primary-${m.id}`}
                  />
                  <label className="form-check-label" htmlFor={`primary-${m.id}`}>
                    {m.name}{' '}
                    <span className="badge bg-light text-dark border">
                      {m.type}
                    </span>
                  </label>
                </div>
              ))}

              <h6 className="mt-4">Guardrail Metrics (optional)</h6>
              {metrics.map((m) => (
                <div key={m.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={form.guardrailMetricIds.includes(m.id)}
                    onChange={() => toggleMetric('guardrailMetricIds', m.id)}
                    id={`guard-${m.id}`}
                  />
                  <label className="form-check-label" htmlFor={`guard-${m.id}`}>
                    {m.name}
                  </label>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Step 4: Stats Config */}
      {step === 4 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Stats Engine</label>
            <select
              className="form-select"
              value={form.statsEngine}
              onChange={(e) =>
                setForm({
                  ...form,
                  statsEngine: e.target.value as StatsEngine,
                })
              }
            >
              <option value="bayesian">
                Bayesian — probability of being best, expected loss
              </option>
              <option value="frequentist">
                Frequentist — p-value, confidence interval
              </option>
              <option value="sequential">
                Sequential — safe continuous monitoring (mSPRT)
              </option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">
              Multiple Comparison Correction
            </label>
            <select
              className="form-select"
              value={form.correction}
              onChange={(e) =>
                setForm({ ...form, correction: e.target.value as Correction })
              }
            >
              <option value="none">None</option>
              <option value="holm-bonferroni">
                Holm-Bonferroni (FWER — conservative)
              </option>
              <option value="benjamini-hochberg">
                Benjamini-Hochberg (FDR — less conservative)
              </option>
            </select>
          </div>
          {/* CUPED disabled for v1 — field preserved in schema for future use */}
        </div>
      )}

      {/* Step 5: Review & Launch */}
      {step === 5 && (
        <div>
          <div className="card mb-3">
            <div className="card-body">
              <h5>{form.name}</h5>
              {form.hypothesis && (
                <p className="text-muted">{form.hypothesis}</p>
              )}
              <div className="row">
                <div className="col-md-6">
                  <strong>Variations:</strong>
                  <ul className="mb-0">
                    {form.variations.map((v) => (
                      <li key={v.id}>
                        {v.name} ({Math.round(v.weight * 100)}%)
                        {v.isControl && (
                          <span className="badge bg-secondary ms-1">
                            control
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-md-6">
                  <strong>Metrics:</strong>
                  <ul className="mb-0">
                    {form.primaryMetricIds.map((id) => {
                      const m = metrics.find((m) => m.id === id);
                      return <li key={id}>{m?.name ?? id}</li>;
                    })}
                  </ul>
                  {form.guardrailMetricIds.length > 0 && (
                    <>
                      <strong>Guardrails:</strong>
                      <ul className="mb-0">
                        {form.guardrailMetricIds.map((id) => {
                          const m = metrics.find((m) => m.id === id);
                          return <li key={id}>{m?.name ?? id}</li>;
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className="badge bg-light text-dark border me-1">
                  {form.statsEngine}
                </span>
                <span className="badge bg-light text-dark border me-1">
                  {form.correction === 'none' ? 'no correction' : form.correction}
                </span>
                {form.cuped && (
                  <span className="badge bg-info text-dark me-1">CUPED</span>
                )}
              </div>
            </div>
          </div>

          <PowerCalculator
            defaultSplitRatio={
              form.variations.find((v) => !v.isControl)?.weight ??
              0.5 /
                (form.variations.find((v) => v.isControl)?.weight ?? 0.5)
            }
          />
        </div>
      )}

      {/* Navigation */}
      <div className="d-flex justify-content-between mt-4">
        <button
          className="btn btn-outline-secondary"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          Back
        </button>
        <div className="d-flex gap-2">
          {step < 5 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
            </button>
          ) : (
            <>
              <button
                className="btn btn-outline-secondary"
                onClick={() => handleSave('draft')}
              >
                Save as Draft
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSave('running')}
              >
                Launch
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
