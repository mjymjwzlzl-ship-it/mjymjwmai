'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { localizedPromoAsset } from '@/lib/promo-assets';

const STORAGE_KEY = 'arata-launch-promo-dismissed-v8';
const SESSION_KEY = 'arata-launch-promo-closed-v8';
let closedInSession = false;

function isClosedInSession() {
  try { return closedInSession || window.sessionStorage.getItem(SESSION_KEY) === '1'; }
  catch { return closedInSession; }
}

function rememberSessionClose() {
  closedInSession = true;
  try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Memory fallback. */ }
}
const ONE_DAY = 24 * 60 * 60 * 1000;
const PLAN_HREF = '/subscribe?plan=BASIC&billing=YEARLY';

const getDismissedUntil = () => {
  try {
    return Number(window.localStorage?.getItem(STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
};

const setDismissedUntil = (value: number) => {
  try {
    window.localStorage?.setItem(STORAGE_KEY, String(value));
  } catch {
    // Some embedded browser contexts do not expose localStorage.
  }
};

const labels: Record<Locale, { aria: string; close: string; cta: string; today: string }> = {
  ko: {
    aria: 'ARATA 창립회원 프로모션',
    close: '팝업 닫기',
    cta: '무제한 감상 시작하기',
    today: '오늘 하루 보지 않기',
  },
  en: {
    aria: 'ARATA launch promotion',
    close: 'Close popup',
    cta: 'Start unlimited viewing',
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
    today: "Ne plus afficher aujourd’hui",
  },
};

export default function LaunchPromoModal() {
  const { locale } = useLanguage();
  const text = labels[locale] || labels.ko;
  const [open, setOpen] = useState(false);
  const posterSrc = localizedPromoAsset(locale, 'arata-launch-promo-banner-v4.png');

  useEffect(() => {
    let timer: number | undefined;
    const maybeOpen = () => {
      if (timer) window.clearTimeout(timer);
      const dismissedUntil = getDismissedUntil();
      if (!isClosedInSession() && (!dismissedUntil || dismissedUntil < Date.now())) {
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
      if (event.key === 'Escape') { rememberSessionClose(); setOpen(false); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const closeForToday = () => {
    rememberSessionClose();
    setDismissedUntil(Date.now() + ONE_DAY);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/[0.58] px-4 py-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={text.aria}
        className="relative aspect-[3/4] w-full max-w-[min(520px,calc((100dvh-48px)*0.75))] shrink-0 overflow-hidden rounded-[24px] bg-[#061221] shadow-2xl shadow-black/45"
      >
        <img
          src={posterSrc}
          alt={text.aria}
          className="h-full w-full object-cover"
          draggable={false}
          onError={(event) => {
            const fallback = '/images/promo/arata-launch-promo-banner-v4.png';
            if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
          }}
        />

        <button
          type="button"
          onClick={() => { rememberSessionClose(); setOpen(false); }}
          aria-label={text.close}
          className="absolute right-[4.5%] top-[3.2%] h-[8.2%] w-[10.8%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        />

        <Link
          href={PLAN_HREF}
          onClick={closeForToday}
          aria-label={text.cta}
          className="absolute inset-x-[6%] bottom-[8.9%] h-[9.2%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        />

        <button
          type="button"
          onClick={closeForToday}
          aria-label={text.today}
          className="absolute inset-x-[26%] bottom-[1.6%] h-[5%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        />
      </div>
    </div>
  );
}
