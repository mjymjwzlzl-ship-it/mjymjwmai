'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Clock,
  Gamepad2,
  Globe2,
  Home,
  Image,
  Library,
  Menu,
  MessageCircle,
  Moon,
  PlaySquare,
  Search,
  ClipboardList,
  Sun,
  X,
} from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { useAdultModeStore } from '@/store/adultMode';
import { useLoginModalStore } from '@/store/loginModal';
import AgeGateModal from '@/components/ui/AgeGateModal';
import { LANGUAGES, Locale, useLanguage } from '@/components/providers/LanguageProvider';
import { getImageUrl } from '@/lib/utils';

const navItems = [
  { href: '/home', labelKey: 'nav.home', icon: Home },
  { href: '/daily', labelKey: 'nav.webtoons', icon: Library },
  { href: '/novel', labelKey: 'nav.novels', icon: BookOpen },
  { href: '/library', labelKey: 'nav.gallery', icon: Image },
  { href: '/community', labelKey: 'nav.community', icon: ClipboardList },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '#shortform', labelKey: 'nav.shortAnime', icon: PlaySquare, comingSoon: true },
  { href: '/games', labelKey: 'nav.games', icon: Gamepad2 },
];

interface ViewedWebtoon {
  webtoonId: string;
  webtoonTitle: string;
  lastEpisode?: number;
  viewedAt?: string;
  thumbnailUrl?: string;
}

