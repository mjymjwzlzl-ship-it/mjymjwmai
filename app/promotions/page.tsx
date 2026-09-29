'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent } from 'lucide-react';
import { api } from '@/lib/api';
import PromoCard, { PROMO_TABS, type PromoComic, type PromoTab } from '@/components/promotions/PromoCard';

function PromotionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parse = (value: string | null): PromoTab => (value === 'discount' || value === 'free' ? value : 'all');
  const [tab, setTab] = useState<PromoTab>(parse(searchParams.get('tab')));
  useEffect(() => setTab(parse(searchParams.get('tab'))), [searchParams]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promotions', tab],
    queryFn: async () => (await api.get('/frontend/promotions', { params: { type: tab } })).data.items as PromoComic[],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <BadgePercent className="h-6 w-6 text-red-500" />
          이벤트 작품
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">할인 중이거나 무료로 볼 수 있는 작품이에요. 이벤트가 끝나면 목록에서 자동으로 빠집니다.</p>
        <div className="mb-5 mt-5 flex gap-2" role="tablist">
          {PROMO_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => { setTab(key); router.replace(`/promotions?tab=${key}`, { scroll: false }); }}
              className={`rounded-full px-4 py-1.5 text-sm font-black transition ${tab === key ? 'bg-gray-950 text-white dark:bg-white dark:text-black' : 'border border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-gray-500">목록을 불러오지 못했습니다. <button type="button" onClick={() => void refetch()} className="font-bold text-[#00a84c] underline">다시 시도</button></p>
        ) : !data || data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center font-bold text-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400">진행 중인 이벤트 작품이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.map((item) => <PromoCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  return <Suspense fallback={null}><PromotionsContent /></Suspense>;
}
