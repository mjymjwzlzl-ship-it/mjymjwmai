"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Gamepad2,
  Home,
  Image,
  Library,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
  ClipboardList,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAdultStore } from '@/store/adult';
import { useThemeStore } from '@/store/theme';
import SlideMenu from '@/components/ui/SlideMenu';

const AdultVerificationModal = dynamic(() => import('@/components/ui/AdultVerificationModal'), {
  ssr: false,
  loading: () => null,
});

const iconClass = 'h-[18px] w-[18px]';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const adult = useAdultStore((s) => s.adult);
  const setAdult = useAdultStore((s) => s.setAdult);
  const setAsked = useAdultStore((s) => s.setAsked);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [user, setUser] = useState<any>(null);
  const [showAdultVerification, setShowAdultVerification] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSlideMenu, setShowSlideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const adultMode = adult === 'on' || pathname.startsWith('/adult');
  const isEpisodePage = pathname?.includes('/episode/');
  const isCharacterChatPage = pathname?.includes('/character/');
  const isWebtoonDetailPage = pathname?.match(/^\/webtoons\/[^/]+$/);
  const isIndividualGamePage = pathname?.match(/^\/games\/[^/]+$/);
  const shouldHideHeader = isEpisodePage || isCharacterChatPage || isWebtoonDetailPage || isIndividualGamePage;

  const navItems = adultMode
    ? [
        { href: '/adult', label: '홈', icon: <Home className={iconClass} /> },
        { href: '/adult/daily', label: '완전판 웹툰', icon: <Library className={iconClass} /> },
        { href: '/adult/novel', label: '무제한 소설', icon: <BookOpen className={iconClass} /> },
        { href: '/adult/library', label: '화보', icon: <Image className={iconClass} /> },
        { href: '/adult/community', label: '게시판', icon: <ClipboardList className={iconClass} /> },
        { href: '/adult/chat', label: '캐릭터 채팅', icon: <MessageCircle className={iconClass} /> },
        { href: '/adult/games', label: '게임', icon: <Gamepad2 className={iconClass} /> },
      ]
    : [
        { href: '/home', label: '홈', icon: <Home className={iconClass} /> },
        { href: '/daily', label: '무제한 웹툰', icon: <Library className={iconClass} /> },
        { href: '/novel', label: '무제한 소설', icon: <BookOpen className={iconClass} /> },
        { href: '/library', label: '화보', icon: <Image className={iconClass} /> },
        { href: '/community', label: '게시판', icon: <ClipboardList className={iconClass} /> },
        { href: '/chat', label: '캐릭터 채팅', icon: <MessageCircle className={iconClass} /> },
        { href: '/games', label: '게임', icon: <Gamepad2 className={iconClass} /> },
      ];

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');

    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    if (!token) return;

    api.get('/users/me')
      .then((response) => {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      })
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchBox(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&adult=${adultMode}`);
        setSearchResults(response.data.results?.slice(0, 6) || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, adultMode]);

  const isActive = (href: string) => {
    if (href === '/home') return pathname === '/home' || pathname === '/';
    if (href === '/adult') return pathname === '/adult' || pathname === '/adult/home';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const onToggleAdult = () => {
    if (!adultMode) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!user.adultVerified) {
        setShowAdultVerification(true);
        return;
      }

      setAdult('on');
      setAsked(true);
      router.push('/adult');
      return;
    }

    setAdult('off');
    setAsked(true);
    router.push('/home');
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setShowSearchBox(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowProfileMenu(false);
    router.push('/home');
  };

  const handleAdultVerificationSuccess = () => {
    setShowAdultVerification(false);
    const userData = localStorage.getItem('user');

    if (userData) {
      const updatedUser = JSON.parse(userData);
      updatedUser.adultVerified = true;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }

    setAdult('on');
    setAsked(true);
    router.push('/adult');
  };

  if (shouldHideHeader) return null;

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)] transition-colors dark:border-gray-800 dark:bg-[#101010]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={adultMode ? '/adult' : '/home'} className="text-2xl font-black tracking-tight text-[#00dc64]">
            ARATA COMICS
          </Link>

          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={onToggleAdult}
              className={`hidden h-7 items-center rounded-full border px-3 text-xs font-black transition md:inline-flex ${
                adultMode
                  ? 'border-red-400 bg-red-50 text-red-500 dark:bg-red-950/30'
                  : 'border-gray-300 bg-white text-gray-500 hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:bg-transparent'
              }`}
            >
              19 {adultMode ? 'ON' : 'OFF'}
            </button>

            <Link
              href="/attendance"
              className="hidden h-7 items-center rounded-full border border-gray-300 bg-gray-100 px-3 text-xs font-bold text-gray-600 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300 md:inline-flex"
            >
              출석
            </Link>

            <div ref={searchRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSearchBox((value) => !value)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="검색"
              >
                <Search className="h-5 w-5" />
              </button>

              {showSearchBox && (
                <div className="absolute right-0 top-full mt-3 w-[calc(100vw-24px)] max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1e1e1e] sm:w-96">
                  <form onSubmit={handleSearch} className="border-b border-gray-100 p-4 dark:border-gray-700">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="작품명, 작가명, 태그로 검색해보세요"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#2a2a2a] dark:text-white"
                      autoFocus
                    />
                  </form>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {searchLoading && <div className="p-8 text-center text-sm text-gray-500">검색 중...</div>}
                    {!searchLoading && searchQuery && searchResults.length === 0 && (
                      <div className="p-8 text-center text-sm text-gray-500">검색 결과가 없습니다.</div>
                    )}
                    {!searchLoading && searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => router.push(`/webtoons/${result.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-gray-200">
                          <img src={result.thumbnailUrl || result.thumbnail || '/images/placeholder.png'} alt={result.title} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-gray-900 dark:text-white">{result.title}</p>
                          <p className="truncate text-xs text-gray-500">{result.authorName || result.author || 'ARATA'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white md:inline-flex" aria-label="최근 본 작품">
              <Clock className="h-5 w-5" />
            </button>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => user ? setShowProfileMenu((value) => !value) : setShowSlideMenu(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="메뉴"
              >
                {showProfileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              {user && showProfileMenu && (
                <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-2xl dark:border-gray-700 dark:bg-[#1e1e1e]">
                  <div className="border-b border-gray-100 p-4 dark:border-gray-700">
                    <p className="font-bold text-gray-900 dark:text-white">{user.nickname || user.username || '회원'}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => setShowProfileMenu(false)}>
                      <User className="h-4 w-4" /> 내 프로필
                    </Link>
                    <Link href="/favorites" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => setShowProfileMenu(false)}>
                      <Library className="h-4 w-4" /> 찜한 작품
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => setShowProfileMenu(false)}>
                      <Settings className="h-4 w-4" /> 설정
                    </Link>
                    <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                      <LogOut className="h-4 w-4" /> 로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="hidden h-12 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-[#151515] md:block">
          <div className="mx-auto flex h-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-full min-w-[118px] items-center justify-center gap-2 border-l border-gray-200 px-6 text-sm font-bold transition last:border-r dark:border-gray-800 ${
                  isActive(item.href)
                    ? 'bg-gray-50 text-[#00c85a] dark:bg-[#242424] dark:text-[#00dc64]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-[#202020] dark:hover:text-[#00dc64]'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <AdultVerificationModal
        isOpen={showAdultVerification}
        onClose={() => setShowAdultVerification(false)}
        onSuccess={handleAdultVerificationSuccess}
        mode="simple"
      />
      <SlideMenu isOpen={showSlideMenu} onClose={() => setShowSlideMenu(false)} />
    </>
  );
}
