'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { markNavigation } from '@/lib/nav-history';
import dynamic from 'next/dynamic';
import MobileNav from '@/components/layout/MobileNav';
import { useInteractionStore } from '@/store/interaction';

const CopyProtection = dynamic(() => import('@/components/ui/CopyProtection'), {
  ssr: false,
  loading: () => null,
});

const NotificationManager = dynamic(() => import('@/components/providers/NotificationManager'), {
  ssr: false,
  loading: () => null,
});

const LaunchPromoModal = dynamic(() => import('@/components/ui/LaunchPromoModal'), {
  ssr: false,
  loading: () => null,
});

const CookieConsentBanner = dynamic(() => import('@/components/ui/CookieConsentBanner'), {
  ssr: false,
  loading: () => null,
});

const LoginModal = dynamic(() => import('@/components/ui/LoginModal'), {
  ssr: false,
  loading: () => null,
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const setHasInteracted = useInteractionStore((state) => state.setHasInteracted);

  // 뒤로가기 버튼이 이전 목록으로 돌아갈 수 있도록 사이트 내 이동 횟수를 기록
  useEffect(() => {
    markNavigation();
  }, [pathname]);

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [setHasInteracted]);


  const isEpisodePage = pathname?.includes('/episode/') || false;
  const isIndividualGamePage = pathname?.match(/^\/games\/[^/]+$/) || false;
  const isCharacterChatPage = pathname?.includes('/chat/webtoon/') || pathname?.includes('/adult/chat/webtoon/') || false;
  const hideLayout = isEpisodePage || isIndividualGamePage || isCharacterChatPage;
  const hasContentSubnav = Boolean(
    pathname?.startsWith('/daily') || pathname?.startsWith('/books') || pathname?.startsWith('/novel'),
  );

  const layoutPadding = hasContentSubnav
    ? 'arata-shell arata-shell-subnav'
    : 'arata-shell';

  return (
    <>
      <CopyProtection />

      <main className={`min-h-[calc(100dvh-56px)] bg-gray-50 transition-colors dark:bg-[#121212] ${!hideLayout ? layoutPadding : 'p-0'}`}>
        {children}
      </main>

      <div style={{ display: hideLayout ? 'none' : 'block' }}>
        <MobileNav />
      </div>

      {!hideLayout && <LaunchPromoModal />}
      {!hideLayout && <CookieConsentBanner />}
      <LoginModal />
      <NotificationManager />
    </>
  );
}
