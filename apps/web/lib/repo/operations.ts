import { exportAllData, importData, type ExportData } from '@/lib/db';
import { useLoadingStore } from '@/lib/store/loadingStore';
import type { RepoConfig, SyncResult } from './types';
import * as github from './github';
import { serializeToFileMap, deserializeFromFileMap } from './serializer';

/** Execute promises in batches to avoid overwhelming the API. */
async function batchedResolve<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

/** Test connectivity to a GitHub repo. */
export async function testRepoConnection(config: RepoConfig): Promise<boolean> {
  return github.testConnection(config);
}

/** Export all IndexedDB data to the configured GitHub repo as a single atomic commit. */
export async function exportToRepo(config: RepoConfig): Promise<SyncResult> {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    // 1. Gather all data from IndexedDB
    const data: ExportData = await exportAllData();

    // 2. Serialize to file map
    const fileMap = serializeToFileMap(data, config.path);

    // 3. Get current branch HEAD
    const headSha = await github.getRef(config);
    const treeSha = await github.getCommitTreeSha(config, headSha);

    // 4. Create blobs (batched to respect rate limits)
    const entries = await batchedResolve(
      Array.from(fileMap.entries()).map(
        ([path, content]) => () =>
          github.createBlob(config, content).then((sha) => ({ path, sha })),
      ),
      10,
    );

    // 5. Create tree with base_tree for efficiency
    const newTreeSha = await github.createTree(config, treeSha, entries);

    // 6. Create commit
    const message = `alphabeta: sync ${data.experiments.length} experiments, ${data.metrics.length} metrics`;
    const newCommitSha = await github.createCommit(config, newTreeSha, headSha, message);

    // 7. Update branch ref
    await github.updateRef(config, newCommitSha);

    return {
      success: true,
      message: `Pushed ${fileMap.size} files to ${config.owner}/${config.repo}`,
      filesWritten: fileMap.size,
      commitSha: newCommitSha,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error during export',
    };
  } finally {
    stopLoading();
  }
}

/** Import data from a GitHub repo into IndexedDB. */
export async function importFromRepo(
  config: RepoConfig,
  mode: 'merge' | 'replace',
): Promise<SyncResult> {
  const { startLoading, stopLoading } = useLoadingStore.getState();
  startLoading();
  try {
    // 1. Get current branch HEAD and tree
    const headSha = await github.getRef(config);
    const treeSha = await github.getCommitTreeSha(config, headSha);

    // 2. Get recursive tree, filter to our path prefix
    const allEntries = await github.getTreeRecursive(config, treeSha);
    const relevantEntries = allEntries.filter(
      (e) => e.type === 'blob' && e.path.startsWith(config.path + '/'),
    );

    if (relevantEntries.length === 0) {
      return {
        success: false,
        message: `No data found under ${config.path}/ in ${config.owner}/${config.repo}`,
      };
    }

    // 3. Fetch all blobs (batched)
    const fileEntries = await batchedResolve(
      relevantEntries.map(
        (entry) => () =>
          github.getBlob(config, entry.sha).then((content) => ({
            path: entry.path,
            content,
          })),
      ),
      10,
    );

    const fileMap = new Map<string, string>();
    for (const { path, content } of fileEntries) {
      fileMap.set(path, content);
    }

    // 4. Deserialize to ExportData
    const data: ExportData = deserializeFromFileMap(fileMap, config.path);

    // 5. Import into IndexedDB (reuse existing importData)
    await importData(data, mode);

    return {
      success: true,
      message: `Pulled ${data.experiments.length} experiments, ${data.metrics.length} metrics from ${config.owner}/${config.repo}`,
      filesRead: fileMap.size,
      commitSha: headSha,
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
