/** Configuration for the GitHub repository connection. */
export interface RepoConfig {
  owner: string;
  repoName: string;
  branch: string;
  path: string;
  token: string;
}

/** Manifest written to repo root — tracks live entity IDs so stale files are ignored on import. */
export interface ManifestData {
  version: 1;
  exportedAt: string;
  experimentIds: string[];
  metricIds: string[];
}

/** Flat mapping from repo-relative file paths to JSON string content. */
export type FileMap = Map<string, string>;

/** Result of a push or pull operation. */
export interface SyncResult {
  success: boolean;
  message: string;
  filesWritten?: number;
  filesRead?: number;
  commitSha?: string;
}

/** Abstract storage backend for push/pull sync operations. */
export interface StorageBackend {
  /** Push files atomically. Git backends create a single commit. Push is additive — it creates/updates files but never deletes. */
  push(files: FileMap, message: string): Promise<SyncResult>;

  /** Pull all files under the configured path. */
  pull(): Promise<{ files: FileMap; ref?: string }>;

  /** Verify backend is reachable and credentials are valid. */
  testConnection(): Promise<boolean>;
}
