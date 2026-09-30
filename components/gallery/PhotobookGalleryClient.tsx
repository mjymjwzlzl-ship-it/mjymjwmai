'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Heart, Image as Images, Lock, Plus, Search, Sparkles, User } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useAdultModeStore } from '@/store/adultMode';

// 캐릭터 화보관 (/api/gallery)
// 탭: 추천 | 인기 | 최신 | 작품별 | 캐릭터별 | 내 화보 — 아래에 검색(범위) + 태그 + 유형 필터(웹툰·단행본·웹소설·캐릭터 채팅)
// 조건은 주소(?tab=&q=&field=&tag=&type=&work=&character=&series=&theme=)에 담아 뒤로가기에 유지
export interface GalleryCard {
  id: string; title: string; thumbnail?: string | null; assetCount: number; coinPrice: number; isFree: boolean; contentRating: string;
  work?: { id: string; title: string; contentType: string } | null; character?: { id?: string | null; name: string; chatReady?: boolean } | null;
  series?: { id: string; title: string } | null; tags: string[]; creator: string; isOfficial: boolean; likeCount: number; viewCount: number; saveCount?: number;
  isLiked?: boolean; isSaved?: boolean; status?: string; visibility?: string; rejectReason?: string | null;
}
type Tab = 'recommend' | 'popular' | 'latest' | 'works' | 'characters' | 'mine';
const TABS: [Tab, string][] = [['recommend', '추천'], ['popular', '인기'], ['latest', '최신'], ['works', '작품별'], ['characters', '캐릭터별'], ['mine', '내 화보']];
const TYPES: [string, string][] = [['', '전체'], ['WEBTOON', '웹툰'], ['BOOK', '단행본'], ['NOVEL', '웹소설'], ['CHAT', '캐릭터 채팅']];
const FIELDS: [string, string][] = [['all', '전체'], ['character', '캐릭터명'], ['work', '작품명'], ['tag', '태그'], ['creator', '제작자']];
const TYPE_LABEL: Record<string, string> = { WEBTOON: '웹툰', BOOK: '단행본', NOVEL: '웹소설' };
const STATUS_LABEL: Record<string, string> = { REVIEW: '검토 대기', REJECTED: '반려', HIDDEN: '숨김', DRAFT: '비공개' };

