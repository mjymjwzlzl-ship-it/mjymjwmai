"use client";
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'dark' | 'light';

type ThemeState = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

// 기존 localStorage 데이터를 새 형식으로 마이그레이션
const migrateThemeStorage = () => {
  if (typeof window === 'undefined') return { theme: 'light' };

  const oldTheme = localStorage.getItem('theme') as Theme | null;

  // 이미 새 형식이 있으면 마이그레이션 스킵
  if (localStorage.getItem('theme-storage')) {
    return undefined; // persist가 기존 값 사용
  }

  // 기존 데이터가 있으면 마이그레이션
  if (oldTheme) {
    const migrated = { theme: oldTheme };

    // 기존 키 삭제
    localStorage.removeItem('theme');

    return migrated;
  }

  return undefined;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggle: () =>
        set((s) => {
          const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
          return { theme: next };
        }),
      set: (t) => set({ theme: t }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        const migrated = migrateThemeStorage();
        return migrated || persistedState;
      },
    }
  )
);


