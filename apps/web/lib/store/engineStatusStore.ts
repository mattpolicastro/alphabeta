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
  setStatus: (status: EngineStatus, message?: string) => void;
}

export const useEngineStatusStore = create<EngineStatusState>((set) => ({
  status: 'uninitialised',
  message: '',

  setStatus: (status, message = '') => set({ status, message }),
}));
