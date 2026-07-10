'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const COOKIE_NAME = 'arata_cookie_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function hasConsentCookie() {
  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith(`${COOKIE_NAME}=accepted`));
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasConsentCookie());
  }, []);

  const acceptCookies = () => {
    document.cookie = `${COOKIE_NAME}=accepted; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    window.dispatchEvent(new Event('arata-cookie-consent-accepted'));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-gray-300 bg-white p-5 text-gray-950 shadow-[0_18px_70px_rgba(0,0,0,0.32)] md:flex-row md:items-center md:justify-between md:gap-8 dark:border-gray-700 dark:bg-[#111111] dark:text-white">
        <div className="min-w-0">
          <p className="text-base font-black">
            더 나은 서비스를 위해 쿠키를 활용하고 있어요.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            ARATA는 맞춤형 서비스 이용 경험 개인화, 콘텐츠 추천, 광고 성과 측정, 서비스 이용 분석을 위해 쿠키를 사용합니다.
            계속 이용하시면{' '}
            <Link href="/terms/privacy" className="font-bold underline underline-offset-2 hover:text-[#00a84c] dark:hover:text-[#00dc64]">
              개인정보처리방침
            </Link>
            에 따른 쿠키 사용에 동의한 것으로 간주됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={acceptCookies}
          className="h-12 shrink-0 rounded-xl bg-[#00dc64] px-10 text-sm font-black text-black transition hover:bg-[#20ef7b] md:min-w-44"
        >
          확인
        </button>
      </div>
    </div>
  );
}
