'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Pin, PinOff, Plus, RefreshCw, Search, Unlock } from 'lucide-react';
import { DAY_LABEL, STATUS_LABEL, TYPE_LABEL, adminApi, img, siteBase } from '@/lib/works';

// 노출 관리 (/api/admin/exposure): 작품 정보가 아니라 "사용자 화면 어디에 무엇을 보여 줄지"
// 탭: 홈 화면 섹션 / 오늘의 추천작 / 추천 신작 / 인기 작품 / 실시간 랭킹 / 자동 분류(요일·매일·완결·신작·최신 업데이트)
// 순위 영역 4개는 관리자가 고른 집계 기준·기간으로 자동 순위를 내고, [고정]한 작품만 지정 순위에 머문다 (/api/admin/exposure/ranking/:area)
// 배너 관리는 /banners (같은 노출 관리 메뉴)
type Tab = 'sections' | 'today' | 'new' | 'popular' | 'realtime' | 'auto';
interface Brief { id: string; title: string; thumbnail?: string | null; status: string; type: 'webtoon' | 'book' | 'novel'; rating: string; createdAt: string; lastEpisodeAt?: string | null; isPublished?: boolean }
interface Section { key: string; label: string; visible: boolean }
type Area = 'today' | 'new' | 'popular' | 'realtime';
type MetricKey = 'views' | 'likes' | 'purchases' | 'reads' | 'hearts' | 'rising' | 'composite';
interface RankRow { rank: number; id: string; title: string; thumbnail?: string | null; type: string; status: string; launchedAt: string; pinned: boolean; metricValue: number | null; metrics: Partial<Record<MetricKey, number>> }
interface RankingView {
  area: Area; label: string; metricLabel: string; periodLabel: string; computedAt: number; candidates: number;
  config: { metric: string; period: string; size: number; newWithinDays?: number; pins: { id: string; rank: number }[] };
  options: { metrics: { key: string; label: string; help: string }[]; periods: { key: string; label: string }[]; weights: Record<string, number> };
  items: RankRow[];
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'sections', label: '홈 화면 섹션' }, { key: 'today', label: '오늘의 추천작' }, { key: 'new', label: '추천 신작' },
  { key: 'popular', label: '인기 작품' }, { key: 'realtime', label: '실시간 랭킹' }, { key: 'auto', label: '자동 분류' },
];
const d = (v?: string | null) => (v ? new Date(v).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '-');

