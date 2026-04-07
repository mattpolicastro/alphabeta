import { exportAllData, importData, type ExportData } from '@/lib/db';
import { useLoadingStore } from '@/lib/store/loadingStore';
import type { StorageBackend, SyncResult } from './types';
import { serializeToFileMap, deserializeFromFileMap } from './serializer';

export async function testRepoConnection(backend: StorageBackend): Promise<boolean> {
  return backend.testConnection();
}

export async function exportToRepo(
  backend: StorageBackend,
  basePath: string,
): Promise<SyncResult> {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    const data: ExportData = await exportAllData({ skipLoading: true });
    const fileMap = serializeToFileMap(data, basePath);
    const message = `alphabeta: sync ${data.experiments.length} experiments, ${data.metrics.length} metrics`;
    return await backend.push(fileMap, message);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error during export',
    };
  } finally {
    stopLoading();
  }
}

export async function importFromRepo(
  backend: StorageBackend,
  basePath: string,
  mode: 'merge' | 'replace',
): Promise<SyncResult> {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    const { files, ref } = await backend.pull();
    const data: ExportData = deserializeFromFileMap(files, basePath);
    await importData(data, mode, { skipLoading: true });
    return {
      success: true,
      message: `Pulled ${data.experiments.length} experiments, ${data.metrics.length} metrics`,
      filesRead: files.size,
      commitSha: ref,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error during import',
    };
  } finally {
    stopLoading();
  }
}
