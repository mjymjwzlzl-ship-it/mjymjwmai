'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

// 회차 감상 후 추천: 작품 상세의 '비슷한 인기 작품'과 같은 기준(/frontend/comics/:id/similar)
interface SimilarWork {
  id: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  totalEpisodes: number;
  rating: number;
  reason: 'SAME_GENRE' | 'SAME_AUTHOR' | 'POPULAR' | 'SAME_GENRE_POPULAR';
}

export const REASON_LABEL: Record<string, string> = {
  SAME_GENRE: '같은 장르',
  SAME_AUTHOR: '같은 작가',
  POPULAR: '인기작',
  SAME_GENRE_POPULAR: '장르 인기',
};

function Rail({ title, items }: { title: string; items: SimilarWork[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-5">
      <h3 className="mb-3 text-base font-black text-gray-950 dark:text-white">{title}</h3>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((work) => (
          <Link key={work.id} href={`/webtoons/${work.id}`} className="group w-[128px] shrink-0 sm:w-[140px]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <img
                src={getImageUrl(work.thumbnailUrl, { width: 300 })}
                alt={work.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {REASON_LABEL[work.reason] || '추천'}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-4 text-gray-900 dark:text-gray-100">{work.title}</p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {work.totalEpisodes}화{work.rating > 0 ? ` · ★ ${work.rating.toFixed(1)}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function SimilarWorksRail({ comicId, isFinale = false }: { comicId: string; isFinale?: boolean }) {
  const [similar, setSimilar] = useState<SimilarWork[]>([]);
  const [sameGenre, setSameGenre] = useState<SimilarWork[]>([]);

  useEffect(() => {
    if (!comicId) return;
    api.get(`/frontend/comics/${comicId}/similar`, { params: { limit: isFinale ? 10 : 8 } })
      .then(({ data }) => {
        setSimilar(Array.isArray(data?.comics) ? data.comics : []);
        setSameGenre(Array.isArray(data?.sameGenre) ? data.sameGenre : []);
      })
      .catch(() => {});
  }, [comicId, isFinale]);

  if (similar.length === 0 && (!isFinale || sameGenre.length === 0)) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {isFinale && (
        <p className="flex items-center gap-1.5 text-sm font-black text-[#00a84c] dark:text-[#00dc64]">
          <Sparkles className="h-4 w-4" />마지막 화까지 감상하셨어요! 다음 작품을 골라 보세요
        </p>
      )}
      <Rail title="이 작품과 비슷한 작품" items={similar} />
      {isFinale && <Rail title="같은 장르 인기작" items={sameGenre} />}
    </div>
  );
}
