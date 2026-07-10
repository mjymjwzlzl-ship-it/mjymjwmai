"use client";
import React from 'react';
import { useDragScroll } from '@/lib/useDragScroll';

type StripItem = {
  id: string;
  title: string;
  meta?: string;
  cover?: string;
};

export default function SectionStrip({ title, items, limit, itemWidth, aspectRatio, mediaHeight }: { title: string; items: StripItem[]; limit?: number; itemWidth?: number; aspectRatio?: number; mediaHeight?: number }) {
  const scrollRef = useDragScroll<HTMLDivElement>();
  const cardWidth = itemWidth ?? 160;
  const cardAspect = aspectRatio ?? 3 / 4;
  const data = typeof limit === 'number' ? items.slice(0, limit) : items;
  return (
    <section className="px-4" style={{ color: 'var(--ui-text)' }}>
      <div className="mx-auto max-w-5xl py-1.5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--ui-text)' }}>{title}</h3>
          <button className="text-sm" style={{ color: 'var(--ui-muted)' }}>+ 더보기</button>
        </div>
        <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing">
          {data.map((it) => (
            <article key={it.id} className="relative shrink-0" style={{ width: cardWidth }}>
              <div
                className="relative overflow-hidden rounded-2xl"
                style={Object.assign(mediaHeight ? { height: mediaHeight } : ({ aspectRatio: cardAspect } as any), { background: 'var(--surface)' })}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--ui-muted)' }}>이미지</div>
              </div>
              <div className="mt-2 line-clamp-2 text-sm font-medium" style={{ color: 'var(--ui-text)' }}>{it.title}</div>
              {it.meta && <div className="text-xs" style={{ color: 'var(--ui-muted)' }}>{it.meta}</div>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


