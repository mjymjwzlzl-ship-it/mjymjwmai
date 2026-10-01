'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ADMIN_THEME_KEY, type AdminTheme } from '@/lib/admin-theme';

type ThemeContextValue = { theme: AdminTheme; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AdminTheme) {
  document.documentElement.dataset.adminTheme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export default function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>('light');
  useEffect(() => {
    const initial = document.documentElement.dataset.adminTheme === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    const sync = (event: StorageEvent) => {
      if (event.key !== ADMIN_THEME_KEY && event.key !== null) return;
      const next = event.newValue === 'dark' ? 'dark' : 'light';
      applyTheme(next);
      setTheme(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggleTheme = () => {
    const next = document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    try { localStorage.setItem(ADMIN_THEME_KEY, next); } catch { /* Storage can be disabled; the current page can still switch. */ }
  };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('AdminThemeProvider is required.');
  return context;
}
