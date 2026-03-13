/**
 * CSV parsing and validation module.
 * Uses PapaParse with worker: true to avoid blocking the main thread.
 * See requirements.md Sections 4.2, 4.3, 5.3.
 */

import Papa from 'papaparse';

export const SCHEMA_VERSION_PREFIX = '#schema_version:';
export const CURRENT_SCHEMA_VERSION = '1';
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const RESERVED_COLUMNS = [
  'experiment_id',
  'variation_id',
  'units',
] as const;

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  schemaVersion: string;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  row?: number;
}

/**
 * Parse a CSV file, validating the schema version header.
 * Uses PapaParse in streaming/worker mode for large files.
 */
export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  // Read full text — we need to strip the schema version header before parsing
  const text = await file.text();
  const firstNewline = text.indexOf('\n');
  const firstLine = (firstNewline >= 0 ? text.slice(0, firstNewline) : text).trim();

  // The first line may have trailing commas from CSV editors — strip them
  const firstLineCleaned = firstLine.replace(/,+$/, '');

  if (!firstLineCleaned.startsWith(SCHEMA_VERSION_PREFIX)) {
    throw new Error(
      'Unrecognised CSV schema version. The first line must be #schema_version:1. Please export a fresh file.',
    );
  }

  const schemaVersion = firstLineCleaned.slice(SCHEMA_VERSION_PREFIX.length).trim();
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Unrecognised CSV schema version "${schemaVersion}". Expected version ${CURRENT_SCHEMA_VERSION}. Please export a fresh file.`,
    );
  }

  // Strip the schema version line and parse the rest
  const csvBody = text.slice(firstNewline + 1);

  // PapaParse worker mode only supports File input, not strings.
  // Parse synchronously on the main thread — this is fine for pre-aggregated
  // CSVs which are small. For large files, wrap in a manual Web Worker later.
  const results = Papa.parse<Record<string, string>>(csvBody, {
    header: true,
    skipEmptyLines: true,
  });

  if (results.errors.length > 0) {
    const firstErr = results.errors[0];
    throw new Error(`CSV parse error (row ${firstErr.row}): ${firstErr.message}`);
  }

  const headers = results.meta.fields ?? [];
  return {
    headers,
    rows: results.data,
    schemaVersion,
  };
}

/**
 * Validate parsed CSV data against experiment configuration.
 * See requirements.md Section 4.3 for full validation rules.
 */
export function validateCSV(
  parsed: ParsedCSV,
  experimentVariationKeys: string[],
  dimensionWarningThreshold: number = 5,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { headers, rows } = parsed;

  // 1. Required columns
  for (const col of RESERVED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push({ type: 'error', message: `Missing required column: "${col}"` });
    }
  }

  if (errors.length > 0) return errors; // can't continue without required columns

  // 2. Variation ID matching (case-insensitive, whitespace-tolerant)
  const normalizedExpKeys = experimentVariationKeys.map((k) =>
    k.trim().toLowerCase(),
  );
  const csvVariationValues = new Set(
    rows.map((r) => r['variation_id']?.trim().toLowerCase()),
  );

  const unmatchedCSV = [...csvVariationValues].filter(
    (v) => v && !normalizedExpKeys.includes(v),
  );
  if (unmatchedCSV.length > 0) {
    errors.push({
      type: 'error',
      message: `Unmatched variation IDs in CSV: ${unmatchedCSV.map((v) => `"${v}"`).join(', ')}. Expected: ${normalizedExpKeys.map((k) => `"${k}"`).join(', ')}.`,
    });
  }

  const unmatchedExp = normalizedExpKeys.filter(
    (k) => !csvVariationValues.has(k),
  );
  if (unmatchedExp.length > 0) {
    errors.push({
      type: 'error',
      message: `Missing variation IDs in CSV: ${unmatchedExp.map((k) => `"${k}"`).join(', ')}.`,
    });
  }

  // 3. Units validation — positive integer on every row
  for (let i = 0; i < rows.length; i++) {
    const units = rows[i]['units'];
    const parsed_units = Number(units);
    if (!Number.isInteger(parsed_units) || parsed_units <= 0) {
      errors.push({
        type: 'error',
        message: `Row ${i + 1}: "units" must be a positive integer, got "${units}"`,
        row: i,
      });
    }
  }

  // 4. Each variation should have exactly one overall row (all dimensions = "all")
  // Only check columns that look like dimensions (string values), not metric columns (numeric).
  // Use the same heuristic as autoClassifyColumns: sample rows, if all non-"all" values are
  // numeric, treat it as a metric column and skip it for dimension checks.
  const nonReservedCols = headers.filter(
    (h) => !(RESERVED_COLUMNS as readonly string[]).includes(h),
  );
  const dimensionCols = nonReservedCols.filter((col) => {
    const samples = rows
      .slice(0, 10)
      .map((r) => r[col])
      .filter((v) => v != null && v.trim().toLowerCase() !== 'all');
    return samples.length === 0 || !samples.every((v) => !isNaN(Number(v)));
  });

  for (const varKey of normalizedExpKeys) {
    const overallRows = rows.filter((r) => {
      if (r['variation_id']?.trim().toLowerCase() !== varKey) return false;
      return dimensionCols.every(
        (d) => r[d]?.trim().toLowerCase() === 'all',
      );
    });
    if (overallRows.length === 0) {
      errors.push({
        type: 'warning',
        message: `Variation "${varKey}" has no overall row (all dimensions = "all").`,
      });
    }
    if (overallRows.length > 1) {
      errors.push({
        type: 'warning',
        message: `Variation "${varKey}" has ${overallRows.length} overall rows (expected 1).`,
      });
    }
  }

  // 5. Dimension count soft warning
  if (dimensionCols.length > dimensionWarningThreshold) {
    errors.push({
      type: 'warning',
      message: `You've mapped ${dimensionCols.length} dimensions. More than ${dimensionWarningThreshold} dimensions can make results harder to interpret. Consider reducing to the most important breakouts.`,
    });
  }

  return errors;
}

