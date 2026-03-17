/**
 * Tests for CSV validation: variation ID matching, normalization, dimension
 * count warnings, and units validation.
 */

import { validateCSV } from '../parser';
import type { ParsedCSV } from '../parser';

function makeParsed(
  headers: string[],
  rows: Record<string, string>[],
): ParsedCSV {
  return { headers, rows, schema: 'agg-v1' };
}

// ---------------------------------------------------------------------------
// Unmatched variation IDs
// ---------------------------------------------------------------------------
describe('validateCSV — variation ID matching', () => {
  it('returns an error when the CSV contains a variation ID not in the experiment', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '1000' },
        { experiment_id: 'exp1', variation_id: 'unknown_variant', units: '900' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    const errorMessages = errors.map((e) => e.message);
    expect(errors.some((e) => e.type === 'error' && /unmatched/i.test(e.message))).toBe(true);
    expect(errorMessages.join(' ')).toMatch(/unknown_variant/);
  });

  it('returns an error when a variation from the experiment is absent from the CSV', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [{ experiment_id: 'exp1', variation_id: 'control', units: '1000' }],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'error' && /missing/i.test(e.message))).toBe(true);
  });

  it('returns no variation-matching errors when all variation IDs match', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '1000' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '900' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    const matchingErrors = errors.filter(
      (e) => e.type === 'error' && /(unmatched|missing variation)/i.test(e.message),
    );
    expect(matchingErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Whitespace / case normalization
// ---------------------------------------------------------------------------
describe('validateCSV — variation ID normalization', () => {
  it('accepts " Control " (padded, mixed case) matching experiment key "control"', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: ' Control ', units: '1000' },
        { experiment_id: 'exp1', variation_id: '  Variant_A  ', units: '900' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    const matchingErrors = errors.filter(
      (e) => e.type === 'error' && /(unmatched|missing)/i.test(e.message),
    );
    expect(matchingErrors).toHaveLength(0);
  });

  it('accepts mixed-case experiment keys matching lower-case CSV values', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '500' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '500' },
      ],
    );
    // Experiment keys are stored in mixed case
    const errors = validateCSV(parsed, ['Control', 'Variant_A']);
    const matchingErrors = errors.filter(
      (e) => e.type === 'error' && /(unmatched|missing variation)/i.test(e.message),
    );
    expect(matchingErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Dimension count warning
// ---------------------------------------------------------------------------
describe('validateCSV — dimension count warning', () => {
  it('produces a warning when dimension columns exceed the threshold', () => {
    // Build 6 dimension columns (all string values so they classify as dimensions)
    const dimCols = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
    const headers = ['experiment_id', 'variation_id', 'units', ...dimCols];
    const makeRow = (varId: string) => {
      const base: Record<string, string> = {
        experiment_id: 'exp1',
        variation_id: varId,
        units: '1000',
      };
      for (const d of dimCols) base[d] = 'all';
      return base;
    };
    const rows = [makeRow('control'), makeRow('variant_a')];
    const parsed = makeParsed(headers, rows);

    // Default threshold is 5; 6 dimensions should trigger a warning
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'warning' && /dimensions/i.test(e.message))).toBe(true);
  });

  it('does not warn when dimension count is at or below the threshold', () => {
    const dimCols = ['d1', 'd2', 'd3'];
    const headers = ['experiment_id', 'variation_id', 'units', ...dimCols];
    const makeRow = (varId: string) => {
      const base: Record<string, string> = {
        experiment_id: 'exp1',
        variation_id: varId,
        units: '1000',
      };
      for (const d of dimCols) base[d] = 'all';
      return base;
    };
    const parsed = makeParsed(headers, [makeRow('control'), makeRow('variant_a')]);
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'warning' && /dimensions/i.test(e.message))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Units validation
// ---------------------------------------------------------------------------
describe('validateCSV — units validation', () => {
  it('flags a row with non-positive units (zero)', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '0' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '1000' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'error' && /units/i.test(e.message) && /row 1/i.test(e.message))).toBe(true);
  });

  it('flags a row with negative units', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '-5' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '1000' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'error' && /units/i.test(e.message))).toBe(true);
  });

  it('flags a row with non-integer units', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '1000.5' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '1000' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'error' && /units/i.test(e.message))).toBe(true);
  });

  it('does not flag rows with valid positive integer units', () => {
    const parsed = makeParsed(
      ['experiment_id', 'variation_id', 'units'],
      [
        { experiment_id: 'exp1', variation_id: 'control', units: '1000' },
        { experiment_id: 'exp1', variation_id: 'variant_a', units: '950' },
      ],
    );
    const errors = validateCSV(parsed, ['control', 'variant_a']);
    expect(errors.some((e) => e.type === 'error' && /units/i.test(e.message))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Missing required columns
// ---------------------------------------------------------------------------
describe('validateCSV — required columns', () => {
  it('returns errors for all missing required columns', () => {
    const parsed = makeParsed(
      ['purchases'], // none of the required columns present
      [{ purchases: '100' }],
    );
    const errors = validateCSV(parsed, ['control']);
    const missingMessages = errors.filter(
      (e) => e.type === 'error' && /missing required column/i.test(e.message),
    );
    expect(missingMessages.length).toBe(3); // experiment_id, variation_id, units
  });

  it('stops further validation after reporting missing required columns', () => {
    const parsed = makeParsed(['purchases'], [{ purchases: '100' }]);
    const errors = validateCSV(parsed, ['control']);
    // Should only contain the missing-column errors, not variation-matching errors
    expect(errors.every((e) => /missing required column/i.test(e.message))).toBe(true);
  });
});
