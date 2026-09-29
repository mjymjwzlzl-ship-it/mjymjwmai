'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function NaverLoading({ label = '네이버 인증 처리 중...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-2xl bg-green-500">
            <span className="text-3xl font-black text-white">N</span>
          </div>
          <h2 className="mb-2 text-xl font-black">{label}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">잠시만 기다려주세요</p>
        </div>
      </div>
    </div>
  );
}

function NaverAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        alert('네이버 인증을 취소했습니다.');
        router.push('/');
        return;
      }

      if (!code || !state) {
        alert('인증 정보가 올바르지 않습니다.');
        router.push('/');
        return;
      }

      try {
        const response = await api.post('/auth/naver-auth/callback', { code, state });

        if (response.data.success) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            user.adultVerified = true;
            localStorage.setItem('user', JSON.stringify(user));
          }

          alert('네이버 성인인증이 완료되었습니다.');
          router.push('/');
          window.location.reload();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || '인증 처리 중 오류가 발생했습니다.');
        router.push('/');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return <NaverLoading />;
}

export default function NaverAuthCallback() {
  return (
    <Suspense fallback={<NaverLoading label="로딩 중..." />}>
      <NaverAuthCallbackContent />
    </Suspense>
  );
}
