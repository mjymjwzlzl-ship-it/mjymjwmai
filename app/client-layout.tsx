'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const [topBannerHidden, setTopBannerHidden] = useState(false);

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

  useEffect(() => {
    const syncTopBannerState = () => {
      setTopBannerHidden(localStorage.getItem('arata-top-benefit-hidden') === 'true');
    };

    syncTopBannerState();
    window.addEventListener('storage', syncTopBannerState);
    window.addEventListener('arata-top-benefit-hidden-change', syncTopBannerState);

    return () => {
      window.removeEventListener('storage', syncTopBannerState);
      window.removeEventListener('arata-top-benefit-hidden-change', syncTopBannerState);
    };
  }, []);

  const isEpisodePage = pathname?.includes('/episode/') || false;
  const isIndividualGamePage = pathname?.match(/^\/games\/[^/]+$/) || false;
  const isCharacterChatPage = pathname?.includes('/chat/webtoon/') || pathname?.includes('/adult/chat/webtoon/') || false;
  const hideLayout = isEpisodePage || isIndividualGamePage || isCharacterChatPage;

  const layoutPadding = topBannerHidden
    ? 'pt-[56px] md:pt-[104px] xl:pt-[104px]'
    : 'pt-[96px] md:pt-[152px] xl:pt-[160px]';

  return (
    <>
      <CopyProtection />

      <main className={`min-h-[calc(100dvh-56px)] bg-gray-50 transition-colors dark:bg-[#121212] ${!hideLayout ? `${layoutPadding} pb-16 lg:pb-0` : 'p-0'}`}>
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