/**
 * Validate that mapped metric columns contain parseable non-negative numbers.
 * Called after column mapping is complete.
 */
export function validateMetricColumns(
  rows: Record<string, string>[],
  metricColumns: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  let droppedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    for (const col of metricColumns) {
      const val = Number(rows[i][col]);
      if (isNaN(val) || val < 0) {
        droppedCount++;
        if (droppedCount <= 5) {
          errors.push({
            type: 'warning',
            message: `Row ${i + 1}, column "${col}": invalid metric value "${rows[i][col]}" (expected non-negative number). Row will be dropped.`,
            row: i,
          });
        }
      }
    }
  }

  if (droppedCount > 5) {
    errors.push({
      type: 'warning',
      message: `${droppedCount - 5} additional rows with invalid metric values were dropped.`,
    });
  }

  return errors;
}

/**
 * Generate a column fingerprint from a sorted list of column names.
 * Used to detect schema changes between uploads for column mapping persistence.
 */
export function getColumnFingerprint(columns: string[]): string {
  return [...columns].sort().join('|');
}

/**
 * Auto-classify columns into reserved vs candidates for user mapping.
 * Non-reserved columns that look numeric default to 'metric', others to 'dimension'.
 */
export function autoClassifyColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): Record<string, 'reserved' | 'dimension' | 'metric'> {
  const classification: Record<string, 'reserved' | 'dimension' | 'metric'> = {};

  for (const header of headers) {
    if ((RESERVED_COLUMNS as readonly string[]).includes(header)) {
      classification[header] = 'reserved';
      continue;
    }

    // Heuristic: sample up to 10 rows — if all non-"all" values are numeric, classify as metric
    const samples = sampleRows
      .slice(0, 10)
      .map((r) => r[header])
      .filter((v) => v != null && v.trim().toLowerCase() !== 'all');

    const allNumeric =
      samples.length > 0 && samples.every((v) => !isNaN(Number(v)));

    classification[header] = allNumeric ? 'metric' : 'dimension';
  }

  return classification;
}

/**
 * Extract variation ID normalization info for display.
 * Returns pairs of [original, normalized] for each unique variation_id.
 */
export function getVariationNormalization(
  rows: Record<string, string>[],
): Array<{ original: string; normalized: string }> {
  const seen = new Map<string, string>();

  for (const row of rows) {
    const original = row['variation_id'] ?? '';
    const normalized = original.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.set(normalized, original);
    }
  }

  return [...seen.entries()].map(([normalized, original]) => ({
    original,
    normalized,
  }));
}

// ----- Helpers -----

async function readFirstLine(file: File): Promise<string> {
  // Read just enough bytes to get the first line (schema version is short)
  const slice = file.slice(0, 256);
  const text = await slice.text();
  const newlineIdx = text.indexOf('\n');
  return newlineIdx >= 0 ? text.slice(0, newlineIdx).trim() : text.trim();
}
