'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import ComicBadges from '@/components/ui/ComicBadges';

// 회차 감상 후 추천: 작품 상세의 '비슷한 인기 작품'과 같은 기준(/frontend/comics/:id/similar)
interface SimilarWork {
  id: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  totalEpisodes: number;
  rating: number;
  reason: 'SAME_GENRE' | 'SAME_AUTHOR' | 'POPULAR' | 'SAME_GENRE_POPULAR';
  createdAt?: string;
  lastEpisodeAt?: string | null;
  status?: string;
}

export const REASON_LABEL: Record<string, string> = {
  SAME_GENRE: '같은 장르',
  SAME_AUTHOR: '같은 작가',
  POPULAR: '인기작',
  SAME_GENRE_POPULAR: '장르 인기',
};

function Rail({ title, items }: { title: string; items: SimilarWork[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateButtons();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateButtons);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items, updateButtons]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 140), behavior: 'smooth' });
  };

  // 마우스로 끌어서 넘기기 (터치·트랙패드는 기본 가로 스크롤 그대로)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !trackRef.current) return;
    drag.current = { active: true, startX: event.clientX, startLeft: trackRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!drag.current.active || !el) return;
    const dx = event.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const endDrag = () => { drag.current.active = false; };
  const onClickCapture = (event: React.MouseEvent) => {
    // 끌어서 넘긴 뒤 손을 뗄 때 작품이 열리지 않게
    if (drag.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
    }
  };

  if (items.length === 0) return null;
  const arrow = 'flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-[#00dc64] hover:text-[#00a84c] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:text-[#00dc64]';
  return (
    <section className="mt-5">
      <h3 className="mb-3 text-base font-black text-gray-950 dark:text-white">{title}</h3>
      <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateButtons}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        className="no-scrollbar -mx-4 flex select-none gap-3 overflow-x-auto px-4 pb-1"
      >
        {items.map((work) => (
          <Link key={work.id} href={`/webtoons/${work.id}`} className="group w-[128px] shrink-0 sm:w-[140px]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
              <img
                src={getImageUrl(work.thumbnailUrl, { width: 300 })}
                alt={work.title}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{REASON_LABEL[work.reason] || '추천'}</span>
                <ComicBadges lastEpisodeAt={work.lastEpisodeAt} createdAt={work.createdAt} status={work.status} />
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-4 text-gray-900 dark:text-gray-100">{work.title}</p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {work.totalEpisodes}화{work.rating > 0 ? ` · ★ ${work.rating.toFixed(1)}` : ''}
            </p>
          </Link>
        ))}
      </div>
      {(canPrev || canNext) && (
        <>
          {/* 목록 양옆 〈 〉: 처음이면 왼쪽, 끝이면 오른쪽이 흐려진다 */}
          <button type="button" className={`${arrow} absolute -left-3 top-[85px] z-10 -translate-y-1/2 sm:top-[93px]`} onClick={() => page(-1)} disabled={!canPrev} aria-label="이전 작품">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className={`${arrow} absolute -right-3 top-[85px] z-10 -translate-y-1/2 sm:top-[93px]`} onClick={() => page(1)} disabled={!canNext} aria-label="다음 작품">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
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
