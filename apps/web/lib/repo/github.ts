import type { RepoConfig } from './types';

const API = 'https://api.github.com';

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

// --- Unicode-safe base64 ---

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

// --- Read operations ---

export async function testConnection(config: RepoConfig): Promise<boolean> {
  try {
    const res = await fetch(`${API}/repos/${config.owner}/${config.repo}`, {
      headers: headers(config.token),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getRef(config: RepoConfig): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/ref/heads/${config.branch}`,
    { headers: headers(config.token) },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { object: { sha: string } }).object.sha;
}

export async function getCommitTreeSha(
  config: RepoConfig,
  commitSha: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/commits/${commitSha}`,
    { headers: headers(config.token) },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { tree: { sha: string } }).tree.sha;
}

export interface TreeEntry {
  path: string;
  sha: string;
  type: string;
}

export async function getTreeRecursive(
  config: RepoConfig,
  treeSha: string,
): Promise<TreeEntry[]> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/trees/${treeSha}?recursive=1`,
    { headers: headers(config.token) },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { tree: TreeEntry[] }).tree;
}

export async function getBlob(
  config: RepoConfig,
  blobSha: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/blobs/${blobSha}`,
    { headers: headers(config.token) },
  );
  await assertOk(res);
  const data = await res.json();
  // GitHub returns base64-encoded content with newlines
  const raw = (data as { content: string }).content.replace(/\n/g, '');
  return base64ToUtf8(raw);
}

// --- Write operations ---

export async function createBlob(
  config: RepoConfig,
  content: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/blobs`,
    {
      method: 'POST',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: utf8ToBase64(content), encoding: 'base64' }),
    },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { sha: string }).sha;
}

export async function createTree(
  config: RepoConfig,
  baseTreeSha: string,
  entries: Array<{ path: string; sha: string }>,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/trees`,
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
    },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { sha: string }).sha;
}

export async function createCommit(
  config: RepoConfig,
  treeSha: string,
  parentSha: string,
  message: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/commits`,
    {
      method: 'POST',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
    },
  );
  await assertOk(res);
  const data = await res.json();
  return (data as { sha: string }).sha;
}

export async function updateRef(
  config: RepoConfig,
  commitSha: string,
): Promise<void> {
  const res = await fetch(
    `${API}/repos/${config.owner}/${config.repo}/git/refs/heads/${config.branch}`,
    {
      method: 'PATCH',
      headers: { ...headers(config.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commitSha }),
    },
  );
  await assertOk(res);
}
