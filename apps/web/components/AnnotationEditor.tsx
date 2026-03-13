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

// import ReactMarkdown from 'react-markdown';

const MAX_ANNOTATION_LENGTH = 2000;

interface AnnotationEditorProps {
  experimentId: string;
  resultId?: string;
  metricId?: string;
  existingBody?: string;
  onSave: (body: string) => void;
  onCancel: () => void;
}

export function AnnotationEditor({
  experimentId,
  resultId,
  metricId,
  existingBody,
  onSave,
  onCancel,
}: AnnotationEditorProps) {
  // TODO: textarea with character counter (max 2000)
  // TODO: preview tab rendering Markdown via react-markdown
  // TODO: save creates or updates annotation in IndexedDB
  // TODO: annotations are append-only (no deletion) per Section 5.8
  // TODO: "hide" toggle to suppress from default view

  void experimentId;
  void resultId;
  void metricId;
  void existingBody;
  void onSave;
  void onCancel;

  return (
    <div>
      {/* TODO: edit/preview tabs */}
      {/* TODO: textarea */}
      {/* TODO: character counter */}
      {/* TODO: save/cancel buttons */}
      <p className="text-muted">AnnotationEditor component stub</p>
    </div>
  );
}