function ExposureContent() {
  const params = useSearchParams();
  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'sections') as Tab;
  const [data, setData] = useState<{ sections: Section[] } | null>(null);
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
          {!data && tab === 'sections' ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
            <>
              {tab === 'sections' && data && <Sections initial={data.sections} />}
              {(tab === 'today' || tab === 'new' || tab === 'popular' || tab === 'realtime') && <RankingArea key={tab} area={tab} />}
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

// 순위 영역 하나 (오늘의 추천작·추천 신작·인기 작품·실시간 랭킹)
// 위: 현재 적용 중인 집계 기준·기간·마지막 집계 시간 / 설정: 집계 기준·기간·노출 개수 / 아래: 순위표 + 고정·비고정·순서 이동·작품 추가
const AREA_HELP: Record<Area, string> = {
  today: '홈 [오늘의 추천작]에 앞에서부터 6개가 나옵니다. 홈 카드 영역이라 웹소설·19세 작품은 빠집니다.',
  new: '홈 [추천 신작](앞에서부터 6개)과 랭킹 페이지 [신작] 탭에 나옵니다. 신작 범위(런칭 후 며칠 이내) 안의 작품만 자동 순위에 들어갑니다. 웹소설·19세 작품은 빠집니다.',
  popular: '홈 [인기 작품](6개)과 랭킹 페이지 [인기 작품] 탭에 나옵니다. 19세 작품은 빠집니다.',
  realtime: '홈 [실시간 랭킹](6개)과 랭킹 페이지 [실시간 랭킹] 탭에 나옵니다. 기간 안에 집계값이 0인 작품은 자동 순위에서 빠집니다. 19세 작품은 빠집니다.',
};
const METRIC_COLS: [MetricKey, string][] = [['views', '조회'], ['likes', '찜'], ['purchases', '구매'], ['reads', '열람'], ['hearts', '좋아요']];
const when = (t: number) => new Date(t).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function RankingArea({ area }: { area: Area }) {
  const [view, setView] = useState<RankingView | null>(null);
  const [form, setForm] = useState({ metric: '', period: '', size: 6, newWithinDays: 30 });
  const [busy, setBusy] = useState(false);
  const [works, setWorks] = useState<Brief[]>([]);
  const [q, setQ] = useState('');
  const [addRank, setAddRank] = useState(1);
  const apply = (v: RankingView) => { setView(v); setForm({ metric: v.config.metric, period: v.config.period, size: v.config.size, newWithinDays: v.config.newWithinDays || 30 }); };
  const call = async (path: string, init?: { method: string; json?: unknown }) => {
    setBusy(true);
    try { apply(await adminApi<RankingView>(`/admin/exposure/ranking/${area}${path}`, init)); return true; } catch (e: any) { alert(e.message); return false; } finally { setBusy(false); }
  };
  useEffect(() => { void call(''); }, [area]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { adminApi<{ works: any[] }>('/admin/works').then((r) => setWorks(r.works.map((w) => ({ id: w.id, title: w.title, thumbnail: w.thumbnail, status: w.status, type: w.type, rating: w.rating, createdAt: w.createdAt, lastEpisodeAt: w.lastEpisodeAt, isPublished: w.isPublished })))).catch(() => {}); }, []);
  const pinOp = (json: Record<string, unknown>) => call('/pins', { method: 'POST', json });
  const dirty = !!view && (form.metric !== view.config.metric || form.period !== view.config.period || form.size !== view.config.size || (area === 'new' && form.newWithinDays !== view.config.newWithinDays));
  const shown = useMemo(() => new Set((view?.items || []).map((r) => r.id)), [view]);
  const candidates = useMemo(() => (q.trim() ? works.filter((w) => w.isPublished !== false && !['19', 'ADULT', 'adult'].includes(w.rating) && ((area !== 'today' && area !== 'new') || w.type !== 'novel') && !shown.has(w.id) && w.title.includes(q.trim())).slice(0, 12) : []), [works, q, shown, area]);
  if (!view) return <p className="py-20 text-center text-gray-400">집계하는 중...</p>;
  const metricHelp = view.options.metrics.find((m) => m.key === form.metric)?.help;
  const pinnedCount = view.items.filter((r) => r.pinned).length;
  const sel = 'rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';
  const fmt = (n?: number | null) => (n == null ? '-' : n.toLocaleString());
  return (
    <section>
      <p className="mb-3 text-sm text-gray-400">{AREA_HELP[area]} 순위는 아래 집계 기준으로 자동 계산되고, [고정]한 작품만 지정한 순위에 머뭅니다.</p>

      {/* 현재 적용 중 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-purple-700/60 bg-purple-900/20 p-4 text-sm" data-testid="ranking-current">
        <span><span className="text-gray-400">집계 기준</span> <b className="ml-1 text-base">{view.metricLabel}</b></span>
        <span><span className="text-gray-400">집계 기간</span> <b className="ml-1 text-base">{view.periodLabel}</b></span>
        <span><span className="text-gray-400">마지막 집계</span> <b className="ml-1">{when(view.computedAt)}</b></span>
        <span className="text-gray-400">후보 {view.candidates}개 · 고정 {pinnedCount}개 · 노출 {view.items.length}/{view.config.size}</span>
        <button type="button" disabled={busy} onClick={() => void call('/recompute', { method: 'POST' })} className="ml-auto flex items-center gap-1 rounded bg-gray-700 px-3 py-1.5 text-xs font-bold disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" />지금 다시 집계</button>
      </div>

      {/* 설정 */}
      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/60 p-4">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1"><span className="text-xs text-gray-400">집계 기준</span>
            <select className={sel} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>{view.options.metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-gray-400">집계 기간</span>
            <select className={sel} value={form.period} disabled={form.metric === 'launch'} onChange={(e) => setForm({ ...form, period: e.target.value })}>{view.options.periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-gray-400">노출 개수 (최대 100)</span>
            <input type="number" min={1} max={100} className={`${sel} w-24`} value={form.size} onChange={(e) => setForm({ ...form, size: Number(e.target.value) || 1 })} /></label>
          {area === 'new' && (
            <label className="flex flex-col gap-1"><span className="text-xs text-gray-400">신작 범위 (런칭 후 일)</span>
              <input type="number" min={1} max={365} className={`${sel} w-24`} value={form.newWithinDays} onChange={(e) => setForm({ ...form, newWithinDays: Number(e.target.value) || 1 })} /></label>
          )}
          <button type="button" disabled={!dirty || busy} onClick={() => void call('', { method: 'PUT', json: form })} className="rounded bg-purple-600 px-4 py-1.5 font-bold disabled:opacity-40">적용</button>
          {dirty && <button type="button" onClick={() => apply(view)} className="rounded bg-gray-700 px-3 py-1.5">되돌리기</button>}
        </div>
        <p className="mt-2 text-xs text-gray-400">{metricHelp}</p>
        {form.metric === 'composite' && <p className="mt-1 text-xs text-gray-500">종합 인기 점수 = {Object.entries(view.options.weights).map(([k, w]) => `${METRIC_COLS.find(([c]) => c === k)?.[1] || k} × ${w}`).join(' + ')} (집계 기간 기준. 전체 기간이면 조회는 누적 조회수, 찜은 현재 찜 수)</p>}
      </div>

      {/* 고정 일괄 + 작품 추가 */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" disabled={busy || !view.items.length} onClick={() => { if (confirm('지금 보이는 순위를 전부 고정할까요? 이후 집계가 바뀌어도 이 순서가 유지됩니다.')) void pinOp({ action: 'pinAll' }); }} className="flex items-center gap-1 rounded bg-purple-700 px-3 py-1.5 font-bold disabled:opacity-40"><Lock className="h-3.5 w-3.5" />전체 고정</button>
        <button type="button" disabled={busy || !pinnedCount} onClick={() => { if (confirm('고정을 모두 풀고 자동 순위로 되돌릴까요?')) void pinOp({ action: 'unpinAll' }); }} className="flex items-center gap-1 rounded bg-gray-700 px-3 py-1.5 font-bold disabled:opacity-40"><Unlock className="h-3.5 w-3.5" />전체 비고정</button>
        <span className="mx-1 h-5 w-px bg-gray-700" />
        <label className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품 검색해서 순위에 넣기" className="w-56 bg-transparent py-1.5 outline-none" /></label>
        <label className="flex items-center gap-1 text-gray-400">순위<input type="number" min={1} max={view.config.size} value={addRank} onChange={(e) => setAddRank(Number(e.target.value) || 1)} className={`${sel} w-16`} />위에 고정</label>
      </div>
      {candidates.length > 0 && (
        <ul className="mb-3 grid gap-1 rounded-lg border border-gray-700 bg-gray-800 p-2 sm:grid-cols-2">
          {candidates.map((w) => (
            <li key={w.id}>
              <button type="button" disabled={busy} onClick={() => void pinOp({ action: 'add', id: w.id, rank: addRank }).then((ok) => ok && setQ(''))} className="flex w-full items-center gap-2 rounded p-1.5 text-left text-sm hover:bg-gray-700">
                <Plus className="h-3.5 w-3.5 text-purple-300" /><img src={img(w.thumbnail)} alt="" className="h-9 w-7 rounded bg-gray-700 object-cover" />
                <span className="min-w-0 flex-1 truncate">{w.title}</span><span className="text-xs text-gray-500">{TYPE_LABEL[w.type]} · {d(w.createdAt)} · {addRank}위에 고정</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 순위표 */}
      {view.items.length === 0 ? <p className="rounded-lg border border-dashed border-gray-700 p-6 text-center text-gray-500">이 기준·기간으로 집계된 작품이 없습니다. 기간을 늘리거나 작품을 직접 넣어 고정하세요.</p> : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr>
              <th className="p-2">순위</th><th className="p-2">작품</th><th className="p-2">상태</th>
              <th className="p-2 text-purple-300">{view.metricLabel}{view.config.metric !== 'launch' && <span className="block text-[10px] font-normal text-gray-500">{view.periodLabel}</span>}</th>
              {METRIC_COLS.map(([k, label]) => <th key={k} className="p-2 text-xs font-normal">{label}</th>)}
              <th className="p-2" />
            </tr></thead>
            <tbody>
              {view.items.map((r, i) => (
                <tr key={r.id} className={`border-t border-gray-800 ${r.pinned ? 'bg-purple-900/15' : ''}`} data-testid="ranking-row">
                  <td className="p-2 text-base font-black">{r.rank}</td>
                  <td className="p-2"><Link href={`/works/${r.id}`} className="flex items-center gap-2 hover:underline"><img src={img(r.thumbnail)} alt="" className="h-10 w-8 rounded bg-gray-700 object-cover" /><span><b>{r.title}</b><span className="block text-xs text-gray-400">{TYPE_LABEL[r.type] || r.type} · {STATUS_LABEL[r.status] || r.status} · {d(r.launchedAt)} 런칭</span></span></Link></td>
                  <td className="p-2">{r.pinned ? <span className="inline-flex items-center gap-1 rounded bg-purple-600/50 px-1.5 text-xs font-bold"><Pin className="h-3 w-3" />고정</span> : <span className="rounded bg-gray-700 px-1.5 text-xs text-gray-300">자동</span>}</td>
                  <td className="p-2 font-bold text-purple-200">{view.config.metric === 'launch' ? d(r.launchedAt) : `${view.config.metric === 'rising' && (r.metricValue || 0) > 0 ? '+' : ''}${fmt(r.metricValue)}`}</td>
                  {METRIC_COLS.map(([k]) => <td key={k} className="p-2 text-xs text-gray-400">{fmt(r.metrics[k])}</td>)}
                  <td className="whitespace-nowrap p-2">
                    <button type="button" aria-label="위로" title="한 칸 위로 (이 작품을 고정)" disabled={busy || i === 0} onClick={() => void pinOp({ action: 'move', id: r.id, rank: r.rank - 1 })} className="mr-1 rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="아래로" title="한 칸 아래로 (이 작품을 고정)" disabled={busy || r.rank >= view.config.size} onClick={() => void pinOp({ action: 'move', id: r.id, rank: r.rank + 1 })} className="mr-2 rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    {r.pinned
                      ? <button type="button" disabled={busy} onClick={() => void pinOp({ action: 'unpin', id: r.id })} className="inline-flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs"><PinOff className="h-3 w-3" />비고정</button>
                      : <button type="button" disabled={busy} onClick={() => void pinOp({ action: 'pin', id: r.id })} className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs font-bold"><Pin className="h-3 w-3" />고정</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">↑↓ 로 옮기면 그 작품은 옮긴 순위에 고정됩니다(옮긴 자리에 고정 작품이 있으면 서로 자리를 바꿈). 집계는 1분마다 새로 하고, 설정·고정을 바꾸면 바로 다시 집계합니다.</p>
    </section>
  );
}

const AUTO_ROWS: { key: string; label: string; rule: string }[] = [
  { key: 'latest', label: '최신 업데이트', rule: '공개된 회차가 있는 작품, 마지막 공개 순 (오늘 공개 = UP 배지)' },
  { key: 'new', label: '신작', rule: '런칭일 포함 7일 이내 (NEW 배지와 같은 기준)' },
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
      <p className="mb-3 text-sm text-gray-400">예전 첫 화면 [카테고리 관리]에서 손으로 넣던 항목입니다. 이제 작품 관리 정보(상태·런칭일·회차 공개일)로 자동으로 나뉘며, 사용자 화면 최신 업데이트·완결·신작 목록과 같은 결과입니다. 바꾸려면 해당 작품을 [작품 관리]에서 고치세요.</p>
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
