'use client';

import { Moon, Sun } from 'lucide-react';
import { useAdminTheme } from './AdminThemeProvider';

export default function AdminThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useAdminTheme();
  const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
  return <button type="button" onClick={toggleTheme} className={`admin-theme-toggle admin-icon-button ${className}`} aria-label={label} aria-pressed={theme === 'dark'} title={label}>{theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}</button>;
}
