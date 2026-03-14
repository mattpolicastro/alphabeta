import {
  createMetric,
  updateMetric,
  deleteMetric,
  getMetricById,
  createExperiment,
} from '../index';
import { resetDb } from './helpers';

afterEach(async () => {
  await resetDb();
});

const baseMetric = {
  name: 'Conversion Rate',
  description: 'Purchase conversion',
  type: 'binomial' as const,
  normalization: 'raw_total' as const,
  higherIsBetter: true,
  isGuardrail: false,
  tags: [],
};

const baseExperiment = {
  name: 'Exp with Metrics',
  hypothesis: 'Better metrics test.',
  status: 'draft' as const,
  variations: [
    { id: 'v1', name: 'Control', key: 'control', weight: 0.5, isControl: true },
    { id: 'v2', name: 'Treatment', key: 'treatment', weight: 0.5, isControl: false },
  ],
  guardrailMetricIds: [] as string[],
  statsEngine: 'bayesian' as const,
  multipleComparisonCorrection: 'none' as const,
  cuped: false,
  tags: [] as string[],
};

describe('createMetric', () => {
  it('returns a metric with an id', async () => {
    const metric = await createMetric(baseMetric);
    expect(metric.id).toBeDefined();
    expect(typeof metric.id).toBe('string');
    expect(metric.name).toBe('Conversion Rate');
    expect(metric.createdAt).toBeDefined();
  });
});

describe('updateMetric', () => {
  it('persists changes', async () => {
    const metric = await createMetric(baseMetric);
    await updateMetric(metric.id, { name: 'Updated Metric', higherIsBetter: false });
    const updated = await getMetricById(metric.id);
    expect(updated!.name).toBe('Updated Metric');
    expect(updated!.higherIsBetter).toBe(false);
  });
});

describe('deleteMetric', () => {
  it('deletes a metric that is not referenced', async () => {
    const metric = await createMetric(baseMetric);
    await deleteMetric(metric.id);
    const found = await getMetricById(metric.id);
    expect(found).toBeUndefined();
  });

  it('throws when metric is referenced in primaryMetricIds', async () => {
    const metric = await createMetric(baseMetric);
    await createExperiment({
      ...baseExperiment,
      primaryMetricIds: [metric.id],
    });
    await expect(deleteMetric(metric.id)).rejects.toThrow(
      /Cannot delete metric/,
    );
  });

  it('throws when metric is referenced in guardrailMetricIds', async () => {
    const metric = await createMetric(baseMetric);
    await createExperiment({
      ...baseExperiment,
      primaryMetricIds: [],
      guardrailMetricIds: [metric.id],
    });
    await expect(deleteMetric(metric.id)).rejects.toThrow(
      /Cannot delete metric/,
    );
  });

  it('throws when metric is referenced as activationMetricId', async () => {
    const metric = await createMetric(baseMetric);
    await createExperiment({
      ...baseExperiment,
      primaryMetricIds: [],
      activationMetricId: metric.id,
    });
    await expect(deleteMetric(metric.id)).rejects.toThrow(
      /Cannot delete metric/,
    );
  });
});
