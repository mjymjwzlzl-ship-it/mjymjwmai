'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pin, Plus, Search, X } from 'lucide-react';
import { DAY_LABEL, STATUS_LABEL, TYPE_LABEL, adminApi, img, siteBase } from '@/lib/works';

// 노출 관리 (/api/admin/exposure): 작품 정보가 아니라 "사용자 화면 어디에 무엇을 보여 줄지"
// 탭: 홈 화면 섹션 / 오늘의 추천작 / 추천 신작 / 인기 작품(상단 고정 + 자동 순위) / 실시간 랭킹 / 자동 분류(요일·매일·완결·신작·최신 업데이트)
// 배너 관리는 /banners (같은 노출 관리 메뉴)
type Tab = 'sections' | 'today' | 'new' | 'popular' | 'realtime' | 'auto';
interface Brief { id: string; title: string; thumbnail?: string | null; status: string; type: 'webtoon' | 'book' | 'novel'; rating: string; createdAt: string; lastEpisodeAt?: string | null; isPublished?: boolean }
interface Section { key: string; label: string; visible: boolean }
interface RankRow { rank: number; id: string; title: string; type: string; score: number; views: number; recentViews: number; likes: number; pinned: boolean; launchedAt: string }

const TABS: { key: Tab; label: string }[] = [
  { key: 'sections', label: '홈 화면 섹션' }, { key: 'today', label: '오늘의 추천작' }, { key: 'new', label: '추천 신작' },
  { key: 'popular', label: '인기 작품' }, { key: 'realtime', label: '실시간 랭킹' }, { key: 'auto', label: '자동 분류' },
];
const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '-');

