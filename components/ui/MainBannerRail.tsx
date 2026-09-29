'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { getImageUrl } from '@/lib/utils';

export interface MainBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  href: string;
  badge?: string;
  description?: string;
  imageFit?: 'cover' | 'contain';
  showTitle?: boolean;
}

interface MainBannerRailProps {
  items: MainBannerItem[];
}

const MainBannerRail: React.FC<MainBannerRailProps> = ({ items }) => {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
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
    dragStartY.current = event.clientY;
    dragCurrentX.current = event.clientX;
    blockClickAfterDrag.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = Math.abs(dragStartX.current - event.clientX);
    const dy = Math.abs((dragStartY.current ?? event.clientY) - event.clientY);
    if (!isDragging && dy > 8 && dy > dx) {
      dragStartX.current = null;
      dragStartY.current = null;
      dragCurrentX.current = null;
      return;
    }
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
    dragStartY.current = null;
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

  const cancelDrag = () => {
    dragStartX.current = null;
    dragStartY.current = null;
    dragCurrentX.current = null;
    blockClickAfterDrag.current = false;
    setIsDragging(false);
  };

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="main-banner-rail"
      className="mb-4 overflow-hidden rounded-xl border border-gray-300 bg-white p-2 shadow-md shadow-gray-200/70 sm:mb-8 sm:px-5 sm:py-7 md:px-9 md:py-8 dark:border-gray-800 dark:bg-[#202020] dark:shadow-none"
    >
      <div className="relative">
        <div className="overflow-hidden">
          <div
            className={`arata-banner-track flex touch-pan-y select-none transition-transform duration-500 ease-out ${
              canSlide ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
            style={{ transform: `translateX(-${page * 100}%)` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={cancelDrag}
            onClickCapture={handleClickCapture}
          >
            {visibleItems.map((item, index) => (
              <div
                key={item.id}
                data-testid="main-banner-card"
                aria-hidden={index < page * perView || index >= (page + 1) * perView}
                className="shrink-0 px-0 md:px-2.5"
                style={{ flexBasis: `${100 / perView}%`, maxWidth: `${100 / perView}%` }}
              >
                <Link
                  href={item.href}
                  tabIndex={index >= page * perView && index < (page + 1) * perView ? 0 : -1}
                  aria-label={item.subtitle ? `${item.title} - ${item.subtitle}` : item.title}
                  className="group block overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-xl dark:border-white/10 dark:bg-[#101010]"
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
                    {item.showTitle && (
                      <>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                          <div className="flex h-[52px] items-end gap-2.5 sm:h-[58px]">
                            {item.badge && (
                              <span className="mb-1 inline-flex min-w-16 shrink-0 items-center justify-center whitespace-nowrap rounded bg-[#00dc64] px-1.5 py-1 text-center text-[10px] font-black leading-none text-black shadow-lg">
                                {item.badge}
                              </span>
                            )}
                            <h2
                              data-testid="main-banner-title"
                              title={item.title}
                              className={`min-w-0 flex-1 truncate font-black leading-tight tracking-[-0.02em] [text-shadow:0_2px_8px_rgba(0,0,0,0.95)] ${
                                item.title.length > 22
                                  ? 'text-[15px]'
                                  : item.title.length > 14
                                    ? 'text-base sm:text-lg'
                                    : item.title.length > 10
                                      ? 'text-[17px] sm:text-lg'
                                      : 'text-xl sm:text-2xl'
                              }`}
                            >
                              {item.title}
                            </h2>
                          </div>
                          {item.description && (
                            <p className="mt-2 h-8 line-clamp-2 text-[11px] font-medium leading-4 text-white/80 [text-shadow:0_1px_5px_rgba(0,0,0,0.95)] sm:h-10 sm:text-sm sm:leading-5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </>
                    )}
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
              aria-label={t('common.previousBanner')}
              onClick={() => moveTo(page - 1)}
              className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg transition-colors hover:bg-black/75 md:flex"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              aria-label={t('common.nextBanner')}
              onClick={() => moveTo(page + 1)}
              className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg transition-colors hover:bg-black/75 md:flex"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {canSlide && (
        <>
        <div className="mt-1 flex items-center justify-center gap-4 md:hidden">
          <button type="button" aria-label={t('common.previousBanner')} onClick={() => moveTo(page - 1)} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 dark:text-gray-200"><ChevronLeft size={20} /></button>
          <span aria-live="polite" aria-atomic="true" className="min-w-12 text-center text-xs tabular-nums text-gray-500 dark:text-gray-300">{page + 1} / {pageCount}</span>
          <button type="button" aria-label={t('common.nextBanner')} onClick={() => moveTo(page + 1)} className="flex h-11 w-11 items-center justify-center rounded-full text-gray-600 dark:text-gray-200"><ChevronRight size={20} /></button>
        </div>
        <div className="mt-5 hidden items-center justify-center gap-2 md:flex">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={t('common.bannerPage', { index: index + 1 })}
              aria-current={page === index ? 'true' : undefined}
              onClick={() => moveTo(index)}
              className="flex h-6 min-w-6 items-center justify-center rounded-full"
            >
              <span className={`block h-1.5 rounded-full transition-all ${page === index ? 'w-5 bg-[#00dc64]' : 'w-1.5 bg-gray-300 dark:bg-white/35'}`} />
            </button>
          ))}
        </div>
        </>
      )}
    </section>
  );
};

export default MainBannerRail;
