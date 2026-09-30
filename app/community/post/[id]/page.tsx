'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Award, Bookmark, BookmarkCheck, BookOpen, EyeOff, MoreVertical, Pencil, Reply, ThumbsUp, Trash2, UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';

const ReportModal = dynamic(() => import('@/components/ui/ReportModal'), { ssr: false, loading: () => null });

// 게시글 상세: 스포일러 본문 가림, 작품·회차 링크, 추천·저장, 신고·차단, 댓글·대댓글·좋아요 (/api/board)
interface C { id: string; parentId?: string | null; deleted?: boolean; content: string; author: string; authorId: string; isMine: boolean; isBlocked: boolean; likeCount: number; isLiked: boolean; createdAt: string; replies?: C[] }
interface Post {
  id: string; title: string; content: string; category: string; categoryName: string; author: string; authorId: string; isMine: boolean; viewCount: number; likeCount: number; commentCount: number;
  isBest: boolean; isSpoiler: boolean; noticeType?: string | null; pinned: boolean; isLiked: boolean; isBookmarked: boolean; authorBlocked: boolean; createdAt: string; updatedAt: string; status: string;
  work?: { id: string; title: string; episode?: { id: string; number: number; title: string } | null } | null;
}
const fmt = (v: string) => new Date(v).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || '');
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<C[]>([]);
  const [error, setError] = useState('');
  const [showBody, setShowBody] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<{ type: 'POST' | 'POST_COMMENT'; id: string; name: string } | null>(null);
  const [notice, setNotice] = useState('');
  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('authToken');

  const load = () => api.get(`/board/posts/${id}`).then(({ data }) => { setPost(data.post); setComments(data.comments || []); }).catch((e) => setError(e?.response?.status === 404 ? '게시글을 찾을 수 없어요. 삭제되었거나 숨겨진 글일 수 있어요.' : '글을 불러오지 못했어요.'));
  useEffect(() => { if (id) void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 2200); return () => window.clearTimeout(t); }, [notice]);
  useEffect(() => { // 알림에서 #c-댓글id 로 들어오면 그 댓글로
    if (!comments.length || !window.location.hash) return;
    window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView({ block: 'center' }), 200);
  }, [comments.length]);

  const needLogin = () => { if (loggedIn) return false; alert('로그인이 필요합니다.'); return true; };
  const like = async () => {
    if (needLogin() || !post) return;
    try { const { data } = await api.post(`/board/posts/${id}/like`); setPost({ ...post, isLiked: data.liked, likeCount: data.likeCount, isBest: data.likeCount >= 10 }); } catch (e: any) { setNotice(e?.response?.data?.message || '추천하지 못했어요.'); }
  };
  const bookmark = async () => {
    if (needLogin() || !post) return;
    const { data } = await api.post(`/board/posts/${id}/bookmark`); setPost({ ...post, isBookmarked: data.bookmarked }); setNotice(data.bookmarked ? '저장한 게시글에 넣었어요' : '저장을 풀었어요');
  };
  const removePost = async () => {
    if (!confirm('이 글을 삭제할까요?')) return;
    await api.delete(`/board/posts/${id}`); router.replace('/community');
  };
  const block = async (userId: string, name: string, on: boolean) => {
    setMenu(null);
    if (needLogin()) return;
    try {
      if (on) { if (!confirm(`${name}님을 차단할까요? 차단한 사용자의 글은 목록에서 빠지고 댓글은 접혀 보여요.`)) return; await api.post('/report/block-user', { userId, reason: '게시판에서 차단' }); }
      else await api.delete(`/report/unblock-user/${userId}`);
      await load(); setNotice(on ? `${name}님을 차단했어요` : '차단을 풀었어요');
    } catch (e: any) { if (/이미 차단/.test(e?.response?.data?.message || '')) await load(); else alert('처리하지 못했어요.'); }
  };
  const sendComment = async (parentId?: string) => {
    if (needLogin()) return;
    const body = parentId ? replyText : text;
    if (!body.trim()) return;
    try { await api.post(`/board/posts/${id}/comments`, { content: body, parentId }); setText(''); setReplyText(''); setReplyTo(null); await load(); } catch (e: any) { alert(e?.response?.data?.message || '댓글을 쓰지 못했어요.'); }
  };
  const likeComment = async (c: C) => {
    if (needLogin()) return;
    try { const { data } = await api.post(`/board/comments/${c.id}/like`); const upd = (x: C): C => (x.id === c.id ? { ...x, isLiked: data.liked, likeCount: data.likeCount } : { ...x, replies: x.replies?.map(upd) }); setComments(comments.map(upd)); } catch (e: any) { setNotice(e?.response?.data?.message || '처리하지 못했어요.'); }
  };
  const deleteComment = async (c: C) => { setMenu(null); if (!confirm('댓글을 삭제할까요?')) return; await api.delete(`/board/comments/${c.id}`); await load(); };

  if (error) return <div className="min-h-screen bg-gray-50 p-6 text-center dark:bg-[#141414]"><p className="mt-20 text-gray-500">{error}</p><Link href="/community" className="mt-4 inline-block underline">목록으로</Link></div>;
  if (!post) return <div className="flex min-h-screen justify-center bg-gray-50 pt-24 dark:bg-[#141414]"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>;
  const bodyHidden = post.isSpoiler && !showBody && !post.isMine;

  const commentView = (c: C, isReply = false) => {
    const collapsed = c.isBlocked && !revealed.has(c.id);
    return (
      <div key={c.id} id={`c-${c.id}`} className={`scroll-mt-24 ${isReply ? 'ml-6 border-l-2 border-gray-100 pl-3 dark:border-gray-800' : ''} py-3`}>
        {c.deleted ? <p className="text-sm text-gray-400">삭제된 댓글입니다.</p> : (
          <>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-200">{c.author}{c.isMine && <span className="ml-1 text-[#00a84c]">(나)</span>}<span className="ml-2 font-normal text-gray-400">{fmt(c.createdAt)}</span></span>
              <span className="relative">
                <button type="button" aria-label="댓글 메뉴" onClick={() => setMenu(menu === c.id ? null : c.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><MoreVertical className="h-4 w-4" /></button>
                {menu === c.id && (
                  <span className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-[#1b1b1b]">
                    {c.isMine ? <button type="button" onClick={() => void deleteComment(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-500 hover:bg-gray-50 dark:hover:bg-white/5"><Trash2 className="h-4 w-4" />삭제</button> : (
                      <>
                        <button type="button" onClick={() => { setMenu(null); if (!needLogin()) setReport({ type: 'POST_COMMENT', id: c.id, name: `${c.author}: ${c.content.slice(0, 40)}` }); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5"><AlertTriangle className="h-4 w-4" />신고</button>
                        <button type="button" onClick={() => void block(c.authorId, c.author, !c.isBlocked)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5">{c.isBlocked ? <><UserCheck className="h-4 w-4" />차단 해제</> : <><UserX className="h-4 w-4" />사용자 차단</>}</button>
                      </>
                    )}
                  </span>
                )}
              </span>
            </div>
            {collapsed ? (
              <p className="mt-1 flex items-center gap-2 rounded bg-gray-100 px-2 py-1.5 text-sm text-gray-500 dark:bg-white/5"><EyeOff className="h-4 w-4" />차단한 사용자의 댓글입니다.<button type="button" onClick={() => setRevealed(new Set(revealed).add(c.id))} className="font-bold underline">보기</button></p>
            ) : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{c.content}</p>}
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
              <button type="button" onClick={() => void likeComment(c)} className={`inline-flex items-center gap-1 ${c.isLiked ? 'text-[#00a84c] dark:text-[#00dc64]' : ''}`}><ThumbsUp className="h-3.5 w-3.5" fill={c.isLiked ? 'currentColor' : 'none'} />{c.likeCount}</button>
              {!isReply && <button type="button" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }} className="inline-flex items-center gap-1"><Reply className="h-3.5 w-3.5" />답글</button>}
            </div>
          </>
        )}
        {replyTo === c.id && (
          <div className="mt-2 flex gap-2">
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={1000} placeholder={`${c.author}님에게 답글`} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#141414]" />
            <button type="button" onClick={() => void sendComment(c.id)} className="rounded-lg bg-[#00dc64] px-3 text-sm font-bold text-black">등록</button>
          </div>
        )}
        {c.replies?.map((r) => commentView(r, true))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-3xl px-3 py-5 sm:px-4">
        <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push('/community'))} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-gray-500"><ArrowLeft className="h-4 w-4" />목록으로</button>
        <article className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-[#1b1b1b]">
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            {post.noticeType === 'NOTICE' && <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-black text-white dark:bg-white dark:text-black">공지</span>}
            {post.noticeType === 'IMPORTANT' && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">중요</span>}
            {post.isBest && <span className="inline-flex items-center gap-0.5 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black"><Award className="h-3 w-3" />BEST</span>}
            <Link href={`/community?category=${post.category}`} className="rounded bg-gray-100 px-1.5 py-0.5 font-bold dark:bg-white/10">{post.categoryName}</Link>
            {post.isSpoiler && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">스포일러</span>}
          </p>
          <h1 className="mt-2 text-xl font-black sm:text-2xl">{post.title}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
            <span className="font-bold text-gray-700 dark:text-gray-300">{post.author}</span><span>{fmt(post.createdAt)}{post.updatedAt !== post.createdAt ? ' (수정됨)' : ''}</span><span>조회 {post.viewCount}</span><span>추천 {post.likeCount}</span>
          </p>
          {post.work && (
            <Link href={post.work.episode ? `/webtoons/${post.work.id}/episode/${post.work.episode.id}` : `/webtoons/${post.work.id}`} className="mt-3 flex items-center gap-2 rounded-lg bg-[#00dc64]/10 px-3 py-2 text-sm font-bold text-[#00a84c] dark:text-[#00dc64]">
              <BookOpen className="h-4 w-4" />{post.work.title}{post.work.episode ? ` · ${post.work.episode.number}화` : ''} <span className="ml-auto text-xs font-normal">작품 보기 →</span>
            </Link>
          )}
          {post.authorBlocked && !showBody ? (
            <button type="button" onClick={() => setShowBody(true)} className="mt-4 flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-3 text-sm text-gray-500 dark:bg-white/5"><EyeOff className="h-4 w-4" />차단한 사용자의 글입니다. <span className="underline">내용 보기</span></button>
          ) : bodyHidden ? (
            <button type="button" onClick={() => setShowBody(true)} className="mt-4 flex w-full items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-6 text-left text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />스포일러가 포함된 게시글입니다 <span className="ml-auto text-xs underline">내용 보기</span>
            </button>
          ) : <div className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">{post.content}</div>}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => void like()} disabled={post.isMine} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold ${post.isLiked ? 'border-[#00dc64] bg-[#00dc64]/10 text-[#00a84c]' : 'border-gray-200 dark:border-gray-700'} disabled:opacity-50`}><ThumbsUp className="h-4 w-4" fill={post.isLiked ? 'currentColor' : 'none'} />추천 {post.likeCount}</button>
            <button type="button" onClick={() => void bookmark()} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold ${post.isBookmarked ? 'border-[#00dc64] text-[#00a84c]' : 'border-gray-200 dark:border-gray-700'}`}>{post.isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{post.isBookmarked ? '저장됨' : '저장'}</button>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
            {post.isMine ? (
              <>
                <Link href={`/community/write?id=${post.id}`} className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" />수정</Link>
                <button type="button" onClick={() => void removePost()} className="inline-flex items-center gap-1 text-red-500"><Trash2 className="h-3.5 w-3.5" />삭제</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { if (!needLogin()) setReport({ type: 'POST', id: post.id, name: post.title }); }} className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />신고</button>
                <button type="button" onClick={() => void block(post.authorId, post.author, !post.authorBlocked)} className="inline-flex items-center gap-1">{post.authorBlocked ? <><UserCheck className="h-3.5 w-3.5" />차단 해제</> : <><UserX className="h-3.5 w-3.5" />작성자 차단</>}</button>
              </>
            )}
          </div>
        </article>

        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-[#1b1b1b]">
          <h2 className="font-black">댓글 {post.commentCount}</h2>
          <div className="mt-3 flex gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} placeholder={loggedIn ? '댓글을 입력하세요' : '로그인 후 댓글을 쓸 수 있어요'} disabled={!loggedIn} className="min-w-0 flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#141414]" />
            <button type="button" disabled={!loggedIn || !text.trim()} onClick={() => void sendComment()} className="shrink-0 rounded-lg bg-[#00dc64] px-4 text-sm font-black text-black disabled:opacity-40">등록</button>
          </div>
          <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {comments.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">첫 댓글을 남겨 보세요.</p> : comments.map((c) => commentView(c))}
          </div>
        </section>
      </div>
      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white">{notice}</div>}
      {report && <ReportModal isOpen onClose={() => setReport(null)} targetType={report.type} targetId={report.id} targetName={report.name} />}
    </div>
  );
}
