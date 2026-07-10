"use client";
import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

export default function ThemeProvider() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const clsList = document.body.classList;
    clsList.remove('theme-dark', 'theme-light');
    clsList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
  }, [theme]);

  // nothing to render
  return null;
}


