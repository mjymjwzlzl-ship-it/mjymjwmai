'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ListChecks, Save } from 'lucide-react';

// 작품 연재 상태·공지. 사이트 작품 상세의 상태 배지와 [공지사항] 탭에 그대로 나간다.
// 판매중지(SUSPENDED): 새 대여·소장 불가, 보유 회차·무료 회차는 계속 열람.

type Status = 'ONGOING' | 'HIATUS' | 'COMPLETED' | 'SUSPENDED' | 'HIDDEN';
interface Row { id: string; title: string; authorName?: string | null; rating: string; status: Status; statusNotice?: string | null; resumeAt?: string | null; noticeCount?: number }
interface Notice { id: string; type: string; title: string; content: string; isPinned: boolean; createdAt: string }
const NOTICE_LABEL: Record<string, string> = { HIATUS: '휴재 안내', RESUME: '연재 재개', SCHEDULE: '업로드 일정 변경', SUSPENDED: '판매중지 안내', GENERAL: '공지' };

const LABEL: Record<Status, string> = { ONGOING: '연재중', HIATUS: '휴재중', COMPLETED: '완결', SUSPENDED: '판매중지', HIDDEN: '숨김' };
const apiBase = () => (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000/api' : 'https://api.arata.co.kr/api');
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`, 'Content-Type': 'application/json' });
const toDateInput = (value?: string | null) => (value ? new Date(new Date(value).getTime() + 9 * 3600e3).toISOString().slice(0, 10) : '');

function ComicRow({ row, onSaved, onNotices }: { row: Row; onSaved: (row: Row) => void; onNotices: (row: Row) => void }) {
  const [status, setStatus] = useState<Status>(row.status);
  const [notice, setNotice] = useState(row.statusNotice || '');
  const [resumeAt, setResumeAt] = useState(toDateInput(row.resumeAt));
  const [saving, setSaving] = useState(false);
  const changed = status !== row.status || notice !== (row.statusNotice || '') || resumeAt !== toDateInput(row.resumeAt);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${apiBase()}/admin/comic-status/${row.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ status, statusNotice: notice, resumeAt: status === 'HIATUS' && resumeAt ? `${resumeAt}T00:00:00+09:00` : null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '저장 실패');
      onSaved({ ...row, ...data.comic, noticeCount: (row.noticeCount || 0) + (data.notice ? 1 : 0) });
      if (data.notice) alert(`'${data.notice.title}' 공지를 [중요]로 자동 등록했습니다. 필요하면 공지 관리에서 고치세요.`);
    } catch (error: any) {
      alert(error.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-gray-700 align-top">
      <td className="p-3">
        <p className="font-bold">{row.title}</p>
        <p className="text-xs text-gray-400">{row.authorName || ''}{['19', 'ADULT'].includes(row.rating) ? ' · 19+' : ''}</p>
      </td>
      <td className="p-3">
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm">
          {(Object.keys(LABEL) as Status[]).map((key) => <option key={key} value={key}>{LABEL[key]}</option>)}
        </select>
        {status === 'HIATUS' && (
          <label className="mt-2 block text-xs text-gray-400">재개 예정일
            <input type="date" value={resumeAt} onChange={(e) => setResumeAt(e.target.value)} className="mt-1 block rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white" />
          </label>
        )}
      </td>
      <td className="p-3">
        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          rows={2}
          placeholder={status === 'HIATUS' ? '예) 작가 사정으로 2주간 휴재합니다. (상태 변경 시 자동 공지에 덧붙음)' : status === 'SUSPENDED' ? '예) 계약 종료로 판매가 중지되었습니다. (자동 공지에 덧붙음)' : '상태를 휴재·판매중지로 바꿀 때 자동 공지에 덧붙일 문구 (선택)'}
          className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm"
        />
      </td>
      <td className="space-y-2 p-3">
        <button type="button" onClick={() => onNotices(row)} className="block w-full rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600">공지 {row.noticeCount || 0}</button>
        <button type="button" onClick={() => void save()} disabled={!changed || saving} className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm font-bold disabled:bg-gray-700 disabled:text-gray-500">
          <Save className="h-4 w-4" />{saving ? '저장 중' : '저장'}
        </button>
      </td>
    </tr>
  );
}

export default function ComicStatusPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const [noticeRow, setNoticeRow] = useState<Row | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/admin/comic-status`, { headers: headers() })
      .then((response) => response.json().then((data) => { if (!response.ok) throw new Error(data.message); return data; }))
      .then((data) => setRows(data.comics || []))
      .catch((error) => alert(error.message || '불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => rows.filter((row) => (filter === 'ALL' || row.status === filter) && (!query.trim() || row.title.includes(query.trim()))), [rows, filter, query]);

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ListChecks className="h-6 w-6" />연재 상태·공지</h1>
        <p className="mt-1 text-sm text-gray-400">작품 상세의 상태 배지([연재중]/[휴재중]/[완결]/[판매중지])와 [공지사항] 탭에 반영됩니다. 판매중지는 새 대여·소장만 막고, 이미 산 회차와 무료 회차는 계속 볼 수 있습니다.</p>
        <div className="my-4 flex flex-wrap gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="작품명 검색" className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm" />
          {(['ALL', 'ONGOING', 'HIATUS', 'COMPLETED', 'SUSPENDED', 'HIDDEN'] as const).map((key) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full px-3 py-1 text-sm ${filter === key ? 'bg-purple-600' : 'bg-gray-800 text-gray-300'}`}>
              {key === 'ALL' ? '전체' : LABEL[key]} ({key === 'ALL' ? rows.length : rows.filter((row) => row.status === key).length})
            </button>
          ))}
        </div>
        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
          <div className="overflow-hidden rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-3">작품</th><th className="p-3">연재 상태</th><th className="w-2/5 p-3">상태 안내 문구</th><th className="p-3" /></tr></thead>
              <tbody>
                {visible.map((row) => <ComicRow key={row.id} row={row} onNotices={setNoticeRow} onSaved={(saved) => setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {noticeRow && (
        <NoticeManager
          row={noticeRow}
          onClose={(count) => { setRows((prev) => prev.map((r) => (r.id === noticeRow.id ? { ...r, noticeCount: count } : r))); setNoticeRow(null); }}
        />
      )}
    </div>
  );
}

// 작품 공지 관리: 사이트 작품 상세 [작품 공지] 탭. [중요]는 상단 고정.
function NoticeManager({ row, onClose }: { row: Row; onClose: (count: number) => void }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ type: 'GENERAL', title: '', content: '', isPinned: false });
  const base = `${apiBase()}/admin/comics/${row.id}/notices`;
  const load = () => fetch(base, { headers: headers() }).then((r) => r.json()).then((d) => setNotices(d.notices || []));
  useEffect(() => { void load(); }, []);
  const reset = () => { setEditing(null); setForm({ type: 'GENERAL', title: '', content: '', isPinned: false }); };
  const save = async () => {
    const response = await fetch(editing ? `${base}/${editing.id}` : base, { method: editing ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) { alert(data.message || '저장 실패'); return; }
    reset();
    await load();
  };
  const remove = async (notice: Notice) => {
    if (!confirm(`'${notice.title}' 공지를 삭제할까요?`)) return;
    await fetch(`${base}/${notice.id}`, { method: 'DELETE', headers: headers() });
    await load();
  };
  const input = 'w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-white';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">작품 공지 · {row.title}</h2>
          <button type="button" onClick={() => onClose(notices.length)} className="text-gray-400">닫기</button>
        </div>
        <ul className="mb-5 divide-y divide-gray-700 rounded border border-gray-700">
          {notices.length === 0 && <li className="p-3 text-sm text-gray-400">등록된 공지가 없습니다.</li>}
          {notices.map((notice) => (
            <li key={notice.id} className="flex items-center gap-2 p-3 text-sm">
              {notice.isPinned && <span className="rounded bg-red-600 px-1.5 text-xs font-bold">중요</span>}
              <span className="rounded bg-gray-700 px-1.5 text-xs">{NOTICE_LABEL[notice.type] || notice.type}</span>
              <span className="min-w-0 flex-1 truncate">{notice.title}</span>
              <span className="text-xs text-gray-400">{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
              <button type="button" className="text-xs text-blue-300" onClick={() => { setEditing(notice); setForm({ type: notice.type, title: notice.title, content: notice.content, isPinned: notice.isPinned }); }}>수정</button>
              <button type="button" className="text-xs text-red-300" onClick={() => void remove(notice)}>삭제</button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 rounded border border-gray-700 p-3">
          <p className="text-sm font-bold">{editing ? '공지 수정' : '새 공지'}</p>
          <div className="flex gap-2">
            <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(NOTICE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-sm"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />중요(상단 고정)</label>
          </div>
          <input className={input} placeholder="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={input} rows={4} placeholder="내용" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div className="flex justify-end gap-2">
            {editing && <button type="button" onClick={reset} className="rounded bg-gray-700 px-3 py-1.5 text-sm">취소</button>}
            <button type="button" onClick={() => void save()} className="rounded bg-purple-600 px-3 py-1.5 text-sm font-bold">{editing ? '수정 저장' : '등록'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
