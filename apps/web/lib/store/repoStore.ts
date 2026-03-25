import { create } from 'zustand';
import type { RepoConfig } from '@/lib/repo/types';

type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'error' | 'success';

interface RepoState {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;

  syncStatus: SyncStatus;
  lastSyncMessage: string;

  /** Returns a clean RepoConfig for passing to API functions. */
  getConfig: () => RepoConfig;
  /** True when minimum required fields (owner, repo, token) are set. */
  isConfigured: () => boolean;
  updateField: <K extends keyof RepoConfig>(key: K, value: RepoConfig[K]) => void;
  setSyncStatus: (status: SyncStatus, message?: string) => void;
  disconnect: () => void;
  loadFromLocalStorage: () => void;
}

const LS_KEY = 'alphabeta-repo-config';

const defaults: RepoConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  path: '.alphabeta',
  token: '',
};

function loadPersisted(): RepoConfig {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function persist(config: RepoConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    // localStorage may be full or unavailable
  }
}

export const useRepoStore = create<RepoState>((set, get) => ({
  ...defaults,
  syncStatus: 'idle',
  lastSyncMessage: '',

  getConfig: () => ({
    owner: get().owner,
    repo: get().repo,
    branch: get().branch,
    path: get().path,
    token: get().token,
  }),

  isConfigured: () => {
    const s = get();
    return !!(s.owner && s.repo && s.token);
  },

  updateField: (key, value) => {
    set({ [key]: value });
    persist(get().getConfig());
  },

  setSyncStatus: (status, message = '') => {
    set({ syncStatus: status, lastSyncMessage: message });
  },

  disconnect: () => {
    set({ ...defaults, syncStatus: 'idle', lastSyncMessage: '' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_KEY);
    }
  },

  loadFromLocalStorage: () => {
    const config = loadPersisted();
    set({ ...config });
  },
}));
