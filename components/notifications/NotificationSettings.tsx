'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

type PrefKey = 'updates' | 'events' | 'promotions';
interface ComicPref { comicId: string; title: string; thumbnail?: string | null; notify: boolean }

const ROWS: { key: PrefKey; title: string; desc: string }[] = [
  { key: 'updates', title: '작품 업데이트', desc: '찜한 작품에 새 회차가 올라오면 알려 드려요' },
  { key: 'events', title: '이벤트', desc: '이벤트 시작과 종료 임박(24시간 전) 안내' },
  { key: 'promotions', title: '할인·무료 소식', desc: '할인·무료 공개 등 프로모션이 시작되면 알려 드려요' },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#00dc64]' : 'bg-gray-400 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean> | null>(null);
  const [comics, setComics] = useState<ComicPref[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/notifications/settings')
      .then(({ data }) => {
        setPrefs({ updates: data.updates, events: data.events, promotions: data.promotions });
        setComics(data.comics || []);
      })
      .catch(() => setError('로그인 후 알림을 설정할 수 있어요.'));
  }, []);

  const setPref = async (key: PrefKey, value: boolean) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
    try {
      await api.put('/notifications/settings', { [key]: value });
    } catch {
      setPrefs((prev) => (prev ? { ...prev, [key]: !value } : prev));
      alert('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const setComic = async (comicId: string, notify: boolean) => {
    setComics((prev) => prev.map((comic) => (comic.comicId === comicId ? { ...comic, notify } : comic)));
    try {
      await api.put(`/notifications/comics/${comicId}`, { notify });
    } catch {
      setComics((prev) => prev.map((comic) => (comic.comicId === comicId ? { ...comic, notify: !notify } : comic)));
      alert('저장하지 못했습니다.');
    }
  };

  if (error) return <p className="text-sm text-gray-500">{error}</p>;
  if (!prefs) return <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-50 p-5 dark:bg-gray-800">
        <h3 className="mb-1 text-lg font-semibold">알림함 알림</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">상단 종 모양 아이콘의 알림함으로 받아요.</p>
        <div className="space-y-4">
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{row.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{row.desc}</div>
              </div>
              <Toggle checked={prefs[row.key]} onChange={(value) => void setPref(row.key, value)} label={`${row.title} 알림`} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-5 dark:bg-gray-800">
        <h3 className="mb-1 text-lg font-semibold">작품별 업데이트 알림</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          찜한 작품마다 새 회차 알림을 따로 켜고 끌 수 있어요.{!prefs.updates && ' (지금은 작품 업데이트 알림 전체가 꺼져 있어요)'}
        </p>
        {comics.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">찜한 작품이 없습니다.</p>
        ) : (
          <ul className={`space-y-3 ${prefs.updates ? '' : 'opacity-50'}`}>
            {comics.map((comic) => (
              <li key={comic.comicId} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                    {comic.thumbnail ? <img src={getImageUrl(comic.thumbnail, { width: 100 })} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <span className="line-clamp-1 text-sm font-bold">{comic.title}</span>
                </div>
                <Toggle checked={comic.notify} onChange={(value) => void setComic(comic.comicId, value)} label={`${comic.title} 새 회차 알림`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
