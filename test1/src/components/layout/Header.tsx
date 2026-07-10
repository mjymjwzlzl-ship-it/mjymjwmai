"use client";
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { useAdultStore } from '@/store/adult';
import { useThemeStore } from '@/store/theme';
import { useState } from 'react';
import AgeGateModal from '@/components/ui/AgeGateModal';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="ARATA 홈으로">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <rect rx="6" width="28" height="28" fill="#6C5CE7" />
        <path d="M6 20L12 8l4 8 2-4 4 8" stroke="white" strokeWidth="2" fill="none" />
      </svg>
      <span className="font-bold text-xl tracking-tight">{BRAND.name}</span>
    </Link>
  );
}

export default function Header() {
  const adult = useAdultStore((s) => s.adult);
  const setAdult = useAdultStore((s) => s.setAdult);
  const asked = useAdultStore((s) => s.asked);
  const setAsked = useAdultStore((s) => s.setAsked);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [openAgeGate, setOpenAgeGate] = useState(false);

  const onToggleAdult = () => {
    const turningOn = adult === 'off';
    if (turningOn && !asked) {
      setOpenAgeGate(true);
      return;
    }
    setAdult(turningOn ? 'on' : 'off');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-base text-[var(--ui-text)]">
            <Link href="/" className="hover:text-[var(--ui-text)]">매일</Link>
            <Link href="/week" className="hover:text-[var(--ui-text)]">요일</Link>
            <Link href="/new" className="hover:text-[var(--ui-text)]">신작</Link>
            <Link href="/complete" className="hover:text-[var(--ui-text)]">완결</Link>
            <Link href="/library" className="hover:text-[var(--ui-text)]">내 서재</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <input
            aria-label="검색"
            placeholder="제목/작가/태그 검색"
            className="hidden md:block h-9 w-56 rounded-full border bg-transparent px-3 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-muted)]"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <button
            onClick={() => toggleTheme()}
            className="h-9 rounded-full border px-3 text-sm"
            style={{ borderColor: 'var(--border-color)', color: 'var(--ui-text)' }}
            title={theme === 'dark' ? '다크모드 ON' : '다크모드 OFF'}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <button
            aria-label={`19 ${adult === 'on' ? 'ON' : 'OFF'}`}
            title={adult === 'on' ? '성인 작품 표시 중' : '성인 작품 숨김 중'}
            onClick={onToggleAdult}
            className={`h-9 rounded-full px-3 text-sm font-medium border`}
            style={adult === 'on' ? { borderColor: 'var(--arata-danger)', color: 'var(--arata-danger)' } : { borderColor: 'var(--border-color)', color: 'var(--ui-text)' }}
          >
            19 {adult === 'on' ? 'ON' : 'OFF'}
          </button>
          <button aria-label="알림" className="h-9 w-9 rounded-full border" />
          <button aria-label="프로필" className="h-9 w-9 rounded-full border" />
        </div>
      </div>
      <AgeGateModal
        open={openAgeGate}
        onCancel={() => setOpenAgeGate(false)}
        onConfirm={() => {
          setAsked(true);
          setAdult('on');
          setOpenAgeGate(false);
        }}
      />
    </header>
  );
}


