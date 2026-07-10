"use client";
import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

export default function ThemeProvider() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const clsList = document.documentElement.classList;
    clsList.remove('dark');
    if (theme === 'dark') {
      clsList.add('dark');
    }
    
    // body에도 테마 클래스 추가
    const bodyClsList = document.body.classList;
    bodyClsList.remove('theme-dark', 'theme-light');
    bodyClsList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
  }, [theme]);

  // nothing to render
  return null;
}


