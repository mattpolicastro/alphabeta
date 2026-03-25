/** Configuration for the GitHub repository connection. */
export interface RepoConfig {
  owner: string;
  repo: string;
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
