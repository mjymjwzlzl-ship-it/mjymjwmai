'use client';
import { api } from '@/lib/api';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Book,
  BookOpen,
  Clock,
  ChevronDown,
  Bell,
  Gamepad2,
  Gift,
  GalleryVertical,
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
  User,
  X,
} from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { useAdultModeStore } from '@/store/adultMode';
import { useLoginModalStore } from '@/store/loginModal';
import AgeGateModal from '@/components/ui/AgeGateModal';
import { LANGUAGES, Locale, useLanguage } from '@/components/providers/LanguageProvider';
import { useDragScroll } from '@/lib/use-drag-scroll';

const navItems = [
  { href: '/home', labelKey: 'nav.home', icon: Home, mobilePrimary: true },
  // 웹툰 = 세로로 이어지는 컷 (내 서재의 책장 아이콘과 구분)
  { href: '/daily', labelKey: 'nav.webtoons', icon: GalleryVertical, mobilePrimary: true },
  { href: '/books', labelKey: 'nav.books', icon: Book, mobilePrimary: true },
  { href: '/novel', labelKey: 'nav.novels', icon: BookOpen, mobilePrimary: true },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { href: '#shortform', labelKey: 'nav.shortAnime', icon: PlaySquare, comingSoon: true },
  { href: '/gallery', labelKey: 'nav.gallery', icon: Image },
  { href: '/events', labelKey: 'nav.events', icon: Gift },
  { href: '/community', labelKey: 'nav.community', icon: ClipboardList },
  { href: '/games', labelKey: 'nav.games', icon: Gamepad2 },
];

const comicSubnavItems = [
  { value: 'all', labelKey: 'category.all' },
  { value: 'action', labelKey: 'category.action' },
  { value: 'school', labelKey: 'category.school' },
  { value: 'comedy', labelKey: 'category.comedy' },
  { value: 'romance', labelKey: 'category.romance' },
  { value: 'fantasy', labelKey: 'category.fantasy' },
  { value: 'martial', labelKey: 'category.martial' },
  { value: 'drama', labelKey: 'category.drama' },
  { value: 'thriller', labelKey: 'category.thriller' },
  { value: 'sports', labelKey: 'category.sports' },
  { value: 'daily', labelKey: 'category.daily' },
];

