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

  // 모바일에서는 한 줄 요약 + 확인 버튼만 (예전 긴 안내가 화면 아래를 덮어 가로 목록 스와이프를 가로챘다)
  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 shadow-[0_18px_70px_rgba(0,0,0,0.32)] sm:p-5 md:justify-between md:gap-8 dark:border-gray-700 dark:bg-[#111111] dark:text-white">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black sm:text-base">브라우저 저장소 이용 안내</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-600 sm:hidden dark:text-gray-300">
            로그인 유지·설정·열람 위치에 쿠키를 써요.{' '}
            <Link href="/terms/privacy" className="font-bold underline underline-offset-2">자세히</Link>
          </p>
          <p className="mt-2 hidden text-sm leading-relaxed text-gray-700 sm:block dark:text-gray-300">
            ARATA는 로그인 유지, 언어·테마 설정, 최근 열람 위치와 서비스 보안을 위해 쿠키와 브라우저 저장소를 사용합니다.
            현재 외부 광고·웹분석 SDK는 사용하지 않습니다. 자세한 내용은{' '}
            <Link href="/terms/privacy" className="font-bold underline underline-offset-2 hover:text-[#00a84c] dark:hover:text-[#00dc64]">
              개인정보처리방침
            </Link>
            을 확인해 주세요. 브라우저 설정에서 저장 정보를 삭제하거나 차단할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={acceptCookies}
          className="h-10 shrink-0 rounded-xl bg-[#00dc64] px-4 text-sm font-black text-black transition hover:bg-[#20ef7b] sm:h-12 sm:px-10 md:min-w-44"
        >
          확인
        </button>
      </div>
    </div>
  );
}
