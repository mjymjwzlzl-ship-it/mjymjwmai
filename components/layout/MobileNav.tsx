'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Calendar, Home, Library, MessageCircle, Tag } from 'lucide-react';
import { useAdultStore } from '@/store/adult';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const adult = useAdultStore((s) => s.adult);
  const setAdult = useAdultStore((s) => s.setAdult);

  useEffect(() => {
    if (pathname.startsWith('/adult') && adult !== 'on') {
      setAdult('on');
    } else if (!pathname.startsWith('/adult') && adult === 'on') {
      setAdult('off');
    }
  }, [pathname, adult, setAdult]);

  const isWebtoonEpisode = pathname.includes('/episode/');
  const isCharacterChatPage = pathname.includes('/chat/webtoon/') || pathname.includes('/adult/chat/webtoon/');

  if (isWebtoonEpisode || isCharacterChatPage) {
    return null;
  }

  const isAdultMode = adult === 'on' || pathname.startsWith('/adult');
  const navItems = [
    { href: isAdultMode ? '/adult' : '/home', label: t('nav.home'), icon: Home },
    { href: isAdultMode ? '/adult/daily' : '/daily', label: isAdultMode ? t('nav.fullEdition') : t('nav.webtoons'), icon: Calendar },
    { href: isAdultMode ? '/adult/chat' : '/chat', label: t('nav.chat'), icon: MessageCircle },
    { href: '/attendance', label: t('nav.attendance'), icon: Tag },
    { href: isAdultMode ? '/adult/new' : '/new', label: t('nav.new'), icon: Library },
  ];

  const isActive = (href: string) => {
    if (href === '/home') return pathname === '/home' || pathname === '/';
    if (href === '/adult') return pathname === '/adult';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-gray-200 bg-white transition-colors dark:border-gray-800 dark:bg-[#1e1e1e] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-14 items-center justify-around text-center">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full flex-1 flex-col items-center justify-center text-xs transition-colors ${
                active ? 'text-[#00dc64]' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
