/**
 * Zustand store for app settings.
 * Backed by the `settings` table in IndexedDB via Dexie.
 * See requirements.md Section 7.4.
 */

import { create } from 'zustand';
import { getSettings, updateSettings } from '@/lib/db';
import type { AppSettings } from '@/lib/db/schema';

type SettingsValues = Omit<AppSettings, 'id'>;

interface SettingsState extends SettingsValues {
  loaded: boolean;
  updateSetting: <K extends keyof SettingsValues>(
    key: K,
    value: SettingsValues[K],
  ) => Promise<void>;
  loadFromDB: () => Promise<void>;
}

const defaults: SettingsValues = {
  computeEngine: 'wasm',
  lambdaUrl: '',
  srmThreshold: 0.001,
  multipleExposureThreshold: 0.01,
  defaultStatsEngine: 'bayesian',
  defaultAlpha: 0.05,
  defaultPower: 0.80,
  dimensionWarningThreshold: 5,
  backupReminderDays: 30,
  lastExportedAt: null,
  currencySymbol: '$',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,
  loaded: false,

  loadFromDB: async () => {
    if (get().loaded) return;
    const settings = await getSettings();
    const { id: _, ...values } = settings;
    set({ ...values, loaded: true });
  },

  updateSetting: async (key, value) => {
    set({ [key]: value });
    await updateSettings({ [key]: value });
  },
}));
