'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, History, Paperclip, Search, X } from 'lucide-react';
import { adminApi, apiBase, authHeaders, siteBase } from '@/lib/works';

// 신고 관리 (/api/admin/report-center)
// 접수 → 확인 중 → 처리 완료 / 반려. 상태를 바꿀 때마다 이력(누가·언제·메모)이 남고,
// 같은 대상(댓글·회차·작품·사용자)의 지난 신고와 처리 메모를 함께 본다.
type Status = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
interface Report {
  id: string; type: string; typeLabel: string; reason: string; reasonLabel: string; description?: string | null;
  status: Status; statusLabel: string; resolution?: string | null; createdAt: string; resolvedAt?: string | null; hasImage: boolean;
  comic?: { id: string; title: string } | null; episode?: { id: string; episodeNumber: number; title: string } | null;
  comment?: { id: string; content: string; isSpoiler: boolean; hiddenAt?: string | null } | null;
  reporter?: { id: string; name: string } | null; targetUser?: { id: string; name: string } | null; sameTargetCount?: number;
}
interface HistoryRow { id: string; fromLabel?: string | null; toLabel: string; memo?: string | null; adminName?: string | null; createdAt: string }

const STATUS: { key: Status; label: string; className: string }[] = [
  { key: 'PENDING', label: '접수', className: 'bg-yellow-500/20 text-yellow-300' },
  { key: 'PROCESSING', label: '확인 중', className: 'bg-sky-500/20 text-sky-300' },
  { key: 'RESOLVED', label: '처리 완료', className: 'bg-green-500/20 text-green-300' },
  { key: 'REJECTED', label: '반려', className: 'bg-gray-500/30 text-gray-300' },
];
const statusMeta = (s: string) => STATUS.find((x) => x.key === s) || STATUS[0];
const TYPES = [['', '전체'], ['COMIC', '작품·회차'], ['COMMENT', '댓글'], ['USER', '사용자']] as const;
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
const target = (r: Report) => r.comment ? r.comment.content : r.description || '';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<'' | Status>('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...(status ? { status } : {}), ...(type ? { type } : {}), ...(q.trim() ? { q: q.trim() } : {}) });
      const data = await adminApi<{ reports: Report[]; counts: Record<string, number> }>(`/admin/report-center?${params}`);
      setReports(data.reports); setCounts(data.counts);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }, [status, type, q]);
  useEffect(() => { void load(); }, [status, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><AlertTriangle className="h-6 w-6 text-red-400" />신고 관리</h1>
        <p className="mt-1 text-sm text-gray-400">작품·회차 오류 제보, 댓글·사용자 신고를 한곳에서 처리합니다. 상태를 바꿀 때마다 이력과 메모가 남고, 같은 대상의 지난 신고도 함께 보입니다.</p>

        <div className="my-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setStatus('')} className={`rounded-full px-3 py-1 text-sm ${status === '' ? 'bg-purple-600' : 'bg-gray-800 text-gray-300'}`}>전체 {total}</button>
          {STATUS.map((s) => (
            <button key={s.key} type="button" onClick={() => setStatus(s.key)} className={`rounded-full px-3 py-1 text-sm ${status === s.key ? 'bg-purple-600' : 'bg-gray-800 text-gray-300'}`}>{s.label} {counts[s.key] || 0}</button>
          ))}
          <span className="mx-2 h-5 w-px bg-gray-700" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm">
            {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2">
            <Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="작품명·내용 검색" className="bg-transparent py-1.5 text-sm outline-none" />
          </form>
        </div>

        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : reports.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-700 py-16 text-center text-gray-400">신고가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400">
                <tr><th className="p-3">신고 유형</th><th className="p-3">작품명</th><th className="p-3">회차</th><th className="w-1/3 p-3">신고 내용</th><th className="p-3">신고일</th><th className="p-3">첨부</th><th className="p-3">처리 상태</th></tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-t border-gray-700 hover:bg-gray-800/60">
                    <td className="p-3"><span className="mr-1 rounded bg-gray-700 px-1.5 text-xs">{r.typeLabel}</span><b>{r.reasonLabel}</b></td>
                    <td className="p-3">{r.comic?.title || (r.targetUser ? `사용자 ${r.targetUser.name}` : '-')}</td>
                    <td className="p-3">{r.episode ? `${r.episode.episodeNumber}화` : '-'}</td>
                    <td className="p-3 text-gray-300">
                      <span className="line-clamp-2">{r.comment && <span className="mr-1 text-xs text-gray-500">[댓글]</span>}{target(r) || <span className="text-gray-500">(내용 없음)</span>}</span>
                      {(r.sameTargetCount || 1) > 1 && <span className="mt-0.5 inline-block rounded bg-red-500/20 px-1 text-[11px] text-red-300">같은 대상 신고 {r.sameTargetCount}건</span>}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-gray-400">{fmt(r.createdAt)}</td>
                    <td className="p-3">{r.hasImage ? <Paperclip className="h-4 w-4 text-sky-300" aria-label="첨부 이미지 있음" /> : <span className="text-gray-600">-</span>}</td>
                    <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-bold ${statusMeta(r.status).className}`}>{r.statusLabel}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {openId && <ReportDetail id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function ReportDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const [data, setData] = useState<{ report: Report; history: HistoryRow[]; previous: Report[] } | null>(null);
  const [image, setImage] = useState('');
  const [next, setNext] = useState<Status>('PROCESSING');
  const [memo, setMemo] = useState('');
  const [hideComment, setHideComment] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await adminApi<{ report: Report; history: HistoryRow[]; previous: Report[] }>(`/admin/report-center/${id}`);
    setData(d);
    setNext(d.report.status === 'PENDING' ? 'PROCESSING' : d.report.status === 'PROCESSING' ? 'RESOLVED' : d.report.status);
  }, [id]);
  useEffect(() => { load().catch((e) => alert(e.message)); }, [load]);
  // 첨부 이미지는 관리자 인증이 필요해 blob 으로 받아 보여 준다
  useEffect(() => {
    if (!data?.report.hasImage) return;
    let url = '';
    fetch(`${apiBase()}/admin/report-center/${id}/image`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) { url = URL.createObjectURL(b); setImage(url); } }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [data?.report.hasImage, id]);

  const save = async (unhide = false) => {
    if (!data) return;
    const final = next === 'RESOLVED' || next === 'REJECTED';
    if (final && !memo.trim() && !unhide) { alert('처리 완료·반려는 관리자 메모를 남겨 주세요. (나중에 같은 신고가 들어오면 참고합니다)'); return; }
    setBusy(true);
    try {
      await adminApi(`/admin/report-center/${id}`, { method: 'PATCH', json: { status: unhide ? data.report.status : next, memo, hideComment: !unhide && hideComment, unhideComment: unhide } });
      setMemo(''); setHideComment(false);
      await load(); await onChanged();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const r = data?.report;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label="신고 상세">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="닫기" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">신고 상세</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-700" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>
        {!r ? <p className="text-gray-400">불러오는 중...</p> : (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-[6rem_1fr] gap-y-2 rounded-lg bg-gray-900/50 p-4">
              <dt className="text-gray-400">처리 상태</dt><dd><span className={`rounded px-2 py-0.5 text-xs font-bold ${statusMeta(r.status).className}`}>{r.statusLabel}</span></dd>
              <dt className="text-gray-400">신고 유형</dt><dd>{r.typeLabel} · <b>{r.reasonLabel}</b></dd>
              <dt className="text-gray-400">작품명</dt><dd>{r.comic ? <a href={`${siteBase()}/webtoons/${r.comic.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{r.comic.title}<ExternalLink className="h-3 w-3" /></a> : '-'}</dd>
              <dt className="text-gray-400">회차</dt><dd>{r.episode && r.comic ? <a href={`${siteBase()}/webtoons/${r.comic.id}/episode/${r.episode.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{r.episode.episodeNumber}화 {r.episode.title}<ExternalLink className="h-3 w-3" /></a> : '-'}</dd>
              {r.comment && (<><dt className="text-gray-400">신고된 댓글</dt><dd className="whitespace-pre-wrap rounded bg-gray-900 p-2">{r.comment.isSpoiler && <span className="mr-1 rounded bg-amber-500/30 px-1 text-[10px] text-amber-200">스포일러 표시됨</span>}{r.comment.hiddenAt && <span className="mr-1 rounded bg-red-500/30 px-1 text-[10px] text-red-200">숨김 처리됨</span>}{r.comment.content}</dd></>)}
              {r.targetUser && (<><dt className="text-gray-400">대상 사용자</dt><dd>{r.targetUser.name}</dd></>)}
              <dt className="text-gray-400">신고 내용</dt><dd className="whitespace-pre-wrap">{r.description || <span className="text-gray-500">(작성 안 함)</span>}</dd>
              <dt className="text-gray-400">신고자</dt><dd>{r.reporter?.name || '-'}</dd>
              <dt className="text-gray-400">신고일</dt><dd>{fmt(r.createdAt)}</dd>
              <dt className="text-gray-400">첨부 이미지</dt><dd>{r.hasImage ? (image ? <a href={image} target="_blank" rel="noreferrer"><img src={image} alt="첨부 스크린샷" className="max-h-72 rounded border border-gray-700" /></a> : '불러오는 중...') : '없음'}</dd>
            </dl>

            <section className="rounded-lg border border-purple-500/40 p-4">
              <h3 className="mb-2 font-bold">상태 변경</h3>
              <div className="flex flex-wrap gap-2">
                {STATUS.map((s) => (
                  <label key={s.key} className={`cursor-pointer rounded-full px-3 py-1 ${next === s.key ? 'bg-purple-600' : 'bg-gray-700 text-gray-300'}`}>
                    <input type="radio" name="next-status" className="sr-only" checked={next === s.key} onChange={() => setNext(s.key)} />{s.label}
                  </label>
                ))}
              </div>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} maxLength={1000}
                placeholder={next === 'REJECTED' ? '반려 사유 (예: 확인 결과 이미지 정상 노출, 제재 대상 아님)' : next === 'RESOLVED' ? '처리 내용 (예: 12화 이미지 재업로드 완료 / 댓글 숨김)' : '메모 (선택)'}
                className="mt-3 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm" />
              {r.comment && next === 'RESOLVED' && !r.comment.hiddenAt && (
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={hideComment} onChange={(e) => setHideComment(e.target.checked)} />신고된 댓글 숨기기 (사이트 댓글 목록에서 빠짐)</label>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {r.comment?.hiddenAt && <button type="button" disabled={busy} onClick={() => void save(true)} className="rounded bg-gray-700 px-3 py-1.5">댓글 숨김 해제</button>}
                <button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-1.5 font-bold disabled:opacity-50">{busy ? '저장 중...' : '저장'}</button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1 font-bold"><History className="h-4 w-4" />처리 이력</h3>
              <ol className="space-y-2 border-l border-gray-600 pl-4">
                {data!.history.map((h) => (
                  <li key={h.id}>
                    <p className="text-xs text-gray-400">{fmt(h.createdAt)} · {h.adminName || '시스템'}</p>
                    <p>{h.fromLabel ? `${h.fromLabel} → ` : ''}<b>{h.toLabel}</b></p>
                    {h.memo && <p className="whitespace-pre-wrap text-gray-300">{h.memo}</p>}
                  </li>
                ))}
                {data!.history.length === 0 && <li className="text-gray-500">이력 없음 (예전 신고)</li>}
              </ol>
            </section>

            <section>
              <h3 className="mb-2 font-bold">같은 대상 이전 신고 {data!.previous.length}건</h3>
              {data!.previous.length === 0 ? <p className="text-gray-500">없음</p> : (
                <ul className="divide-y divide-gray-700 rounded border border-gray-700">
                  {data!.previous.map((p) => (
                    <li key={p.id} className="p-3">
                      <p className="flex flex-wrap items-center gap-2"><span className={`rounded px-1.5 text-xs font-bold ${statusMeta(p.status).className}`}>{p.statusLabel}</span><b>{p.reasonLabel}</b><span className="text-xs text-gray-400">{fmt(p.createdAt)}</span></p>
                      {p.description && <p className="mt-1 line-clamp-2 text-gray-300">{p.description}</p>}
                      {p.resolution && <p className="mt-1 text-xs text-gray-400">처리 메모: {p.resolution}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
