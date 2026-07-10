'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

// 배너 텍스트/로고는 이미지에 직접 넣어 업로드한다 (오버레이 렌더링 없음)
export interface MainBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  href: string;
  badge?: string;
  imageFit?: 'cover' | 'contain';
}

interface MainBannerRailProps {
  items: MainBannerItem[];
}

const MainBannerRail: React.FC<MainBannerRailProps> = ({ items }) => {
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragCurrentX = useRef<number | null>(null);
  const blockClickAfterDrag = useRef(false);

  const visibleItems = useMemo(
    () => items.filter((item) => item.imageUrl && item.title && item.href),
    [items],
  );

  useEffect(() => {
    const updatePerView = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setPerView(3);
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setPerView(2);
      } else {
        setPerView(1);
      }
    };

    updatePerView();
    window.addEventListener('resize', updatePerView);
    return () => window.removeEventListener('resize', updatePerView);
  }, []);

  const pageCount = Math.max(1, Math.ceil(visibleItems.length / perView));
  const canSlide = pageCount > 1;

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const moveTo = (nextPage: number) => {
    if (!canSlide) return;
    setPage((nextPage + pageCount) % pageCount);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSlide || event.button !== 0) return;
    dragStartX.current = event.clientX;
    dragCurrentX.current = event.clientX;
    blockClickAfterDrag.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    dragCurrentX.current = event.clientX;
    if (Math.abs(dragStartX.current - event.clientX) > 8) {
      blockClickAfterDrag.current = true;
      if (!isDragging) {
        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    }
  };

  const finishDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null || dragCurrentX.current === null) {
      setIsDragging(false);
      return;
    }

    const distance = dragStartX.current - dragCurrentX.current;
    if (Math.abs(distance) > 50) {
      moveTo(distance > 0 ? page + 1 : page - 1);
    }

    if (event && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    dragStartX.current = null;
    dragCurrentX.current = null;
    setIsDragging(false);

    if (blockClickAfterDrag.current) {
      window.setTimeout(() => {
        blockClickAfterDrag.current = false;
      }, 150);
    }
  };

  const handleClickCapture = (event: React.MouseEvent) => {
    if (!blockClickAfterDrag.current) return;
    event.preventDefault();
    event.stopPropagation();
    blockClickAfterDrag.current = false;
  };

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="main-banner-rail"
      className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-7 shadow-sm md:px-9 md:py-8 dark:border-gray-800 dark:bg-[#202020]"
    >
      <div className="relative">
        <div className="overflow-hidden">
          <div
            className={`flex touch-pan-y select-none transition-transform duration-500 ease-out ${
              canSlide ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
            style={{ transform: `translateX(-${page * 100}%)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onClickCapture={handleClickCapture}
          >
            {visibleItems.map((item, index) => (
              <div
                key={item.id}
                data-testid="main-banner-card"
                className="shrink-0 px-0 md:px-2.5"
                style={{ flexBasis: `${100 / perView}%`, maxWidth: `${100 / perView}%` }}
              >
                <Link
                  href={item.href}
                  aria-label={item.subtitle ? `${item.title} - ${item.subtitle}` : item.title}
                  className="group block overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-white/5 dark:bg-[#101010]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={getImageUrl(item.imageUrl, { width: 900 })}
                      alt={item.title}
                      className={`h-full w-full transition-transform duration-500 group-hover:scale-105 ${
                        item.imageFit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      draggable={false}
                    />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {canSlide && (
          <>
            <button
              type="button"
              aria-label="이전 배너"
              onClick={() => moveTo(page - 1)}
              className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg transition-colors hover:bg-black/75 md:flex"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              aria-label="다음 배너"
              onClick={() => moveTo(page + 1)}
              className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg transition-colors hover:bg-black/75 md:flex"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {canSlide && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`${index + 1}번째 배너 보기`}
              onClick={() => moveTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                page === index ? 'w-5 bg-[#00dc64]' : 'w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-white/35 dark:hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default MainBannerRail;
