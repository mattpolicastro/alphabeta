import { create } from 'zustand';
import type { RepoConfig } from '@/lib/repo/types';

type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'error' | 'success';

const LS_KEY = 'alphabeta-repo-config';
const SS_TOKEN_KEY = 'alphabeta-repo-token';
const LS_TOKEN_KEY = 'alphabeta-repo-token-saved';

interface RepoState {
  owner: string;
  repoName: string;
  branch: string;
  path: string;
  token: string;
  rememberToken: boolean;

  syncStatus: SyncStatus;
  lastSyncMessage: string;

  getConfig: () => RepoConfig;
  isConfigured: () => boolean;
  updateField: <K extends keyof RepoConfig>(key: K, value: RepoConfig[K]) => void;
  setRememberToken: (remember: boolean) => void;
  setSyncStatus: (status: SyncStatus, message?: string) => void;
  disconnect: () => void;
  loadFromLocalStorage: () => void;
}

const defaults: RepoConfig = {
  owner: '',
  repoName: '',
  branch: 'main',
  path: '.alphabeta',
  token: '',
};

function loadPersisted(): RepoConfig & { rememberToken: boolean } {
  if (typeof window === 'undefined') return { ...defaults, rememberToken: false };
  try {
    const raw = localStorage.getItem(LS_KEY);
    const config = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };

    // Migrate old 'repo' field to 'repoName'
    if ((config as Record<string, unknown>).repo && !config.repoName) {
      config.repoName = (config as Record<string, unknown>).repo as string;
    }

    // Migrate token from old localStorage config to sessionStorage
    if ((config as Record<string, unknown>).token) {
      sessionStorage.setItem(SS_TOKEN_KEY, (config as Record<string, unknown>).token as string);
      delete (config as Record<string, unknown>).token;
      delete (config as Record<string, unknown>).repo;
      localStorage.setItem(LS_KEY, JSON.stringify(config));
    }

    // Load token: check localStorage first (if remembered), then sessionStorage
    const rememberToken = !!(config as Record<string, unknown>).rememberToken;
    const token = rememberToken
      ? (localStorage.getItem(LS_TOKEN_KEY) ?? sessionStorage.getItem(SS_TOKEN_KEY) ?? '')
      : (sessionStorage.getItem(SS_TOKEN_KEY) ?? '');

    return { ...config, token, rememberToken };
  } catch {
    return { ...defaults, rememberToken: false };
  }
}

function persist(state: RepoState): void {
  if (typeof window === 'undefined') return;
  try {
    const config = {
      owner: state.owner,
      repoName: state.repoName,
      branch: state.branch,
      path: state.path,
      rememberToken: state.rememberToken,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(config));

    // Token goes to sessionStorage always
    sessionStorage.setItem(SS_TOKEN_KEY, state.token);

    // If "remember" is on, also save to localStorage
    if (state.rememberToken) {
      localStorage.setItem(LS_TOKEN_KEY, state.token);
    } else {
      localStorage.removeItem(LS_TOKEN_KEY);
    }
  } catch {
    // storage may be full or unavailable
  }
}

export const useRepoStore = create<RepoState>((set, get) => ({
  ...defaults,
  rememberToken: false,
  syncStatus: 'idle',
  lastSyncMessage: '',

  getConfig: () => ({
    owner: get().owner,
    repoName: get().repoName,
    branch: get().branch,
    path: get().path,
    token: get().token,
  }),

  isConfigured: () => {
    const s = get();
    return !!(s.owner && s.repoName && s.token);
  },

  updateField: (key, value) => {
    set({ [key]: value });
    persist(get() as RepoState);
  },

  setRememberToken: (remember: boolean) => {
    set({ rememberToken: remember });
    const s = get() as RepoState;
    if (remember) {
      localStorage.setItem(LS_TOKEN_KEY, s.token);
    } else {
      localStorage.removeItem(LS_TOKEN_KEY);
    }
    persist(s);
  },

  setSyncStatus: (status, message = '') => {
    set({ syncStatus: status, lastSyncMessage: message });
  },

  disconnect: () => {
    set({ ...defaults, rememberToken: false, syncStatus: 'idle', lastSyncMessage: '' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_TOKEN_KEY);
      sessionStorage.removeItem(SS_TOKEN_KEY);
    }
  },

  loadFromLocalStorage: () => {
    const persisted = loadPersisted();
    set({ ...persisted });
  },
}));
