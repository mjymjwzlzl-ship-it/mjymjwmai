'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModal';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { localizedPromoAsset } from '@/lib/promo-assets';

const openExternalLogin = (url: string, provider: string) => {
  const isKakaoInApp = /KAKAOTALK/i.test(navigator.userAgent);

  if (isKakaoInApp) {
    const confirmed = confirm(`${provider} 로그인은 외부 브라우저에서 진행합니다. 계속하시겠습니까?`);
    if (confirmed) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    }
    return;
  }

  window.location.href = url;
};

export default function LoginModal() {
  const { locale } = useLanguage();
  const open = useLoginModalStore((state) => state.open);
  const setOpen = useLoginModalStore((state) => state.setOpen);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setError('');
      setIsLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login({ email, password });
      const data = response.data;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('userLogin'));
      setOpen(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('이메일 또는 비밀번호가 일치하지 않습니다.');
      } else if (err.response) {
        setError(err.response.data?.message || '로그인에 실패했습니다.');
      } else {
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/45 px-4 py-6">
      <button
        type="button"
        aria-label="로그인 팝업 닫기"
        onClick={() => setOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
        className="relative max-h-[92dvh] w-full max-w-[400px] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#1b1b1b]"
      >
        {/* 상단 일러스트 영역 */}
        <div className="relative overflow-hidden bg-[#eafff3]">
          <img
            src={localizedPromoAsset(locale, 'arata-login-free-webtoon-banner.png')}
            alt="지금 가입만 해도 첫 달 990원으로 모든 웹툰 무제한"
            className="h-[171px] w-full object-cover object-center"
            draggable={false}
          />
          <div className="hidden">
            <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-black text-white">
              지금 가입만 해도!
            </span>
            <p className="mt-2.5 text-xl font-black leading-snug text-gray-900">
              첫 달 <span className="text-[#00a84c]">990원</span>으로
              <br />
              모든 웹툰 무제한
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white transition hover:bg-black/45"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* SNS 간편 로그인 */}
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-bold text-gray-400">SNS 간편 로그인</span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <div className="flex justify-center gap-5">
            <button
              type="button"
              onClick={() => openExternalLogin('https://api.arata.co.kr/api/auth/naver', '네이버')}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#03c75a] transition hover:brightness-95">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M15.06 4.5v7.83L8.94 4.5H4.5v15h4.44v-7.83l6.12 7.83h4.44v-15h-4.44z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">네이버</span>
            </button>
            <button
              type="button"
              onClick={() => openExternalLogin('https://api.arata.co.kr/api/auth/kakao', '카카오')}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fee500] transition hover:brightness-95">
                <svg className="h-7 w-7 text-[#191919]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11L5.25 21.75c-.131.131-.374.111-.44-.037L6.75 18.5c-2.69-1.47-4.5-4.03-4.5-6.815C2.25 6.665 6.201 3 12 3z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">카카오톡</span>
            </button>
            <button
              type="button"
              onClick={() => openExternalLogin('https://api.arata.co.kr/api/auth/facebook', '페이스북')}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877f2] transition hover:brightness-95">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M13.5 21v-7.5h2.52l.48-3h-3V8.55c0-.87.24-1.55 1.5-1.55h1.62V4.32c-.28-.04-1.24-.12-2.36-.12-2.34 0-3.76 1.43-3.76 4.05v2.25H8v3h2.5V21h3z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">페이스북</span>
            </button>
            <button
              type="button"
              onClick={() => openExternalLogin('https://api.arata.co.kr/api/auth/google', 'Google')}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50">
                <svg className="h-7 w-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">구글</span>
            </button>
          </div>

          {/* 이메일 로그인 */}
          <div className="mb-4 mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-bold text-gray-400">이메일 로그인</span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="email"
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              onClick={() => setOpen(false)}
              className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
            >
              비밀번호 찾기
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="font-bold text-[#00a84c] underline-offset-2 hover:underline"
            >
              회원가입 바로가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
