'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, MessageCircle, Pencil, PenSquare, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

// 마이페이지 > 커뮤니티 활동: 내가 작성한 게시글 / 작성한 댓글 / 저장한 게시글 (수정·삭제·저장 해제)
type Tab = 'posts' | 'comments' | 'bookmarks';
interface P { id: string; title: string; categoryName: string; createdAt: string; commentCount: number; likeCount: number; viewCount: number; status?: string; work?: { title: string; episode?: { number: number } | null } | null }
interface Cm { id: string; content: string; createdAt: string; isReply: boolean; post: { id: string; title: string } }
const TABS: [Tab, string, typeof PenSquare][] = [['posts', '내가 작성한 게시글', PenSquare], ['comments', '작성한 댓글', MessageCircle], ['bookmarks', '저장한 게시글', Bookmark]];
const d = (v: string) => new Date(v).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' });

function Content() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (['posts', 'comments', 'bookmarks'].includes(params.get('tab') || '') ? params.get('tab') : 'posts') as Tab;
  const [posts, setPosts] = useState<P[] | null>(null);
  const [comments, setComments] = useState<Cm[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const load = () => {
    setPosts(null); setComments(null);
    api.get('/board/me', { params: { tab } }).then(({ data }) => { if (tab === 'comments') setComments(data.comments || []); else setPosts(data.posts || []); }).catch(() => { setPosts([]); setComments([]); });
  };
  useEffect(() => { if (!localStorage.getItem('authToken')) { router.replace('/login'); return; } load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const delPost = async (p: P) => { if (!confirm(`'${p.title}' 글을 삭제할까요?`)) return; await api.delete(`/board/posts/${p.id}`); load(); };
  const unsave = async (p: P) => { await api.post(`/board/posts/${p.id}/bookmark`); load(); };
  const delComment = async (c: Cm) => { if (!confirm('댓글을 삭제할까요?')) return; await api.delete(`/board/comments/${c.id}`); load(); };
  const saveComment = async (c: Cm) => { try { await api.put(`/board/comments/${c.id}`, { content: editText }); setEditing(null); load(); } catch (e: any) { alert(e?.response?.data?.message || '고치지 못했어요.'); } };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-3 py-5 sm:px-4">
        <h1 className="text-2xl font-black">커뮤니티 활동</h1>
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800" role="tablist">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => router.replace(`/my/community?tab=${k}`)} className={`-mb-px flex shrink-0 items-center gap-1 border-b-2 px-3 py-2.5 text-sm font-black ${tab === k ? 'border-[#00dc64]' : 'border-transparent text-gray-400'}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1b1b1b]">
          {tab !== 'comments' ? (
            posts === null ? <p className="py-12 text-center text-sm text-gray-400">불러오는 중...</p> : posts.length === 0 ? <p className="py-12 text-center text-sm text-gray-500">{tab === 'posts' ? '작성한 게시글이 없어요.' : '저장한 게시글이 없어요. 글에서 [저장]을 누르면 여기 모여요.'}</p> : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {posts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/community/post/${p.id}`} className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">{p.categoryName}{p.work ? ` · 《${p.work.title}》${p.work.episode ? ` ${p.work.episode.number}화` : ''}` : ''}{p.status && p.status !== 'NORMAL' ? <span className="ml-1 rounded bg-red-100 px-1 text-red-600">{p.status === 'HIDDEN' ? '관리자 숨김' : p.status}</span> : null}</p>
                      <p className="truncate font-bold">{p.title}</p>
                      <p className="text-xs text-gray-400">{d(p.createdAt)} · 조회 {p.viewCount} · 추천 {p.likeCount} · 댓글 {p.commentCount}</p>
                    </Link>
                    {tab === 'posts' ? (
                      <span className="flex shrink-0 gap-1">
                        <Link href={`/community/write?id=${p.id}`} className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="수정"><Pencil className="h-4 w-4" /></Link>
                        <button type="button" onClick={() => void delPost(p)} className="rounded p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
                      </span>
                    ) : <button type="button" onClick={() => void unsave(p)} className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-gray-700">저장 해제</button>}
                  </li>
                ))}
              </ul>
            )
          ) : comments === null ? <p className="py-12 text-center text-sm text-gray-400">불러오는 중...</p> : comments.length === 0 ? <p className="py-12 text-center text-sm text-gray-500">작성한 댓글이 없어요.</p> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {comments.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <Link href={`/community/post/${c.post.id}#c-${c.id}`} className="text-xs text-gray-500 hover:underline">{c.isReply ? '답글 · ' : ''}{c.post.title}</Link>
                  {editing === c.id ? (
                    <div className="mt-1 flex gap-2"><input value={editText} onChange={(e) => setEditText(e.target.value)} className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-[#141414]" /><button type="button" onClick={() => void saveComment(c)} className="rounded bg-[#00dc64] px-3 text-xs font-bold text-black">저장</button><button type="button" onClick={() => setEditing(null)} className="text-xs text-gray-500">취소</button></div>
                  ) : <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>}
                  <p className="mt-1 flex items-center gap-3 text-xs text-gray-400">{d(c.createdAt)}
                    <button type="button" onClick={() => { setEditing(c.id); setEditText(c.content); }} className="underline">수정</button>
                    <button type="button" onClick={() => void delComment(c)} className="text-red-500 underline">삭제</button>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
export default function MyCommunityPage() { return <Suspense fallback={null}><Content /></Suspense>; }
