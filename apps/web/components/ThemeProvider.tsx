'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settingsStore';

/**
 * Client component that manages the app's theme by reading from the settings store
 * and applying the resolved theme to document.documentElement.
 *
 * Handles 'auto' theme by detecting system preference via prefers-color-scheme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const loadFromDB = useSettingsStore((s) => s.loadFromDB);

  useEffect(() => {
    // Load settings from DB on mount
    loadFromDB();
  }, [loadFromDB]);

  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'auto') {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
      return theme;
    };

    const resolvedTheme = resolveTheme();
    document.documentElement.setAttribute('data-bs-theme', resolvedTheme);

    // Listen for changes to system theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'auto') {
        const newResolvedTheme = mediaQuery.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', newResolvedTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return <>{children}</>;
}
