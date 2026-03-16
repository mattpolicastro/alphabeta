'use client';

/**
 * Inline annotation editor with Markdown support.
 * See requirements.md Section 5.8.
 *
 * Supports three scopes:
 * - Experiment-level: general notes
 * - Result-level: notes tied to a specific analysis run
 * - Metric-level: notes on a specific metric within a result
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const MAX_ANNOTATION_LENGTH = 2000;

interface AnnotationEditorProps {
  experimentId: string;
  resultId?: string;
  metricId?: string;
  existingBody?: string;
  onSave: (body: string) => void;
  onCancel: () => void;
  onHide?: () => void;
}

export function AnnotationEditor({
  existingBody,
  onSave,
  onCancel,
  onHide,
}: AnnotationEditorProps) {
  const [body, setBody] = useState(existingBody ?? '');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const charCount = body.length;
  const overLimit = charCount > MAX_ANNOTATION_LENGTH;
  const canSave = body.trim().length > 0 && !overLimit;

  return (
    <div className="card">
      <div className="card-body">
        {/* Edit / Preview tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => setActiveTab('edit')}
            >
              Edit
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </li>
        </ul>

        {activeTab === 'edit' ? (
          <>
            <textarea
              className={`form-control ${overLimit ? 'is-invalid' : ''}`}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a note… Markdown is supported."
              maxLength={MAX_ANNOTATION_LENGTH + 500} // allow typing past limit for UX but show warning
            />
            <div className="d-flex justify-content-end mt-1">
              <small className={overLimit ? 'text-danger fw-bold' : 'text-muted'}>
                {charCount} / {MAX_ANNOTATION_LENGTH}
              </small>
            </div>
            {overLimit && (
              <div className="text-danger small">
                Annotation exceeds the {MAX_ANNOTATION_LENGTH} character limit.
              </div>
            )}
          </>
        ) : (
          <div className="border rounded p-3" style={{ minHeight: '6rem' }}>
            {body.trim() ? (
              <ReactMarkdown>{body}</ReactMarkdown>
            ) : (
              <p className="text-muted mb-0">Nothing to preview.</p>
            )}
          </div>
        )}

        {/* Save / Cancel buttons */}
        <div className="d-flex gap-2 mt-3">
          <button
            className="btn btn-primary btn-sm"
            disabled={!canSave}
            onClick={() => onSave(body)}
          >
            Save
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>

        {/* Hide button */}
        {onHide && (
          <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
            <button className="btn btn-outline-secondary btn-sm" onClick={onHide}>Hide</button>
            <small className="text-muted">Hidden notes are preserved in the audit trail.</small>
          </div>
        )}
      </div>
    </div>
  );
}
