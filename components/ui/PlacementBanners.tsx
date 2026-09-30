'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

// 페이지 배너 (관리자 [노출 관리 > 배너 관리]의 위치별 배너): WEBTOON·BOOK·NOVEL·CHAT
// 그 위치에 등록·켜짐·기간 안인 배너만 한 장씩 넘겨 보여 준다. 없으면 fallback(기본 안내) 또는 아무것도 안 그림.
interface PageBanner { id: string; title: string; subtitle?: string; imageUrl: string; link: string; showText?: boolean }

export default function PlacementBanners({ placement, fallback = null, className = '' }: { placement: 'WEBTOON' | 'BOOK' | 'NOVEL' | 'CHAT'; fallback?: ReactNode; className?: string }) {
  const [items, setItems] = useState<PageBanner[] | null>(null);
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    api.get('/frontend/banners', { params: { placement } })
      .then(({ data }) => { if (alive) setItems(Array.isArray(data?.banners) ? data.banners : []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [placement]);
  useEffect(() => {
    if (!items || items.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => window.clearInterval(id);
  }, [items]);

  if (items === null) return null;
  if (items.length === 0) return <>{fallback}</>;
  const go = (dir: number) => setIndex((i) => (i + dir + items.length) % items.length);
  const current = items[Math.min(index, items.length - 1)];
  const external = /^https?:\/\//.test(current.link);

  return (
    <section aria-label="배너" data-banner-placement={placement} className={`relative mb-4 overflow-hidden rounded-xl bg-gray-900 sm:mb-6 ${className}`}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (startX.current === null) return; const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); startX.current = null; }}>
      <Link href={current.link} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className="relative block aspect-[16/7] w-full sm:aspect-[16/4]">
        <img src={getImageUrl(current.imageUrl, { width: 1600 })} alt={current.title} className="h-full w-full object-cover" />
        {current.showText !== false && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 text-white sm:p-6">
            <span className="block text-lg font-black sm:text-2xl">{current.title}</span>
            {current.subtitle && <span className="mt-0.5 block text-sm text-white/85">{current.subtitle}</span>}
          </span>
        )}
      </Link>
      {items.length > 1 && (
        <>
          <button type="button" aria-label="이전 배너" onClick={() => go(-1)} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 sm:block"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="다음 배너" onClick={() => go(1)} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 sm:block"><ChevronRight className="h-5 w-5" /></button>
          <span className="absolute bottom-2 right-3 flex gap-1">
            {items.map((b, i) => <button key={b.id} type="button" aria-label={`${i + 1}번째 배너`} onClick={() => setIndex(i)} className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />)}
          </span>
        </>
      )}
    </section>
  );
}
