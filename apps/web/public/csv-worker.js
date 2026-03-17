/**
 * CSV Worker — parses row-level CSV data and aggregates per-variation,
 * per-metric statistics: n, mean, variance (Bessel-corrected).
 * Also aggregates per-dimension-slice when dimension columns are present.
 *
 * Input message: { csvText: string }
 *   csvText is the CSV body (schema line already stripped).
 *
 * Output message: {
 *   type: 'result',
 *   headers: string[],
 *   previewRows: Record<string, string>[],
 *   totalRows: number,
 *   aggregates: Record<string, Record<string, { mean, variance, n }>>
 *     // variation_id → metric_column → stats (overall)
 *   sliceAggregates: Record<string, Record<string, Record<string, Record<string, { mean, variance, n }>>>>
 *     // dimension_name → dimension_value → variation_id → metric_column → stats
 *   columnClassification: Record<string, 'metric' | 'dimension'>
 *     // non-reserved column → auto-detected type
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

  // Non-reserved columns — we'll classify these after a sampling pass
  const nonReservedCols = [];
  for (let i = 0; i < headers.length; i++) {
    if (!reservedIndices.has(i)) {
      nonReservedCols.push({ index: i, name: headers[i] });
    }
  }

  // ---------- Classification pass: sample up to 20 rows ----------
  const sampleLimit = Math.min(20, lines.length - 1);
  // Track non-empty, non-"all" values per column
  const sampleValues = {};
  for (const col of nonReservedCols) {
    sampleValues[col.name] = [];
  }

  for (let lineIdx = 1; lineIdx <= sampleLimit && lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;
    const fields = line.split(',');
    for (const col of nonReservedCols) {
      const val = (fields[col.index] || '').trim();
      if (val && val.toLowerCase() !== 'all') {
        sampleValues[col.name].push(val);
      }
    }
  }

  // Classify: if all sampled values are numeric → metric, otherwise → dimension
  const columnClassification = {};
  const metricCols = [];
  const dimensionCols = [];
  for (const col of nonReservedCols) {
    const samples = sampleValues[col.name];
    const allNumeric = samples.length > 0 && samples.every((v) => !isNaN(Number(v)));
    if (allNumeric) {
      columnClassification[col.name] = 'metric';
      metricCols.push(col);
    } else {
      columnClassification[col.name] = 'dimension';
      dimensionCols.push(col);
    }
  }

  // ---------- Main aggregation pass ----------
  // Overall: variation_id → metric_name → Welford accumulator
  const overallAcc = {};
  // Slices: dimension_name → dimension_value → variation_id → metric_name → Welford accumulator
  const sliceAcc = {};
  for (const dim of dimensionCols) {
    sliceAcc[dim.name] = {};
  }

  const previewRows = [];
  let totalRows = 0;

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;

    const fields = line.split(',');
    totalRows++;

    // Collect preview rows (first 5)
    if (previewRows.length < 5) {
      const row = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = fields[i] || '';
      }
      previewRows.push(row);
    }

    const varId = (fields[varIdx] || '').trim().toLowerCase();
    if (!varId) continue;

    // Overall accumulation
    if (!overallAcc[varId]) overallAcc[varId] = {};
    for (const { index, name } of metricCols) {
      const val = Number(fields[index]);
      if (isNaN(val)) continue;
      welfordUpdate(overallAcc[varId], name, val);
    }

    // Per-dimension-slice accumulation
    for (const dim of dimensionCols) {
      const dimVal = (fields[dim.index] || '').trim().toLowerCase();
      if (!dimVal || dimVal === 'all') continue;

      if (!sliceAcc[dim.name][dimVal]) sliceAcc[dim.name][dimVal] = {};
      if (!sliceAcc[dim.name][dimVal][varId]) sliceAcc[dim.name][dimVal][varId] = {};

      for (const { index, name } of metricCols) {
        const val = Number(fields[index]);
        if (isNaN(val)) continue;
        welfordUpdate(sliceAcc[dim.name][dimVal][varId], name, val);
      }
    }
  }

  // ---------- Finalize ----------
  const aggregates = finalizeAccumulators(overallAcc);

  const sliceAggregates = {};
  for (const [dimName, dimValues] of Object.entries(sliceAcc)) {
    if (Object.keys(dimValues).length === 0) continue;
    sliceAggregates[dimName] = {};
    for (const [dimVal, variations] of Object.entries(dimValues)) {
      sliceAggregates[dimName][dimVal] = finalizeAccumulators(variations);
    }
  }

  return { headers, previewRows, totalRows, aggregates, sliceAggregates, columnClassification };
}

function welfordUpdate(accByMetric, metricName, val) {
  if (!accByMetric[metricName]) {
    accByMetric[metricName] = { n: 0, mean: 0, m2: 0 };
  }
  const acc = accByMetric[metricName];
  acc.n++;
  const delta = val - acc.mean;
  acc.mean += delta / acc.n;
  const delta2 = val - acc.mean;
  acc.m2 += delta * delta2;
}

function finalizeAccumulators(variationAccumulators) {
  const result = {};
  for (const [varId, metrics] of Object.entries(variationAccumulators)) {
    result[varId] = {};
    for (const [metricName, acc] of Object.entries(metrics)) {
      result[varId][metricName] = {
        mean: acc.mean,
        variance: acc.n > 1 ? acc.m2 / (acc.n - 1) : 0,
        n: acc.n,
      };
    }
  }
  return result;
}
