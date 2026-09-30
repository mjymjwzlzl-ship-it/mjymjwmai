'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 작품 공지 관리 (작품 관리 상세·연재 상태 공용). 사이트 작품 상세 [작품 공지] 탭에 목록으로 나간다.
// 게시판처럼 쌓인다: 새 공지를 써도 지난 공지는 남고, 수정·삭제는 한 건씩.
// isImportant = [중요] 배지, isPinned = 상단 고정. 휴재·판매중지 유형은 사이트 상태 배지를 누르면 이 공지로 이동한다.
export interface ComicNotice { id: string; type: string; title: string; content: string; isPinned: boolean; isImportant?: boolean; createdAt: string; updatedAt?: string }

export const NOTICE_TYPE_LABEL: Record<string, string> = { HIATUS: '휴재 안내', RESUME: '연재 재개', SCHEDULE: '일정 변경', SUSPENDED: '판매중지', GENERAL: '일반 공지' };

// datetime-local 값(한국 시간 브라우저 기준) <-> ISO
const toLocal = (value?: string | null) => {
  const d = value ? new Date(value) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const emptyForm = () => ({ type: 'GENERAL', title: '', content: '', createdAt: toLocal(), isImportant: false, isPinned: false });
const input = 'w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none';

export default function ComicNoticeManager({ comicId, onCount }: { comicId: string; onCount?: (count: number) => void }) {
  const [notices, setNotices] = useState<ComicNotice[]>([]);
  const [editing, setEditing] = useState<ComicNotice | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/admin/comics/${comicId}/notices`;
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async () => {
    const data = await adminApi<{ notices: ComicNotice[] }>(base);
    setNotices(data.notices || []);
    onCountRef.current?.((data.notices || []).length);
  }, [base]);
  useEffect(() => { load().catch((e) => alert(e.message)); }, [load]);

  const startNew = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true); };
  const startEdit = (notice: ComicNotice) => {
    setEditing(notice);
    setForm({ type: notice.type, title: notice.title, content: notice.content, createdAt: toLocal(notice.createdAt), isImportant: !!notice.isImportant, isPinned: notice.isPinned });
    setFormOpen(true);
  };
  const close = () => { setEditing(null); setFormOpen(false); };
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) { alert('제목과 내용을 입력하세요.'); return; }
    setBusy(true);
    try {
      const json = { ...form, createdAt: form.createdAt ? new Date(form.createdAt).toISOString() : undefined };
      await adminApi(editing ? `${base}/${editing.id}` : base, { method: editing ? 'PUT' : 'POST', json });
      close();
      await load();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const remove = async (notice: ComicNotice) => {
    if (!confirm(`'${notice.title}' 공지를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try { await adminApi(`${base}/${notice.id}`, { method: 'DELETE' }); if (editing?.id === notice.id) close(); await load(); } catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400">목록 순서: 상단 고정 → 작성일 최신순. 새 공지를 등록해도 지난 공지는 그대로 보관됩니다.</p>
        <button type="button" onClick={startNew} className="flex shrink-0 items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm font-bold hover:bg-purple-700"><Plus className="h-4 w-4" />새 공지</button>
      </div>

      {formOpen && (
        <div className="mb-4 space-y-3 rounded border border-purple-500/40 bg-gray-900/40 p-4">
          <p className="text-sm font-bold">{editing ? '공지 수정' : '새 공지 작성'}</p>
          <div className="grid gap-3 md:grid-cols-[180px_220px_1fr]">
            <label className="block text-sm"><span className="mb-1 block text-gray-300">공지 유형</span>
              <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(NOTICE_TYPE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm"><span className="mb-1 block text-gray-300">작성일</span>
              <input type="datetime-local" className={input} value={form.createdAt} onChange={(e) => setForm({ ...form, createdAt: e.target.value })} />
            </label>
            <div className="flex items-end gap-4 pb-2 text-sm">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isImportant} onChange={(e) => setForm({ ...form, isImportant: e.target.checked })} />중요 공지 <span className="rounded bg-red-600 px-1 text-[10px] font-bold">중요</span></label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />상단 고정 <Pin className="h-3.5 w-3.5" /></label>
            </div>
          </div>
          <label className="block text-sm"><span className="mb-1 block text-gray-300">공지 제목</span>
            <input className={input} value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예) 10월 2주 휴재 안내" />
          </label>
          <label className="block text-sm"><span className="mb-1 block text-gray-300">공지 내용</span>
            <textarea className={input} rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="사용자 화면에 줄바꿈 그대로 보입니다." />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="rounded bg-gray-700 px-3 py-1.5 text-sm">취소</button>
            <button type="button" onClick={() => void save()} disabled={busy} className="rounded bg-purple-600 px-4 py-1.5 text-sm font-bold disabled:opacity-50">{busy ? '저장 중...' : editing ? '수정 저장' : '등록'}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/40 text-left text-gray-400"><tr><th className="p-2">구분</th><th className="p-2">유형</th><th className="p-2">제목</th><th className="p-2">작성일</th><th className="p-2" /></tr></thead>
          <tbody>
            {notices.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">등록된 공지가 없습니다.</td></tr>}
            {notices.map((notice) => (
              <React.Fragment key={notice.id}>
                <tr className={`border-t border-gray-700 ${notice.isPinned ? 'bg-gray-700/30' : ''}`}>
                  <td className="whitespace-nowrap p-2">
                    <span className="flex items-center gap-1">
                      {notice.isPinned && <span className="flex items-center gap-0.5 rounded bg-gray-600 px-1 text-[10px]"><Pin className="h-3 w-3" />고정</span>}
                      {notice.isImportant && <span className="rounded bg-red-600 px-1 text-[10px] font-bold">중요</span>}
                      {!notice.isPinned && !notice.isImportant && <span className="text-xs text-gray-500">-</span>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-2"><span className="rounded bg-gray-700 px-1.5 text-xs">{NOTICE_TYPE_LABEL[notice.type] || notice.type}</span></td>
                  <td className="p-2"><button type="button" onClick={() => setOpenId(openId === notice.id ? null : notice.id)} className="text-left hover:underline">{notice.title}</button></td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-400">{new Date(notice.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="whitespace-nowrap p-2 text-right">
                    <button type="button" onClick={() => startEdit(notice)} className="mr-2 inline-flex items-center gap-0.5 text-xs text-blue-300"><Pencil className="h-3 w-3" />수정</button>
                    <button type="button" onClick={() => void remove(notice)} className="inline-flex items-center gap-0.5 text-xs text-red-300"><Trash2 className="h-3 w-3" />삭제</button>
                  </td>
                </tr>
                {openId === notice.id && <tr><td colSpan={5} className="whitespace-pre-line bg-gray-900/40 p-3 text-sm text-gray-300">{notice.content}</td></tr>}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