export function PhotobookCard({ item, onTag }: { item: GalleryCard; onTag?: (tag: string) => void }) {
  return (
    <div className="group min-w-0">
      <Link href={`/gallery/${item.id}`} className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800">
        {item.thumbnail && <img src={getImageUrl(item.thumbnail, { width: 480 })} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />}
        <span className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          {!item.isFree && <span className="inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black text-yellow-300"><Lock className="h-3 w-3" />{item.coinPrice}</span>}
          {item.contentRating === 'ADULT' && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">19</span>}
          {item.status && STATUS_LABEL[item.status] && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">{STATUS_LABEL[item.status]}</span>}
          {item.visibility === 'PRIVATE' && <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-black text-white">나만 보기</span>}
        </span>
        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"><Images className="h-3 w-3" />{item.assetCount}</span>
      </Link>
      <div className="mt-1.5 min-w-0">
        {item.character && <p className="truncate text-sm font-black">{item.character.name}</p>}
        <p className="truncate text-xs font-bold text-gray-700 dark:text-gray-300">{item.title}</p>
        {item.work && <p className="truncate text-xs text-gray-500 dark:text-gray-400">《{item.work.title}》</p>}
        {item.tags.length > 0 && (
          <p className="mt-0.5 flex flex-wrap gap-x-1 text-[11px] text-[#00a84c] dark:text-[#00dc64]">
            {item.tags.slice(0, 3).map((t) => (onTag ? <button key={t} type="button" onClick={() => onTag(t)} className="hover:underline">#{t}</button> : <span key={t}>#{t}</span>))}
          </p>
        )}
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400"><span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{item.likeCount}</span>{!item.isOfficial && <span className="truncate">by {item.creator}</span>}</p>
      </div>
    </div>
  );
}

const grid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';

export default function PhotobookGalleryClient() {
  const router = useRouter();
  const params = useSearchParams();
  const adult = useAdultModeStore((s) => s.enabled);
  const tab = (TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'recommend') as Tab;
  const q = params.get('q') || ''; const field = params.get('field') || 'all'; const tag = params.get('tag') || ''; const type = params.get('type') || '';
  const work = params.get('work') || ''; const character = params.get('character') || ''; const series = params.get('series') || ''; const theme = params.get('theme') || '';
  const [home, setHome] = useState<any>(null);
  const [list, setList] = useState<{ items: GalleryCard[]; total: number } | null>(null);
  const [groups, setGroups] = useState<any[] | null>(null);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [mine, setMine] = useState<GalleryCard[] | null>(null);
  const [mineTab, setMineTab] = useState<'all' | 'public' | 'private' | 'saved'>('all');
  const [query, setQuery] = useState(q); const [qField, setQField] = useState(field);
  const filtered = !!(q || tag || type || work || character || series || theme);

  useEffect(() => { useAdultModeStore.getState().hydrate(); api.get('/gallery/tags').then(({ data }) => setTags(data.tags || [])).catch(() => {}); }, []);
  useEffect(() => { setQuery(q); setQField(field); }, [q, field]);
  useEffect(() => {
    if (tab === 'mine') return;
    if ((tab === 'works' || tab === 'characters') && !filtered) { setGroups(null); api.get('/gallery/groups', { params: { by: tab === 'works' ? 'work' : 'character' } }).then(({ data }) => setGroups(data.groups || [])).catch(() => setGroups([])); return; }
    if (tab === 'recommend' && !filtered) { setHome(null); api.get('/gallery/home').then(({ data }) => setHome(data)).catch(() => setHome({})); return; }
    setList(null);
    api.get('/gallery/items', { params: { sort: tab === 'popular' ? 'popular' : 'latest', q, field, tag, type, workId: work, character, seriesId: series, themeId: theme } })
      .then(({ data }) => setList({ items: data.items || [], total: data.total || 0 })).catch(() => setList({ items: [], total: 0 }));
  }, [tab, q, field, tag, type, work, character, series, theme, filtered, adult]);
  useEffect(() => {
    if (tab !== 'mine') return;
    if (!localStorage.getItem('authToken')) { setMine([]); return; }
    setMine(null);
    api.get('/gallery/me', { params: { tab: mineTab } }).then(({ data }) => setMine(data.items || [])).catch(() => setMine([]));
  }, [tab, mineTab]);

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.push(`/gallery${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };
  const setTab = (t: Tab) => router.push(`/gallery${t === 'recommend' ? '' : `?tab=${t}`}`, { scroll: false });
  const onTag = (t: string) => go({ tag: t, tab: tab === 'recommend' || tab === 'works' || tab === 'characters' || tab === 'mine' ? 'latest' : tab });
  const filterLabel = useMemo(() => [q && `「${q}」`, tag && `#${tag}`, type && TYPES.find(([k]) => k === type)?.[1], work && '작품', character && `캐릭터 ${character}`, series && '시리즈', theme && '테마 화보전'].filter(Boolean).join(' · '), [q, tag, type, work, character, series, theme]);

  const section = (title: string, items: GalleryCard[] | undefined, more?: () => void, sub?: string) => (!items || items.length === 0 ? null : (
    <section className="mt-6">
      <div className="mb-2 flex items-end justify-between"><div><h2 className="text-lg font-black">{title}</h2>{sub && <p className="text-xs text-gray-500">{sub}</p>}</div>{more && <button type="button" onClick={more} className="text-sm font-bold text-gray-500">더보기 →</button>}</div>
      <div className={grid}>{items.slice(0, 6).map((i) => <PhotobookCard key={i.id} item={i} onTag={onTag} />)}</div>
    </section>
  ));

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black"><Sparkles className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />캐릭터 화보관</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">작품 속 캐릭터 화보를 모아 보고, 마음에 드는 캐릭터와 바로 채팅해 보세요.</p>
          </div>
          <Link href="/gallery/new" className="flex items-center gap-1 rounded-lg bg-[#00dc64] px-3 py-2 text-sm font-black text-black"><Plus className="h-4 w-4" />화보 만들기</Link>
        </div>

        <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800" role="tablist" aria-label="화보관">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-black ${tab === k ? 'border-[#00dc64] text-gray-950 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{label}</button>
          ))}
        </nav>

        {tab !== 'mine' && (
          <div className="mt-3 space-y-2">
            <form onSubmit={(e) => { e.preventDefault(); go({ q: query.trim() || null, field: qField === 'all' ? null : qField, tab: tab === 'recommend' || tab === 'works' || tab === 'characters' ? 'latest' : tab }); }} className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white pl-2 dark:border-gray-700 dark:bg-[#1b1b1b]">
              <select aria-label="검색 범위" value={qField} onChange={(e) => setQField(e.target.value)} className="bg-transparent py-2 text-xs font-bold outline-none">{FIELDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="캐릭터명·작품명·태그·제작자로 찾기" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
              <button type="submit" aria-label="검색" className="px-3 text-gray-500"><Search className="h-4 w-4" /></button>
            </form>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="콘텐츠 유형">
              {TYPES.map(([k, v]) => <button key={k} type="button" aria-pressed={type === k} onClick={() => go({ type: k || null, tab: tab === 'recommend' || tab === 'works' || tab === 'characters' ? 'latest' : tab })} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${type === k ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-300'}`}>{v}</button>)}
            </div>
            {tags.length > 0 && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="태그">
                {tags.slice(0, 20).map((t) => <button key={t.name} type="button" aria-pressed={tag === t.name} onClick={() => (tag === t.name ? go({ tag: null }) : onTag(t.name))} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tag === t.name ? 'bg-[#00dc64] text-black' : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`}>#{t.name} <span className="opacity-60">{t.count}</span></button>)}
              </div>
            )}
            {filtered && <p className="text-sm text-gray-500">{filterLabel} <button type="button" onClick={() => router.push(tab === 'recommend' ? '/gallery' : `/gallery?tab=${tab}`)} className="ml-1 underline">조건 지우기</button></p>}
          </div>
        )}

        {tab === 'recommend' && !filtered && (!home ? <p className="py-16 text-center text-sm text-gray-400">불러오는 중...</p> : (
          <>
            {(home.themes || []).map((t: any) => (
              <section key={t.id} className="mt-5 overflow-hidden rounded-2xl border border-[#00dc64]/30 bg-white dark:bg-[#1b1b1b]">
                {t.bannerUrl && <button type="button" onClick={() => go({ theme: t.id, tab: 'latest' })} className="block w-full"><img src={getImageUrl(t.bannerUrl, { width: 1400 })} alt={t.title} className="aspect-[16/5] w-full object-cover" /></button>}
                <div className="p-4">
                  <div className="flex items-end justify-between"><div><p className="text-xs font-bold text-[#00a84c]">테마 화보전{t.endAt ? ` · ${new Date(t.endAt).toLocaleDateString('ko-KR')}까지` : ''}</p><h2 className="text-lg font-black">{t.title}</h2>{t.description && <p className="text-sm text-gray-500">{t.description}</p>}</div><button type="button" onClick={() => go({ theme: t.id, tab: 'latest' })} className="text-sm font-bold text-gray-500">전체 →</button></div>
                  <div className={`${grid} mt-3`}>{t.items.slice(0, 6).map((i: GalleryCard) => <PhotobookCard key={i.id} item={i} onTag={onTag} />)}</div>
                </div>
              </section>
            ))}
            {section('오늘의 추천', home.today)}
            {section('추천 화보', home.picks)}
            {section('인기 화보', home.popular, () => setTab('popular'), '조회·좋아요·저장이 많은 순')}
            {section('신규 화보', home.latest, () => setTab('latest'))}
            {home.loggedIn ? section('내 관심 작품·캐릭터 화보', home.forYou, undefined, '찜한 작품과 좋아요·저장한 화보를 바탕으로 골랐어요') : <p className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700">로그인하면 찜한 작품·관심 캐릭터 기반 추천 화보를 보여 드려요.</p>}
            {!home.today?.length && !home.popular?.length && !home.latest?.length && <p className="py-16 text-center text-sm text-gray-500">아직 공개된 화보가 없어요.</p>}
          </>
        ))}

        {(tab === 'works' || tab === 'characters') && !filtered && (!groups ? <p className="py-16 text-center text-sm text-gray-400">불러오는 중...</p> : groups.length === 0 ? <p className="py-16 text-center text-sm text-gray-500">화보가 연결된 {tab === 'works' ? '작품' : '캐릭터'}이 없어요.</p> : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {groups.map((g) => (
              <button key={g.key} type="button" onClick={() => go(tab === 'works' ? { work: g.key, tab: 'latest' } : { character: g.key, tab: 'latest' })} className="group text-left">
                <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800">{g.cover && <img src={getImageUrl(g.cover, { width: 400 })} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}<span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 text-[11px] font-bold text-white">화보 {g.count}</span></span>
                <span className="mt-1 block truncate text-sm font-black">{tab === 'works' ? `《${g.name}》` : g.name}</span>
                {tab === 'characters' && g.work && <span className="block truncate text-xs text-gray-500">《{g.work.title}》</span>}
              </button>
            ))}
          </div>
        ))}

        {tab !== 'mine' && (filtered || tab === 'popular' || tab === 'latest') && (!list ? <p className="py-16 text-center text-sm text-gray-400">불러오는 중...</p> : list.items.length === 0 ? <p className="py-16 text-center text-sm text-gray-500">조건에 맞는 화보가 없어요.</p> : (
          <>
            <p className="mt-4 text-sm text-gray-500">{list.total}개</p>
            <div className={`${grid} mt-2`}>{list.items.map((i) => <PhotobookCard key={i.id} item={i} onTag={onTag} />)}</div>
          </>
        ))}

        {tab === 'mine' && (
          <section className="mt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {([['all', '내 화보'], ['public', '공개 화보'], ['private', '비공개 화보'], ['saved', '저장한 화보']] as const).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={mineTab === k} onClick={() => setMineTab(k)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${mineTab === k ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-300'}`}>{k === 'saved' ? <Bookmark className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}{v}</button>
              ))}
            </div>
            {mine === null ? <p className="py-16 text-center text-sm text-gray-400">불러오는 중...</p> : mine.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">{typeof window !== 'undefined' && !localStorage.getItem('authToken') ? '로그인하면 내 화보와 저장한 화보를 볼 수 있어요.' : mineTab === 'saved' ? '저장한 화보가 없어요. 화보에서 [내 화보함에 저장]을 눌러 보세요.' : '만든 화보가 없어요.'}{mineTab !== 'saved' && <Link href="/gallery/new" className="ml-2 font-bold text-[#00a84c] underline">화보 만들기</Link>}</div>
            ) : (
              <>
                {mineTab !== 'saved' && <p className="mt-3 text-xs text-gray-500">전체 공개 화보는 운영팀 검토 후 화보관에 공개돼요. 나만 보기 화보는 나에게만 보여요.</p>}
                <div className={`${grid} mt-3`}>{mine.map((i) => <div key={i.id}><PhotobookCard item={i} />{i.status === 'REJECTED' && i.rejectReason && <p className="mt-1 text-[11px] text-red-500">반려 사유: {i.rejectReason}</p>}</div>)}</div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