const novelSubnavItems = [
  { value: 'all', labelKey: 'category.all' },
  { value: 'new', labelKey: 'category.new' },
  { value: 'ranking', labelKey: 'category.ranking' },
  { value: 'fantasy', labelKey: 'category.fantasy' },
  { value: 'martial', labelKey: 'category.martial' },
  { value: 'romance', labelKey: 'category.romance' },
  { value: 'modern', labelKey: 'category.modern' },
  { value: 'lightNovel', labelKey: 'category.lightNovel' },
  { value: 'bl', labelKey: 'BL' },
  { value: 'gl', labelKey: 'GL' },
];

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


  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ name: string } | null>(null);
  // 알림함: 로그인 상태면 안 읽은 알림 수를 1분마다·페이지 이동 때 확인
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [activeSubnav, setActiveSubnav] = useState('all');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const categoryPanelRef = useRef<HTMLElement | null>(null);
  const categoryToggleRef = useRef<HTMLButtonElement | null>(null);
  const categoryToggleLabel = {
    ko: categoriesExpanded ? '장르 접기' : '전체 장르 펼치기',
    en: categoriesExpanded ? 'Collapse genres' : 'Show all genres',
    ja: categoriesExpanded ? 'ジャンルを閉じる' : 'すべてのジャンル',
    fr: categoriesExpanded ? 'Réduire les genres' : 'Tous les genres',
  }[locale];
  const primaryNavScrollRef = useDragScroll<HTMLDivElement>();
  const categoryNavScrollRef = useDragScroll<HTMLDivElement>();
  const contentPath = pathname?.startsWith('/daily')
    ? '/daily'
    : pathname?.startsWith('/books')
      ? '/books'
      : pathname?.startsWith('/novel')
        ? '/novel'
        : null;
  // [성인] 장르 탭: 성인인증 후 19 ON 일 때 웹툰 목록에서만 보인다
  const contentSubnavItems = contentPath === '/novel'
    ? novelSubnavItems
    : adultEnabled && contentPath === '/daily'
      ? [...comicSubnavItems, { value: 'adult', labelKey: 'category.adult' }]
      : comicSubnavItems;

  useEffect(() => {
    if (!adultEnabled && activeSubnav === 'adult') setActiveSubnav('all');
  }, [adultEnabled, activeSubnav]);

  useEffect(() => {
    const rail = categoryNavScrollRef.current;
    const selected = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !selected) return;
    const railRect = rail.getBoundingClientRect();
    const itemRect = selected.getBoundingClientRect();
    if (itemRect.left < railRect.left || itemRect.right > railRect.right) {
      rail.scrollTo({ left: rail.scrollLeft + itemRect.left - railRect.left - (rail.clientWidth - itemRect.width) / 2, behavior: 'auto' });
    }
  }, [activeSubnav, contentPath, categoryNavScrollRef]);

  useEffect(() => { setCategoriesExpanded(false); }, [pathname]);

  useEffect(() => {
    if (!categoriesExpanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!categoryPanelRef.current?.contains(event.target as Node)) setCategoriesExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCategoriesExpanded(false);
        categoryToggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [categoriesExpanded]);

  useEffect(() => {
    const syncSubnav = () => {
      setActiveSubnav(new URLSearchParams(window.location.search).get('category') || 'all');
    };
    syncSubnav();
    window.addEventListener('popstate', syncSubnav);
    return () => window.removeEventListener('popstate', syncSubnav);
  }, [pathname]);

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

  // ?섏씠吏 ?대룞 ???대젮 ?덈뒗 ?⑤꼸 ?リ린
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getTargets = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select, [tabindex="0"]') || []);
    getTargets()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); }
      if (event.key !== 'Tab') return;
      const targets = getTargets();
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [menuOpen]);

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

  const verifyAdultMode = async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) { setAdultEnabled(false); setLoginModalOpen(true); return; }
    try {
      const { data } = await api.get('/auth/pass/config');
      if (token !== (localStorage.getItem('authToken') || localStorage.getItem('token'))) return;
      if (data.adultVerified === true) { setAdultEnabled(true); setAgeGateOpen(false); }
      else { setAdultEnabled(false); setAgeGateOpen(true); }
    } catch { setAdultEnabled(false); }
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
    void verifyAdultMode();
  };

  useEffect(() => {
    if (!sessionUser) { setUnreadNotifications(0); return; }
    let alive = true;
    const load = () => api.get('/notifications/unread-count')
      .then(({ data }) => { if (alive) setUnreadNotifications(Number(data?.unread) || 0); })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 60 * 1000);
    window.addEventListener('notificationsUpdated', load);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('notificationsUpdated', load); };
  }, [sessionUser, pathname]);

  // 로그인 상태: 토큰이 있으면 로그인으로 본다 (메뉴 하단 로그인/로그아웃 버튼)
  const readSession = () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) { setSessionUser(null); return; }
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setSessionUser({ name: user?.nickname || user?.username || user?.name || (user?.email ? String(user.email).split('@')[0] : '') });
    } catch {
      setSessionUser({ name: '' });
    }
  };

  useEffect(() => {
    readSession();
    const onStorage = () => readSession();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onStorage);
    };
  }, [pathname, menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAdultEnabled(false);
    setSessionUser(null);
    setMenuOpen(false);
    window.location.href = '/home';
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
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-3 sm:px-6 md:h-14 lg:px-8">
        <Link href="/home" className="shrink-0 whitespace-nowrap text-lg font-black tracking-tight text-[#00dc64] sm:text-xl md:text-2xl">
          ARATA COMICS
        </Link>

        <div className="flex shrink-0 items-center gap-0 text-gray-500 dark:text-gray-400 sm:gap-1 md:gap-2">
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:h-9 md:w-9"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:h-9 md:w-9"
            aria-label={t('common.search')}
          >
            <Search className="h-5 w-5" />
          </Link>
          {sessionUser && (
            <Link
              href="/notifications"
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:h-9 md:w-9 ${
                pathname?.startsWith('/notifications') ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white' : ''
              }`}
              aria-label={unreadNotifications > 0 ? `알림함 (안 읽은 알림 ${unreadNotifications}개)` : '알림함'}
              title="알림함"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white md:right-0 md:top-0">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/my/library?tab=viewed"
            className={`hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:inline-flex ${
              pathname?.startsWith('/my/library') ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white' : ''
            }`}
            aria-label={t('common.myLibrary')}
            title={t('common.myLibrary')}
          >
            <Library className="h-5 w-5" />
          </Link>
          {sessionUser ? (
            <Link
              href="/profile"
              className={`hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:inline-flex ${
                pathname?.startsWith('/profile') ? 'bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white' : ''
              }`}
              aria-label={t('common.myPage')}
              title={t('common.myPage')}
            >
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:inline-flex"
              aria-label={t('common.loginJoin')}
              title={t('common.loginJoin')}
            >
              <User className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:h-9 md:w-9"
            aria-label={t('common.openMenu')}
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="h-12 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-[#151515]">
        <div ref={primaryNavScrollRef} className="mx-auto flex h-full max-w-7xl cursor-grab touch-auto overflow-x-auto overscroll-x-contain px-0 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6 lg:px-8">
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
                  className="flex h-full min-w-max shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-l border-gray-200 px-3 text-xs font-bold text-gray-600 transition last:border-r hover:bg-gray-50 hover:text-[#00a84c] dark:border-gray-800 dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64] md:min-w-[118px] md:gap-2 md:px-6 md:text-sm"
                >
                  <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                  {label}
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-full min-w-max shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-l border-gray-200 px-3 text-xs font-bold transition last:border-r dark:border-gray-800 md:min-w-[118px] md:gap-2 md:px-6 md:text-sm ${
                  isActive
                    ? 'bg-gray-50 text-[#00c85a] dark:bg-[#242424] dark:text-[#00dc64]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]'
                }`}
              >
                <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {contentPath && (
        <nav
          ref={categoryPanelRef}
          aria-label={t('common.category')}
          className="relative h-12 border-t border-gray-200 bg-[#f8f9fa] dark:border-gray-800 dark:bg-[#1b1b1b]"
        >
          <div className="mx-auto flex h-full max-w-7xl">
          <div ref={categoryNavScrollRef} className="flex h-full min-w-0 flex-1 cursor-grab touch-auto items-center gap-1 overflow-x-auto overscroll-x-contain px-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2 sm:px-4 md:px-6 lg:px-8">
            {contentSubnavItems.map((item) => {
              const active = activeSubnav === item.value;
              const href = item.value === 'all' ? contentPath : `${contentPath}?category=${item.value}`;
              return (
                <Link
                  key={item.value}
                  href={href}
                  onClick={() => {
                    setActiveSubnav(item.value);
                    window.dispatchEvent(new CustomEvent('arata-content-category-change', { detail: item.value }));
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-sm font-black leading-none transition md:h-8 md:px-4 ${
                    active
                      ? 'bg-[#00dc64] text-black shadow-md shadow-green-500/15'
                      : 'bg-gray-200/70 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
          <button
            ref={categoryToggleRef}
            type="button"
            aria-label={categoryToggleLabel}
            aria-expanded={categoriesExpanded}
            aria-controls="mobile-category-panel"
            onClick={() => setCategoriesExpanded(value => !value)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-gray-200 bg-[#f8f9fa] text-gray-700 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-200 md:hidden"
          >
            <ChevronDown aria-hidden="true" className={`h-5 w-5 transition-transform ${categoriesExpanded ? 'rotate-180' : ''}`} />
          </button>
          </div>
          {categoriesExpanded && (
            <div id="mobile-category-panel" className="absolute inset-x-0 top-full z-20 grid max-h-[60dvh] grid-cols-3 gap-1 overflow-y-auto overscroll-contain border-b border-gray-200 bg-[#f8f9fa] p-2 shadow-lg dark:border-gray-700 dark:bg-[#1b1b1b] md:hidden">
              {contentSubnavItems.map(item => (
                <Link
                  key={item.value}
                  href={item.value === 'all' ? contentPath : `${contentPath}?category=${item.value}`}
                  aria-current={activeSubnav === item.value ? 'page' : undefined}
                  onClick={() => {
                    setActiveSubnav(item.value);
                    setCategoriesExpanded(false);
                    categoryToggleRef.current?.focus();
                    window.dispatchEvent(new CustomEvent('arata-content-category-change', { detail: item.value }));
                  }}
                  className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 py-2 text-center text-sm font-bold ${activeSubnav === item.value ? 'bg-[#00dc64] text-black' : 'text-gray-700 dark:text-gray-200'}`}
                >{t(item.labelKey)}</Link>
              ))}
            </div>
          )}
        </nav>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-[1100]">
          <button
            type="button"
            aria-label={t('common.closeMenu')}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/45"
          />
          <div ref={menuRef} role="dialog" aria-modal="true" aria-label={t('common.menu')} className="absolute right-0 top-0 flex h-[100dvh] w-72 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-[#161616]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800">
              <span className="text-lg font-black text-[#00dc64]">{t('common.menu')}</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t('common.closeMenu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
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
                      className={`h-11 rounded-lg border text-xs font-black transition ${
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
            <div className="shrink-0 border-t border-gray-200 p-4 dark:border-gray-800">
              {sessionUser ? (
                <div className="space-y-2">
                  {sessionUser.name && (
                    <p className="truncate text-center text-xs font-bold text-gray-500 dark:text-gray-400">
                      {t('common.loggedInAs', { name: sessionUser.name })}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/my/library"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-300 text-sm font-black text-gray-700 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:text-gray-200"
                    >
                      <Library className="h-4 w-4" />
                      {t('common.myLibrary')}
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-300 text-sm font-black text-gray-700 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:text-gray-200"
                    >
                      <User className="h-4 w-4" />
                      {t('common.myPage')}
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-black text-white transition hover:bg-black dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    {t('common.logout')}
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}

      <AgeGateModal
        open={ageGateOpen}
        onConfirm={() => {
          void verifyAdultMode();
        }}
        onCancel={() => setAgeGateOpen(false)}
      />
      {comingSoonOpen && (
        <div className="fixed left-1/2 top-[116px] z-[1200] w-[calc(100vw-32px)] max-w-sm -translate-x-1/2 rounded-xl border border-[#00dc64]/30 bg-white px-4 py-3 text-center text-sm font-black text-gray-950 shadow-2xl dark:bg-[#1b1b1b] dark:text-white md:top-[124px]">
          {t('common.comingSoonShortAnime')}
        </div>
      )}
    </header>
  );
}
