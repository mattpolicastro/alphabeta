import { createAnnotation, getAnnotations } from '../index';
import { resetDb } from './helpers';

afterEach(async () => {
  await resetDb();
});

describe('createAnnotation', () => {
  it('creates an annotation scoped to an experiment', async () => {
    const annotation = await createAnnotation({
      experimentId: 'exp-1',
      body: 'Something notable happened.',
    });

    expect(annotation.id).toBeDefined();
    expect(annotation.experimentId).toBe('exp-1');
    expect(annotation.body).toBe('Something notable happened.');
    expect(annotation.createdAt).toBeDefined();
    expect(annotation.updatedAt).toBeDefined();
  });

  it('creates an annotation scoped to a result and metric', async () => {
    const annotation = await createAnnotation({
      experimentId: 'exp-2',
      resultId: 'result-abc',
      metricId: 'metric-xyz',
      body: 'Metric spike on this result.',
    });

    expect(annotation.experimentId).toBe('exp-2');
    expect(annotation.resultId).toBe('result-abc');
    expect(annotation.metricId).toBe('metric-xyz');
  });
});

describe('getAnnotations', () => {
  it('retrieves annotations filtered by experimentId', async () => {
    await createAnnotation({ experimentId: 'exp-a', body: 'Note for A' });
    await createAnnotation({ experimentId: 'exp-b', body: 'Note for B' });

    const annotationsA = await getAnnotations('exp-a');
    expect(annotationsA.length).toBe(1);
    expect(annotationsA[0].body).toBe('Note for A');
  });

  it('retrieves multiple annotations for same experiment', async () => {
    await createAnnotation({ experimentId: 'exp-c', body: 'First note' });
    await createAnnotation({ experimentId: 'exp-c', body: 'Second note' });

    const annotations = await getAnnotations('exp-c');
    expect(annotations.length).toBe(2);
  });

  it('filters by resultId', async () => {
    await createAnnotation({
      experimentId: 'exp-d',
      resultId: 'result-1',
      body: 'On result 1',
    });
    await createAnnotation({
      experimentId: 'exp-d',
      resultId: 'result-2',
      body: 'On result 2',
    });

    const filtered = await getAnnotations('exp-d', { resultId: 'result-1' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].body).toBe('On result 1');
  });

  it('filters by metricId', async () => {
    await createAnnotation({
      experimentId: 'exp-e',
      metricId: 'metric-a',
      body: 'About metric A',
    });
    await createAnnotation({
      experimentId: 'exp-e',
      metricId: 'metric-b',
      body: 'About metric B',
    });

    const filtered = await getAnnotations('exp-e', { metricId: 'metric-a' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].body).toBe('About metric A');
  });

  it('returns empty array when no annotations exist for experiment', async () => {
    const annotations = await getAnnotations('nonexistent-exp');
    expect(annotations).toEqual([]);
  });
});
