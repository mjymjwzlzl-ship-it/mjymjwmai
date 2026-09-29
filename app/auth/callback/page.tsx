'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoadingState({ label = '로그인 처리 중...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#00dc64]" />
          <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-300">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // OAuth callbacks keep credentials in the URL fragment so browsers and
      // reverse-proxy logs do not record the JWT as a query parameter.
      const fragmentParams = new URLSearchParams(window.location.hash.slice(1));
      const token = fragmentParams.get('token');
      const user = fragmentParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        alert(`로그인에 실패했습니다: ${error}`);
        router.push('/');
        return;
      }

      if (!token || !user) {
        alert('로그인 정보를 받지 못했습니다.');
        router.push('/');
        return;
      }

      try {
        window.history.replaceState(null, '', window.location.pathname);
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', user);

        const isApp = typeof window !== 'undefined' && (window as any).isArataApp;
        if (isApp) {
          document.cookie = `authToken=${token}; path=/; max-age=86400`;
          window.dispatchEvent(new Event('loginStateChanged'));
        }

        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } catch {
        alert('로그인 처리 중 오류가 발생했습니다.');
        router.push('/');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return <LoadingState />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
