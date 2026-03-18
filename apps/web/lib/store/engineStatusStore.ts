/**
 * Zustand store for stats engine status (Path A — Pyodide Web Worker).
 * Tracks worker lifecycle: uninitialised → loading → ready → error.
 * See requirements.md Section 7.4.
 */

import { create } from 'zustand';

export type EngineStatus = 'uninitialised' | 'loading' | 'ready' | 'error';

interface EngineStatusState {
  status: EngineStatus;
  message: string;
  failureCount: number;
  setStatus: (status: EngineStatus, message?: string) => void;
  recordFailure: () => void;
  resetFailures: () => void;
}

export const useEngineStatusStore = create<EngineStatusState>((set, get) => ({
  status: 'uninitialised',
  message: '',
  failureCount: 0,

  setStatus: (status, message = '') => set({ status, message }),
  recordFailure: () => set({ failureCount: get().failureCount + 1 }),
  resetFailures: () => set({ failureCount: 0 }),
}));
