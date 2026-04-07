'use client';

import { useState } from 'react';
import { useRepoStore } from '@/lib/store/repoStore';
import { testRepoConnection, exportToRepo, importFromRepo } from '@/lib/repo/operations';
import { createGitHubBackend } from '@/lib/repo/githubBackend';

export function RepoSettings() {
  const repo = useRepoStore();
  const [repoTestResult, setRepoTestResult] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [showToken, setShowToken] = useState(false);
  const [repoPullMode, setRepoPullMode] = useState<'merge' | 'replace'>('merge');
  const repoSyncing = repo.syncStatus === 'pushing' || repo.syncStatus === 'pulling';

  async function handleTestRepo() {
    setRepoTestResult('testing');
    try {
      const backend = createGitHubBackend(repo.getConfig());
      const ok = await testRepoConnection(backend);
      setRepoTestResult(ok ? 'ok' : 'fail');
    } catch {
      setRepoTestResult('fail');
    }
  }

  async function handlePushToRepo() {
    repo.setSyncStatus('pushing', 'Pushing to GitHub...');
    const backend = createGitHubBackend(repo.getConfig());
    const result = await exportToRepo(backend, repo.path);
    repo.setSyncStatus(result.success ? 'success' : 'error', result.message);
  }

  async function handlePullFromRepo() {
    repo.setSyncStatus('pulling', 'Pulling from GitHub...');
    const backend = createGitHubBackend(repo.getConfig());
    const result = await importFromRepo(backend, repo.path, repoPullMode);
    repo.setSyncStatus(result.success ? 'success' : 'error', result.message);
    if (result.success) {
      window.location.reload();
    }
  }

  return (
    <section className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Repository Storage</h5>
        <p className="text-muted small mb-3">
          Push and pull experiment data to a GitHub repository for backup and collaboration.
        </p>

        <div className="alert alert-info small mb-3">
          <strong>Security note:</strong> Your personal access token is stored in your
          browser&apos;s session storage and is cleared when you close the tab. It is
          never sent to any server other than the GitHub API. The token needs{' '}
          <code>Contents: Read and write</code> permission on the target repository.
          {repo.rememberToken && (
            <> When &quot;Remember token&quot; is checked, the token is also saved to
            local storage and persists across sessions.</>
          )}
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Owner</label>
            <input
              className="form-control"
              placeholder="username or org"
              value={repo.owner}
              onChange={(e) => repo.updateField('owner', e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Repository</label>
            <input
              className="form-control"
              placeholder="my-experiments"
              value={repo.repoName}
              onChange={(e) => repo.updateField('repoName', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Branch</label>
            <input
              className="form-control"
              value={repo.branch}
              onChange={(e) => repo.updateField('branch', e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Path</label>
            <input
              className="form-control"
              value={repo.path}
              onChange={(e) => repo.updateField('path', e.target.value)}
            />
          </div>
        </div>

        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-8">
            <label className="form-label">Personal Access Token</label>
            <div className="input-group">
              <input
                type={showToken ? 'text' : 'password'}
                className="form-control"
                placeholder="github_pat_..."
                value={repo.token}
                onChange={(e) => repo.updateField('token', e.target.value)}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            {repo.token.startsWith('ghp_') && (
              <div className="form-text text-danger">
                Classic personal access tokens (ghp_) are not supported. Please create a fine-grained PAT.
              </div>
            )}
            <div className="form-text">
              Fine-grained PAT with <code>Contents: Read and write</code> on the target repo.
            </div>
            <div className="form-check mt-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="remember-token"
                checked={repo.rememberToken}
                onChange={(e) => repo.setRememberToken(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="remember-token">
                Remember token across sessions
              </label>
            </div>
          </div>
          <div className="col-auto">
            <button
              className="btn btn-outline-secondary"
              onClick={handleTestRepo}
              disabled={!repo.isConfigured() || repoTestResult === 'testing'}
            >
              {repoTestResult === 'testing' ? 'Testing\u2026' : 'Test Connection'}
            </button>
            {repoTestResult === 'ok' && (
              <span className="ms-2 text-success">Connected</span>
            )}
            {repoTestResult === 'fail' && (
              <span className="ms-2 text-danger">Failed</span>
            )}
          </div>
        </div>

        <div className="d-flex gap-3 align-items-center flex-wrap">
          <button
            className="btn btn-outline-primary"
            onClick={handlePushToRepo}
            disabled={!repo.isConfigured() || repoSyncing}
          >
            {repo.syncStatus === 'pushing' ? 'Pushing\u2026' : 'Push to GitHub'}
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={handlePullFromRepo}
            disabled={!repo.isConfigured() || repoSyncing}
          >
            {repo.syncStatus === 'pulling' ? 'Pulling\u2026' : 'Pull from GitHub'}
          </button>
          <div className="form-check form-check-inline mb-0">
            <input
              className="form-check-input"
              type="radio"
              id="repo-pull-merge"
              checked={repoPullMode === 'merge'}
              onChange={() => setRepoPullMode('merge')}
            />
            <label className="form-check-label" htmlFor="repo-pull-merge">
              Merge
            </label>
          </div>
          <div className="form-check form-check-inline mb-0">
            <input
              className="form-check-input"
              type="radio"
              id="repo-pull-replace"
              checked={repoPullMode === 'replace'}
              onChange={() => setRepoPullMode('replace')}
            />
            <label className="form-check-label" htmlFor="repo-pull-replace">
              Replace
            </label>
          </div>
          {repo.lastSyncMessage && (
            <span
              className={
                repo.syncStatus === 'error' ? 'text-danger' : 'text-success'
              }
            >
              {repo.lastSyncMessage}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
