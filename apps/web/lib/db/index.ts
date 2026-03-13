import { nanoid } from 'nanoid';
import { AppDB } from './schema';
import type {
  Experiment,
  Metric,
  ExperimentResult,
  ColumnMapping,
  Annotation,
  AppSettings,
} from './schema';
import { useLoadingStore } from '@/lib/store/loadingStore';

export const db = new AppDB();

export * from './schema';

const MAX_RESULTS_PER_EXPERIMENT = 3;

// ----- Settings -----

const DEFAULT_SETTINGS: AppSettings = {
  id: 'singleton',
  computeEngine: 'wasm',
  lambdaUrl: '',
  srmThreshold: 0.001,
  multipleExposureThreshold: 0.01,
  defaultStatsEngine: 'bayesian',
  defaultAlpha: 0.05,
  defaultPower: 0.80,
  dimensionWarningThreshold: 5,
  backupReminderDays: 30,
  lastExportedAt: null,
};

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('singleton');
  return row ?? { ...DEFAULT_SETTINGS };
}

export async function updateSettings(
  patch: Partial<Omit<AppSettings, 'id'>>,
): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: 'singleton' });
}

// ----- Experiment queries -----

export async function getExperiments(filters?: {
  status?: Experiment['status'];
  tag?: string;
}): Promise<Experiment[]> {
  let collection = db.experiments.orderBy('createdAt');

  if (filters?.status) {
    collection = db.experiments.where('status').equals(filters.status);
  }

  let results = await collection.reverse().toArray();

  if (filters?.tag) {
    results = results.filter((e) => e.tags.includes(filters.tag!));
  }

  return results;
}

export async function getExperimentById(
  id: string,
): Promise<Experiment | undefined> {
  return db.experiments.get(id);
}

