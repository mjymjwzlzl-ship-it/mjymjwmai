'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, X } from 'lucide-react';
import { TYPE_LABEL, adminApi } from '@/lib/works';

// 통계 (/api/admin/ops/stats): 작품별 조회수·회차별 조회수·찜·구매·매출·인기 추이·랭킹
// 조회수 = 누적(Comic.viewCount) + 기간(회차 조회 기록), 매출 = 회차 구매 코인 + 코인 충전 결제(원)
interface Day { date: string; views: number; purchases: number; coins: number; payments: number; newUsers: number; likes: number }
interface WorkStat { id: string; title: string; type: string; adult: boolean; status: string; views: number; periodViews: number; likes: number; episodes: number; own: number; rent: number; purchases: number; coins: number; periodCoins: number; popularRank: number | null; realtimeRank: number | null }
interface Stats { days: Day[]; works: WorkStat[]; totals: Record<string, number> }
const METRICS: { key: keyof Day; label: string; unit: string }[] = [
  { key: 'views', label: '조회', unit: '회' }, { key: 'purchases', label: '구매', unit: '건' }, { key: 'coins', label: '구매 코인', unit: '코인' },
  { key: 'payments', label: '결제 매출', unit: '원' }, { key: 'likes', label: '새 찜', unit: '건' }, { key: 'newUsers', label: '신규 회원', unit: '명' },
];
const SORTS: { key: keyof WorkStat; label: string }[] = [
  { key: 'periodViews', label: '기간 조회' }, { key: 'views', label: '누적 조회' }, { key: 'likes', label: '찜' }, { key: 'purchases', label: '구매' }, { key: 'coins', label: '구매 코인' }, { key: 'popularRank', label: '인기 순위' },
];

