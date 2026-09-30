'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { adminApi, apiBase, authHeaders, img } from '@/lib/works';
import PhotobookPicker, { type PickItem } from '@/components/PhotobookPicker';

// 화보 관리 > 테마 화보전: 할로윈·크리스마스·여름 휴가 등, 기간 동안 화보관 [추천] 맨 위에 노출. [이벤트로도 등록]하면 이벤트 관리에 같이 생긴다
interface Theme { id: string; title: string; description?: string | null; bannerUrl?: string | null; itemIds: string[]; startAt?: string | null; endAt?: string | null; isActive: boolean; eventId?: string | null; live: boolean }
const toLocal = (v?: string | null) => { if (!v) return ''; const d = new Date(v); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function ThemesPage() {
  const [list, setList] = useState<Theme[]>([]);
  const [all, setAll] = useState<PickItem[]>([]);
  const [edit, setEdit] = useState<Theme | 'new' | null>(null);
  const load = useCallback(async () => { try { setList((await adminApi<{ themes: Theme[] }>('/admin/gallery/themes')).themes); } catch (e: any) { alert(e.message); } }, []);
  useEffect(() => { void load(); adminApi<{ items: PickItem[] }>('/admin/gallery/items').then((d) => setAll(d.items)).catch(() => {}); }, [load]);
  const remove = async (t: Theme) => { if (!confirm(`'${t.title}' 테마를 삭제할까요?${t.eventId ? '\n(같이 만든 이벤트는 이벤트 관리에서 따로 지우세요)' : ''}`)) return; await adminApi(`/admin/gallery/themes/${t.id}`, { method: 'DELETE' }); await load(); };
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">테마 화보전</h1><button type="button" onClick={() => setEdit('new')} className="flex items-center gap-1 rounded bg-purple-600 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" />테마 추가</button></div>
        <p className="mt-1 text-sm text-gray-400">기간 안에 있는 테마는 사용자 화보관 [추천] 탭 맨 위에 배너와 화보로 나옵니다.</p>
        <ul className="mt-4 space-y-2">
          {list.length === 0 && <li className="rounded border border-dashed border-gray-700 p-8 text-center text-gray-500">테마가 없습니다.</li>}
          {list.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-800 p-3">
              {t.bannerUrl ? <img src={img(t.bannerUrl)} alt="" className="h-14 w-40 rounded object-cover" /> : <span className="flex h-14 w-40 items-center justify-center rounded bg-gray-700 text-xs text-gray-400">배너 없음</span>}
              <span className="min-w-0 flex-1"><b>{t.title}</b> <span className={`ml-1 rounded px-1.5 text-xs ${t.live ? 'bg-green-600/40' : 'bg-gray-700'}`}>{t.live ? '노출 중' : '기간 밖·꺼짐'}</span>{t.eventId && <span className="ml-1 rounded bg-sky-600/40 px-1.5 text-xs">이벤트 연결</span>}<span className="block text-xs text-gray-400">화보 {t.itemIds.length}개 · {t.startAt ? new Date(t.startAt).toLocaleDateString('ko-KR') : '바로'} ~ {t.endAt ? new Date(t.endAt).toLocaleDateString('ko-KR') : '계속'}</span></span>
              <button type="button" onClick={() => setEdit(t)} className="rounded bg-gray-700 px-2 py-1 text-xs">수정</button>
              <button type="button" onClick={() => void remove(t)} className="rounded p-1 text-red-300" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </div>
      {edit && <ThemeForm theme={edit === 'new' ? null : edit} all={all} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); await load(); }} />}
    </div>
  );
}

function ThemeForm({ theme, all, onClose, onSaved }: { theme: Theme | null; all: PickItem[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [f, setF] = useState({ title: theme?.title || '', description: theme?.description || '', startAt: toLocal(theme?.startAt), endAt: toLocal(theme?.endAt), isActive: theme?.isActive ?? true, createEvent: false });
  const [items, setItems] = useState<PickItem[]>((theme?.itemIds || []).map((id) => all.find((a) => a.id === id)).filter(Boolean) as PickItem[]);
  const [banner, setBanner] = useState<File | null>(null);
  const save = async () => {
    if (!f.title.trim()) { alert('테마명을 입력하세요.'); return; }
    if (f.createEvent && !banner && !theme?.bannerUrl) { alert('이벤트로도 등록하려면 배너 이미지가 필요합니다.'); return; }
    const body = new FormData();
    body.append('title', f.title); body.append('description', f.description); body.append('itemIds', JSON.stringify(items.map((i) => i.id)));
    body.append('startAt', f.startAt ? new Date(f.startAt).toISOString() : ''); body.append('endAt', f.endAt ? new Date(f.endAt).toISOString() : ''); body.append('isActive', String(f.isActive)); body.append('createEvent', String(f.createEvent));
    if (banner) body.append('banner', banner);
    const r = await fetch(`${apiBase()}/admin/gallery/themes${theme ? `/${theme.id}` : ''}`, { method: theme ? 'PUT' : 'POST', headers: authHeaders(), body });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d.message || '저장하지 못했습니다.'); return; }
    await onSaved();
  };
  const input = 'w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="테마 화보전">
      <div className="max-h-[92vh] w-full max-w-3xl space-y-3 overflow-y-auto rounded-xl bg-gray-800 p-6 text-sm">
        <h2 className="text-lg font-bold">{theme ? '테마 수정' : '테마 추가'}</h2>
        <label className="block">테마명 *<input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="예) 할로윈 화보전" /></label>
        <label className="block">설명<input className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-gray-600 p-3 text-gray-300"><ImagePlus className="h-4 w-4" />{banner ? banner.name : theme?.bannerUrl ? '배너 바꾸기' : '배너 이미지 (가로형)'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => setBanner(e.target.files?.[0] || null)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">시작<input type="datetime-local" className={input} value={f.startAt} onChange={(e) => setF({ ...f, startAt: e.target.value })} /></label>
          <label className="block">종료<input type="datetime-local" className={input} value={f.endAt} onChange={(e) => setF({ ...f, endAt: e.target.value })} /></label>
        </div>
        <div><p className="mb-1">포함 화보 (순서대로)</p><PhotobookPicker value={items} onChange={setItems} /></div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />노출 켜기</label>
          {!theme?.eventId && !theme && <label className="flex items-center gap-1"><input type="checkbox" checked={f.createEvent} onChange={(e) => setF({ ...f, createEvent: e.target.checked })} />이벤트 관리에도 등록 (이벤트 페이지 → 이 화보전)</label>}
          {theme?.eventId && <span className="text-xs text-sky-300">이벤트와 연결됨: 제목·기간·배너를 바꾸면 이벤트에도 반영</span>}
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded bg-gray-700 px-4 py-2">취소</button><button type="button" onClick={() => void save()} className="rounded bg-purple-600 px-4 py-2 font-bold">저장</button></div>
      </div>
    </div>
  );
}
