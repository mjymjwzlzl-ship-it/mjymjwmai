'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Book,
  BookOpen,
  ChevronDown,
  Gamepad2,
  Home,
  Heart,
  Image,
  Library,
  Menu,
  MessageCircle,
  Moon,
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
import { useDragScroll } from '@/lib/use-drag-scroll';
import { api } from '@/lib/api';

const mainNavItems = [
  { href: '/home', labelKey: 'nav.home', icon: Home },
  { href: '/new', labelKey: 'nav.new', icon: BookOpen },
  { href: '/complete', labelKey: 'nav.complete', icon: Library },
  { href: '/popular', labelKey: 'nav.popular', icon: Heart },
  { href: '/daily', labelKey: 'nav.genres', icon: Book },
  { href: '/gallery', labelKey: 'nav.gallery', icon: Image },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
];
const extraNavItems = [
  { href: '/books', labelKey: 'nav.books', icon: Book },
  { href: '/novel', labelKey: 'nav.novels', icon: BookOpen },
  { href: '/community', labelKey: 'nav.community', icon: ClipboardList },
  { href: '/games', labelKey: 'nav.games', icon: Gamepad2 },
];

const comicSubnavItems = [
  { value: 'all', labelKey: 'category.all' },
  { value: 'new', labelKey: 'category.new' },
  { value: 'ranking', labelKey: 'category.ranking' },
  { value: 'action', labelKey: 'category.action' },
  { value: 'school', labelKey: 'category.school' },
  { value: 'comedy', labelKey: 'category.comedy' },
  { value: 'realtime', labelKey: 'category.realtime' },
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
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const { locale, setLanguage, t } = useLanguage();
  const storeTheme = useThemeStore((state) => state.theme);
  const setStoreTheme = useThemeStore((state) => state.set);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const adultEnabled = useAdultModeStore((state) => state.enabled);
  const setAdultEnabled = useAdultModeStore((state) => state.setEnabled);
  const hydrateAdultMode = useAdultModeStore((state) => state.hydrate);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const adultCheckInFlight = useRef(false);
  const setLoginModalOpen = useLoginModalStore((state) => state.setOpen);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
  const navItems = [...mainNavItems, ...extraNavItems].map(item => ({ ...item, href: adultEnabled && ['/home', '/new', '/complete', '/daily', '/chat', '/gallery', '/popular'].includes(item.href) ? (item.href === '/home' ? '/adult' : item.href === '/gallery' ? '/adult/library' : item.href === '/popular' ? '/adult/daily?category=ranking' : '/adult' + item.href) : item.href }));
  const primaryItems = navItems.slice(0, mainNavItems.length);
  const isNavActive = (href: string) => href === '/home' ? pathname === '/' || pathname === '/home' : href === '/adult' ? pathname === '/adult' || pathname === '/adult/home' : href.includes('?') ? pathname === href.split('?')[0] && activeSubnav === 'ranking' : pathname === href;
  const primaryNavScrollRef = useDragScroll<HTMLDivElement>();
  const categoryNavScrollRef = useDragScroll<HTMLDivElement>();
  const contentPath = pathname?.startsWith('/daily')
    ? '/daily'
    : pathname?.startsWith('/books')
      ? '/books'
      : pathname?.startsWith('/novel')
        ? '/novel'
        : null;
  const contentSubnavItems = contentPath === '/novel' ? novelSubnavItems : comicSubnavItems;

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
    const syncSession = () => setAuthenticated(Boolean(localStorage.getItem('authToken') || localStorage.getItem('token')));
    syncSession();
    window.addEventListener('userLogin', syncSession);
    window.addEventListener('loginStateChanged', syncSession);
    window.addEventListener('storage', syncSession);
    return () => { window.removeEventListener('userLogin', syncSession); window.removeEventListener('loginStateChanged', syncSession); window.removeEventListener('storage', syncSession); };
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
    if (adultCheckInFlight.current) return;
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) { setAdultEnabled(false); setLoginModalOpen(true); return; }
    adultCheckInFlight.current = true;
    try {
      const { data } = await api.get('/users/me');
      // An account switch/logout while this request is running must not enable it.
      if (token !== (localStorage.getItem('authToken') || localStorage.getItem('token'))) return;
      if (data.adultVerified === true) {
        setAdultEnabled(true);
        setAgeGateOpen(false);
      } else {
        setAdultEnabled(false);
        setAgeGateOpen(true);
      }
    } catch { setAdultEnabled(false); }
    finally { adultCheckInFlight.current = false; }
  };

  const handleAdultToggle = () => {
    if (adultEnabled) {
      setAdultEnabled(false);
      if (pathname.startsWith('/adult')) router.push('/home');
      return;
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      setLoginModalOpen(true);
      return;
    }
    void verifyAdultMode();
  };

  return (
    <header
      data-reference-header="true"
      className="fresh-header fixed left-0 right-0 top-0 z-[1000] border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#101a14]"
    >
      <div className="fresh-header-row">
        <Link href={adultEnabled ? '/adult' : '/home'} className="fresh-logo">ARATA COMICS</Link>
        <nav className="fresh-desktop-nav" aria-label={t('common.menu')}>
          {primaryItems.map(item => <Link key={item.labelKey} href={item.href} aria-current={isNavActive(item.href) ? 'page' : undefined}>{t(item.labelKey)}</Link>)}
        </nav>
        <form action="/search" className="fresh-search" role="search"><Search size={18} /><input name="q" aria-label={t('common.search')} placeholder={locale === 'ko' ? '작품명, 작가명으로 검색하세요.' : t('common.search')} /></form>
        <div className="fresh-header-tools">
          <button type="button" className={'fresh-adult-toggle ' + (adultEnabled ? 'is-enabled' : '')} onClick={handleAdultToggle} aria-pressed={adultEnabled} aria-label={adultEnabled ? t('common.hideAdult') : t('common.showAdult')}>19 <span>{adultEnabled ? 'ON' : 'OFF'}</span></button>
          <Link href="/search" className="fresh-mobile-search" aria-label={t('common.search')}><Search size={21} /></Link>
          <button type="button" className="fresh-theme-toggle" onClick={handleThemeToggle} aria-label={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          {authenticated ? <Link href="/profile" className="fresh-login">MY</Link> : <button type="button" className="fresh-login" onClick={() => setLoginModalOpen(true)}>{t('common.loginJoin')}</button>}
          <button type="button" className="fresh-menu-button" onClick={() => setMenuOpen(true)} aria-label={t('common.openMenu')} aria-expanded={menuOpen}><Menu size={22} /></button>
        </div>
      </div>
      <nav className="fresh-mobile-nav" aria-label={t('common.menu')}>
        <div ref={primaryNavScrollRef}>
          {primaryItems.map(item => <Link key={item.labelKey} href={item.href} aria-current={isNavActive(item.href) ? 'page' : undefined}>{t(item.labelKey)}</Link>)}
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
                const isActive = isNavActive(item.href);
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
              <button type="button" onClick={handleThemeToggle} className="flex min-h-11 w-full items-center gap-3 px-5 text-sm font-bold">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}</button>
              <Link
                href="/attendance"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]"
              >
                <BookOpen className="h-[18px] w-[18px]" />
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
          void verifyAdultMode();
        }}
        onCancel={() => setAgeGateOpen(false)}
      />

    </header>
  );
}