function Bars({ data, metric, height = 140 }: { data: { date: string; value: number }[]; metric: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = Math.max(6, Math.floor(900 / Math.max(1, data.length)) - 2);
  return (
    <div className="overflow-x-auto">
      <svg width={data.length * (w + 2)} height={height + 24} role="img" aria-label={`${metric} 일별 추이`}>
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * height);
          return (
            <g key={d.date}>
              <rect x={i * (w + 2)} y={height - h} width={w} height={h} rx={2} className="fill-purple-500"><title>{`${d.date} ${d.value.toLocaleString()}`}</title></rect>
              {(i % Math.ceil(data.length / 10) === 0 || i === data.length - 1) && <text x={i * (w + 2)} y={height + 16} className="fill-gray-400 text-[10px]">{d.date.slice(5)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function StatsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Stats | null>(null);
  const [metric, setMetric] = useState<keyof Day>('views');
  const [sort, setSort] = useState<keyof WorkStat>('periodViews');
  const [type, setType] = useState('');
  const [adult, setAdult] = useState('');
  const [openWork, setOpenWork] = useState<WorkStat | null>(null);
  useEffect(() => { setData(null); adminApi<Stats>(`/admin/ops/stats?days=${days}`).then(setData).catch((e) => alert(e.message)); }, [days]);
  const works = useMemo(() => (data?.works || [])
    .filter((w) => (!type || w.type === type) && (!adult || String(w.adult) === adult))
    .sort((a, b) => (sort === 'popularRank' ? (a.popularRank || 1e9) - (b.popularRank || 1e9) : (Number(b[sort]) || 0) - (Number(a[sort]) || 0))), [data, sort, type, adult]);
  const t = data?.totals || {};
  const card = (label: string, value: string, sub?: string) => (
    <div className="rounded-lg bg-gray-800 p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>{sub && <p className="text-xs text-gray-500">{sub}</p>}</div>
  );

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><BarChart3 className="h-6 w-6" />통계</h1>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm">
            {[7, 14, 30, 90].map((n) => <option key={n} value={n}>최근 {n}일</option>)}
          </select>
        </div>
        <p className="mt-1 text-sm text-gray-400">조회·찜·구매·매출·랭킹을 한곳에서 봅니다. 기간 값은 회차 조회 기록·구매·결제 시각 기준(한국 시간), 누적 값은 작품 전체 기준입니다. 결제 매출은 완료된 코인 충전 결제만.</p>
        {!data ? <p className="py-20 text-center text-gray-400">집계 중...</p> : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              {card('기간 조회', (t.periodViews || 0).toLocaleString(), `누적 ${(t.views || 0).toLocaleString()}`)}
              {card('기간 찜', (t.periodLikes || 0).toLocaleString(), `누적 ${(t.likes || 0).toLocaleString()}`)}
              {card('기간 구매', (t.periodPurchases || 0).toLocaleString(), `누적 ${(t.purchases || 0).toLocaleString()}건`)}
              {card('기간 구매 코인', (t.periodCoins || 0).toLocaleString(), `누적 ${(t.coins || 0).toLocaleString()}코인`)}
              {card('기간 결제 매출', `${(t.payments || 0).toLocaleString()}원`, t.refunds ? `환불 ${t.refunds.toLocaleString()}원` : undefined)}
              {card('신규 회원', (t.newUsers || 0).toLocaleString(), `작품 ${t.works || 0}개`)}
            </div>

            <section className="mt-6 rounded-lg bg-gray-800 p-4">
              <div className="mb-3 flex flex-wrap gap-1">
                {METRICS.map((m) => <button key={m.key} type="button" onClick={() => setMetric(m.key)} className={`rounded-full px-3 py-1 text-xs ${metric === m.key ? 'bg-purple-600' : 'bg-gray-700 text-gray-300'}`}>{m.label}</button>)}
              </div>
              <Bars data={data.days.map((d) => ({ date: d.date, value: Number(d[metric]) || 0 }))} metric={METRICS.find((m) => m.key === metric)!.label} />
            </section>

            <section className="mt-6">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <h2 className="mr-2 text-lg font-bold">작품별</h2>
                <select value={sort} onChange={(e) => setSort(e.target.value as keyof WorkStat)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1">{SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}순</option>)}</select>
                <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1"><option value="">전체 유형</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select value={adult} onChange={(e) => setAdult(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1"><option value="">전체 등급</option><option value="false">일반</option><option value="true">19세</option></select>
                <span className="text-gray-400">작품을 누르면 회차별 조회·인기 추이</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">작품</th><th className="p-2">기간 조회</th><th className="p-2">누적 조회</th><th className="p-2">찜</th><th className="p-2">구매(소장/대여)</th><th className="p-2">구매 코인</th><th className="p-2">인기 순위</th><th className="p-2">실시간 순위</th></tr></thead>
                  <tbody>
                    {works.slice(0, 200).map((w) => (
                      <tr key={w.id} className="cursor-pointer border-t border-gray-700 hover:bg-gray-800/60" onClick={() => setOpenWork(w)}>
                        <td className="p-2"><b>{w.title}</b><span className="block text-xs text-gray-400">{TYPE_LABEL[w.type]}{w.adult ? ' · 19세' : ''} · {w.episodes}화</span></td>
                        <td className="p-2">{w.periodViews.toLocaleString()}</td>
                        <td className="p-2">{w.views.toLocaleString()}</td>
                        <td className="p-2">{w.likes}</td>
                        <td className="p-2">{w.purchases} <span className="text-xs text-gray-400">({w.own}/{w.rent})</span></td>
                        <td className="p-2">{w.coins.toLocaleString()}</td>
                        <td className="p-2">{w.popularRank ? `${w.popularRank}위` : '-'}</td>
                        <td className="p-2">{w.realtimeRank ? `${w.realtimeRank}위` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-gray-500">인기·실시간 순위는 사용자 화면 랭킹과 같은 계산(성인 작품 제외).</p>
            </section>
          </>
        )}
      </div>
      {openWork && <WorkDetail work={openWork} days={days} onClose={() => setOpenWork(null)} />}
    </div>
  );
}

function WorkDetail({ work, days, onClose }: { work: WorkStat; days: number; onClose: () => void }) {
  const [d, setD] = useState<{ episodes: { id: string; episodeNumber: number; title: string; views: number; periodViews: number; purchases: number }[]; trend: { date: string; views: number }[] } | null>(null);
  useEffect(() => { adminApi<any>(`/admin/ops/stats/works/${work.id}?days=${days}`).then(setD).catch((e) => alert(e.message)); }, [work.id, days]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label="작품 통계">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={onClose} />
      <div className="relative h-full w-full max-w-3xl overflow-y-auto bg-gray-800 p-6 text-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">{work.title}</h2><button type="button" onClick={onClose} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button></div>
        <p className="text-gray-400">누적 조회 {work.views.toLocaleString()} · 찜 {work.likes} · 구매 {work.purchases} · 구매 코인 {work.coins.toLocaleString()} · <Link href={`/works/${work.id}`} className="underline">작품 관리로</Link></p>
        {!d ? <p className="mt-6 text-gray-400">불러오는 중...</p> : (
          <>
            <h3 className="mb-2 mt-5 font-bold">인기 추이 (일별 조회, 최근 {days}일)</h3>
            <Bars data={d.trend.map((x) => ({ date: x.date, value: x.views }))} metric="조회" height={110} />
            <h3 className="mb-2 mt-5 font-bold">회차별 조회수</h3>
            <table className="w-full">
              <thead className="text-left text-gray-400"><tr><th className="p-1.5">회차</th><th className="p-1.5">누적 조회</th><th className="p-1.5">기간 조회</th><th className="p-1.5">구매</th></tr></thead>
              <tbody>{d.episodes.map((e) => <tr key={e.id} className="border-t border-gray-700"><td className="p-1.5">{e.episodeNumber}화 <span className="text-gray-400">{e.title}</span></td><td className="p-1.5">{e.views.toLocaleString()}</td><td className="p-1.5">{e.periodViews.toLocaleString()}</td><td className="p-1.5">{e.purchases}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
