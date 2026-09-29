'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { api } from '@/lib/api';
import EventCard, { EVENT_STATUS_LABEL, type EventStatus, type SiteEvent } from '@/components/events/EventCard';

const TABS: EventStatus[] = ['ONGOING', 'UPCOMING', 'ENDED'];

export default function EventsPage() {
  const [tab, setTab] = useState<EventStatus>('ONGOING');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: async () => (await api.get('/events', { params: { status: 'all' } })).data.events as SiteEvent[],
    retry: false,
  });

  const counts = useMemo(() => {
    const map: Record<EventStatus, number> = { ONGOING: 0, UPCOMING: 0, ENDED: 0 };
    for (const event of data || []) map[event.status] += 1;
    return map;
  }, [data]);
  const items = (data || []).filter((event) => event.status === tab);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Gift className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
          이벤트
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">진행 중인 이벤트와 곧 시작할 이벤트를 한눈에 확인하세요.</p>

        <div className="mb-5 mt-5 flex gap-2 border-b border-gray-200 dark:border-gray-800" role="tablist">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-black transition ${
                tab === key ? 'border-[#00dc64] text-gray-950 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {EVENT_STATUS_LABEL[key]} <span className="text-xs font-bold text-gray-400">{counts[key]}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-gray-500">
            이벤트를 불러오지 못했습니다.
            <button type="button" onClick={() => void refetch()} className="ml-2 font-bold text-[#00a84c] underline">다시 시도</button>
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center font-bold text-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400">
            {tab === 'ONGOING' ? '진행 중인 이벤트가 없습니다.' : tab === 'UPCOMING' ? '예정된 이벤트가 없습니다.' : '종료된 이벤트가 없습니다.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  );
}
