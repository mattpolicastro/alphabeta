import type { RepoConfig, FileMap, SyncResult, StorageBackend } from './types';

const API = 'https://api.github.com';
const API_TIMEOUT = 30_000;
const BATCH_SIZE = 10;

// --- Helpers ---

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `GitHub API error ${res.status}`,
    );
  }
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

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

// --- GitHub API functions ---

interface TreeEntry {
  path: string;
  sha: string;
  type: string;
}

async function testConnectionApi(config: RepoConfig): Promise<boolean> {
  try {
    const res = await fetch(`${API}/repos/${config.owner}/${config.repoName}`, {
      headers: headers(config.token),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function getRef(config: RepoConfig): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/ref/heads/${config.branch}`,
    { headers: headers(config.token), signal: AbortSignal.timeout(API_TIMEOUT) },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { object: { sha: string } }).object.sha;
}

async function getCommitTreeSha(
  config: RepoConfig,
  commitSha: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/commits/${commitSha}`,
    { headers: headers(config.token), signal: AbortSignal.timeout(API_TIMEOUT) },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { tree: { sha: string } }).tree.sha;
}

async function getTreeRecursive(
  config: RepoConfig,
  treeSha: string,
): Promise<TreeEntry[]> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/trees/${treeSha}?recursive=1`,
    { headers: headers(config.token), signal: AbortSignal.timeout(API_TIMEOUT) },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { tree: TreeEntry[] }).tree;
}

async function getBlob(
  config: RepoConfig,
  blobSha: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/blobs/${blobSha}`,
    { headers: headers(config.token), signal: AbortSignal.timeout(API_TIMEOUT) },
  );
  await assertOk(res);
  const data = await res.json();
  const raw = (data as { content: string }).content.replace(/\n/g, '');
  return base64ToUtf8(raw);
}

async function createBlob(
  config: RepoConfig,
  content: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/blobs`,
    {
      method: 'POST',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: utf8ToBase64(content), encoding: 'base64' }),
      signal: AbortSignal.timeout(API_TIMEOUT),
    },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { sha: string }).sha;
}

async function createTree(
  config: RepoConfig,
  baseTreeSha: string,
  entries: Array<{ path: string; sha: string }>,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/trees`,
    {
      method: 'POST',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: entries.map((e) => ({
          path: e.path,
          mode: '100644',
          type: 'blob',
          sha: e.sha,
        })),
      }),
      signal: AbortSignal.timeout(API_TIMEOUT),
    },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { sha: string }).sha;
}

async function createCommit(
  config: RepoConfig,
  treeSha: string,
  parentSha: string,
  message: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/commits`,
    {
      method: 'POST',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
      signal: AbortSignal.timeout(API_TIMEOUT),
    },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { sha: string }).sha;
}

async function updateRef(
  config: RepoConfig,
  commitSha: string,
): Promise<void> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repoName}/git/refs/heads/${config.branch}`,
    {
      method: 'PATCH',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commitSha }),
      signal: AbortSignal.timeout(API_TIMEOUT),
    },
  );
  await assertOk(res);
}

// --- Factory ---

function validateToken(token: string): void {
  if (token.startsWith('ghp_')) {
    throw new Error(
      'Classic personal access tokens (ghp_) are not supported. ' +
      'Please create a fine-grained PAT at https://github.com/settings/tokens?type=beta',
    );
  }
}

export function createGitHubBackend(config: RepoConfig): StorageBackend {
  validateToken(config.token);

  return {
    async push(files: FileMap, message: string): Promise<SyncResult> {
      const headSha = await getRef(config);
      const treeSha = await getCommitTreeSha(config, headSha);

      const entries = await batchedResolve(
        Array.from(files.entries()).map(
          ([path, content]) => () =>
            createBlob(config, content).then((sha) => ({ path, sha })),
        ),
        BATCH_SIZE,
      );

      const newTreeSha = await createTree(config, treeSha, entries);
      const newCommitSha = await createCommit(config, newTreeSha, headSha, message);
      await updateRef(config, newCommitSha);

      return {
        success: true,
        message: `Pushed ${files.size} files to ${config.owner}/${config.repoName}`,
        filesWritten: files.size,
        commitSha: newCommitSha,
      };
    },

    async pull(): Promise<{ files: FileMap; ref?: string }> {
      const headSha = await getRef(config);
      const treeSha = await getCommitTreeSha(config, headSha);
      const allEntries = await getTreeRecursive(config, treeSha);
      const relevantEntries = allEntries.filter(
        (e) => e.type === 'blob' && e.path.startsWith(config.path + '/'),
      );

      if (relevantEntries.length === 0) {
        throw new Error(
          `No data found under ${config.path}/ in ${config.owner}/${config.repoName}`,
        );
      }

      const fileEntries = await batchedResolve(
        relevantEntries.map(
          (entry) => () =>
            getBlob(config, entry.sha).then((content) => ({
              path: entry.path,
              content,
            })),
        ),
        BATCH_SIZE,
      );

      const files: FileMap = new Map();
      for (const { path, content } of fileEntries) {
        files.set(path, content);
      }

      return { files, ref: headSha };
    },

    async testConnection(): Promise<boolean> {
      return testConnectionApi(config);
    },
  };
}
