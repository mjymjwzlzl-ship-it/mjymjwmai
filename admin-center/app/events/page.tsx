'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';

// 이벤트 관리: 사이트 /events 페이지와 홈 이벤트 코너에 나가는 이벤트를 등록·수정한다.
// 상태(진행 중·예정·종료)는 기간으로 자동 계산된다.

type EventStatus = 'ONGOING' | 'UPCOMING' | 'ENDED';
interface EventItem {
  id: string;
  title: string;
  summary?: string | null;
  thumbnailUrl: string;
  link: string;
  startAt: string;
  endAt?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  status: EventStatus;
}

const STATUS_LABEL: Record<EventStatus, string> = { ONGOING: '진행 중', UPCOMING: '예정', ENDED: '종료' };
const STATUS_CLASS: Record<EventStatus, string> = {
  ONGOING: 'bg-green-500/20 text-green-300',
  UPCOMING: 'bg-blue-500/20 text-blue-300',
  ENDED: 'bg-gray-600/40 text-gray-400',
};

const apiBase = () => {
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) return 'http://localhost:8000/api';
  return 'https://api.arata.co.kr/api';
};
const siteBase = () => (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:8000' : 'https://arata.co.kr');
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` });

// datetime-local 입력값 <-> ISO (한국 시간 기준으로 보이게)
const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '상시');

const emptyForm = { title: '', summary: '', link: '', startAt: '', endAt: '', isActive: true, isFeatured: false, order: 0, thumbnailUrl: '' };

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase()}/admin/events`, { headers: authHeader() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '불러오기 실패');
      setEvents(data.events || []);
    } catch (error: any) {
      alert(error.message || '이벤트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openForm = (event: EventItem | null) => {
    setEditing(event);
    setFile(null);
    setForm(event ? {
      title: event.title,
      summary: event.summary || '',
      link: event.link,
      startAt: toLocalInput(event.startAt),
      endAt: toLocalInput(event.endAt),
      isActive: event.isActive,
      isFeatured: event.isFeatured,
      order: event.order,
      thumbnailUrl: event.thumbnailUrl,
    } : { ...emptyForm, startAt: toLocalInput(new Date().toISOString()) });
    setPreview(event ? (event.thumbnailUrl.startsWith('/') ? `${siteBase()}${event.thumbnailUrl}` : event.thumbnailUrl) : '');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !file && !form.thumbnailUrl) { alert('썸네일 이미지를 올려 주세요.'); return; }
    setSaving(true);
    try {
      const body = new FormData();
      body.append('title', form.title);
      body.append('summary', form.summary);
      body.append('link', form.link);
      body.append('startAt', new Date(form.startAt).toISOString());
      body.append('endAt', form.endAt ? new Date(form.endAt).toISOString() : '');
      body.append('isActive', String(form.isActive));
      body.append('isFeatured', String(form.isFeatured));
      body.append('order', String(form.order));
      if (form.thumbnailUrl && !file) body.append('thumbnailUrl', form.thumbnailUrl);
      if (file) body.append('thumbnail', file);
      const response = await fetch(`${apiBase()}/admin/events${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: authHeader(),
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '저장 실패');
      setOpen(false);
      await load();
    } catch (error: any) {
      alert(error.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (event: EventItem) => {
    if (!confirm(`'${event.title}' 이벤트를 삭제할까요? 되돌릴 수 없습니다. (숨기기만 하려면 '노출'을 끄세요)`)) return;
    const response = await fetch(`${apiBase()}/admin/events/${event.id}`, { method: 'DELETE', headers: authHeader() });
    if (!response.ok) { alert('삭제하지 못했습니다.'); return; }
    await load();
  };

  const input = 'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6" />이벤트 관리</h1>
            <p className="mt-1 text-sm text-gray-400">사이트 [이벤트] 페이지와 홈 하단 이벤트 코너에 노출됩니다. 상태는 기간으로 자동 계산됩니다. &lsquo;홈 우선 노출&rsquo;을 켠 진행 중 이벤트가 홈에 먼저 나옵니다.</p>
          </div>
          <button type="button" onClick={() => openForm(null)} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 font-bold hover:bg-purple-700">
            <Plus className="h-4 w-4" />새 이벤트
          </button>
        </div>

        {loading ? (
          <p className="py-20 text-center text-gray-400">불러오는 중...</p>
        ) : events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-700 py-20 text-center text-gray-400">등록된 이벤트가 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400">
                <tr>
                  <th className="p-3">이벤트</th>
                  <th className="p-3">기간</th>
                  <th className="p-3">상태</th>
                  <th className="p-3">노출</th>
                  <th className="p-3">순서</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-gray-700">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={event.thumbnailUrl.startsWith('/') ? `${siteBase()}${event.thumbnailUrl}` : event.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                        <div>
                          <p className="font-bold">{event.title}</p>
                          <p className="text-xs text-gray-400">{event.link}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-300">{formatDate(event.startAt)} ~ {event.endAt ? formatDate(event.endAt) : '상시'}</td>
                    <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS_CLASS[event.status]}`}>{STATUS_LABEL[event.status]}</span></td>
                    <td className="p-3 text-xs text-gray-300">{event.isActive ? '노출' : '숨김'}{event.isFeatured ? ' · 홈 우선' : ''}</td>
                    <td className="p-3 text-gray-300">{event.order}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openForm(event)} className="rounded p-1.5 text-gray-300 hover:bg-gray-700" aria-label="수정"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void remove(event)} className="rounded p-1.5 text-red-400 hover:bg-gray-700" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? '이벤트 수정' : '새 이벤트'}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm">이벤트명 *
                <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </label>
              <label className="block text-sm">한 줄 설명
                <input className={input} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </label>
              <label className="block text-sm">이동 링크 * <span className="text-gray-400">(예: /attendance, /subscribe)</span>
                <input className={input} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">시작 *
                  <input type="datetime-local" className={input} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required />
                </label>
                <label className="block text-sm">종료 <span className="text-gray-400">(비우면 상시)</span>
                  <input type="datetime-local" className={input} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                </label>
              </div>
              <div className="text-sm">
                썸네일 * <span className="text-gray-400">(16:9 권장, webp 로 자동 변환)</span>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-600 py-4 text-gray-400 hover:border-gray-500">
                  <Upload className="h-4 w-4" />이미지 선택
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const next = e.target.files?.[0];
                      if (!next) return;
                      setFile(next);
                      setPreview(URL.createObjectURL(next));
                    }}
                  />
                </label>
                {preview && <img src={preview} alt="" className="mt-2 aspect-video w-full rounded-lg object-cover" />}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />사이트에 노출</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />홈 우선 노출</label>
                <label className="flex items-center gap-2">순서 <input type="number" className="w-20 rounded border border-gray-600 bg-gray-700 px-2 py-1" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-gray-700 px-4 py-2">취소</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
