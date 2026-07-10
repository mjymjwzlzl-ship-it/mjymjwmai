"use client";
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import RankingTabs from './RankingTabs';
import { useDragScroll } from '@/lib/useDragScroll';
import { api, endpoints } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

type RankItem = {
  id: string;
  title: string;
  cover: string; // image url
  meta?: string;
};

type Props = {
  fetcher?: (mode: 'daily' | 'weekly' | 'completed') => Promise<RankItem[]>;
  dailyComics?: any[]; // 관리자가 설정한 매일 랭킹
  weekComics?: any[]; // 관리자가 설정한 요일 랭킹
  completeComics?: any[]; // 관리자가 설정한 완결 랭킹
  realtimeComics?: any[]; // 관리자가 설정한 실시간 랭킹
};

export default function RankingSection({ fetcher, dailyComics, weekComics, completeComics, realtimeComics }: Props) {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'completed'>('daily');
  const router = useRouter();
  const { t } = useTranslation();
  
  const { data: comicsData } = useQuery({
    queryKey: ['comics', tab],
    queryFn: async () => {
      const response = await api.get(endpoints.comics);
      return response.data;
    },
  });

  // 관리자가 설정한 카테고리별 랭킹 사용
  let filteredComics = [];
  if (tab === 'daily') {
    filteredComics = dailyComics || realtimeComics || comicsData?.comics || [];
  } else if (tab === 'weekly') {
    filteredComics = weekComics || (comicsData?.comics ? [...comicsData.comics].sort((a: any, b: any) => b.viewCount - a.viewCount) : []);
  } else if (tab === 'completed') {
    filteredComics = completeComics || comicsData?.comics?.filter((c: any) => c.status === 'COMPLETED') || [];
  }
  
  // 이미지 URL 처리 (Next.js rewrites 사용)
  const getImageUrl = (path: string) => {
    if (!path) return '/next.svg';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return path.startsWith('/') ? path : `/${path}`;
  };

  const items = filteredComics.slice(0, 10).map((item: any) => ({
    id: item.id,
    title: item.title,
    cover: getImageUrl(item.thumbnail),
    meta: `${item._count?.episodes || 0} ${t('webtoon.episode')} • ${item.viewCount || 0} ${t('webtoon.viewCount')}`,
  }));
  const scrollRef = useDragScroll<HTMLDivElement>();

  return (
    <section className="px-4" style={{ color: 'var(--ui-text)' }}>
      <div className="mx-auto max-w-6xl py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--ui-text)' }}>{t('home.hero.realtimeRanking')}</h2>
            <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>Updated 3 min ago</span>
          </div>
          <RankingTabs items={[t('common.daily'), t('common.weekly'), t('common.complete')]} value={tab} onChange={(v) => {
            const tabMap: { [key: string]: 'daily' | 'weekly' | 'completed' } = {
              [t('common.daily')]: 'daily',
              [t('common.weekly')]: 'weekly', 
              [t('common.complete')]: 'completed'
            };
            setTab(tabMap[v] || 'daily');
          }} />
        </div>
        <div ref={scrollRef} className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {items.map((it: any, idx: number) => (
            <article key={it.id} className="relative w-[168px] shrink-0 group cursor-pointer" 
                     onClick={() => router.push(`/webtoons/${it.id}`)}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg" style={{ background: 'var(--surface)' }}>
                <img
                  src={it.cover || '/next.svg'}
                  alt={it.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* 순위 배지 */}
                <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 group-hover:scale-110" style={{ background: 'var(--overlay-btn)', color: 'var(--ui-text)' }}>
                  {idx + 1}
                </div>
                {/* 호버 시 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="mt-2 text-sm font-medium line-clamp-2 transition-colors duration-300 group-hover:text-purple-400" style={{ color: 'var(--ui-text)' }}>{it.title}</div>
              <div className="text-xs" style={{ color: 'var(--ui-muted)' }}>{it.meta}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


