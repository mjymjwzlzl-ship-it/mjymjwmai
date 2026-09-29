'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};
    if (!formData.email) newErrors.email = '이메일을 입력해주세요';
    if (!formData.password) newErrors.password = '비밀번호를 입력해주세요';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      const data = response.data;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('userLogin'));

      if (typeof window !== 'undefined' && (window as any).isArataApp) {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        let message = error.response.data?.message || '로그인에 실패했습니다.';

        if (status === 401) {
          message = '이메일 또는 비밀번호가 일치하지 않습니다.';
        } else if (status === 400) {
          message = error.response.data?.message || '입력 정보를 확인해주세요.';
        } else if (status === 500) {
          message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }

        setErrors({ general: message });
      } else if (error.request) {
        setErrors({ general: '백엔드 서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.' });
      } else {
        setErrors({ general: `예상치 못한 오류가 발생했습니다: ${error.message}` });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-black">로그인</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">ARATA 계정으로 계속 감상하세요</p>
          </div>

          {errors.general && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
              <p className="whitespace-pre-line text-sm text-red-600 dark:text-red-300">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-100">
                이메일
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full rounded-xl border-2 bg-white py-3 pl-12 pr-4 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-4 focus:ring-[#00dc64]/20 dark:bg-[#121212] dark:text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="이메일을 입력하세요"
                />
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-100">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full rounded-xl border-2 bg-white py-3 pl-12 pr-12 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-4 focus:ring-[#00dc64]/20 dark:bg-[#121212] dark:text-white ${
                    errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="비밀번호를 입력하세요"
                />
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#00dc64] focus:ring-[#00dc64]"
                />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">로그인 상태 유지</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-bold text-[#00a84c] hover:text-[#00dc64]">
                비밀번호 찾기
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#00dc64] px-4 py-4 font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-black" />
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400 dark:bg-[#1b1b1b]">또는</span>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              disabled title="연동 준비 중" aria-label="소셜 로그인 연동 준비 중"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#03c75a] px-4 py-4 font-bold text-white shadow-sm transition hover:brightness-95"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.06 4.5v7.83L8.94 4.5H4.5v15h4.44v-7.83l6.12 7.83h4.44v-15h-4.44z" />
              </svg>
              네이버로 로그인
            </button>

            <button
              type="button"
              onClick={() => openExternalLogin('https://api.arata.co.kr/api/auth/google', 'Google')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 font-bold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google로 로그인
            </button>

            <button
              type="button"
              onClick={() => openExternalLogin('https://api.arata.co.kr/api/auth/kakao', '카카오')}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-yellow-400 px-4 py-4 font-bold text-gray-900 shadow-sm transition hover:bg-yellow-500"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11L5.25 21.75c-.131.131-.374.111-.44-.037L6.75 18.5c-2.69-1.47-4.5-4.03-4.5-6.815C2.25 6.665 6.201 3 12 3z" />
              </svg>
              카카오로 로그인
            </button>

            <button
              type="button"
              disabled title="연동 준비 중" aria-label="소셜 로그인 연동 준비 중"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877f2] px-4 py-4 font-bold text-white shadow-sm transition hover:brightness-95"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.5 21v-7.5h2.52l.48-3h-3V8.55c0-.87.24-1.55 1.5-1.55h1.62V4.32c-.28-.04-1.24-.12-2.36-.12-2.34 0-3.76 1.43-3.76 4.05v2.25H8v3h2.5V21h3z" />
              </svg>
              페이스북으로 로그인
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              계정이 없으신가요?{' '}
              <Link href="/register" className="font-bold text-[#00a84c] hover:text-[#00dc64]">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
