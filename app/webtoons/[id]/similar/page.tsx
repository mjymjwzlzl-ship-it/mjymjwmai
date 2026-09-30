'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { REASON_LABEL } from '@/components/ui/SimilarWorksRail';
import ComicBadges from '@/components/ui/ComicBadges';
import { contentTypeLabel } from '@/lib/comic-content-format';

// 작품 상세 [이 작품과 비슷한 인기작품] 전체보기 (같은 기준 /frontend/comics/:id/similar, 최대 20개)
interface SimilarComic { id: string; title: string; author?: string; thumbnailUrl: string; totalEpisodes: number; rating?: number; reason?: string; createdAt?: string; lastEpisodeAt?: string | null; status?: string; contentType?: string }

export default function SimilarListPage() {
  const params = useParams();
  const id = String(params.id || '');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<SimilarComic[] | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/frontend/comics/${id}`).then(({ data }) => setTitle(data?.title || '')).catch(() => {});
    api.get(`/frontend/comics/${id}/similar`, { params: { limit: 20 } })
      .then(({ data }) => setItems(Array.isArray(data?.comics) ? data.comics : []))
      .catch(() => setItems([]));
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href={`/webtoons/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" />작품으로 돌아가기
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Sparkles className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
          {title ? `「${title}」와 비슷한 인기작품` : '비슷한 인기작품'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">같은 작가·같은 장르·인기작 순으로 골랐어요.</p>
        {items === null ? (
          <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
        ) : items.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-gray-700">추천할 작품이 없어요.</p>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {items.map((comic) => (
              <Link key={comic.id} href={`/webtoons/${comic.id}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                  <img src={getImageUrl(comic.thumbnailUrl, { width: 300 })} alt={comic.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <span className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                    {comic.reason && REASON_LABEL[comic.reason] && <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{REASON_LABEL[comic.reason]}</span>}
                    <ComicBadges lastEpisodeAt={comic.lastEpisodeAt} createdAt={comic.createdAt} status={comic.status} />
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-bold sm:text-sm">{comic.title}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400"><span className="rounded bg-gray-100 px-1 py-px text-[10px] font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">{contentTypeLabel(comic.contentType)}</span> · {comic.totalEpisodes}화{comic.reason && REASON_LABEL[comic.reason] ? ` · ${REASON_LABEL[comic.reason]}` : ''}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
