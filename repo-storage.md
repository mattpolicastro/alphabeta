# Repository Storage

Git-backed collaborative storage for alphabeta. Push experiment data to a GitHub repository so anyone with access can pull it down and pick up where you left off.

## Status

**Phase 1 — manual export/import.** Not bidirectional auto-sync. You explicitly push and pull via buttons in Settings.

## How It Works

### The Problem

All alphabeta data lives in the browser's IndexedDB. That's great for privacy and zero-setup, but it means:
- Data is trapped in one browser on one machine
- No way for teammates to share experiment configs, results, or annotations
- No version history beyond the 3 most recent result snapshots per experiment

### The Solution

Connect a GitHub repository. Alphabeta serializes every entity (experiment, metric, result, annotation, column mapping) into individual JSON files and commits them atomically via the GitHub Git Data API. Anyone with repo access can pull that data into their own browser.

### Architecture

```
Push:  IndexedDB → exportAllData() → ExportData → serialize to FileMap → GitHub API → repo
Pull:  repo → GitHub API → FileMap → deserialize to ExportData → importData() → IndexedDB
```

The repo layer sits on top of the existing export/import pipeline. `exportAllData()` and `importData()` already handle gathering and writing all entity tables — the new code just provides a different transport (GitHub API instead of a downloaded JSON blob).

### Repo File Layout

Each entity becomes its own JSON file, nested by experiment:

```
.alphabeta/
  manifest.json                              # tracks live entity IDs
  metrics/
    {metricId}.json
  experiments/
    {experimentId}/
      experiment.json                        # experiment config
      results/
        {resultId}.json                      # analysis snapshots
      annotations/
        {annotationId}.json
      column-mappings/
        {columnFingerprint}.json
```

**Why one file per entity?**
- Git diffs are per-entity, not one giant blob — clean, readable history
- Two people working on different experiments can't conflict
- Browsable on GitHub without the app

### The Manifest

`manifest.json` lists all "live" experiment and metric IDs. This solves the stale-file problem:

If you push experiments A, B, C — then delete B locally — then push again, the repo still has B's files (the Git Data API's `base_tree` mode is additive). Without the manifest, importing would resurrect B. With it, the import ignores any entity not listed in the manifest.

```json
{
  "version": 1,
  "exportedAt": "2026-03-25T00:00:00.000Z",
  "experimentIds": ["abc123", "def456"],
  "metricIds": ["m1", "m2", "m3"]
}
```

### GitHub API Approach

The app is fully static (GitHub Pages) with no backend, so all API calls happen from the browser via `fetch()`. The GitHub REST API supports CORS for authenticated requests, which makes this work.

**Push (export) uses the Git Data API for atomic commits:**
1. `GET /git/ref/heads/{branch}` — current HEAD SHA
2. `GET /git/commits/{sha}` — current tree SHA
3. `POST /git/blobs` — create a blob for each JSON file (batched 10 at a time)
4. `POST /git/trees` — create a new tree with `base_tree` for efficiency
5. `POST /git/commits` — create a commit pointing to the new tree
6. `PATCH /git/refs/heads/{branch}` — advance the branch

This creates a single atomic commit with all files, no matter how many entities you have. The commit message summarizes the content: `alphabeta: sync 5 experiments, 12 metrics`.

**Pull (import) reads the full tree then fetches blobs:**
1. `GET /git/trees/{sha}?recursive=1` — get all file paths in one call
2. Filter to paths under `.alphabeta/`
3. `GET /git/blobs/{sha}` — fetch each file's content (batched 10 at a time)
4. Deserialize the file map back to `ExportData`
5. Feed into the existing `importData()` with merge or replace mode

**Unicode handling:** JSON content may contain non-ASCII characters (experiment names, annotations, etc.). The GitHub blob API uses base64, and `btoa()`/`atob()` only handle ASCII. The client uses `TextEncoder`/`TextDecoder` for proper UTF-8 round-tripping.

### Storage of Credentials

The repo config (owner, repo, branch, path, PAT) is stored in `localStorage` via a Zustand store. This avoids a Dexie schema migration and keeps repo config separate from app settings (which don't sync). The PAT is stored in plain text — acceptable for a single-user client-side app with no third-party scripts, but worth noting.

### What Syncs vs. Stays Local

| Entity | Synced | Why |
|--------|--------|-----|
| Experiments | Yes | Core shared state |
| Metrics | Yes | Shared definitions referenced by experiments |
| Results | Yes | The whole point — share analysis outcomes |
| Annotations | Yes | Collaborative interpretation |
| Column Mappings | Yes | Saves teammates from re-mapping the same CSV |
| Settings | **No** | Personal: compute engine, theme, thresholds |
| Repo config | **No** | Per-browser: token, connection details |

## Module Inventory

| File | Purpose |
|------|---------|
| `lib/repo/types.ts` | `RepoConfig`, `ManifestData`, `FileMap`, `SyncResult` interfaces |
| `lib/repo/github.ts` | GitHub Git Data API client — all fetch calls with auth, error handling, base64 |
| `lib/repo/serializer.ts` | Pure functions: `ExportData` ↔ `FileMap` conversion with manifest |
| `lib/repo/operations.ts` | `exportToRepo()`, `importFromRepo()`, `testRepoConnection()` |
| `lib/store/repoStore.ts` | Zustand store for repo config, persisted to localStorage |
| `lib/repo/__tests__/serializer.test.ts` | 10 tests: round-trip, manifest, stale filtering, unicode, edge cases |
| `app/settings/page.tsx` | UI: "Repository Storage" card with config inputs, test/push/pull buttons |

## Design Decisions

### Why GitHub API, not isomorphic-git?

isomorphic-git is a full git client in JS, but it requires a CORS proxy for HTTP git operations (most hosts don't serve CORS headers for the smart HTTP protocol). The GitHub API has native CORS support, is well-documented, and is what the target users already use. Provider-agnostic support (GitLab, Bitbucket) can be added later via an adapter interface.

### Why localStorage for config, not IndexedDB?

Adding fields to `AppSettings` in Dexie would require a schema version bump and migration. localStorage is simpler, keeps sensitive data (PAT) out of the export/import flow, and the config is inherently per-browser anyway.

### Why `base_tree` instead of full tree replacement?

The `createTree` API with `base_tree` only needs to specify changed files — everything else is inherited. This is simpler and makes fewer API calls. The downside is that deleted entities leave stale files in the repo, but the manifest handles this on the import side.

### Why batch blob requests 10 at a time?

GitHub's authenticated rate limit is 5,000 requests/hour, but there are also undocumented burst/concurrency limits. Batching 10 at a time is conservative and avoids secondary rate limiting while still being much faster than sequential.

## Future Work (Phase 2+)

- **Bidirectional sync** — push on every save, pull on page load, sync status in nav bar
- **CSV archival** — commit uploaded CSVs alongside results for full reproducibility
- **Change attribution** — show "last edited by" from git commit metadata
- **Change history** — browse experiment history from git log
- **Conflict detection** — warn when pull would overwrite local unsaved changes
- **Provider-agnostic** — adapter interface for GitLab, Bitbucket, self-hosted git
- **Stale file cleanup** — full tree replacement on push to remove orphaned files
