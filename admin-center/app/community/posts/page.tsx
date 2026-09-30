'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Pin, Search, X } from 'lucide-react';
import { adminApi, siteBase } from '@/lib/works';

// 커뮤니티 관리 > 게시글 관리: 목록·검색·상세, 숨김/삭제/복구, [공지]·[중요] 고정(기간), 스포일러·분류 변경, 작성자 → 사용자 관리
interface Row {
  id: string; title: string; category: string; categoryName: string; status: 'NORMAL' | 'HIDDEN' | 'DELETED'; statusReason?: string | null; review: boolean; openReports: number;
  isSpoiler: boolean; noticeType?: string | null; isPinned: boolean; pinnedUntil?: string | null; author: { id: string; name: string; email: string; status: string };
  viewCount: number; likeCount: number; commentCount: number; work?: { id: string; title: string; episodeNumber?: number | null } | null; createdAt: string;
}
const STATUS: Record<string, [string, string]> = { NORMAL: ['정상', 'bg-green-600/30'], HIDDEN: ['숨김', 'bg-amber-600/30'], DELETED: ['삭제', 'bg-red-600/40'] };
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const toLocal = (v?: string | null) => { if (!v) return ''; const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function PostsContent() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<{ key: string; name: string }[]>([]);
  const [f, setF] = useState({ status: params.get('status') || '', category: params.get('category') || '', q: '', reported: params.get('reported') || '', pinned: params.get('pinned') || '', spoiler: '' });
  const [open, setOpen] = useState<string | null>(params.get('focus'));
  const load = useCallback(async () => {
    try { setRows((await adminApi<{ posts: Row[] }>(`/admin/community/posts?${new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][])}`)).posts); } catch (e: any) { alert(e.message); }
  }, [f]);
  useEffect(() => { void load(); }, [f.status, f.category, f.reported, f.pinned, f.spoiler]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { adminApi<{ categories: any[] }>('/admin/community/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  const sel = 'rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold">게시글 관리</h1>
        <p className="mt-1 text-sm text-gray-400">상태: 정상 / 숨김(사이트에서 안 보임) / 삭제 / <span className="text-red-300">신고 검토 중</span>(처리 안 끝난 신고가 있는 글). 글을 누르면 내용·댓글·신고·관리 기능이 열립니다.</p>
        <div className="my-4 flex flex-wrap gap-2">
          <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="제목·내용·작성자" className="bg-transparent py-1.5 text-sm outline-none" /></form>
          <select className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">모든 상태</option><option value="NORMAL">정상</option><option value="HIDDEN">숨김</option><option value="DELETED">삭제</option></select>
          <select className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">모든 분류</option>{cats.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
          <select className={sel} value={f.reported} onChange={(e) => setF({ ...f, reported: e.target.value })}><option value="">신고 여부</option><option value="true">신고 검토 중만</option></select>
          <select className={sel} value={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.value })}><option value="">고정 여부</option><option value="true">고정 글만</option></select>
          <select className={sel} value={f.spoiler} onChange={(e) => setF({ ...f, spoiler: e.target.value })}><option value="">스포일러</option><option value="true">스포일러 글만</option></select>
          <span className="self-center text-sm text-gray-400">{rows.length}개</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">제목</th><th className="p-2">분류</th><th className="p-2">작성자</th><th className="p-2">작성일</th><th className="p-2">조회</th><th className="p-2">추천</th><th className="p-2">댓글</th><th className="p-2">작품 연결</th><th className="p-2">상태</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setOpen(r.id)} className={`cursor-pointer border-t border-gray-700 hover:bg-gray-800/60 ${open === r.id ? 'bg-purple-900/30' : ''}`}>
                  <td className="p-2"><span className="flex flex-wrap items-center gap-1">{r.isPinned && <Pin className="h-3.5 w-3.5 text-amber-300" />}{r.noticeType && <span className={`rounded px-1 text-[10px] ${r.noticeType === 'IMPORTANT' ? 'bg-red-600' : 'bg-gray-600'}`}>{r.noticeType === 'IMPORTANT' ? '중요' : '공지'}</span>}{r.isSpoiler && <span className="rounded bg-amber-600/40 px-1 text-[10px]">스포일러</span>}<b>{r.title}</b></span></td>
                  <td className="p-2 text-xs">{r.categoryName}</td>
                  <td className="p-2 text-xs">{r.author.name}{r.author.status !== 'ACTIVE' && <span className="ml-1 text-red-300">({r.author.status === 'BANNED' ? '차단' : '제한'})</span>}</td>
                  <td className="whitespace-nowrap p-2 text-xs">{fmt(r.createdAt)}</td>
                  <td className="p-2">{r.viewCount}</td><td className="p-2">{r.likeCount}</td><td className="p-2">{r.commentCount}</td>
                  <td className="p-2 text-xs">{r.work ? `${r.work.title}${r.work.episodeNumber ? ` · ${r.work.episodeNumber}화` : ''}` : '-'}</td>
                  <td className="p-2"><span className={`rounded px-1.5 text-xs ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>{r.review && <span className="ml-1 rounded bg-red-600/40 px-1.5 text-xs">신고 검토 중 {r.openReports}</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-500">게시글이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {open && <PostPanel id={open} cats={cats} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

function PostPanel({ id, cats, onClose, onChanged }: { id: string; cats: { key: string; name: string }[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const [d, setD] = useState<any>(null);
  const [notice, setNotice] = useState('');
  const [until, setUntil] = useState('');
  const load = useCallback(async () => { const r = await adminApi<any>(`/admin/community/posts/${id}`); setD(r); setNotice(r.post.noticeType || ''); setUntil(toLocal(r.post.pinnedUntil)); }, [id]);
  useEffect(() => { load().catch((e) => alert(e.message)); }, [load]);
  const patch = async (json: any, msg?: string) => { try { await adminApi(`/admin/community/posts/${id}`, { method: 'PATCH', json }); await load(); await onChanged(); if (msg) alert(msg); } catch (e: any) { alert(e.message); } };
  const setStatus = async (status: string) => {
    const reason = status === 'NORMAL' ? '' : prompt(status === 'HIDDEN' ? '숨김 사유 (사용자에게는 보이지 않음)' : '삭제 사유', status === 'HIDDEN' ? '운영정책 위반' : '') ;
    if (reason === null) return;
    await patch({ status, statusReason: reason });
  };
  const commentStatus = async (cid: string, status: string) => { try { await adminApi(`/admin/community/comments/${cid}`, { method: 'PATCH', json: { status } }); await load(); } catch (e: any) { alert(e.message); } };
  const purge = async () => { if (!confirm('이 글을 영구 삭제할까요? 댓글도 함께 지워지고 되돌릴 수 없습니다.')) return; try { await adminApi(`/admin/community/posts/${id}`, { method: 'DELETE' }); await onChanged(); onClose(); } catch (e: any) { alert(e.message); } };
  const p = d?.post;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label="게시글 상세">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl space-y-4 overflow-y-auto bg-gray-800 p-6 text-sm">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">게시글 상세</h2><button type="button" onClick={onClose} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button></div>
        {!p ? <p className="text-gray-400">불러오는 중...</p> : (
          <>
            <div className="rounded bg-gray-900 p-3">
              <p className="text-xs text-gray-400">{cats.find((c) => c.key === p.category)?.name || p.category} · {fmt(p.createdAt)} · 조회 {p.viewCount}</p>
              <h3 className="mt-1 text-base font-bold">{p.title}</h3>
              {p.work && <p className="mt-1 text-xs text-sky-300">연결 작품: {p.work.title}{p.work.episodeNumber ? ` · ${p.work.episodeNumber}화` : ''}</p>}
              <p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap text-gray-200">{p.content}</p>
              <a href={`${siteBase()}/community/post/${p.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-purple-300 underline">사이트에서 보기<ExternalLink className="h-3 w-3" /></a>
            </div>
            <div className="rounded bg-gray-900 p-3">
              <p>작성자: <b>{p.author.name}</b> <span className="text-gray-400">{p.author.email}</span> {p.author.status !== 'ACTIVE' && <span className="text-red-300">({p.author.status})</span>}</p>
              <a href={`/users?q=${encodeURIComponent(p.author.email || p.author.name)}`} className="text-xs text-purple-300 underline">사용자 관리에서 이용 제한·차단 →</a>
            </div>
            <section className="space-y-2 rounded border border-purple-500/40 p-3">
              <p className="font-bold">상태: {STATUS[p.status][0]}{p.statusReason ? ` (${p.statusReason})` : ''}</p>
              <div className="flex flex-wrap gap-2">
                {p.status !== 'NORMAL' && <button type="button" onClick={() => void setStatus('NORMAL')} className="rounded bg-green-700 px-3 py-1">정상으로 복구</button>}
                {p.status !== 'HIDDEN' && <button type="button" onClick={() => void setStatus('HIDDEN')} className="rounded bg-amber-700 px-3 py-1">숨김</button>}
                {p.status !== 'DELETED' && <button type="button" onClick={() => void setStatus('DELETED')} className="rounded bg-red-700 px-3 py-1">삭제</button>}
                {p.status === 'DELETED' && <button type="button" onClick={() => void purge()} className="rounded bg-red-900 px-3 py-1">영구 삭제</button>}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span>상단 고정</span>
                <select value={notice} onChange={(e) => setNotice(e.target.value)} className="rounded border border-gray-600 bg-gray-700 px-2 py-1"><option value="">고정 안 함</option><option value="NOTICE">[공지]</option><option value="IMPORTANT">[중요]</option></select>
                <span className="text-gray-400">기간 끝</span><input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded border border-gray-600 bg-gray-700 px-2 py-1" />
                <button type="button" onClick={() => void patch({ noticeType: notice || null, pinnedUntil: notice && until ? new Date(until).toISOString() : null }, '고정 설정을 저장했습니다.')} className="rounded bg-purple-600 px-3 py-1 font-bold">저장</button>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.isSpoiler} onChange={(e) => void patch({ isSpoiler: e.target.checked })} />스포일러 포함</label>
                <label className="flex items-center gap-1">분류<select value={p.category} onChange={(e) => void patch({ category: e.target.value })} className="rounded border border-gray-600 bg-gray-700 px-2 py-1">{cats.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
              </div>
            </section>
            {d.reports.length > 0 && (
              <section className="rounded bg-gray-900 p-3">
                <p className="mb-1 font-bold">신고 {d.reports.length}건</p>
                <ul className="space-y-1 text-xs">{d.reports.map((r: any) => <li key={r.id}>{fmt(r.createdAt)} · {r.type === 'POST' ? '글' : '댓글'} · {r.reason} · {r.status} <a href={`/reports`} className="text-purple-300 underline">신고 관리에서 처리</a></li>)}</ul>
              </section>
            )}
            <section>
              <p className="mb-1 font-bold">댓글 {d.comments.length}</p>
              <ul className="space-y-1">
                {d.comments.map((c: any) => (
                  <li key={c.id} className={`rounded bg-gray-900 p-2 ${c.parentId ? 'ml-5' : ''}`}>
                    <p className="text-xs text-gray-400">{c.author.name} · {fmt(c.createdAt)} · 좋아요 {c.likeCount} {c.status !== 'NORMAL' && <span className="text-red-300">[{c.status === 'HIDDEN' ? '숨김' : '삭제'}]</span>}</p>
                    <p className="whitespace-pre-wrap">{c.content}</p>
                    <span className="flex gap-2 text-xs">
                      {c.status !== 'NORMAL' && <button type="button" onClick={() => void commentStatus(c.id, 'NORMAL')} className="text-green-300 underline">복구</button>}
                      {c.status !== 'HIDDEN' && <button type="button" onClick={() => void commentStatus(c.id, 'HIDDEN')} className="text-amber-300 underline">숨김</button>}
                      {c.status !== 'DELETED' && <button type="button" onClick={() => void commentStatus(c.id, 'DELETED')} className="text-red-300 underline">삭제</button>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
export default function PostsAdminPage() { return <Suspense fallback={null}><PostsContent /></Suspense>; }
