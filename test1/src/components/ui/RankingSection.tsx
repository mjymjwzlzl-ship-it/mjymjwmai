"use client";
import React, { useMemo, useState } from 'react';
import RankingTabs from './RankingTabs';
import { useDragScroll } from '@/lib/useDragScroll';

type RankItem = {
  id: string;
  title: string;
  cover: string; // image url
  meta?: string;
};

type Props = {
  fetcher?: (mode: '매일' | '요일' | '완결') => Promise<RankItem[]>;
};

const mock: RankItem[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `r${i + 1}`,
  title: `샘플 작품 ${i + 1}`,
  cover: '/next.svg',
  meta: '제144화 업데이트',
}));

export default function RankingSection({ fetcher }: Props) {
  const [tab, setTab] = useState<'매일' | '요일' | '완결'>('매일');
  const items = useMemo(() => mock, [tab]);
  const scrollRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="px-4" style={{ color: 'var(--ui-text)' }}>
      <div className="mx-auto max-w-6xl py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--ui-text)' }}>실시간 랭킹</h2>
            <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>업데이트 3분 전</span>
          </div>
          <RankingTabs items={["매일","요일","완결"]} value={tab} onChange={(v)=>setTab(v as any)} />
        </div>
        <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto pb-2 cursor-grab active:cursor-grabbing">
          {items.map((it, idx) => (
            <article key={it.id} className="relative w-[168px] shrink-0">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl" style={{ background: 'var(--surface)' }}>
                {/* 썸네일 자리: 실제에선 next/image 사용 */}
                <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--ui-muted)' }}>
                  이미지
                </div>
                {/* 순위 배지 */}
                <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--overlay-btn)', color: 'var(--ui-text)' }}>
                  {idx + 1}
                </div>
              </div>
              <div className="mt-2 text-sm font-medium line-clamp-2" style={{ color: 'var(--ui-text)' }}>{it.title}</div>
              <div className="text-xs" style={{ color: 'var(--ui-muted)' }}>{it.meta}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


