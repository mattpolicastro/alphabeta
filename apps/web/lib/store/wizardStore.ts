/**
 * Zustand store for experiment creation wizard state.
 * Multi-step form; saved to IndexedDB on completion.
 * See requirements.md Section 7.1.
 */

import { create } from 'zustand';
import type { Variation } from '@/lib/db/schema';

export interface WizardState {
  currentStep: number; // 1–5
  // Step 1 — Hypothesis
  name: string;
  hypothesis: string;
  description: string;
  tags: string[];
  // Step 2 — Variations
  variations: Variation[];
  // Step 3 — Metrics
  primaryMetricIds: string[];
  guardrailMetricIds: string[];
  activationMetricId: string | null;
  // Step 4 — Stats Configuration
  statsEngine: 'bayesian' | 'frequentist' | 'sequential';
  multipleComparisonCorrection: 'none' | 'holm-bonferroni' | 'benjamini-hochberg';
  cuped: boolean;

  // Actions
  setStep: (step: number) => void;
  updateField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  name: '',
  hypothesis: '',
  description: '',
  tags: [],
  variations: [],
  primaryMetricIds: [],
  guardrailMetricIds: [],
  activationMetricId: null,
  statsEngine: 'bayesian' as const,
  multipleComparisonCorrection: 'none' as const,
  cuped: false,
};

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  updateField: (key, value) => set({ [key]: value }),

  reset: () => set(initialState),
}));
