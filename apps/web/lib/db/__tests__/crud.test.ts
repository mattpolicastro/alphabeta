import {
  createExperiment,
  getExperimentById,
  getExperiments,
  updateExperiment,
  cloneExperiment,
} from '../index';
import { resetDb } from './helpers';

afterEach(async () => {
  await resetDb();
});

// Minimal valid experiment payload (omits id, createdAt, updatedAt)
const baseExperiment = {
  name: 'Test Experiment',
  hypothesis: 'This will improve things.',
  description: 'A test experiment.',
  status: 'draft' as const,
  variations: [
    { id: 'v1', name: 'Control', key: 'control', weight: 0.5, isControl: true },
    { id: 'v2', name: 'Treatment', key: 'treatment', weight: 0.5, isControl: false },
  ],
  primaryMetricIds: [],
  guardrailMetricIds: [],
  activationMetricId: undefined,
  statsEngine: 'bayesian' as const,
  multipleComparisonCorrection: 'none' as const,
  cuped: false,
  tags: [],
};

describe('createExperiment', () => {
  it('returns an experiment with an id', async () => {
    const exp = await createExperiment(baseExperiment);
    expect(exp.id).toBeDefined();
    expect(typeof exp.id).toBe('string');
    expect(exp.id.length).toBeGreaterThan(0);
    expect(exp.name).toBe('Test Experiment');
    expect(exp.createdAt).toBeDefined();
    expect(exp.updatedAt).toBeDefined();
  });
});

describe('getExperimentById', () => {
  it('retrieves experiment by id', async () => {
    const exp = await createExperiment(baseExperiment);
    const found = await getExperimentById(exp.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(exp.id);
    expect(found!.name).toBe('Test Experiment');
  });

  it('returns undefined for missing id', async () => {
    const found = await getExperimentById('nonexistent-id');
    expect(found).toBeUndefined();
  });
});

describe('getExperiments', () => {
  it('returns all experiments when no filter is provided', async () => {
    await createExperiment({ ...baseExperiment, name: 'Exp A', status: 'draft' });
    await createExperiment({ ...baseExperiment, name: 'Exp B', status: 'running' });
    const all = await getExperiments();
    expect(all.length).toBe(2);
  });

  it('filters by status', async () => {
    await createExperiment({ ...baseExperiment, name: 'Draft Exp', status: 'draft' });
    await createExperiment({ ...baseExperiment, name: 'Running Exp', status: 'running' });
    const drafts = await getExperiments({ status: 'draft' });
    expect(drafts.length).toBe(1);
    expect(drafts[0].name).toBe('Draft Exp');
  });

  it('filters by tag', async () => {
    await createExperiment({ ...baseExperiment, name: 'Tagged', tags: ['launch'] });
    await createExperiment({ ...baseExperiment, name: 'Untagged', tags: [] });
    const tagged = await getExperiments({ tag: 'launch' });
    expect(tagged.length).toBe(1);
    expect(tagged[0].name).toBe('Tagged');
  });
});

describe('updateExperiment', () => {
  it('persists changes', async () => {
    const exp = await createExperiment(baseExperiment);
    await updateExperiment(exp.id, { name: 'Updated Name', status: 'running' });
    const updated = await getExperimentById(exp.id);
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.status).toBe('running');
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(exp.updatedAt);
  });
});

describe('cloneExperiment', () => {
  it('creates a new draft copy with a different id', async () => {
    const original = await createExperiment({ ...baseExperiment, status: 'running' });
    const clone = await cloneExperiment(original.id);
    expect(clone.id).not.toBe(original.id);
    expect(clone.name).toBe(`${original.name} (copy)`);
    expect(clone.status).toBe('draft');
  });

  it('throws if experiment does not exist', async () => {
    await expect(cloneExperiment('missing-id')).rejects.toThrow('missing-id');
  });
});

describe('archiveExperiment (via updateExperiment)', () => {
  it('sets status to archived', async () => {
    const exp = await createExperiment({ ...baseExperiment, status: 'stopped' });
    await updateExperiment(exp.id, { status: 'archived' });
    const archived = await getExperimentById(exp.id);
    expect(archived!.status).toBe('archived');
  });
});
