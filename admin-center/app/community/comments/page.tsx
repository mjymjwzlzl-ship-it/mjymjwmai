'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi, siteBase } from '@/lib/works';

// 커뮤니티 관리 > 댓글 관리: 게시판 댓글·대댓글 전체, 숨김·삭제·복구, 신고된 댓글 필터
interface Row { id: string; content: string; status: 'NORMAL' | 'HIDDEN' | 'DELETED'; isReply: boolean; likeCount: number; openReports: number; author: { id: string; name: string; email: string; status: string }; post: { id: string; title: string }; createdAt: string }
const STATUS: Record<string, [string, string]> = { NORMAL: ['정상', 'bg-green-600/30'], HIDDEN: ['숨김', 'bg-amber-600/30'], DELETED: ['삭제', 'bg-red-600/40'] };

export default function CommentsAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('');
  const [reported, setReported] = useState('');
  const [q, setQ] = useState('');
  const load = useCallback(async () => {
    try { setRows((await adminApi<{ comments: Row[] }>(`/admin/community/comments?${new URLSearchParams({ ...(status ? { status } : {}), ...(reported ? { reported } : {}), ...(q.trim() ? { q: q.trim() } : {}) })}`)).comments); } catch (e: any) { alert(e.message); }
  }, [status, reported, q]);
  useEffect(() => { void load(); }, [status, reported]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = async (id: string, s: string) => { try { await adminApi(`/admin/community/comments/${id}`, { method: 'PATCH', json: { status: s } }); await load(); } catch (e: any) { alert(e.message); } };
  const sel = 'rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">댓글 관리</h1>
        <p className="mt-1 text-sm text-gray-400">게시판 댓글·대댓글입니다. 숨김은 사이트에서 빠지고, 삭제는 "삭제된 댓글"로 남습니다(답글이 있을 때). 회차 댓글은 [신고 관리]에서 처리합니다.</p>
        <div className="my-4 flex flex-wrap gap-2">
          <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="내용·작성자" className="bg-transparent py-1.5 text-sm outline-none" /></form>
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">모든 상태</option><option value="NORMAL">정상</option><option value="HIDDEN">숨김</option><option value="DELETED">삭제</option></select>
          <select className={sel} value={reported} onChange={(e) => setReported(e.target.value)}><option value="">신고 여부</option><option value="true">신고 검토 중만</option></select>
          <span className="self-center text-sm text-gray-400">{rows.length}개</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">내용</th><th className="p-2">게시글</th><th className="p-2">작성자</th><th className="p-2">작성일</th><th className="p-2">좋아요</th><th className="p-2">상태</th><th className="p-2" /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-gray-700">
                  <td className="max-w-md p-2">{c.isReply && <span className="mr-1 text-xs text-gray-500">↳ 답글</span>}{c.content}</td>
                  <td className="p-2 text-xs"><a href={`${siteBase()}/community/post/${c.post.id}#c-${c.id}`} target="_blank" rel="noreferrer" className="hover:underline">{c.post.title}</a></td>
                  <td className="p-2 text-xs">{c.author.name}<a href={`/users?q=${encodeURIComponent(c.author.email)}`} className="ml-1 text-purple-300 underline">이용 제한</a></td>
                  <td className="whitespace-nowrap p-2 text-xs">{new Date(c.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-2">{c.likeCount}</td>
                  <td className="p-2"><span className={`rounded px-1.5 text-xs ${STATUS[c.status][1]}`}>{STATUS[c.status][0]}</span>{c.openReports > 0 && <span className="ml-1 rounded bg-red-600/40 px-1.5 text-xs">신고 {c.openReports}</span>}</td>
                  <td className="whitespace-nowrap p-2 text-xs">
                    {c.status !== 'NORMAL' && <button type="button" onClick={() => void set(c.id, 'NORMAL')} className="mr-2 text-green-300 underline">복구</button>}
                    {c.status !== 'HIDDEN' && <button type="button" onClick={() => void set(c.id, 'HIDDEN')} className="mr-2 text-amber-300 underline">숨김</button>}
                    {c.status !== 'DELETED' && <button type="button" onClick={() => void set(c.id, 'DELETED')} className="text-red-300 underline">삭제</button>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">댓글이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
