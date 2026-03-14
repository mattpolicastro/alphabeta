import { saveResult, getResultsForExperiment } from '../index';
import { resetDb } from './helpers';
import type { ExperimentResult } from '../schema';

afterEach(async () => {
  await resetDb();
});

function makeResult(
  id: string,
  experimentId: string,
  computedAt: number,
): ExperimentResult {
  return {
    id,
    experimentId,
    computedAt,
    srmPValue: 0.5,
    srmFlagged: false,
    multipleExposureCount: 0,
    multipleExposureFlagged: false,
    perMetricResults: [],
    rawRequest: {
      engine: 'bayesian',
      correction: 'none',
      alpha: 0.05,
      srmThreshold: 0.001,
      variations: [],
      metrics: [],
      data: { overall: {}, slices: {} },
      multipleExposureCount: 0,
    },
    status: 'complete',
  };
}

describe('saveResult', () => {
  it('stores a result linked to an experiment', async () => {
    const result = makeResult('result-1', 'exp-1', Date.now());
    await saveResult(result);
    const found = await getResultsForExperiment('exp-1');
    expect(found.length).toBe(1);
    expect(found[0].id).toBe('result-1');
  });
});

describe('retention limit', () => {
  it('auto-deletes the oldest result when a 4th is added', async () => {
    const now = Date.now();
    // Insert results with ascending timestamps so result-1 is oldest
    await saveResult(makeResult('result-1', 'exp-1', now + 1));
    await saveResult(makeResult('result-2', 'exp-1', now + 2));
    await saveResult(makeResult('result-3', 'exp-1', now + 3));
    await saveResult(makeResult('result-4', 'exp-1', now + 4));

    const results = await getResultsForExperiment('exp-1');
    expect(results.length).toBe(3);
    // The oldest (result-1) should have been deleted
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain('result-1');
    expect(ids).toContain('result-4');
  });
});

describe('getResultsForExperiment', () => {
  it('returns results ordered by computedAt descending', async () => {
    const now = Date.now();
    await saveResult(makeResult('r-early', 'exp-2', now + 1));
    await saveResult(makeResult('r-late', 'exp-2', now + 100));

    const results = await getResultsForExperiment('exp-2');
    expect(results.length).toBe(2);
    // First result should be the most recent
    expect(results[0].id).toBe('r-late');
    expect(results[1].id).toBe('r-early');
  });

  it('returns only results for the given experiment', async () => {
    await saveResult(makeResult('r-a', 'exp-a', Date.now()));
    await saveResult(makeResult('r-b', 'exp-b', Date.now() + 1));

    const resultsA = await getResultsForExperiment('exp-a');
    expect(resultsA.length).toBe(1);
    expect(resultsA[0].id).toBe('r-a');
  });
});
