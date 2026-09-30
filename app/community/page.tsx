'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Award, BookmarkCheck, Eye, MessageCircle, MessageSquare, PenSquare, Pin, Search, ThumbsUp } from 'lucide-react';
import { api } from '@/lib/api';

// 커뮤니티 게시판 (/api/board)
// 분류 탭 · 정렬(최신·조회·추천·댓글·베스트) · 검색 범위(전체·제목·내용·작성자·작품명) · 공지/중요 고정 · 스포일러 가림 · 페이지 번호
// 조건·페이지는 주소(?category=&sort=&q=&field=&page=)에, 스크롤은 글을 누를 때 저장해 목록으로 돌아오면 그대로
interface Category { key: string; name: string; canWrite: boolean }
interface PostItem {
  id: string; title: string; excerpt: string; category: string; categoryName: string; author: string; viewCount: number; likeCount: number; commentCount: number;
  isBest: boolean; isSpoiler: boolean; noticeType?: 'NOTICE' | 'IMPORTANT' | null; pinned: boolean; createdAt: string;
  work?: { id: string; title: string; episode?: { id: string; number: number } | null } | null;
}
const SORTS = [['latest', '최신순'], ['views', '조회순'], ['likes', '추천순'], ['comments', '댓글순'], ['best', '베스트']] as const;
const FIELDS = [['all', '전체'], ['title', '제목'], ['content', '내용'], ['author', '작성자'], ['work', '작품명']] as const;
const RETURN_KEY = 'arata_board_return_v1';
const dateOf = (v: string) => {
  const d = new Date(v); const diff = Date.now() - d.getTime();
  if (diff < 86400000 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

function BoardContent() {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || 'latest';
  const q = params.get('q') || '';
  const field = params.get('field') || 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [cats, setCats] = useState<Category[]>([]);
  const [data, setData] = useState<{ pinned: PostItem[]; posts: PostItem[]; total: number; totalPages: number } | null>(null);
  const [query, setQuery] = useState(q);
  const [searchField, setSearchField] = useState(field);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const restored = useRef(false);

  useEffect(() => { api.get('/board/categories').then(({ data }) => setCats(data.categories || [])).catch(() => {}); }, []);
  useEffect(() => {
    setData(null);
    api.get('/board/posts', { params: { category, sort, q, field, page } }).then(({ data }) => setData(data)).catch(() => setData({ pinned: [], posts: [], total: 0, totalPages: 1 }));
    setQuery(q); setSearchField(field);
  }, [category, sort, q, field, page]);
  // 글에서 돌아오면 스크롤 위치 복원
  useEffect(() => {
    if (!data || restored.current) return;
    restored.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null');
      if (saved && saved.url === `${window.location.pathname}${window.location.search}`) { sessionStorage.removeItem(RETURN_KEY); requestAnimationFrame(() => window.scrollTo(0, saved.y)); }
    } catch {}
  }, [data]);

  const go = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => { if (v === null || v === '' || (k === 'page' && v === 1) || (k === 'sort' && v === 'latest') || (k === 'category' && v === 'all') || (k === 'field' && v === 'all')) next.delete(k); else next.set(k, String(v)); });
    if (!('page' in patch)) next.delete('page');
    restored.current = true;
    router.push(`/community${next.toString() ? `?${next}` : ''}`, { scroll: 'page' in patch });
  };
  const remember = () => { try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ url: `${window.location.pathname}${window.location.search}`, y: window.scrollY })); } catch {} };
  const canWriteAny = cats.some((c) => c.canWrite);

  const row = (p: PostItem) => {
    const hide = p.isSpoiler && !revealed.has(p.id);
    return (
      <li key={p.id} className={`border-b border-gray-100 last:border-0 dark:border-gray-800 ${p.pinned ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
        <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {p.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" aria-label="상단 고정" />}
              {p.noticeType === 'NOTICE' && <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-black text-white dark:bg-white dark:text-black">공지</span>}
              {p.noticeType === 'IMPORTANT' && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">중요</span>}
              {p.isBest && <span className="inline-flex items-center gap-0.5 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black"><Award className="h-3 w-3" />BEST</span>}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-bold dark:bg-white/10">{p.categoryName}</span>
              {p.work && <span className="truncate text-[#00a84c] dark:text-[#00dc64]">《{p.work.title}》{p.work.episode ? ` · ${p.work.episode.number}화` : ''}</span>}
            </p>
            {hide ? (
              <button type="button" onClick={() => setRevealed(new Set(revealed).add(p.id))} className="mt-1 flex items-center gap-1.5 text-left text-sm font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />스포일러가 포함된 게시글입니다 <span className="text-xs underline">제목 보기</span>
              </button>
            ) : (
              <Link href={`/community/post/${p.id}`} onClick={remember} className="mt-1 block">
                <span className="line-clamp-1 font-bold text-gray-950 hover:underline dark:text-white">{p.isSpoiler && <span className="mr-1 rounded bg-amber-100 px-1 text-[10px] font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">스포일러</span>}{p.title}</span>
                {!p.isSpoiler && p.excerpt && <span className="mt-0.5 line-clamp-1 text-sm text-gray-500 dark:text-gray-400">{p.excerpt}</span>}
              </Link>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{p.author}</span><span>{dateOf(p.createdAt)}</span>
              <span className="inline-flex items-center gap-0.5"><Eye className="h-3.5 w-3.5" />{p.viewCount}</span>
              <span className="inline-flex items-center gap-0.5"><ThumbsUp className="h-3.5 w-3.5" />{p.likeCount}</span>
              <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3.5 w-3.5" />{p.commentCount}</span>
            </p>
          </div>
          {hide && <Link href={`/community/post/${p.id}`} onClick={remember} className="shrink-0 self-center rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300">열기</Link>}
        </div>
      </li>
    );
  };

  const pages = data ? Array.from({ length: data.totalPages }, (_, i) => i + 1) : [];
  const groupStart = Math.floor((page - 1) / 10) * 10 + 1;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black"><MessageSquare className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />커뮤니티</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">작품 이야기와 추천을 나눠 보세요. 스포일러는 [스포일러 포함]을 켜 주세요.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/my/community" className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold dark:border-gray-700"><BookmarkCheck className="h-4 w-4" />내 활동</Link>
            {canWriteAny && <Link href={`/community/write${category !== 'all' ? `?category=${category}` : ''}`} className="flex items-center gap-1 rounded-lg bg-[#00dc64] px-3 py-2 text-sm font-black text-black"><PenSquare className="h-4 w-4" />글쓰기</Link>}
          </div>
        </div>

        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="게시판 분류">
          {[{ key: 'all', name: '전체' }, ...cats].map((c) => (
            <button key={c.key} type="button" role="tab" aria-selected={category === c.key} onClick={() => go({ category: c.key })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold ${category === c.key ? 'bg-[#00dc64] text-black' : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-300'}`}>{c.name}</button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 text-xs font-bold" role="group" aria-label="정렬">
            {SORTS.map(([k, label]) => <button key={k} type="button" aria-pressed={sort === k} onClick={() => go({ sort: k })} className={`rounded-full px-3 py-1.5 ${sort === k ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>{label}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); go({ q: query.trim() || null, field: searchField }); }} className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-white pl-1 dark:border-gray-700 dark:bg-[#1b1b1b]">
            <select aria-label="검색 범위" value={searchField} onChange={(e) => setSearchField(e.target.value)} className="bg-transparent py-1.5 text-xs font-bold outline-none">{FIELDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색어" className="w-36 bg-transparent py-1.5 text-sm outline-none sm:w-48" />
            <button type="submit" aria-label="검색" className="px-2 text-gray-500"><Search className="h-4 w-4" /></button>
          </form>
        </div>
        {q && <p className="mb-2 text-sm text-gray-500">「{q}」 {FIELDS.find(([k]) => k === field)?.[1]} 검색 결과 {data?.total ?? 0}건 <button type="button" onClick={() => go({ q: null, field: null })} className="ml-1 underline">검색 지우기</button></p>}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1b1b1b]">
          {!data ? <p className="py-16 text-center text-sm text-gray-400">불러오는 중...</p> : (
            <ul>
              {data.pinned.map(row)}
              {data.posts.filter((p) => !data.pinned.some((x) => x.id === p.id)).map(row)}
              {data.posts.length === 0 && data.pinned.length === 0 && <li className="py-16 text-center text-sm text-gray-500">{sort === 'best' ? '추천 10개 이상 받은 베스트 글이 아직 없어요.' : '게시글이 없습니다.'}</li>}
            </ul>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-1" aria-label="페이지">
            <button type="button" disabled={groupStart === 1} onClick={() => go({ page: groupStart - 1 })} className="h-9 w-9 rounded-md text-gray-500 disabled:opacity-30" aria-label="이전 페이지 구간">‹</button>
            {pages.slice(groupStart - 1, groupStart + 9).map((n) => (
              <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => go({ page: n })} className={`h-9 min-w-9 rounded-md px-2 text-sm font-bold ${n === page ? 'bg-[#00dc64] text-black' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'}`}>{n}</button>
            ))}
            <button type="button" disabled={groupStart + 10 > data.totalPages} onClick={() => go({ page: groupStart + 10 })} className="h-9 w-9 rounded-md text-gray-500 disabled:opacity-30" aria-label="다음 페이지 구간">›</button>
          </nav>
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return <Suspense fallback={null}><BoardContent /></Suspense>;
}
