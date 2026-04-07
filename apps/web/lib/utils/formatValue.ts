/**
 * Shared formatting helpers for metric values displayed in the results UI.
 *
 * `formatValue` renders a raw metric value as a string appropriate for its
 * metric type:
 *
 *   - 'revenue'              → currency, 2 decimal places (e.g. 24.5 → "$24.50")
 *   - 'continuous'           → fixed decimal, 2 places (e.g. 3.14159 → "3.14")
 *   - 'binomial' / default   → percentage, 2 decimal places (e.g. 0.0532 → "5.32%")
 *   - 'count'                → per-user mean displayed as rate (historic behaviour)
 *
 * Missing or non-finite values render as an em dash. Infinite values render
 * as "∞" / "−∞".
 */

export type MetricType = 'binomial' | 'count' | 'revenue' | 'continuous';

export interface FormatValueOptions {
  /** Currency symbol prefix for 'revenue' metrics. Defaults to '$'. */
  currencySymbol?: string;
}

const EM_DASH = '—';

export function formatValue(
  value: number | null | undefined,
  metricType?: string,
  options: FormatValueOptions | string = {},
): string {
  // Back-compat: historic signature passed currencySymbol as a string arg.
  const opts: FormatValueOptions =
    typeof options === 'string' ? { currencySymbol: options } : options;
  const currencySymbol = opts.currencySymbol ?? '$';

  if (value == null || Number.isNaN(value)) return EM_DASH;
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';

  switch (metricType) {
    case 'revenue':
      return formatRevenue(value, currencySymbol);
    case 'continuous':
      return value.toFixed(2);
    default:
      // 'binomial', 'count', and anything unspecified → rate display.
      return formatRate(value);
  }
}

/** Format a proportion (0–1) as a percentage with two decimals. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatRevenue(value: number, currencySymbol: string): string {
  const magnitude = Math.abs(value).toFixed(2);
  // Add thousands separators to the integer portion.
  const [intPart, decPart] = magnitude.split('.');
  const withSep = Number(intPart).toLocaleString();
  const body = `${withSep}.${decPart}`;
  return value < 0 ? `−${currencySymbol}${body}` : `${currencySymbol}${body}`;
}