export default function ReferenceHeader() {
  const pathname = usePathname();
  const { locale, setLanguage, t } = useLanguage();
  const storeTheme = useThemeStore((state) => state.theme);
  const setStoreTheme = useThemeStore((state) => state.set);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const adultEnabled = useAdultModeStore((state) => state.enabled);
  const setAdultEnabled = useAdultModeStore((state) => state.setEnabled);
  const hydrateAdultMode = useAdultModeStore((state) => state.hydrate);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const setLoginModalOpen = useLoginModalStore((state) => state.setOpen);

  const [recentOpen, setRecentOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<ViewedWebtoon[]>([]);
  const recentRef = useRef<HTMLDivElement | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  useEffect(() => {
    setTheme(storeTheme);
  }, [storeTheme]);

  useEffect(() => {
    const persisted = localStorage.getItem('theme-storage');
    const persistedTheme = persisted ? JSON.parse(persisted)?.state?.theme : null;
    const initialTheme = persistedTheme === 'dark' || document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(initialTheme);
    setTheme(initialTheme);
    setStoreTheme(initialTheme);
    hydrateAdultMode();
  }, [setStoreTheme, hydrateAdultMode]);

  // 理쒓렐 蹂??묓뭹 ?쒕∼?ㅼ슫 諛붽묑 ?대┃ ???リ린
  useEffect(() => {
    if (!recentOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (recentRef.current && !recentRef.current.contains(event.target as Node)) {
        setRecentOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [recentOpen]);

  // ?섏씠吏 ?대룞 ???대젮 ?덈뒗 ?⑤꼸 ?リ린
  useEffect(() => {
    setMenuOpen(false);
    setRecentOpen(false);
  }, [pathname]);

  const applyTheme = (nextTheme: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(nextTheme === 'dark' ? 'theme-dark' : 'theme-light');
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setTheme(nextTheme);
    setStoreTheme(nextTheme);
    localStorage.setItem('theme-storage', JSON.stringify({ state: { theme: nextTheme }, version: 0 }));
  };

  const handleAdultToggle = () => {
    if (adultEnabled) {
      setAdultEnabled(false);
      return;
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      setLoginModalOpen(true);
      return;
    }
    setAgeGateOpen(true);
  };

  const handleRecentToggle = () => {
    if (!recentOpen) {
      try {
        const history = JSON.parse(localStorage.getItem('viewedWebtoons') || '[]');
        setRecentItems(Array.isArray(history) ? history.slice(0, 6) : []);
      } catch {
        setRecentItems([]);
      }
    }
    setRecentOpen((open) => !open);
  };

  const handleComingSoon = () => {
    setMenuOpen(false);
    setComingSoonOpen(true);
    window.setTimeout(() => setComingSoonOpen(false), 2200);
  };

  return (
    <header
      data-reference-header="true"
      className="fixed left-0 right-0 top-0 z-[1000] border-b border-gray-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)] dark:border-gray-800 dark:bg-[#101010]"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="text-2xl font-black tracking-tight text-[#00dc64]">
          ARATA COMICS
        </Link>

        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <label className="hidden h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 text-xs font-black text-gray-600 transition hover:border-[#00dc64] dark:border-gray-700 dark:bg-[#1a1a1a] dark:text-gray-300 md:inline-flex">
            <Globe2 className="h-4 w-4" />
            <select
              value={locale}
              onChange={(event) => setLanguage(event.target.value as Locale)}
              aria-label={t('common.language')}
              className="cursor-pointer bg-transparent text-xs font-black outline-none dark:bg-[#1a1a1a]"
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.short}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleThemeToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
            title={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={handleAdultToggle}
            aria-pressed={adultEnabled}
            aria-label={adultEnabled ? t('common.hideAdult') : t('common.showAdult')}
            className={`hidden h-7 items-center rounded-full border px-3 text-xs font-black transition md:inline-flex ${
              adultEnabled
                ? 'border-[#00dc64] bg-[#00dc64]/10 text-[#00a84c] hover:bg-[#00dc64]/20 dark:text-[#00dc64]'
                : 'border-gray-300 bg-white text-gray-500 hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:bg-transparent'
            }`}
          >
            {adultEnabled ? '19 ON' : '19 OFF'}
          </button>
          <Link href="/attendance" className="hidden h-7 items-center rounded-full border border-gray-300 bg-gray-100 px-3 text-xs font-bold text-gray-600 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300 md:inline-flex">
            {t('nav.attendance')}
          </Link>
          <Link
            href="/search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('common.search')}
          >
            <Search className="h-5 w-5" />
          </Link>
          <div className="relative hidden md:block" ref={recentRef}>
            <button
              type="button"
              onClick={handleRecentToggle}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white ${
                recentOpen ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white' : ''
              }`}
              aria-label={t('recent.title')}
              aria-expanded={recentOpen}
            >
              <Clock className="h-5 w-5" />
            </button>
            {recentOpen && (
              <div className="absolute right-0 top-11 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#1b1b1b]">
                <div className="border-b border-gray-100 px-4 py-3 text-sm font-black text-gray-900 dark:border-gray-800 dark:text-white">
                  {t('recent.title')}
                </div>
                {recentItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('recent.empty')}
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {recentItems.map((item) => (
                      <li key={item.webtoonId}>
                        <Link
                          href={`/webtoons/${item.webtoonId}`}
                          onClick={() => setRecentOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <span className="h-12 w-9 shrink-0 overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
                            {item.thumbnailUrl ? (
                              <img
                                src={getImageUrl(item.thumbnailUrl, { width: 120 })}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">
                              {item.webtoonTitle}
                            </span>
                            {item.lastEpisode ? (
                              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                                {t('recent.episode', { episode: item.lastEpisode })}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('common.openMenu')}
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="hidden h-12 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-[#151515] md:block">
        <div className="mx-auto flex h-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey);
            const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href));
            if (item.comingSoon) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={handleComingSoon}
                  className="flex h-full min-w-[118px] items-center justify-center gap-2 whitespace-nowrap border-l border-gray-200 px-6 text-sm font-bold text-gray-600 transition last:border-r hover:bg-gray-50 hover:text-[#00a84c] dark:border-gray-800 dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]"
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-full min-w-[118px] items-center justify-center gap-2 whitespace-nowrap border-l border-gray-200 px-6 text-sm font-bold transition last:border-r dark:border-gray-800 ${
                  isActive
                    ? 'bg-gray-50 text-[#00c85a] dark:bg-[#242424] dark:text-[#00dc64]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[1100]">
          <button
            type="button"
            aria-label={t('common.closeMenu')}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/45"
          />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-[#161616]">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800">
              <span className="text-lg font-black text-[#00dc64]">{t('common.menu')}</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t('common.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const label = t(item.labelKey);
                const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href));
                if (item.comingSoon) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={handleComingSoon}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3 text-sm font-bold transition ${
                      isActive
                        ? 'bg-gray-50 text-[#00c85a] dark:bg-[#242424] dark:text-[#00dc64]'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                  </Link>
                );
              })}
              <div className="mx-5 my-2 border-t border-gray-100 dark:border-gray-800" />
              <div className="px-5 py-3">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-400">{t('common.language')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => setLanguage(language.code)}
                      className={`h-9 rounded-lg border text-xs font-black transition ${
                        locale === language.code
                          ? 'border-[#00dc64] bg-[#00dc64] text-black'
                          : 'border-gray-200 text-gray-600 hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {language.short}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mx-5 my-2 border-t border-gray-100 dark:border-gray-800" />
              <Link
                href="/attendance"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]"
              >
                <Clock className="h-[18px] w-[18px]" />
                {t('common.checkIn')}
              </Link>
              <button
                type="button"
                onClick={handleAdultToggle}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-[#202020]"
              >
                {t('common.displayAdult')}
                <span
                  className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-black ${
                    adultEnabled
                      ? 'border-[#00dc64] bg-[#00dc64]/10 text-[#00a84c] dark:text-[#00dc64]'
                      : 'border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  {adultEnabled ? '19 ON' : '19 OFF'}
                </span>
              </button>
            </nav>
            <div className="border-t border-gray-200 p-5 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setLoginModalOpen(true);
                }}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-[#00dc64] text-sm font-black text-black transition hover:bg-[#00c85a]"
              >
                {t('common.loginJoin')}
              </button>
            </div>
          </div>
        </div>
      )}

      <AgeGateModal
        open={ageGateOpen}
        onConfirm={() => {
          setAdultEnabled(true);
          setAgeGateOpen(false);
        }}
        onCancel={() => setAgeGateOpen(false)}
      />
      {comingSoonOpen && (
        <div className="fixed left-1/2 top-[112px] z-[1200] w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 rounded-xl border border-[#00dc64]/30 bg-white px-4 py-3 text-center text-sm font-black text-gray-950 shadow-2xl dark:bg-[#1b1b1b] dark:text-white md:top-[176px] xl:top-[192px]">
          {t('common.comingSoonShortAnime')}
        </div>
      )}
    </header>
  );
}
