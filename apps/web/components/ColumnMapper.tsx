'use client';

/**
 * Column mapping UI — user assigns each CSV column as Dimension, Metric, or Ignore.
 * For metric columns, user selects which Metric from the library.
 * See requirements.md Sections 5.3, 4.2 Column Mapping.
 */

import type { Metric } from '@/lib/db/schema';

interface ColumnMapperProps {
  headers: string[];
  previewRows: Record<string, string>[]; // first 5 rows for preview
  availableMetrics: Metric[];
  savedMapping?: Record<string, { role: string; metricId?: string }> | null;
  onMappingComplete: (mapping: Record<string, { role: 'dimension' | 'metric' | 'ignore'; metricId?: string }>) => void;
}

export function ColumnMapper({
  headers,
  previewRows,
  availableMetrics,
  savedMapping,
  onMappingComplete,
}: ColumnMapperProps) {
  // TODO: display first 5 rows in a preview table
  // TODO: for each non-reserved column, render a dropdown: Dimension / Metric / Ignore
  // TODO: for columns set to Metric, render a metric selector (existing from library or "Create new")
  // TODO: if savedMapping provided, pre-fill and show banner: "Using saved column mapping from [date]"
  // TODO: if column set changed from saved mapping, show diff highlighting changes
  // TODO: auto-classify using autoClassifyColumns() as default suggestions
  // TODO: "Create new metric" inline flow for unmapped metric columns

  void headers;
  void previewRows;
  void availableMetrics;
  void savedMapping;
  void onMappingComplete;

  return (
    <div>
      <h3>Column Mapping</h3>
      {/* TODO: saved mapping banner */}
      {/* TODO: column preview table */}
      {/* TODO: per-column role selector */}
      {/* TODO: metric selector for metric columns */}
      <p className="text-muted">ColumnMapper component stub</p>
    </div>
  );
}
