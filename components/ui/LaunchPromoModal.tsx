'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { localizedPromoAsset } from '@/lib/promo-assets';

const STORAGE_KEY = 'arata-launch-promo-dismissed-v7';
const ONE_DAY = 24 * 60 * 60 * 1000;

const modalLabels: Record<Locale, { aria: string; close: string; cta: string; today: string }> = {
  ko: {
    aria: 'ARATA 창립회원 프로모션',
    close: '팝업 닫기',
    cta: '무제한 감상 시작하기',
    today: '오늘 하루 보지 않기',
  },
  en: {
    aria: 'ARATA founding member promotion',
    close: 'Close popup',
    cta: 'Start unlimited reading',
    today: "Don't show today",
  },
  ja: {
    aria: 'ARATA創立会員プロモーション',
    close: 'ポップアップを閉じる',
    cta: '読み放題を始める',
    today: '今日は表示しない',
  },
  fr: {
    aria: 'Promotion membre fondateur ARATA',
    close: 'Fermer la fenêtre',
    cta: 'Commencer en illimité',
    today: "Ne plus afficher aujourd'hui",
  },
};

export default function LaunchPromoModal() {
  const { locale } = useLanguage();
  const labels = modalLabels[locale] || modalLabels.ko;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    const maybeOpen = () => {
      const dismissedUntil = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
      if (!dismissedUntil || dismissedUntil < Date.now()) {
        timer = window.setTimeout(() => setOpen(true), 450);
      }
    };

    maybeOpen();
    window.addEventListener('arata-cookie-consent-accepted', maybeOpen);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('arata-cookie-consent-accepted', maybeOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeForSession();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const closeForToday = () => {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + ONE_DAY));
    setOpen(false);
  };

  const closeForSession = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.aria}
        className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] bg-transparent shadow-2xl"
      >
        <div className="relative aspect-[758/1011] overflow-hidden rounded-[24px]">
          <img
            key={`launch-promo-${locale}`}
            src={localizedPromoAsset(locale, 'arata-launch-promo-banner-v4.png', 'image2-ja-20260710')}
            alt=""
            className="block h-full w-full select-none object-contain"
            draggable={false}
          />

          <button
            type="button"
            onClick={closeForSession}
            aria-label={labels.close}
            className="absolute right-[4.5%] top-[2.8%] h-[8.5%] w-[13%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />

          <Link
            href="/register"
            onClick={closeForToday}
            aria-label={labels.cta}
            className="absolute inset-x-[7%] bottom-[9%] h-[10%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />

          <button
            type="button"
            onClick={closeForToday}
            aria-label={labels.today}
            className="absolute inset-x-[31%] bottom-[2.5%] h-[4.5%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
        </div>
      </div>
    </div>
  );
}
