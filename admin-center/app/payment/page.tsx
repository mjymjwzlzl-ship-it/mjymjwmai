'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { TYPE_LABEL, adminApi, img } from '@/lib/works';

// 결제 관리 > 작품별 대여·소장 가격: 가격은 여기서만 바꾼다 (작품 관리 상세에는 요약만)
interface Row { id: string; title: string; thumbnail?: string | null; type: 'webtoon' | 'book' | 'novel'; rating: string; episodes: number; paidStartEpisode: number; episodeCoinPrice: number; rentalCoinPrice: number | null; rentalDays: number }
type Edit = { paidStartEpisode: string; episodeCoinPrice: string; rentalCoinPrice: string; rentalDays: string };

function PricesContent() {
  const params = useSearchParams();
  const focus = params.get('work');
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => adminApi<{ works: Row[] }>('/admin/works').then((d) => setRows(d.works)).catch((e) => alert(e.message)).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (focus && rows.length) document.getElementById(`price-${focus}`)?.scrollIntoView({ block: 'center' }); }, [focus, rows.length]);
  const edit = (r: Row): Edit => edits[r.id] || { paidStartEpisode: String(r.paidStartEpisode), episodeCoinPrice: String(r.episodeCoinPrice), rentalCoinPrice: r.rentalCoinPrice === null || r.rentalCoinPrice === undefined ? '' : String(r.rentalCoinPrice), rentalDays: String(r.rentalDays || 3) };
  const change = (r: Row, patch: Partial<Edit>) => setEdits({ ...edits, [r.id]: { ...edit(r), ...patch } });
  const save = async (r: Row) => {
    const e = edit(r);
    const n = (v: string) => Number(v);
    if ([e.paidStartEpisode, e.episodeCoinPrice, e.rentalDays].some((v) => v === '' || !Number.isInteger(n(v)) || n(v) < 0) || (e.rentalCoinPrice !== '' && (!Number.isInteger(n(e.rentalCoinPrice)) || n(e.rentalCoinPrice) < 0)) || n(e.rentalDays) < 1) { alert('0 이상의 정수로 입력하세요. (대여 기간은 1일 이상)'); return; }
    try {
      await adminApi(`/admin/works/${r.id}`, { method: 'PATCH', json: { paidStartEpisode: n(e.paidStartEpisode), episodeCoinPrice: n(e.episodeCoinPrice), rentalCoinPrice: e.rentalCoinPrice === '' ? null : n(e.rentalCoinPrice), rentalDays: n(e.rentalDays) } });
      const next = { ...edits }; delete next[r.id]; setEdits(next); await load();
    } catch (err: any) { alert(err.message); }
  };
  const list = useMemo(() => rows.filter((r) => (!type || r.type === type) && (!q.trim() || r.title.includes(q.trim()))), [rows, q, type]);
  const input = 'w-20 rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">작품별 대여·소장 가격</h1>
        <p className="mt-1 text-sm text-gray-400">유료 시작 회차·소장가·대여가·대여 기간을 작품별로 정합니다. 가격은 이 화면에서만 바꾸고, 기간 할인·무료는 [프로모션 &gt; 할인·무료 작품]에서 겁니다. 대여가를 비우면 소장가-1, 0이면 대여 없음.</p>
        <div className="my-4 flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품명" className="bg-transparent py-1.5 text-sm outline-none" /></label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm"><option value="">전체 유형</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <span className="self-center text-sm text-gray-400">{list.length}개</span>
        </div>
        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-3">작품</th><th className="p-3">회차</th><th className="p-3">유료 시작 회차<br /><span className="text-[11px]">0 = 전편 무료</span></th><th className="p-3">소장가(코인)</th><th className="p-3">대여가(코인)</th><th className="p-3">대여 기간(일)</th><th className="p-3" /></tr></thead>
              <tbody>
                {list.map((r) => {
                  const e = edit(r); const dirty = !!edits[r.id];
                  return (
                    <tr key={r.id} id={`price-${r.id}`} className={`border-t border-gray-700 ${focus === r.id ? 'bg-purple-900/30' : ''}`}>
                      <td className="p-3"><Link href={`/works/${r.id}`} className="flex items-center gap-2 hover:underline"><img src={img(r.thumbnail)} alt="" className="h-10 w-7 rounded bg-gray-700 object-cover" /><span><b>{r.title}</b><span className="block text-xs text-gray-400">{TYPE_LABEL[r.type]}{['19', 'ADULT'].includes(r.rating) ? ' · 19세' : ''}</span></span></Link></td>
                      <td className="p-3">{r.episodes}</td>
                      <td className="p-3"><input aria-label="유료 시작 회차" type="number" min={0} className={input} value={e.paidStartEpisode} onChange={(ev) => change(r, { paidStartEpisode: ev.target.value })} /></td>
                      <td className="p-3"><input aria-label="소장가" type="number" min={0} className={input} value={e.episodeCoinPrice} onChange={(ev) => change(r, { episodeCoinPrice: ev.target.value })} /></td>
                      <td className="p-3"><input aria-label="대여가" type="number" min={0} placeholder="자동" className={input} value={e.rentalCoinPrice} onChange={(ev) => change(r, { rentalCoinPrice: ev.target.value })} /></td>
                      <td className="p-3"><input aria-label="대여 기간" type="number" min={1} className={input} value={e.rentalDays} onChange={(ev) => change(r, { rentalDays: ev.target.value })} /></td>
                      <td className="p-3"><button type="button" disabled={!dirty} onClick={() => void save(r)} className="rounded bg-purple-600 px-3 py-1 text-xs font-bold disabled:bg-gray-700 disabled:text-gray-500">저장</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default function PaymentPricesPage() { return <Suspense fallback={null}><PricesContent /></Suspense>; }