export async function createExperiment(
  data: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Experiment> {
  const now = Date.now();
  const experiment: Experiment = {
    ...data,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  };
  await db.experiments.add(experiment);
  return experiment;
}

export async function updateExperiment(
  id: string,
  data: Partial<Omit<Experiment, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.experiments.update(id, { ...data, updatedAt: Date.now() });
}

export async function cloneExperiment(id: string): Promise<Experiment> {
  const original = await db.experiments.get(id);
  if (!original) throw new Error(`Experiment ${id} not found`);

  const now = Date.now();
  const clone: Experiment = {
    ...original,
    id: nanoid(),
    name: `${original.name} (copy)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  await db.experiments.add(clone);
  return clone;
}

export async function deleteExperiment(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.experiments, db.results, db.annotations, db.columnMappings],
    async () => {
      await db.experiments.delete(id);
      await db.results.where('experimentId').equals(id).delete();
      await db.annotations.where('experimentId').equals(id).delete();
      await db.columnMappings.where('experimentId').equals(id).delete();
    },
  );
}

// ----- Metric queries -----

export async function getMetrics(filters?: {
  type?: Metric['type'];
  tag?: string;
}): Promise<Metric[]> {
  let results: Metric[];

  if (filters?.type) {
    results = await db.metrics.where('type').equals(filters.type).toArray();
  } else {
    results = await db.metrics.orderBy('createdAt').reverse().toArray();
  }

  if (filters?.tag) {
    results = results.filter((m) => m.tags.includes(filters.tag!));
  }

  return results;
}

export async function getMetricById(
  id: string,
): Promise<Metric | undefined> {
  return db.metrics.get(id);
}

export async function getMetricsByIds(ids: string[]): Promise<Metric[]> {
  return db.metrics.where('id').anyOf(ids).toArray();
}

export async function createMetric(
  data: Omit<Metric, 'id' | 'createdAt'>,
): Promise<Metric> {
  const metric: Metric = {
    ...data,
    id: nanoid(),
    createdAt: Date.now(),
  };
  await db.metrics.add(metric);
  return metric;
}

export async function updateMetric(
  id: string,
  data: Partial<Omit<Metric, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.metrics.update(id, data);
}

export async function deleteMetric(id: string): Promise<void> {
  // Check if any experiments reference this metric
  const experiments = await db.experiments.toArray();
  const referencedBy = experiments.filter(
    (e) =>
      e.primaryMetricIds.includes(id) ||
      e.guardrailMetricIds.includes(id) ||
      e.activationMetricId === id,
  );

  if (referencedBy.length > 0) {
    const names = referencedBy.map((e) => e.name).join(', ');
    throw new Error(
      `Cannot delete metric: referenced by experiments: ${names}`,
    );
  }

  await db.metrics.delete(id);
}

// ----- Result queries -----

export async function getResultsForExperiment(
  experimentId: string,
): Promise<ExperimentResult[]> {
  return db.results
    .where('experimentId')
    .equals(experimentId)
    .reverse()
    .sortBy('computedAt');
}

export async function getLatestResult(
  experimentId: string,
): Promise<ExperimentResult | undefined> {
  const results = await db.results
    .where('experimentId')
    .equals(experimentId)
    .reverse()
    .sortBy('computedAt');
  return results[0];
}

export async function saveResult(
  result: ExperimentResult,
): Promise<void> {
  await db.transaction('rw', db.results, async () => {
    await db.results.add(result);

    // Enforce max 3 results per experiment — delete oldest beyond limit
    const all = await db.results
      .where('experimentId')
      .equals(result.experimentId)
      .reverse()
      .sortBy('computedAt');

    if (all.length > MAX_RESULTS_PER_EXPERIMENT) {
      const toDelete = all.slice(MAX_RESULTS_PER_EXPERIMENT);
      await db.results.bulkDelete(toDelete.map((r) => r.id));
    }
  });
}

// ----- Column Mapping queries -----

export async function getColumnMapping(
  experimentId: string,
  columnFingerprint: string,
): Promise<ColumnMapping | undefined> {
  const id = `${experimentId}:${columnFingerprint}`;
  return db.columnMappings.get(id);
}

export async function saveColumnMapping(
  experimentId: string,
  columnFingerprint: string,
  mapping: ColumnMapping['mapping'],
): Promise<void> {
  const id = `${experimentId}:${columnFingerprint}`;
  await db.columnMappings.put({
    id,
    experimentId,
    columnFingerprint,
    savedAt: Date.now(),
    mapping,
  });
}

// ----- Annotation queries -----

export async function getAnnotations(
  experimentId: string,
  filters?: { resultId?: string; metricId?: string },
): Promise<Annotation[]> {
  let results = await db.annotations
    .where('experimentId')
    .equals(experimentId)
    .reverse()
    .sortBy('createdAt');

  if (filters?.resultId) {
    results = results.filter((a) => a.resultId === filters.resultId);
  }
  if (filters?.metricId) {
    results = results.filter((a) => a.metricId === filters.metricId);
  }

  return results;
}

export async function createAnnotation(
  data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Annotation> {
  const now = Date.now();
  const annotation: Annotation = { ...data, createdAt: now, updatedAt: now };
  const id = await db.annotations.add(annotation);
  return { ...annotation, id: id as number };
}

// ----- Export / Import -----

export interface ExportData {
  exportedAt: string;
  version: 1;
  experiments: Experiment[];
  metrics: Metric[];
  results: ExperimentResult[];
  columnMappings: ColumnMapping[];
  annotations: Annotation[];
}

export async function exportAllData(): Promise<ExportData> {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    const [experiments, metrics, results, columnMappings, annotations] =
      await Promise.all([
        db.experiments.toArray(),
        db.metrics.toArray(),
        db.results.toArray(),
        db.columnMappings.toArray(),
        db.annotations.toArray(),
      ]);

    await updateSettings({ lastExportedAt: Date.now() });

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      experiments,
      metrics,
      results,
      columnMappings,
      annotations,
    };
  } finally {
    stopLoading();
  }
}

export interface ImportSummary {
  experiments: number;
  metrics: number;
  results: number;
  columnMappings: number;
  annotations: number;
}

export function previewImport(data: ExportData): ImportSummary {
  return {
    experiments: data.experiments.length,
    metrics: data.metrics.length,
    results: data.results.length,
    columnMappings: data.columnMappings.length,
    annotations: data.annotations.length,
  };
}

export async function importData(
  data: ExportData,
  mode: 'merge' | 'replace',
): Promise<void> {
  if (data.version !== 1) {
    throw new Error(`Unsupported export version: ${data.version}`);
  }

  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    await db.transaction(
      'rw',
      [db.experiments, db.metrics, db.results, db.columnMappings, db.annotations],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.experiments.clear(),
            db.metrics.clear(),
            db.results.clear(),
            db.columnMappings.clear(),
            db.annotations.clear(),
          ]);
        }

        // bulkPut merges on key conflict (merge mode) or inserts fresh (replace mode)
        await Promise.all([
          db.experiments.bulkPut(data.experiments),
          db.metrics.bulkPut(data.metrics),
          db.results.bulkPut(data.results),
          db.columnMappings.bulkPut(data.columnMappings),
          db.annotations.bulkPut(data.annotations),
        ]);
      },
    );
  } finally {
    stopLoading();
  }
}

export async function exportExperiment(
  experimentId: string,
): Promise<ExportData> {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    const experiment = await db.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    const [results, columnMappings, annotations] = await Promise.all([
      db.results.where('experimentId').equals(experimentId).toArray(),
      db.columnMappings.where('experimentId').equals(experimentId).toArray(),
      db.annotations.where('experimentId').equals(experimentId).toArray(),
    ]);

    // Include metrics referenced by this experiment
    const metricIds = [
      ...experiment.primaryMetricIds,
      ...experiment.guardrailMetricIds,
      ...(experiment.activationMetricId ? [experiment.activationMetricId] : []),
    ];
    const metrics = await db.metrics.where('id').anyOf(metricIds).toArray();

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      experiments: [experiment],
      metrics,
      results,
      columnMappings,
      annotations,
    };
  } finally {
    stopLoading();
  }
}

// ----- Backup tracking -----

export async function checkBackupReminder(): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.lastExportedAt) return true; // never exported
  const daysSince =
    (Date.now() - settings.lastExportedAt) / (1000 * 60 * 60 * 24);
  return daysSince > settings.backupReminderDays;
}

// ----- Demo mode -----

export async function isDatabaseEmpty(): Promise<boolean> {
  const count = await db.experiments.count();
  return count === 0;
}
