'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { RANKING_KINDS, RankingCard, RankingEmpty, rankingCriteria, rankingLabel, type RankingKind, type RankingResponse } from '@/components/ranking/rankingShared';

function RankingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parse = (value: string | null): RankingKind => (RANKING_KINDS.includes(value as RankingKind) ? (value as RankingKind) : 'popular');
  const [kind, setKind] = useState<RankingKind>(parse(searchParams.get('tab')));
  useEffect(() => setKind(parse(searchParams.get('tab'))), [searchParams]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rankings', 'full'],
    queryFn: async () => (await api.get('/frontend/rankings', { params: { limit: 100 } })).data as RankingResponse,
    retry: false,
  });
  const list = data?.rankings?.[kind];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Trophy className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
          작품 랭킹
        </h1>
        <div className="no-scrollbar mb-3 mt-5 flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800" role="tablist">
          {RANKING_KINDS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={kind === key}
              onClick={() => { setKind(key); router.replace(`/ranking?tab=${key}`, { scroll: false }); }}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-black transition ${
                kind === key ? 'border-[#00dc64] text-gray-950 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {rankingLabel(key, data?.rankings?.[key])}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{rankingCriteria(kind, data?.realtimeHours, list)}</p>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-gray-500">
            랭킹을 불러오지 못했습니다.
            <button type="button" onClick={() => void refetch()} className="ml-2 font-bold text-[#00a84c] underline">다시 시도</button>
          </p>
        ) : !list || list.items.length === 0 ? (
          <RankingEmpty kind={kind} />
        ) : (
          <div className="grid gap-1 rounded-xl border border-gray-200 bg-white p-2 sm:grid-cols-2 dark:border-gray-800 dark:bg-[#1b1b1b]">
            {list.items.map((item) => <RankingCard key={item.id} item={item} kind={kind} criteria={list.criteria} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={null}>
      <RankingContent />
    </Suspense>
  );
}
