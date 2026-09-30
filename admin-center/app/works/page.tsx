'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Library, Search, X } from 'lucide-react';
import { DAY_LABEL, LOCALE_LABEL, RATING_LABEL, STATUS_LABEL, TYPE_LABEL, apiBase, authHeaders, genreLabel, img } from '@/lib/works';

// 작품 관리: 웹툰·단행본·웹소설 한곳에서. 유형·언어·이용등급·연재 상태·연재 요일·장르·태그·날짜를 따로 골라 조합 필터.
// (예전 일반/성인/영어 일반/영어 성인 구역 대신 조건으로 나눈다) 작품을 누르면 상세(정보·연재·회차·공지)로.
interface Work {
  id: string; title: string; authorName?: string | null; thumbnail?: string | null; rating: string; status: string; type: 'webtoon' | 'book' | 'novel';
  genre?: string | null; locale: string; days: string[]; tags: string[];
  isPublished: boolean; paidStartEpisode: number; episodeCoinPrice: number; viewCount: number; createdAt: string; episodes: number; lastEpisodeAt?: string | null;
  nextScheduledAt?: string | null; badges: { up: boolean; new: boolean; hiatus: boolean; suspended: boolean }; scheduled: number;
}
type DateField = 'createdAt' | 'lastEpisodeAt' | 'nextScheduledAt';
const TYPE_TABS = [['', '전체 작품'], ['webtoon', '웹툰'], ['book', '단행본'], ['novel', '웹소설']] as const;
const ratingKey = (r: string) => (['19', 'ADULT', 'adult'].includes(r) ? '19' : r === '15' ? '15' : 'GENERAL');
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' }) : '-');

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ q: '', type: '', locale: '', rating: '', status: '', days: '', genre: '', tag: '', published: '', dateField: 'createdAt' as DateField, from: '', to: '', sort: 'created' });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    // 목록 조건은 주소(?type=…)에도 담아 새로고침·뒤로가기에 유지
    try { const p = new URLSearchParams(window.location.search); const init: any = {}; p.forEach((v, k) => { if (k in f) init[k] = v; }); if (Object.keys(init).length) set(init); } catch {}
    fetch(`${apiBase()}/admin/works`, { headers: authHeaders() })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.message); return d; }))
      .then((d) => setWorks(d.works || []))
      .catch((e) => alert(e.message || '불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v && !(k === 'dateField' && v === 'createdAt') && !(k === 'sort' && v === 'created')) p.set(k, String(v)); });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${p.toString() ? `?${p}` : ''}`);
  }, [f]);

  const genres = useMemo(() => Array.from(new Set(works.map((w) => genreLabel(w.genre)))).sort((a, b) => a.localeCompare(b, 'ko')), [works]);
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    works.forEach((w) => w.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [works]);

  const list = useMemo(() => {
    const fromT = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
    const toT = f.to ? new Date(`${f.to}T23:59:59`).getTime() : null;
    const out = works.filter((w) => {
      if (f.q && !w.title.includes(f.q) && !(w.authorName || '').includes(f.q)) return false;
      if (f.type && w.type !== f.type) return false;
      if (f.locale && (w.locale || 'ko') !== f.locale) return false;
      if (f.rating && ratingKey(w.rating) !== f.rating) return false;
      if (f.status && w.status !== f.status) return false;
      if (f.days === 'daily' && w.days.length !== 7) return false;
      if (f.days === 'irregular' && w.days.length !== 0) return false;
      if (f.days && !['daily', 'irregular'].includes(f.days) && !w.days.includes(f.days)) return false;
      if (f.genre && genreLabel(w.genre) !== f.genre) return false;
      if (f.tag && !w.tags.includes(f.tag)) return false;
      if (f.published && String(w.isPublished) !== f.published) return false;
      if (fromT || toT) {
        const v = w[f.dateField]; if (!v) return false;
        const t = new Date(v).getTime(); if ((fromT && t < fromT) || (toT && t > toT)) return false;
      }
      return true;
    });
    const by: Record<string, (a: Work, b: Work) => number> = {
      created: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      updated: (a, b) => +new Date(b.lastEpisodeAt || 0) - +new Date(a.lastEpisodeAt || 0),
      views: (a, b) => b.viewCount - a.viewCount,
      title: (a, b) => a.title.localeCompare(b.title, 'ko'),
    };
    return out.sort(by[f.sort] || by.created);
  }, [works, f]);

  const count = (key: string) => (key ? works.filter((w) => w.type === key).length : works.length);
  const select = 'rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';
  const active = Object.entries(f).filter(([k, v]) => v && !['type', 'dateField', 'sort'].includes(k)).length;

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Library className="h-6 w-6" />작품 관리</h1>
        <p className="mt-1 text-sm text-gray-400">작품 정보의 기준. 여기서 정한 유형·언어·이용등급·연재 상태·연재 요일·장르·태그·공개일이 사용자 화면과 자동 분류(요일·완결·신작·최신 업데이트)에 그대로 반영됩니다. 배지: <b className="text-red-400">UP</b> 오늘 공개 회차 · <b className="text-green-400">NEW</b> 런칭 7일 이내.</p>

        <div className="mt-4 flex flex-wrap gap-1 border-b border-gray-700" role="tablist">
          {TYPE_TABS.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={f.type === key} onClick={() => set({ type: key })}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold ${f.type === key ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {label} <span className="text-xs text-gray-500">{count(key)}</span>
            </button>
          ))}
        </div>

        <div className="my-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="제목·작가" className="bg-transparent py-1.5 text-sm outline-none" /></label>
          <select aria-label="언어" className={select} value={f.locale} onChange={(e) => set({ locale: e.target.value })}><option value="">언어 전체</option>{Object.entries(LOCALE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select aria-label="이용등급" className={select} value={f.rating} onChange={(e) => set({ rating: e.target.value })}><option value="">이용등급 전체</option><option value="GENERAL">전체 이용가</option><option value="15">15세</option><option value="19">19세</option></select>
          <select aria-label="연재 상태" className={select} value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">연재 상태 전체</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select aria-label="연재 요일" className={select} value={f.days} onChange={(e) => set({ days: e.target.value })}><option value="">연재 요일 전체</option>{Object.entries(DAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}요일</option>)}<option value="daily">매일</option><option value="irregular">비정기(요일 없음)</option></select>
          <select aria-label="장르" className={select} value={f.genre} onChange={(e) => set({ genre: e.target.value })}><option value="">장르 전체</option>{genres.map((g) => <option key={g} value={g}>{g}</option>)}</select>
          <select aria-label="태그" className={select} value={f.tag} onChange={(e) => set({ tag: e.target.value })}><option value="">태그 전체</option>{tags.map((t) => <option key={t} value={t}>#{t}</option>)}</select>
          <select aria-label="공개 여부" className={select} value={f.published} onChange={(e) => set({ published: e.target.value })}><option value="">공개·미공개</option><option value="true">공개</option><option value="false">미공개</option></select>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <select aria-label="날짜 기준" className={select} value={f.dateField} onChange={(e) => set({ dateField: e.target.value as DateField })}>
            <option value="createdAt">발행일(런칭일)</option><option value="lastEpisodeAt">최근 공개일</option><option value="nextScheduledAt">예약 공개일</option>
          </select>
          <input type="date" aria-label="시작일" className={select} value={f.from} onChange={(e) => set({ from: e.target.value })} />~
          <input type="date" aria-label="종료일" className={select} value={f.to} onChange={(e) => set({ to: e.target.value })} />
          <select aria-label="정렬" className={select} value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="created">런칭 최신순</option><option value="updated">최근 공개순</option><option value="views">조회수순</option><option value="title">제목순</option>
          </select>
          <span className="text-gray-400">{list.length}개</span>
          {active > 0 && <button type="button" onClick={() => setF((prev) => ({ ...prev, q: '', locale: '', rating: '', status: '', days: '', genre: '', tag: '', published: '', from: '', to: '' }))} className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs"><X className="h-3 w-3" />조건 {active}개 지우기</button>}
        </div>

        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400">
                <tr><th className="p-3">작품</th><th className="p-3">유형·언어</th><th className="p-3">이용등급</th><th className="p-3">연재</th><th className="p-3">장르·태그</th><th className="p-3">회차</th><th className="p-3">발행일</th><th className="p-3">최근·예약 공개</th><th className="p-3">조회</th></tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="border-t border-gray-700 hover:bg-gray-800/60">
                    <td className="p-3">
                      <Link href={`/works/${w.id}`} className="flex items-center gap-3">
                        <img src={img(w.thumbnail)} alt="" className="h-14 w-10 shrink-0 rounded bg-gray-700 object-cover" />
                        <span>
                          <span className="flex flex-wrap items-center gap-1 font-bold hover:underline">
                            {w.title}
                            {w.badges.up && <span className="rounded bg-red-600 px-1 text-[10px]">UP</span>}
                            {w.badges.new && <span className="rounded bg-green-500 px-1 text-[10px] text-black">NEW</span>}
                            {!w.isPublished && <span className="rounded bg-gray-600 px-1 text-[10px]">미공개</span>}
                          </span>
                          <span className="text-xs text-gray-400">{w.authorName || '-'}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="p-3 text-xs">{TYPE_LABEL[w.type]}<br /><span className="text-gray-400">{LOCALE_LABEL[w.locale] || w.locale}</span></td>
                    <td className="p-3 text-xs">{ratingKey(w.rating) === '19' ? <span className="rounded bg-red-800 px-1.5">19세</span> : RATING_LABEL[ratingKey(w.rating)]}</td>
                    <td className="p-3 text-xs">
                      <span className={w.status === 'HIATUS' ? 'text-amber-300' : w.status === 'SUSPENDED' ? 'text-red-300' : ''}>{STATUS_LABEL[w.status] || w.status}</span><br />
                      <span className="text-gray-400">{w.days.length === 7 ? '매일' : w.days.length ? w.days.map((d) => DAY_LABEL[d]).join('·') : '비정기'}</span>
                    </td>
                    <td className="max-w-[12rem] p-3 text-xs">{genreLabel(w.genre)}{w.tags.length > 0 && <span className="block truncate text-gray-400">{w.tags.map((t) => `#${t}`).join(' ')}</span>}</td>
                    <td className="p-3 text-xs">{w.episodes}{w.scheduled > 0 && <span className="ml-1 text-yellow-300">(예약 {w.scheduled})</span>}</td>
                    <td className="p-3 text-xs">{day(w.createdAt)}</td>
                    <td className="p-3 text-xs">{day(w.lastEpisodeAt)}{w.nextScheduledAt && <span className="block text-yellow-300">예약 {day(w.nextScheduledAt)}</span>}</td>
                    <td className="p-3 text-xs">{w.viewCount.toLocaleString()}</td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-gray-400">조건에 맞는 작품이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
