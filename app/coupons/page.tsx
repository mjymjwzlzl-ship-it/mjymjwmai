'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { useLoginModalStore } from '@/store/loginModal';

export interface MyCoupon { id: string; name: string; type: 'DISCOUNT' | 'RENT_PASS' | 'OWN_PASS'; value: number; comicId?: string | null; comicTitle?: string | null; remainingUses: number; expiresAt?: string | null; daysLeft: number | null; expiringSoon: boolean; status: 'AVAILABLE' | 'USED' | 'EXPIRED'; typeLabel: string; scope: string; benefit: string; condition: string }

const fmt = (value: string) => new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' });
type Tab = 'AVAILABLE' | 'DONE';

export default function CouponsPage() {
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [coupons, setCoupons] = useState<MyCoupon[]>([]);
  const [tab, setTab] = useState<Tab>('AVAILABLE');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/coupons/mine').then(({ data }) => setCoupons(data.coupons || [])).catch(() => {}), []);
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setLoggedIn(!!token);
    if (token) void load();
  }, [load]);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post('/coupons/redeem', { code });
      alert(data.message);
      setCode('');
      await load();
    } catch (error: any) {
      alert(error.response?.data?.message || '등록하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const available = coupons.filter((c) => c.status === 'AVAILABLE');
  const done = coupons.filter((c) => c.status !== 'AVAILABLE');
  const list = tab === 'AVAILABLE' ? available : done;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="flex items-center gap-2 text-2xl font-black"><Ticket className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />쿠폰함 · 이용권</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">할인 쿠폰과 회차 이용권은 유료 회차 구매창에서 골라 쓸 수 있어요.</p>
        {loggedIn === false ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
            <button type="button" onClick={() => openLogin(true)} className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black">로그인 / 회원가입</button>
          </div>
        ) : (
          <>
            <form onSubmit={redeem} className="mt-5 flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="쿠폰 번호 입력" maxLength={32} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#1b1b1b]" />
              <button type="submit" disabled={busy || !code.trim()} className="shrink-0 rounded-lg bg-[#00dc64] px-4 text-sm font-black text-black disabled:opacity-50">등록</button>
            </form>
            <div className="mb-3 mt-5 flex gap-2 border-b border-gray-200 dark:border-gray-800" role="tablist">
              {([['AVAILABLE', `사용 가능 ${available.length}`], ['DONE', `사용·만료 ${done.length}`]] as const).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-black ${tab === key ? 'border-[#00dc64]' : 'border-transparent text-gray-400'}`}>{label}</button>
              ))}
            </div>
            {list.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-sm font-bold text-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400">{tab === 'AVAILABLE' ? '사용할 수 있는 쿠폰이 없어요.' : '사용했거나 만료된 쿠폰이 없어요.'}</p>
            ) : (
              <ul className="space-y-2">
                {list.map((c) => (
                  <li key={c.id} className={`rounded-xl border bg-white p-4 dark:bg-[#1b1b1b] ${c.expiringSoon ? 'border-red-300 dark:border-red-500/40' : 'border-gray-200 dark:border-gray-800'} ${c.status !== 'AVAILABLE' ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-[#00dc64]/15 px-1.5 py-0.5 text-[11px] font-black text-[#00a84c] dark:text-[#00dc64]">{c.typeLabel}</span>
                      {c.expiringSoon && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-black text-white">만료 임박</span>}
                      {c.status === 'USED' && <span className="rounded bg-gray-300 px-1.5 py-0.5 text-[11px] font-black text-gray-700">사용 완료</span>}
                      {c.status === 'EXPIRED' && <span className="rounded bg-gray-300 px-1.5 py-0.5 text-[11px] font-black text-gray-700">만료</span>}
                    </div>
                    <p className="mt-1.5 font-black">{c.name}{c.remainingUses > 1 ? ` · ${c.remainingUses}장` : ''}</p>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{c.benefit}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      적용 작품: {c.comicId ? <Link href={`/webtoons/${c.comicId}`} className="underline">{c.comicTitle || '지정 작품'}</Link> : '모든 작품'} · 사용 조건: 유료 회차 1개에 1장
                    </p>
                    <p className={`mt-0.5 text-xs ${c.expiringSoon ? 'font-bold text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      유효기간: {c.expiresAt ? `${fmt(c.expiresAt)}까지${c.status === 'AVAILABLE' && c.daysLeft !== null ? ` (${c.daysLeft === 0 ? '오늘 만료' : `${c.daysLeft}일 남음`})` : ''}` : '기한 없음'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
