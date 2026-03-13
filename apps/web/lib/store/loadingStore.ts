/**
 * Zustand store for global loading state.
 * Tracks a reference count so overlapping async operations
 * keep the indicator visible until all complete.
 */

import { create } from 'zustand';

interface LoadingState {
  /** Number of in-flight async operations. */
  count: number;
  /** True when at least one operation is in progress. */
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  count: 0,
  isLoading: false,

  startLoading: () =>
    set((s) => {
      const next = s.count + 1;
      return { count: next, isLoading: next > 0 };
    }),

  stopLoading: () =>
    set((s) => {
      const next = Math.max(0, s.count - 1);
      return { count: next, isLoading: next > 0 };
    }),
}));
