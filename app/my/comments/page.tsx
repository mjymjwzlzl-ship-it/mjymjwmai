'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useLoginModalStore } from '@/store/loginModal';

interface MyComment {
  id: string;
  content: string;
  likes: number;
  replies: number;
  isReply: boolean;
  edited: boolean;
  createdAt: string;
  comic: { id: string; title: string; thumbnail?: string | null } | null;
  episode: { id: string; episodeNumber: number; title?: string | null } | null;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' });

export default function MyCommentsPage() {
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const { data } = await api.get('/comments/mine', { params: { page: nextPage, limit: 20 } });
      setComments((prev) => (nextPage === 1 ? data.comments : [...prev, ...data.comments]));
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      if (nextPage === 1) setComments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setLoggedIn(!!token);
    if (token) void load(1);
    else setLoading(false);
  }, [load]);

  const saveEdit = async (id: string) => {
    const content = draft.trim();
    if (!content) { alert('내용을 입력해 주세요.'); return; }
    try {
      await api.put(`/comments/${id}`, { content });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content, edited: true } : c)));
      setEditingId(null);
    } catch (error: any) {
      alert(error.response?.data?.error || '수정하지 못했습니다.');
    }
  };

  const remove = async (comment: MyComment) => {
    if (!confirm(comment.replies > 0 ? `이 댓글을 삭제할까요? 달린 답글 ${comment.replies}개도 함께 삭제돼요.` : '이 댓글을 삭제할까요?')) return;
    try {
      await api.delete(`/comments/${comment.id}`);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      setTotal((n) => n - 1);
    } catch (error: any) {
      alert(error.response?.data?.error || '삭제하지 못했습니다.');
    }
  };

  const hrefOf = (comment: MyComment) =>
    comment.comic && comment.episode ? `/webtoons/${comment.comic.id}/episode/${comment.episode.id}?to=comments` : comment.comic ? `/webtoons/${comment.comic.id}` : '#';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-end justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <MessageSquare className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
            댓글 내역
          </h1>
          {loggedIn && <span className="text-sm font-bold text-gray-500 dark:text-gray-400">총 {total}개</span>}
        </div>

        {loggedIn === false ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
            <p className="mb-4 font-bold text-gray-500 dark:text-gray-400">로그인하면 내가 남긴 댓글을 모아 볼 수 있어요</p>
            <button type="button" onClick={() => openLogin(true)} className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black">로그인 / 회원가입</button>
          </div>
        ) : loading && comments.length === 0 ? (
          <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
        ) : comments.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm font-bold text-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400">아직 남긴 댓글이 없어요.</p>
        ) : (
          <>
            <ul className="mt-5 space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1b1b1b]">
                  <Link href={hrefOf(comment)} className="group flex items-center gap-3">
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
                      {comment.comic?.thumbnail ? <img src={getImageUrl(comment.comic.thumbnail, { width: 100 })} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-black group-hover:text-[#00a84c] dark:group-hover:text-[#00dc64]">{comment.comic?.title || '삭제된 작품'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {comment.episode ? `${comment.episode.episodeNumber}화` : '작품 댓글'}
                        {comment.isReply ? ' · 답글' : ''} · {formatDate(comment.createdAt)}{comment.edited ? ' · 수정됨' : ''}
                      </p>
                    </div>
                  </Link>

                  {editingId === comment.id ? (
                    <div className="mt-3">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#141414]"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold dark:bg-white/10">취소</button>
                        <button type="button" onClick={() => void saveEdit(comment.id)} className="rounded-lg bg-[#00dc64] px-3 py-1.5 text-xs font-black text-black">저장</button>
                      </div>
                    </div>
                  ) : (
                    <Link href={hrefOf(comment)} className="mt-3 block whitespace-pre-line break-words text-sm text-gray-800 dark:text-gray-200">{comment.content}</Link>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>좋아요 {comment.likes} · 답글 {comment.replies}</span>
                    {editingId !== comment.id && (
                      <span className="flex gap-3">
                        <button type="button" onClick={() => { setEditingId(comment.id); setDraft(comment.content); }} className="flex items-center gap-1 font-bold hover:text-[#00a84c]"><Pencil className="h-3.5 w-3.5" />수정</button>
                        <button type="button" onClick={() => void remove(comment)} className="flex items-center gap-1 font-bold hover:text-red-500"><Trash2 className="h-3.5 w-3.5" />삭제</button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {page < totalPages && (
              <button type="button" disabled={loading} onClick={() => void load(page + 1)} className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-600 disabled:opacity-50 dark:border-gray-800 dark:bg-[#1b1b1b] dark:text-gray-300">
                {loading ? '불러오는 중...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
