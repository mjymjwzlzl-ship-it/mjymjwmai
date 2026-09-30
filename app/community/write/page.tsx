'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, BookOpen, Search, X } from 'lucide-react';
import { api } from '@/lib/api';

// 게시글 쓰기·고치기 (?id= 이면 고치기). 분류 · 작품/회차 연결 · 스포일러 포함 ON/OFF
interface Category { key: string; name: string; canWrite: boolean }
interface Work { id: string; title: string; contentType?: string }
interface Ep { id: string; episodeNumber: number; title: string }
const TYPE = (t?: string) => ({ NOVEL: '웹소설', BOOK: '단행본' } as Record<string, string>)[String(t || '').toUpperCase()] || '웹툰';

function WriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const [cats, setCats] = useState<Category[]>([]);
  const [category, setCategory] = useState(params.get('category') || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [work, setWork] = useState<Work | null>(null);
  const [episodes, setEpisodes] = useState<Ep[]>([]);
  const [episodeId, setEpisodeId] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Work[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('authToken')) { alert('로그인 후 글을 쓸 수 있어요.'); router.replace('/login'); return; }
    api.get('/board/categories').then(({ data }) => {
      const list = (data.categories || []).filter((c: Category) => c.canWrite);
      setCats(list);
      setCategory((cur) => cur && list.some((c: Category) => c.key === cur) ? cur : list[0]?.key || '');
    }).catch(() => {});
    if (editId) {
      api.get(`/board/posts/${editId}`).then(({ data }) => {
        const p = data.post;
        if (!p.isMine) { alert('내 글만 고칠 수 있어요.'); router.back(); return; }
        setTitle(p.title); setContent(p.content); setSpoiler(p.isSpoiler); setCategory(p.category);
        if (p.work) { setWork({ id: p.work.id, title: p.work.title, contentType: p.work.contentType }); if (p.work.episode) setEpisodeId(p.work.episode.id); }
      }).catch(() => { alert('글을 불러오지 못했어요.'); router.back(); });
    }
  }, [editId, router]);
  useEffect(() => {
    if (!work) { setEpisodes([]); return; }
    api.get(`/board/works/${work.id}/episodes`).then(({ data }) => setEpisodes(data.episodes || [])).catch(() => setEpisodes([]));
  }, [work]);
  useEffect(() => {
    if (!q.trim()) { setFound([]); return; }
    const t = window.setTimeout(() => api.get('/board/works', { params: { q: q.trim() } }).then(({ data }) => setFound(data.works || [])).catch(() => {}), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const submit = async () => {
    if (!category) { alert('게시판 분류를 고르세요.'); return; }
    if (!title.trim() || !content.trim()) { alert('제목과 내용을 입력하세요.'); return; }
    setBusy(true);
    try {
      const body = { category, title, content, isSpoiler: spoiler, comicId: work?.id || null, episodeId: work ? episodeId || null : null };
      if (editId) { await api.put(`/board/posts/${editId}`, body); router.replace(`/community/post/${editId}`); }
      else { const { data } = await api.post('/board/posts', body); router.replace(`/community/post/${data.id}`); }
    } catch (e: any) { alert(e?.response?.data?.message || '저장하지 못했어요.'); } finally { setBusy(false); }
  };

  const field = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#1b1b1b]';
  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-3 py-5 sm:px-4">
        <button type="button" onClick={() => router.back()} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-gray-500"><ArrowLeft className="h-4 w-4" />이전</button>
        <h1 className="mb-4 text-2xl font-black">{editId ? '글 고치기' : '글쓰기'}</h1>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1b1b1b]">
          <label className="block"><span className="mb-1 block text-sm font-black">게시판</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>{cats.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
          </label>
          <label className="block"><span className="mb-1 block text-sm font-black">제목</span><input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className={field} /></label>
          <div>
            <span className="mb-1 block text-sm font-black">작품 연결 <span className="font-normal text-gray-400">(선택)</span></span>
            {work ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm dark:bg-white/5">
                <BookOpen className="h-4 w-4 text-[#00a84c]" /><b>{work.title}</b><span className="text-xs text-gray-500">{TYPE(work.contentType)}</span>
                <select aria-label="회차" value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} className="rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-[#141414]">
                  <option value="">회차 지정 안 함</option>{episodes.map((ep) => <option key={ep.id} value={ep.id}>{ep.episodeNumber}화 {ep.title && ep.title !== `${ep.episodeNumber}화` ? ep.title : ''}</option>)}
                </select>
                <button type="button" onClick={() => { setWork(null); setEpisodeId(''); }} className="ml-auto text-gray-400" aria-label="연결 해제"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 dark:border-gray-700"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품명으로 찾기 (웹툰·단행본·웹소설)" className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
                {found.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1b1b1b]">
                    {found.map((w) => <li key={w.id}><button type="button" onClick={() => { setWork(w); setQ(''); setFound([]); }} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"><span>{w.title}</span><span className="text-xs text-gray-400">{TYPE(w.contentType)}</span></button></li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <label className="block"><span className="mb-1 block text-sm font-black">내용</span><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className={`${field} resize-y`} /></label>
          <label className={`flex w-fit cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${spoiler ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'border-gray-200 text-gray-500 dark:border-gray-700'}`}>
            <input type="checkbox" role="switch" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="accent-amber-500" /><AlertTriangle className="h-4 w-4" />스포일러 포함 {spoiler ? 'ON' : 'OFF'}
          </label>
          {spoiler && <p className="text-xs text-amber-700 dark:text-amber-300">목록에서는 제목이, 글에서는 본문이 가려지고 읽는 사람이 눌러야 보입니다.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.back()} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold dark:bg-white/10">취소</button>
            <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-lg bg-[#00dc64] px-5 py-2 text-sm font-black text-black disabled:opacity-50">{busy ? '저장 중...' : editId ? '고치기' : '등록'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function WritePage() { return <Suspense fallback={null}><WriteContent /></Suspense>; }
