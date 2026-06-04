/**
 * Welford's online algorithm for running mean and variance.
 *
 * This module is the testable reference implementation. The same logic is
 * duplicated (verbatim) in `apps/web/public/csv-worker.js`, which runs as a
 * plain Web Worker without a bundler and therefore cannot import this file.
 * If you change the algorithm here, update the worker to match.
 */

export interface WelfordAcc {
  n: number;
  mean: number;
  m2: number;
}

export type AccByMetric = Record<string, WelfordAcc>;
export type VariationAccumulators = Record<string, AccByMetric>;

export interface FinalizedStats {
  mean: number;
  variance: number;
  n: number;
}

export type FinalizedVariations = Record<
  string,
  Record<string, FinalizedStats>
>;

/**
 * Update an accumulator in-place with a new observation for `metricName`.
 * Uses Welford's numerically stable recurrence:
 *   delta  = x - mean_{n-1}
 *   mean_n = mean_{n-1} + delta / n
 *   m2_n   = m2_{n-1} + delta * (x - mean_n)
 */
export function welfordUpdate(
  accByMetric: AccByMetric,
  metricName: string,
  val: number,
): void {
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

/**
 * Convert running accumulators into finalized stats with Bessel-corrected
 * (sample) variance `m2 / (n - 1)`. A single-value accumulator yields
 * variance 0.
 */
export function finalizeAccumulators(
  variationAccumulators: VariationAccumulators,
): FinalizedVariations {
  const result: FinalizedVariations = {};
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
