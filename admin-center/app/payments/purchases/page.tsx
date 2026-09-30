'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 결제 관리 > 구매·대여 내역 (회차를 코인으로 소장·대여한 기록)
interface Row { id: string; type: 'OWN' | 'RENT'; coinPrice: number; createdAt: string; expiresAt?: string | null; active: boolean; user: { id: string; name: string; email: string }; comic?: { id: string; title: string } | null; episodeNumber?: number; episodeTitle?: string }
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

export default function PurchasesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [type, setType] = useState('');
  const [active, setActive] = useState('');
  const [q, setQ] = useState('');
  const load = useCallback(async () => {
    try { setRows((await adminApi<{ purchases: Row[] }>(`/admin/ops/purchases?${new URLSearchParams({ ...(type ? { type } : {}), ...(active ? { active } : {}), ...(q.trim() ? { q: q.trim() } : {}) })}`)).purchases); } catch (e: any) { alert(e.message); }
  }, [type, active, q]);
  useEffect(() => { void load(); }, [type, active]); // eslint-disable-line react-hooks/exhaustive-deps
  const coins = rows.reduce((a, r) => a + r.coinPrice, 0);
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">구매·대여 내역</h1>
        <p className="mt-1 text-sm text-gray-400">회차 소장·대여 기록입니다. 대여는 남은 기간(이용 중/만료)을 함께 보여 줍니다. 최근 300건.</p>
        <div className="my-4 flex flex-wrap items-center gap-2 text-sm">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5"><option value="">소장·대여</option><option value="OWN">소장</option><option value="RENT">대여</option></select>
          <select value={active} onChange={(e) => setActive(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5"><option value="">전체</option><option value="true">이용 중</option><option value="false">대여 만료</option></select>
          <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품명·이메일·닉네임" className="bg-transparent py-1.5 outline-none" /></form>
          <span className="text-gray-400">{rows.length}건 · {coins.toLocaleString()}코인</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">일시</th><th className="p-2">회원</th><th className="p-2">작품</th><th className="p-2">회차</th><th className="p-2">구분</th><th className="p-2">코인</th><th className="p-2">대여 만료</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">내역이 없습니다.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-700">
                  <td className="whitespace-nowrap p-2 text-xs">{fmt(r.createdAt)}</td>
                  <td className="p-2">{r.user.name}<span className="block text-xs text-gray-500">{r.user.email}</span></td>
                  <td className="p-2">{r.comic ? <Link href={`/works/${r.comic.id}`} className="hover:underline">{r.comic.title}</Link> : '-'}</td>
                  <td className="p-2">{r.episodeNumber}화</td>
                  <td className="p-2">{r.type === 'RENT' ? <span className="rounded bg-sky-600/30 px-1.5 text-xs">대여</span> : <span className="rounded bg-purple-600/30 px-1.5 text-xs">소장</span>}</td>
                  <td className="p-2">{r.coinPrice}</td>
                  <td className="p-2 text-xs">{r.type === 'RENT' ? <>{fmt(r.expiresAt)} <span className={r.active ? 'text-green-300' : 'text-gray-500'}>{r.active ? '이용 중' : '만료'}</span></> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