function ExposureContent() {
  const params = useSearchParams();
  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'sections') as Tab;
  const [data, setData] = useState<{ sections: Section[]; todayPicks: Brief[]; newPicks: Brief[]; popularPins: Brief[] } | null>(null);
  const load = useCallback(async () => { try { setData(await adminApi('/admin/exposure')); } catch (e: any) { alert(e.message); } }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">노출 관리</h1>
        <p className="mt-1 text-sm text-gray-400">사용자 화면에서 어떤 작품을 어디에 보여 줄지 정합니다. 작품 자체 정보(유형·상태·연재 요일 등)는 [작품 관리]에서만 바꾸고, 요일·완결·신작·최신 업데이트는 그 정보로 자동 분류됩니다.</p>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-gray-700">
          {TABS.map((t) => (
            <Link key={t.key} href={`/exposure?tab=${t.key}`} onClick={() => window.setTimeout(() => window.dispatchEvent(new Event('arata-admin-tab')), 0)} aria-current={tab === t.key ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold ${tab === t.key ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>{t.label}</Link>
          ))}
          <Link href="/banners" className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-bold text-gray-400 hover:text-white">배너 관리 →</Link>
        </div>
        <div className="mt-5">
          {!data && tab !== 'realtime' && tab !== 'auto' ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
            <>
              {tab === 'sections' && data && <Sections initial={data.sections} />}
              {tab === 'today' && data && (
                <PickList listKey="today_picks" title="오늘의 추천작" max={6} initial={data.todayPicks} allowNovel={false} onSaved={load}
                  help="홈 [오늘의 추천작]에 이 순서대로 나옵니다(최대 6개). 비거나 모자라면 남는 자리는 인기 작품 순으로 자동으로 채웁니다. 홈 카드 영역이라 웹소설·19세 작품은 고를 수 없습니다." />
              )}
              {tab === 'new' && data && (
                <PickList listKey="new_picks" title="추천 신작" max={6} initial={data.newPicks} allowNovel={false} onSaved={load}
                  help="홈 [추천 신작]에 먼저 나옵니다(최대 6개). 남는 자리는 런칭 최신순으로 자동으로 채웁니다. 웹소설·19세 작품은 고를 수 없습니다." />
              )}
              {tab === 'popular' && data && (
                <>
                  <PickList listKey="popular_pins" title="인기 작품 상단 고정" max={10} initial={data.popularPins} allowNovel onSaved={load}
                    help="홈 [인기 작품]·랭킹 페이지 인기순에서 점수와 관계없이 맨 앞에 이 순서대로 둡니다(최대 10개). 나머지는 인기 점수(누적 조회수 + 찜 × 10 + 평점 합) 순으로 자동 정렬됩니다." />
                  <Rankings kind="popular" />
                </>
              )}
              {tab === 'realtime' && <Rankings kind="realtime" />}
              {tab === 'auto' && <AutoCategories />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Sections({ initial }: { initial: Section[] }) {
  const [list, setList] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const move = (i: number, dir: -1 | 1) => { const n = [...list]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setList(n); setDirty(true); };
  const save = async () => {
    try { const r = await adminApi<{ sections: Section[] }>('/admin/exposure/sections', { method: 'PUT', json: { sections: list } }); setList(r.sections); setDirty(false); alert('홈 화면 섹션을 저장했습니다. 사이트 홈에 바로 반영됩니다.'); } catch (e: any) { alert(e.message); }
  };
  return (
    <section>
      <p className="mb-3 text-sm text-gray-400">홈 화면에 나오는 섹션의 순서와 노출 여부입니다. 맨 위 대배너는 항상 첫 번째이고 [배너 관리]에서 관리합니다.</p>
      <ol className="space-y-2">
        {list.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-3 rounded-lg border p-3 ${s.visible ? 'border-gray-700 bg-gray-800' : 'border-gray-800 bg-gray-800/40 text-gray-500'}`}>
            <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
            <span className="flex-1 font-bold">{s.label}</span>
            <button type="button" onClick={() => { setList(list.map((x) => (x.key === s.key ? { ...x, visible: !x.visible } : x))); setDirty(true); }} className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${s.visible ? 'bg-green-600/30 text-green-200' : 'bg-gray-700 text-gray-400'}`}>
              {s.visible ? <><Eye className="h-3.5 w-3.5" />노출</> : <><EyeOff className="h-3.5 w-3.5" />숨김</>}
            </button>
            <button type="button" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="아래로" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex justify-end gap-2">
        <a href={`${siteBase()}/home`} target="_blank" rel="noreferrer" className="rounded bg-gray-700 px-3 py-2 text-sm">홈에서 보기</a>
        <button type="button" disabled={!dirty} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-2 text-sm font-bold disabled:opacity-40">저장</button>
      </div>
    </section>
  );
}

// 작품 고르기: 선택 목록(순서·삭제) + 검색해서 추가
function PickList({ listKey, title, max, initial, allowNovel, help, onSaved }: { listKey: string; title: string; max: number; initial: Brief[]; allowNovel: boolean; help: string; onSaved: () => Promise<void> }) {
  const [picked, setPicked] = useState<Brief[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [all, setAll] = useState<Brief[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { setPicked(initial); setDirty(false); }, [initial]);
  useEffect(() => { adminApi<{ works: any[] }>('/admin/works').then((r) => setAll(r.works.map((w) => ({ id: w.id, title: w.title, thumbnail: w.thumbnail, status: w.status, type: w.type, rating: w.rating, createdAt: w.createdAt, lastEpisodeAt: w.lastEpisodeAt, isPublished: w.isPublished })))).catch(() => {}); }, []);
  const candidates = useMemo(() => all.filter((w) => w.isPublished !== false && !['19', 'ADULT', 'adult'].includes(w.rating) && (allowNovel || w.type !== 'novel') && !picked.some((p) => p.id === w.id) && (!q.trim() || w.title.includes(q.trim()))).slice(0, 30), [all, picked, q, allowNovel]);
  const move = (i: number, dir: -1 | 1) => { const n = [...picked]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setPicked(n); setDirty(true); };
  const save = async () => {
    try { await adminApi(`/admin/exposure/list/${listKey}`, { method: 'PUT', json: { ids: picked.map((p) => p.id) } }); setDirty(false); await onSaved(); alert(`${title}을(를) 저장했습니다. 사이트에 바로 반영됩니다.`); } catch (e: any) { alert(e.message); }
  };
  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title} <span className="text-sm text-gray-400">{picked.length}/{max}</span></h2>
        <button type="button" disabled={!dirty} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-1.5 text-sm font-bold disabled:opacity-40">저장</button>
      </div>
      <p className="mb-3 mt-1 text-sm text-gray-400">{help}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <ol className="space-y-2">
          {picked.length === 0 && <li className="rounded-lg border border-dashed border-gray-700 p-6 text-center text-sm text-gray-500">고른 작품이 없습니다 (전부 자동으로 채움)</li>}
          {picked.map((w, i) => (
            <li key={w.id} className="flex items-center gap-2 rounded-lg bg-gray-800 p-2 text-sm">
              <span className="w-5 text-center font-bold text-gray-400">{i + 1}</span>
              <img src={img(w.thumbnail)} alt="" className="h-12 w-9 rounded bg-gray-700 object-cover" />
              <span className="min-w-0 flex-1"><b className="block truncate">{w.title}</b><span className="text-xs text-gray-400">{TYPE_LABEL[w.type]} · {STATUS_LABEL[w.status] || w.status}</span></span>
              <button type="button" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="아래로" disabled={i === picked.length - 1} onClick={() => move(i, 1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="빼기" onClick={() => { setPicked(picked.filter((p) => p.id !== w.id)); setDirty(true); }} className="rounded bg-red-600/70 p-1"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ol>
        <div>
          <label className="mb-2 flex items-center gap-2 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품 검색해서 추가" className="w-full bg-transparent py-1.5 text-sm outline-none" /></label>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {candidates.map((w) => (
              <li key={w.id}>
                <button type="button" disabled={picked.length >= max} onClick={() => { setPicked([...picked, w]); setDirty(true); }} className="flex w-full items-center gap-2 rounded p-1.5 text-left text-sm hover:bg-gray-800 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5 text-purple-300" /><img src={img(w.thumbnail)} alt="" className="h-9 w-7 rounded bg-gray-700 object-cover" />
                  <span className="min-w-0 flex-1 truncate">{w.title}</span><span className="text-xs text-gray-500">{TYPE_LABEL[w.type]} · {d(w.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Rankings({ kind }: { kind: 'popular' | 'realtime' }) {
  const [rows, setRows] = useState<RankRow[] | null>(null);
  useEffect(() => { adminApi<Record<string, RankRow[]>>('/admin/exposure/rankings').then((r) => setRows(r[kind])).catch((e) => alert(e.message)); }, [kind]);
  return (
    <section>
      <h2 className="text-lg font-bold">{kind === 'popular' ? '현재 인기 작품 순위 (자동)' : '실시간 랭킹 (자동)'}</h2>
      <p className="mb-3 mt-1 text-sm text-gray-400">{kind === 'popular' ? '인기 점수 = 누적 조회수 + 찜 × 10 + 회차 평점 합. 상단 고정 작품은 맨 앞(📌). 1분마다 다시 집계합니다.' : '최근 24시간 회차 조회 수 순. 직접 고치지 않고 조회 기록으로 자동 계산됩니다. 홈 [실시간 랭킹]과 같은 목록입니다.'} 성인 작품은 제외.</p>
      {!rows ? <p className="text-gray-400">불러오는 중...</p> : rows.length === 0 ? <p className="rounded-lg border border-dashed border-gray-700 p-6 text-center text-gray-500">최근 24시간 조회 기록이 없습니다.</p> : (
        <table className="w-full text-sm">
          <thead className="text-left text-gray-400"><tr><th className="p-2">순위</th><th className="p-2">작품</th><th className="p-2">유형</th><th className="p-2">{kind === 'popular' ? '인기 점수' : '24시간 조회'}</th><th className="p-2">누적 조회</th><th className="p-2">찜</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-800"><td className="p-2 font-bold">{r.pinned ? <Pin className="inline h-3.5 w-3.5 text-purple-300" /> : r.rank}</td><td className="p-2"><Link href={`/works/${r.id}`} className="hover:underline">{r.title}</Link></td><td className="p-2 text-xs">{TYPE_LABEL[r.type] || r.type}</td><td className="p-2">{(kind === 'popular' ? r.score : r.recentViews).toLocaleString()}</td><td className="p-2">{r.views.toLocaleString()}</td><td className="p-2">{r.likes}</td></tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}

const AUTO_ROWS: { key: string; label: string; rule: string }[] = [
  { key: 'latest', label: '최신 업데이트', rule: '공개된 회차가 있는 작품, 마지막 공개 순 (오늘 공개 = UP 배지)' },
  { key: 'new', label: '신작', rule: '런칭일 포함 7일 이내 (NEW 배지와 같은 기준)' },
  { key: 'daily', label: '매일', rule: '연재 요일 7일 모두 선택된 연재중·휴재 작품' },
  ...Object.entries(DAY_LABEL).map(([k, v]) => ({ key: `week_${k}`, label: `${v}요일`, rule: `연재 요일에 ${v}요일이 있는 연재중·휴재 작품` })),
  { key: 'complete', label: '완결', rule: '연재 상태 = 완결' },
];
function AutoCategories() {
  const [audience, setAudience] = useState<'general' | 'adult'>('general');
  const [locale, setLocale] = useState<'ko' | 'en'>('ko');
  const [data, setData] = useState<{ total: number; categories: Record<string, Brief[]> } | null>(null);
  const [open, setOpen] = useState<string | null>('latest');
  useEffect(() => { setData(null); adminApi<{ total: number; categories: Record<string, Brief[]> }>(`/admin/exposure/auto?audience=${audience}&locale=${locale}`).then(setData).catch((e) => alert(e.message)); }, [audience, locale]);
  return (
    <section>
      <p className="mb-3 text-sm text-gray-400">예전 첫 화면 [카테고리 관리]에서 손으로 넣던 항목입니다. 이제 작품 관리 정보(연재 요일·상태·런칭일·회차 공개일)로 자동으로 나뉘며, 사용자 화면 요일별 연재·완결·신작 목록과 같은 결과입니다. 바꾸려면 해당 작품을 [작품 관리]에서 고치세요.</p>
      <div className="mb-3 flex gap-2 text-sm">
        <select value={audience} onChange={(e) => setAudience(e.target.value as 'general' | 'adult')} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5"><option value="general">일반 작품</option><option value="adult">19세 작품 (성인 홈)</option></select>
        <select value={locale} onChange={(e) => setLocale(e.target.value as 'ko' | 'en')} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5"><option value="ko">한국어</option><option value="en">영어</option></select>
        {data && <span className="self-center text-gray-400">대상 작품 {data.total}개</span>}
      </div>
      {!data ? <p className="text-gray-400">불러오는 중...</p> : (
        <ul className="space-y-2">
          {AUTO_ROWS.map((row) => {
            const list = data.categories[row.key] || [];
            return (
              <li key={row.key} className="rounded-lg border border-gray-700 bg-gray-800">
                <button type="button" onClick={() => setOpen(open === row.key ? null : row.key)} className="flex w-full items-center gap-3 p-3 text-left">
                  <b className="w-24">{row.label}</b><span className="rounded bg-gray-700 px-2 text-sm">{list.length}</span><span className="flex-1 text-xs text-gray-400">{row.rule}</span>
                </button>
                {open === row.key && (
                  <div className="flex flex-wrap gap-2 border-t border-gray-700 p-3">
                    {list.length === 0 ? <span className="text-sm text-gray-500">해당 작품 없음</span> : list.slice(0, 60).map((w) => (
                      <Link key={w.id} href={`/works/${w.id}`} className="flex items-center gap-1.5 rounded bg-gray-900 px-2 py-1 text-xs hover:bg-gray-700">
                        <img src={img(w.thumbnail)} alt="" className="h-7 w-5 rounded object-cover" />{w.title}<span className="text-gray-500">{row.key === 'new' ? d(w.createdAt) : d(w.lastEpisodeAt)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function ExposurePage() {
  return <Suspense fallback={null}><ExposureContent /></Suspense>;
}
