"use client";
import { create } from 'zustand';

type Theme = 'dark' | 'light';

type ThemeState = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

const STORAGE_KEY = 'theme';

export const useThemeStore = create<ThemeState>((set) => ({
  theme:
    typeof window !== 'undefined'
      ? ((localStorage.getItem(STORAGE_KEY) as Theme) || 'dark')
      : 'dark',
  toggle: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
      return { theme: next };
    }),
  set: (t) => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, t);
    set({ theme: t });
  },
}));


