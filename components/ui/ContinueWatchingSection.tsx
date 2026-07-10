'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { getImageUrl } from '@/lib/config';
import { useDragScroll } from '@/lib/useDragScroll';
import { useTranslation } from '@/lib/i18n';

interface WatchingComic {
  id: string;
  title: string;
  thumbnail: string;
  authorName: string;
  genre: string;
  rating?: string;
  totalEpisodes: number;
  viewedEpisodes: number;
  progress: number;
  lastViewedAt: string;
}

interface ContinueWatchingSectionProps {
  isAdult?: boolean; // 성인 페이지인지 여부
}

export default function ContinueWatchingSection({ isAdult = false }: ContinueWatchingSectionProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const scrollRef = useDragScroll<HTMLDivElement>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // 로그인 여부 확인
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setIsLoggedIn(!!token && token !== 'null' && token !== 'undefined');
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['continue-watching', isAdult ? 'adult' : 'general'],
    queryFn: async () => {
      const response = await api.get(endpoints.history, {
        params: { limit: 20 }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    enabled: isLoggedIn, // 로그인한 경우에만 쿼리 실행
  });

  // 성인/일반 필터링 (로딩 전에 미리 계산)
  const allComics: WatchingComic[] = data?.comics || [];
  const filteredComics = isAdult
    ? allComics.filter(comic => comic.rating === 'ADULT' || comic.rating === '19' || comic.rating === 'adult')
    : allComics.filter(comic => comic.rating !== 'ADULT' && comic.rating !== '19' && comic.rating !== 'adult');
  const comics = filteredComics.slice(0, 10);

  // useEffect는 항상 최상단에서 호출
  useEffect(() => {
    checkArrows();
  }, [comics]);

  const checkArrows = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const targetScroll = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });

    setTimeout(checkArrows, 300);
  };

  if (isLoading) {
    return (
      <section className="px-4" style={{ color: 'var(--ui-text)' }}>
        <div className="mx-auto max-w-6xl py-3">
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--ui-text)' }}>
            {t('home.continueWatching')}
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-[168px] shrink-0">
                <div className="aspect-[3/4] bg-gray-700 rounded-2xl animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // 에러 또는 데이터 없음 체크 (필터링 후에)
  if (error || !data?.comics || data.comics.length === 0 || filteredComics.length === 0) {
    return null;
  }

  return (
    <section className="px-4 relative group/section" style={{ color: 'var(--ui-text)' }}>
      <div className="mx-auto max-w-6xl py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--ui-text)' }}>
            내가 보던 웹툰
          </h2>
        </div>

        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-r from-[#141414] to-transparent items-center justify-start opacity-0 hover:opacity-100 group-hover/section:opacity-100 transition-opacity duration-200"
            aria-label="이전"
          >
            <div className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-l from-[#141414] to-transparent items-center justify-end opacity-0 hover:opacity-100 group-hover/section:opacity-100 transition-opacity duration-200"
            aria-label="다음"
          >
            <div className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        <div
          ref={(el) => {
            scrollContainerRef.current = el;
            if (scrollRef && 'current' in scrollRef) {
              (scrollRef as any).current = el;
            }
          }}
          onScroll={checkArrows}
          className="no-scrollbar flex gap-3 overflow-x-auto pb-2 scroll-smooth">
          {comics.map((comic) => (
            <article
              key={comic.id}
              className="relative w-[168px] shrink-0 group cursor-pointer"
              onClick={() => router.push(`/webtoons/${comic.id}`)}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg" style={{ background: 'var(--surface)' }}>
                <img
                  src={getImageUrl(comic.thumbnail) || '/next.svg'}
                  alt={comic.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />

                {/* 진행률 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all" />

                {/* 진행률 텍스트 */}
                <div className="absolute bottom-8 left-2 right-2 text-white">
                  <div className="text-xs font-medium mb-1">
                    {comic.viewedEpisodes} / {comic.totalEpisodes} 화
                  </div>
                </div>

                {/* 녹색 프로그레스 바 - 직선 */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-600">
                  <div
                    className="h-full bg-[#3E7A5A] transition-all duration-300"
                    style={{ width: `${comic.progress}%` }}
                  />
                </div>

                {/* 호버 시 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="mt-2 text-sm font-medium line-clamp-2 transition-colors duration-300 group-hover:text-purple-400" style={{ color: 'var(--ui-text)' }}>
                {comic.title}
              </div>
              <div className="text-xs" style={{ color: 'var(--ui-muted)' }}>
                {comic.authorName}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
