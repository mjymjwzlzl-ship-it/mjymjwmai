'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 예전 [인기작 관리] 수동 목록은 사용자 화면에 쓰이지 않았다 → [노출 관리 > 인기 작품](상단 고정 + 자동 순위)으로 옮김
export default function PopularRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/exposure?tab=popular'); }, [router]);
  return <div className="min-h-screen bg-gray-900 p-6 text-gray-400">[노출 관리 &gt; 인기 작품]으로 이동합니다...</div>;
}
