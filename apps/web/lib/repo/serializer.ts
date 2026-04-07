import type { ExportData } from '@/lib/db';
import type { FileMap, ManifestData } from './types';

// --- Path helpers ---

function manifestPath(base: string): string {
  return `${base}/manifest.json`;
}

function metricPath(base: string, id: string): string {
  return `${base}/metrics/${id}.json`;
}

function experimentPath(base: string, id: string): string {
  return `${base}/experiments/${id}/experiment.json`;
}

function resultPath(base: string, expId: string, id: string): string {
  return `${base}/experiments/${expId}/results/${id}.json`;
}

function annotationPath(base: string, expId: string, id: number | string): string {
  return `${base}/experiments/${expId}/annotations/${id}.json`;
}

function columnMappingPath(base: string, expId: string, fingerprint: string): string {
  return `${base}/experiments/${expId}/column-mappings/${fingerprint}.json`;
}

// --- Serialize ---

export function buildManifest(data: ExportData): ManifestData {
  return {
    version: 1,
    exportedAt: data.exportedAt,
    experimentIds: data.experiments.map((e) => e.id),
    metricIds: data.metrics.map((m) => m.id),
  };
}

export function serializeToFileMap(data: ExportData, basePath: string): FileMap {
  const files: FileMap = new Map();

  // Manifest
  files.set(manifestPath(basePath), JSON.stringify(buildManifest(data), null, 2));

  // Metrics
  for (const metric of data.metrics) {
    files.set(metricPath(basePath, metric.id), JSON.stringify(metric, null, 2));
  }

  // Experiments + children
  for (const experiment of data.experiments) {
    files.set(
      experimentPath(basePath, experiment.id),
      JSON.stringify(experiment, null, 2),
    );
  }

  for (const result of data.results) {
    files.set(
      resultPath(basePath, result.experimentId, result.id),
      JSON.stringify(result, null, 2),
    );
  }

  for (const annotation of data.annotations) {
    const annId = annotation.id ?? annotation.createdAt;
    files.set(
      annotationPath(basePath, annotation.experimentId, annId),
      JSON.stringify(annotation, null, 2),
    );
  }

  for (const mapping of data.columnMappings) {
    files.set(
      columnMappingPath(basePath, mapping.experimentId, mapping.columnFingerprint),
      JSON.stringify(mapping, null, 2),
    );
  }

  return files;
}

// --- Deserialize ---

const METRICS_RE = /\/metrics\/([^/]+)\.json$/;
const EXPERIMENT_RE = /\/experiments\/([^/]+)\/experiment\.json$/;
const RESULT_RE = /\/experiments\/([^/]+)\/results\/([^/]+)\.json$/;
const ANNOTATION_RE = /\/experiments\/([^/]+)\/annotations\/([^/]+)\.json$/;
const COLUMN_MAPPING_RE = /\/experiments\/([^/]+)\/column-mappings\/([^/]+)\.json$/;

export function deserializeFromFileMap(files: FileMap, basePath: string): ExportData {
  const manifestContent = files.get(manifestPath(basePath));
  if (!manifestContent) {
    throw new Error(
      'No manifest.json found — this repository may not contain alphabeta data.',
    );
  }

  const manifest: ManifestData = JSON.parse(manifestContent);
  const liveExperiments = new Set(manifest.experimentIds);
  const liveMetrics = new Set(manifest.metricIds);

  const data: ExportData = {
    exportedAt: manifest.exportedAt,
    version: 1,
    experiments: [],
    metrics: [],
    results: [],
    columnMappings: [],
    annotations: [],
  };

  for (const [path, content] of files) {
    let match: RegExpMatchArray | null;

    if ((match = path.match(METRICS_RE))) {
      const id = match[1];
      if (liveMetrics.has(id)) {
        data.metrics.push(JSON.parse(content));
      }
    } else if ((match = path.match(EXPERIMENT_RE))) {
      const id = match[1];
      if (liveExperiments.has(id)) {
        data.experiments.push(JSON.parse(content));
      }
    } else if ((match = path.match(RESULT_RE))) {
      const expId = match[1];
      if (liveExperiments.has(expId)) {
        data.results.push(JSON.parse(content));
      }
    } else if ((match = path.match(ANNOTATION_RE))) {
      const expId = match[1];
      if (liveExperiments.has(expId)) {
        data.annotations.push(JSON.parse(content));
      }
    } else if ((match = path.match(COLUMN_MAPPING_RE))) {
      const expId = match[1];
      if (liveExperiments.has(expId)) {
        data.columnMappings.push(JSON.parse(content));
      }
    }
  }

  return data;
}
