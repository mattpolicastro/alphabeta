/**
 * Tests for autoClassifyColumns: reserved, metric (numeric), and dimension (string).
 */

import { autoClassifyColumns, RESERVED_COLUMNS_AGG } from '../parser';

describe('autoClassifyColumns — reserved columns', () => {
  it('classifies experiment_id, variation_id, and units as reserved', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'revenue'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', revenue: '500' },
    ];
    const classification = autoClassifyColumns(headers, rows);

    for (const col of RESERVED_COLUMNS_AGG) {
      expect(classification[col]).toBe('reserved');
    }
  });
});

describe('autoClassifyColumns — metric classification (numeric columns)', () => {
  it('classifies numeric-valued columns as metric', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'revenue', 'clicks'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', revenue: '500', clicks: '42' },
      { experiment_id: 'exp1', variation_id: 'variant_a', units: '950', revenue: '480', clicks: '38' },
    ];
    const classification = autoClassifyColumns(headers, rows);
    expect(classification['revenue']).toBe('metric');
    expect(classification['clicks']).toBe('metric');
  });

  it('classifies a column with all-zero numeric values as metric', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'conversions'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', conversions: '0' },
      { experiment_id: 'exp1', variation_id: 'variant_a', units: '900', conversions: '0' },
    ];
    const classification = autoClassifyColumns(headers, rows);
    expect(classification['conversions']).toBe('metric');
  });

  it('treats "all" sentinel values as non-numeric samples (skipped)', () => {
    // A column that has "all" for dimension slices should only sample real values
    const headers = ['experiment_id', 'variation_id', 'units', 'revenue', 'country'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', revenue: 'all', country: 'all' },
      { experiment_id: 'exp1', variation_id: 'control', units: '500', revenue: '250', country: 'US' },
    ];
    const classification = autoClassifyColumns(headers, rows);
    // revenue has one "all" (skipped) and one "250" (numeric) — should be metric
    expect(classification['revenue']).toBe('metric');
    // country has one "all" (skipped) and one "US" (non-numeric) — should be dimension
    expect(classification['country']).toBe('dimension');
  });
});

describe('autoClassifyColumns — dimension classification (string columns)', () => {
  it('classifies string-valued columns as dimension', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'country', 'device'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', country: 'US', device: 'mobile' },
      { experiment_id: 'exp1', variation_id: 'variant_a', units: '900', country: 'UK', device: 'desktop' },
    ];
    const classification = autoClassifyColumns(headers, rows);
    expect(classification['country']).toBe('dimension');
    expect(classification['device']).toBe('dimension');
  });

  it('classifies a mixed-type column (some numeric, some string) as dimension', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'mixed_col'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', mixed_col: '100' },
      { experiment_id: 'exp1', variation_id: 'variant_a', units: '900', mixed_col: 'n/a' },
    ];
    const classification = autoClassifyColumns(headers, rows);
    expect(classification['mixed_col']).toBe('dimension');
  });

  it('classifies an empty-sample column (all values are null/undefined) as dimension', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'empty_col'];
    // No rows to sample from
    const rows: Record<string, string>[] = [];
    const classification = autoClassifyColumns(headers, rows);
    // samples.length === 0 → not allNumeric → dimension
    expect(classification['empty_col']).toBe('dimension');
  });
});

describe('autoClassifyColumns — complete output', () => {
  it('classifies all columns in a typical CSV', () => {
    const headers = ['experiment_id', 'variation_id', 'units', 'purchases', 'country'];
    const rows = [
      { experiment_id: 'exp1', variation_id: 'control', units: '1000', purchases: '100', country: 'US' },
    ];
    const classification = autoClassifyColumns(headers, rows);
    expect(classification).toEqual({
      experiment_id: 'reserved',
      variation_id: 'reserved',
      units: 'reserved',
      purchases: 'metric',
      country: 'dimension',
    });
  });
});
