/**
 * CSV Worker — parses schema v2 (row-level) CSV data and aggregates
 * per-variation, per-metric statistics: n, mean, variance (Bessel-corrected).
 *
 * Input message: { csvText: string }
 *   csvText is the CSV body (schema version line already stripped).
 *
 * Output message: {
 *   type: 'result',
 *   headers: string[],
 *   previewRows: Record<string, string>[],
 *   totalRows: number,
 *   aggregates: Record<string, Record<string, { mean: number, variance: number, n: number }>>
 *     // variation_id → metric_column → stats
 * }
 *
 * Or: { type: 'error', message: string }
 */

// eslint-disable-next-line no-restricted-globals
self.onmessage = function (e) {
  try {
    const { csvText } = e.data;
    const result = parseAndAggregate(csvText);
    self.postMessage({ type: 'result', ...result });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};

function parseAndAggregate(csvText) {
  const lines = csvText.split('\n');

  // Parse header
  const headerLine = lines[0];
  if (!headerLine) throw new Error('CSV is empty (no header row).');
  const headers = headerLine.split(',').map((h) => h.trim());

  // Identify required column indices
  const expIdx = headers.indexOf('experiment_id');
  const varIdx = headers.indexOf('variation_id');
  const userIdx = headers.indexOf('user_id');
  if (expIdx === -1) throw new Error('Missing required column: "experiment_id"');
  if (varIdx === -1) throw new Error('Missing required column: "variation_id"');
  if (userIdx === -1) throw new Error('Missing required column: "user_id"');

  const reservedIndices = new Set([expIdx, varIdx, userIdx]);

  // Metric columns = everything that's not reserved
  const metricCols = [];
  for (let i = 0; i < headers.length; i++) {
    if (!reservedIndices.has(i)) {
      metricCols.push({ index: i, name: headers[i] });
    }
  }

  // Two-pass online aggregation (Welford's algorithm for numerical stability)
  // variation_id → metric_name → { n, mean, m2 }
  const accumulators = {};
  const previewRows = [];
  let totalRows = 0;

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;

    const fields = line.split(',');
    totalRows++;

    // Collect preview rows (first 5, as full parsed objects)
    if (previewRows.length < 5) {
      const row = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = fields[i] || '';
      }
      previewRows.push(row);
    }

    const varId = (fields[varIdx] || '').trim().toLowerCase();
    if (!varId) continue;

    if (!accumulators[varId]) accumulators[varId] = {};

    for (const { index, name } of metricCols) {
      const rawVal = fields[index];
      const val = Number(rawVal);
      if (isNaN(val)) continue; // skip unparseable

      if (!accumulators[varId][name]) {
        accumulators[varId][name] = { n: 0, mean: 0, m2: 0 };
      }

      const acc = accumulators[varId][name];
      acc.n++;
      const delta = val - acc.mean;
      acc.mean += delta / acc.n;
      const delta2 = val - acc.mean;
      acc.m2 += delta * delta2;
    }
  }

  // Convert accumulators to final aggregates with Bessel-corrected variance
  const aggregates = {};
  for (const [varId, metrics] of Object.entries(accumulators)) {
    aggregates[varId] = {};
    for (const [metricName, acc] of Object.entries(metrics)) {
      aggregates[varId][metricName] = {
        mean: acc.mean,
        variance: acc.n > 1 ? acc.m2 / (acc.n - 1) : 0,
        n: acc.n,
      };
    }
  }

  return { headers, previewRows, totalRows, aggregates };
}
