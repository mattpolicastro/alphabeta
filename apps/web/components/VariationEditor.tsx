'use client';

/**
 * Variation list editor — add, remove, rename, set weights and control.
 * Shared between experiment creation wizard and experiment config panel.
 */

import { nanoid } from 'nanoid';
import type { Variation } from '@/lib/db/schema';

const MAX_VARIATIONS = 5;
const MIN_VARIATIONS = 2;

export interface VariationEditorProps {
  variations: Variation[];
  onChange: (variations: Variation[]) => void;
}

export function VariationEditor({ variations, onChange }: VariationEditorProps) {
  const totalWeight = variations.reduce((s, v) => s + v.weight, 0);
  const weightPct = Math.round(totalWeight * 100);
  const weightsValid = Math.abs(totalWeight - 1) < 0.001;
  const hasZeroWeight = variations.some((v) => v.weight <= 0);

  function update(id: string, patch: Partial<Variation>) {
    onChange(variations.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function add() {
    if (variations.length >= MAX_VARIATIONS) return;
    const idx = variations.length;
    onChange([
      ...variations,
      {
        id: nanoid(),
        name: `Variant ${String.fromCharCode(64 + idx)}`,
        key: `variant_${String.fromCharCode(96 + idx)}`,
        weight: 0,
        isControl: false,
      },
    ]);
  }

  function remove(id: string) {
    if (variations.length <= MIN_VARIATIONS) return;
    onChange(variations.filter((v) => v.id !== id));
  }

  function setControl(id: string) {
    onChange(variations.map((v) => ({ ...v, isControl: v.id === id })));
  }

  function reallocate() {
    const count = variations.length;
    const base = Math.floor((1 / count) * 100) / 100;
    const first = Math.round((1 - base * (count - 1)) * 100) / 100;
    onChange(variations.map((v, i) => ({ ...v, weight: i === 0 ? first : base })));
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span>
          Weight total:{' '}
          <strong className={weightsValid ? 'text-success' : 'text-danger'}>
            {weightPct}%
          </strong>
          {!weightsValid && (
            <span className="text-danger ms-2">
              ({weightPct < 100 ? `${100 - weightPct}% remaining` : 'exceeds 100%'})
            </span>
          )}
        </span>
        <div className="d-flex gap-2">
          {(!weightsValid || hasZeroWeight) && (
            <button className="btn btn-sm btn-outline-warning" onClick={reallocate}>
              Distribute evenly
            </button>
          )}
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={add}
            disabled={variations.length >= MAX_VARIATIONS}
          >
            Add Variation
          </button>
        </div>
      </div>

      {!weightsValid && (
        <div className="alert alert-warning py-2 small">
          Variation weights must sum to exactly 100%. Currently {weightPct}%.
        </div>
      )}
      {hasZeroWeight && weightsValid && (
        <div className="alert alert-warning py-2 small">
          Every variation must have an allocation greater than 0%.
        </div>
      )}

      {variations.map((v) => (
        <div key={v.id} className="row g-2 align-items-center mb-2">
          <div className="col-md-3">
            <input
              className="form-control form-control-sm"
              value={v.name}
              onChange={(e) => update(v.id, { name: e.target.value })}
              placeholder="Name"
            />
          </div>
          <div className="col-md-3">
            <input
              className="form-control form-control-sm"
              value={v.key}
              onChange={(e) => update(v.id, { key: e.target.value })}
              placeholder="Key"
            />
          </div>
          <div className="col-md-2">
            <div className="input-group input-group-sm">
              <input
                type="number"
                className={`form-control ${!weightsValid || v.weight <= 0 ? 'is-invalid' : ''}`}
                value={Math.round(v.weight * 100)}
                onChange={(e) => update(v.id, { weight: Number(e.target.value) / 100 })}
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
              onClick={() => remove(v.id)}
              disabled={variations.length <= MIN_VARIATIONS}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Check if variations are valid (at least 2, has control, weights sum to 1, none zero). */
export function variationsValid(variations: Variation[]): boolean {
  return (
    variations.length >= MIN_VARIATIONS &&
    variations.some((v) => v.isControl) &&
    variations.every((v) => v.weight > 0) &&
    Math.abs(variations.reduce((s, v) => s + v.weight, 0) - 1) < 0.001
  );
}
