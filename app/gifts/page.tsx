'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { api } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModal';

interface GiftItem { id: string; type: 'COIN' | 'COUPON'; title: string; kindLabel: string; detail?: string | null; reason: string; claimBefore?: string | null; daysLeft: number | null; status: 'READY' | 'CLAIMED' | 'EXPIRED'; claimedAt?: string | null; createdAt: string }

const fmt = (value: string) => new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' });

export default function GiftsPage() {
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/gifts').then(({ data }) => setGifts(data.gifts || [])).catch(() => {}), []);
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setLoggedIn(!!token);
    if (token) void load();
  }, [load]);

  const done = async () => { await load(); window.dispatchEvent(new Event('giftsUpdated')); };
  const claimOne = async (id: string) => {
    setBusy(true);
    try { await api.post(`/gifts/${id}/claim`); await done(); } catch (e: any) { alert(e.response?.data?.message || '받지 못했어요.'); } finally { setBusy(false); }
  };
  const claimAll = async () => {
    setBusy(true);
    try { const { data } = await api.post('/gifts/claim-all'); alert(`${data.claimed}개의 선물을 받았어요.`); await done(); } catch { alert('받지 못했어요.'); } finally { setBusy(false); }
  };
  const ready = gifts.filter((g) => g.status === 'READY');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-end justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-black"><Gift className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />선물함</h1>
          {ready.length > 0 && (
            <button type="button" disabled={busy} onClick={() => void claimAll()} className="rounded-lg bg-[#00dc64] px-4 py-2 text-sm font-black text-black disabled:opacity-50">전체 받기 ({ready.length})</button>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">이벤트 보상은 [받기]를 눌러야 코인·쿠폰함에 들어가요. 받을 수 있는 기간이 지나면 사라져요.</p>
        {loggedIn === false ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
            <button type="button" onClick={() => openLogin(true)} className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black">로그인 / 회원가입</button>
          </div>
        ) : gifts.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm font-bold text-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400">받은 선물이 없어요.</p>
        ) : (
          <ul className="mt-5 space-y-2">
            {gifts.map((gift) => (
              <li key={gift.id} className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1b1b1b] ${gift.status !== 'READY' ? 'opacity-60' : ''}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-black ${gift.type === 'COIN' ? 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300' : 'bg-[#00dc64]/15 text-[#00a84c] dark:text-[#00dc64]'}`}>{gift.kindLabel}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-black">{gift.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{gift.reason}{gift.detail ? ` · ${gift.detail}` : ''}</p>
                  <p className="mt-0.5 text-xs">
                    {gift.status === 'CLAIMED' ? <span className="text-gray-400">{gift.claimedAt ? `${fmt(gift.claimedAt)} 받음` : '받음'}</span>
                      : gift.status === 'EXPIRED' ? <span className="text-gray-400">받을 수 있는 기간이 지났어요</span>
                      : gift.claimBefore ? <span className={`font-bold ${gift.daysLeft !== null && gift.daysLeft <= 3 ? 'text-red-500' : 'text-gray-500'}`}>{gift.daysLeft === 0 ? '오늘 만료' : `${gift.daysLeft}일 후 만료`} · {fmt(gift.claimBefore)}까지</span>
                      : <span className="text-gray-500">기한 없이 받을 수 있어요</span>}
                  </p>
                </div>
                {gift.status === 'READY' && (
                  <button type="button" disabled={busy} onClick={() => void claimOne(gift.id)} className="shrink-0 rounded-lg bg-[#00dc64] px-4 py-2 text-sm font-black text-black disabled:opacity-50">받기</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
