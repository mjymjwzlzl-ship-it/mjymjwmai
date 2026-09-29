'use client'

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// 중국어 버전은 일반 웹툰 상세 페이지로 리다이렉트
export default function ChineseWebtoonDetailPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // /zh/webtoons/[id] → /webtoons/[id]?lang=zh
    router.replace(`/webtoons/${params.id}?lang=zh`);
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
    </div>
  );
}
