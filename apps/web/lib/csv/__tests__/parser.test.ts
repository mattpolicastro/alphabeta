/**
 * Tests for CSV parsing: schema validation and required columns.
 */

import { parseCSVFile, RESERVED_COLUMNS_AGG } from '../parser';

function makeFile(content: string): File {
  return new File([content], 'test.csv', { type: 'text/csv' });
}

const VALID_CSV = `#schema:agg-v1
experiment_id,variation_id,units,purchases
exp1,control,1000,100
exp1,variant_a,900,110`;

describe('parseCSVFile — schema', () => {
  it('parses a valid file with #schema:agg-v1 header', async () => {
    const file = makeFile(VALID_CSV);
    const result = await parseCSVFile(file);
    expect(result.schema).toBe('agg-v1');
    expect(result.headers).toEqual(['experiment_id', 'variation_id', 'units', 'purchases']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]['experiment_id']).toBe('exp1');
  });

  it('throws when the schema line is missing', async () => {
    const csv = `experiment_id,variation_id,units,purchases
exp1,control,1000,100`;
    const file = makeFile(csv);
    await expect(parseCSVFile(file)).rejects.toThrow(/schema/);
  });

  it('throws for an unknown schema', async () => {
    const csv = `#schema:unknown-v1
experiment_id,variation_id,units,purchases
exp1,control,1000,100`;
    const file = makeFile(csv);
    await expect(parseCSVFile(file)).rejects.toThrow(/unknown-v1/);
  });

  it('strips trailing commas from the schema line (editor artifacts)', async () => {
    const csv = `#schema:agg-v1,,
experiment_id,variation_id,units,purchases
exp1,control,1000,100`;
    const file = makeFile(csv);
    const result = await parseCSVFile(file);
    expect(result.schema).toBe('agg-v1');
  });
});

describe('parseCSVFile — required columns', () => {
  it('returns the RESERVED_COLUMNS_AGG list containing experiment_id, variation_id, units', () => {
    expect(RESERVED_COLUMNS_AGG).toContain('experiment_id');
    expect(RESERVED_COLUMNS_AGG).toContain('variation_id');
    expect(RESERVED_COLUMNS_AGG).toContain('units');
  });

  it('parses a file that has all required columns', async () => {
    const file = makeFile(VALID_CSV);
    const result = await parseCSVFile(file);
    for (const col of RESERVED_COLUMNS_AGG) {
      expect(result.headers).toContain(col);
    }
  });

  it('parses successfully with only the required columns (no metrics)', async () => {
    const csv = `#schema:agg-v1
experiment_id,variation_id,units
exp1,control,1000`;
    const file = makeFile(csv);
    const result = await parseCSVFile(file);
    expect(result.headers).toEqual(['experiment_id', 'variation_id', 'units']);
    expect(result.rows).toHaveLength(1);
  });

  it('throws on file size exceeding limit', async () => {
    const bigContent = '#schema:agg-v1\n' + 'x,'.repeat(1024 * 1024 * 26);
    const bigFile = new File([bigContent], 'big.csv', { type: 'text/csv' });
    await expect(parseCSVFile(bigFile)).rejects.toThrow(/MB/);
  });
});
