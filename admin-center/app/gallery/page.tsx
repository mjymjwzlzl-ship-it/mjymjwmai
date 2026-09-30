'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { adminApi, img, siteBase } from '@/lib/works';

// 화보 관리 > 화보 목록·검수: 전체 / 공개 / 비공개 / 검토 중 / 숨김 / 반려, 공식·사용자, 신고 여부
// 제목·대표 이미지·캐릭터·작품·등록자·등록일·공개 상태·좋아요/조회·신고 여부. 검토 중 화보는 여기서 바로 승인·반려·숨김
interface Row {
  id: string; title: string; thumbnail?: string | null; status: string; visibility: string; isOfficial: boolean; creator: string;
  work?: { id: string; title: string } | null; character?: { name: string } | null; tags: string[]; assetCount: number; coinPrice: number;
  viewCount: number; likeCount: number; saveCount: number; createdAt: string; releaseAt?: string | null; endAt?: string | null; rejectReason?: string | null; openReports: number;
}
const STATUS: [string, string, string][] = [['', '전체', ''], ['PUBLISHED', '공개', 'bg-green-600/30'], ['DRAFT', '비공개', 'bg-gray-600'], ['REVIEW', '검토 중', 'bg-sky-600/40'], ['HIDDEN', '숨김', 'bg-amber-600/30'], ['REJECTED', '반려', 'bg-red-600/40']];
const label = (s: string) => STATUS.find(([k]) => k === s) || [s, s, 'bg-gray-700'];

function ListContent() {
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState(params.get('status') || '');
  const [owner, setOwner] = useState('');
  const [reported, setReported] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { setStatus(params.get('status') || ''); }, [params]);
  const load = useCallback(async () => {
    try { const d = await adminApi<{ items: Row[]; counts: Record<string, number> }>(`/admin/gallery/items?${new URLSearchParams({ ...(status ? { status } : {}), ...(owner ? { owner } : {}), ...(reported ? { reported } : {}), ...(q.trim() ? { q: q.trim() } : {}) })}`); setRows(d.items); setCounts(d.counts); } catch (e: any) { alert(e.message); }
  }, [status, owner, reported, q]);
  useEffect(() => { void load(); }, [status, owner, reported]); // eslint-disable-line react-hooks/exhaustive-deps
  const review = async (r: Row, action: string) => {
    let reason = '';
    if (action === 'reject' || action === 'hide') { const v = prompt(action === 'reject' ? '반려 사유 (작성자에게 보여요)' : '숨김 사유 (선택)', ''); if (v === null) return; reason = v; }
    try { await adminApi(`/admin/gallery/items/${r.id}/review`, { method: 'POST', json: { action, reason } }); await load(); } catch (e: any) { alert(e.message); }
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sel = 'rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{status === 'REVIEW' ? '사용자 화보 검수' : '화보 목록'}</h1>
          <div className="flex gap-2"><a href={`${siteBase()}/gallery`} target="_blank" rel="noreferrer" className="rounded bg-gray-700 px-3 py-2 text-sm">화보관 보기</a><Link href="/gallery/edit" className="flex items-center gap-1 rounded bg-purple-600 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" />공식 화보 등록</Link></div>
        </div>
        <p className="mt-1 text-sm text-gray-400">공개 = 캐릭터 화보관에 노출(공개일·노출 종료일 안에서). 사용자가 [전체 공개]로 올린 화보는 [검토 중]에서 승인해야 공개됩니다. 신고된 화보는 [신고 관리](화보)에서도 처리할 수 있습니다.</p>
        <div className="my-4 flex flex-wrap items-center gap-2">
          {STATUS.map(([k, v]) => <button key={k} type="button" onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-sm ${status === k ? 'bg-purple-600' : 'bg-gray-800 text-gray-300'}`}>{v} {k ? counts[k] || 0 : total}</button>)}
          <span className="mx-1 h-5 w-px bg-gray-700" />
          <select className={sel} value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">공식·사용자</option><option value="official">공식 화보</option><option value="user">사용자 화보</option></select>
          <select className={sel} value={reported} onChange={(e) => setReported(e.target.value)}><option value="">신고 여부</option><option value="true">신고된 화보만</option></select>
          <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·캐릭터·작품·태그·등록자" className="bg-transparent py-1.5 text-sm outline-none" /></form>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">화보</th><th className="p-2">캐릭터 · 작품</th><th className="p-2">등록자</th><th className="p-2">등록일</th><th className="p-2">공개 상태</th><th className="p-2">좋아요 · 조회</th><th className="p-2">신고</th><th className="p-2" /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const [, st, cls] = label(r.status);
                return (
                  <tr key={r.id} className="border-t border-gray-700">
                    <td className="p-2"><Link href={`/gallery/edit?id=${r.id}`} className="flex items-center gap-2 hover:underline"><img src={img(r.thumbnail)} alt="" className="h-14 w-10 rounded bg-gray-700 object-cover" /><span><b>{r.title}</b><span className="block text-xs text-gray-400">{r.assetCount}장{r.coinPrice ? ` · ${r.coinPrice}코인` : ' · 무료'}{r.tags.length ? ` · ${r.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}` : ''}</span></span></Link></td>
                    <td className="p-2 text-xs">{r.character?.name || '-'}<span className="block text-gray-400">{r.work ? `《${r.work.title}》` : '-'}</span></td>
                    <td className="p-2 text-xs">{r.isOfficial ? <span className="rounded bg-purple-600/40 px-1">공식</span> : r.creator}</td>
                    <td className="whitespace-nowrap p-2 text-xs">{new Date(r.createdAt).toLocaleDateString('ko-KR')}{r.endAt && <span className="block text-gray-400">~{new Date(r.endAt).toLocaleDateString('ko-KR')}</span>}</td>
                    <td className="p-2"><span className={`rounded px-1.5 text-xs ${cls}`}>{st}</span>{r.visibility === 'PRIVATE' && <span className="ml-1 rounded bg-gray-700 px-1 text-xs">나만 보기</span>}{r.rejectReason && <span className="block text-[11px] text-gray-400">{r.rejectReason}</span>}</td>
                    <td className="p-2 text-xs">♥ {r.likeCount} · 👁 {r.viewCount}</td>
                    <td className="p-2">{r.openReports ? <a href="/reports?type=PHOTOBOOK" className="rounded bg-red-600/40 px-1.5 text-xs">신고 {r.openReports}</a> : '-'}</td>
                    <td className="whitespace-nowrap p-2 text-xs">
                      {r.status === 'REVIEW' && <><button type="button" onClick={() => void review(r, 'approve')} className="mr-2 text-green-300 underline">승인</button><button type="button" onClick={() => void review(r, 'reject')} className="mr-2 text-red-300 underline">반려</button></>}
                      {r.status === 'PUBLISHED' && <button type="button" onClick={() => void review(r, 'hide')} className="mr-2 text-amber-300 underline">숨김</button>}
                      {(r.status === 'HIDDEN' || r.status === 'REJECTED') && <button type="button" onClick={() => void review(r, 'unhide')} className="mr-2 text-green-300 underline">공개</button>}
                      <Link href={`/gallery/edit?id=${r.id}`} className="underline">수정</Link>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">화보가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export default function GalleryAdminPage() { return <Suspense fallback={null}><ListContent /></Suspense>; }
