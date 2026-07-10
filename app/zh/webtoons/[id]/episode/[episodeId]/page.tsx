'use client'

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// 중국어 버전은 일반 에피소드 뷰어로 리다이렉트
export default function ChineseEpisodeViewerPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // /zh/webtoons/[id]/episode/[episodeId] → /webtoons/[id]/episode/[episodeId]?lang=zh
    router.replace(`/webtoons/${params.id}/episode/${params.episodeId}?lang=zh`);
  }, [params.id, params.episodeId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
    </div>
  );
}
