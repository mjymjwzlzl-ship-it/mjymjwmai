'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NaverAuthFail() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500">
            <span className="text-3xl font-black text-white">!</span>
          </div>
          <h2 className="mb-2 text-xl font-black">인증 실패</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            네이버 성인인증에 실패했습니다
          </p>
          <p className="text-sm text-gray-400">3초 후 홈으로 이동합니다...</p>
        </div>
      </div>
    </div>
  );
}
