'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/works';
import PhotobookPicker, { type PickItem } from '@/components/PhotobookPicker';

// 화보 관리 > 시리즈: 같은 캐릭터 화보를 화보집처럼 (예: 은서율 - 성율 마법학교 화보집 → 봄 교복 / 여름 축제 / 겨울 야경)
interface Series { id: string; title: string; description?: string | null; characterName?: string | null; isActive: boolean; items: PickItem[] }

export default function SeriesPage() {
  const [list, setList] = useState<Series[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<PickItem[]>([]);
  const [form, setForm] = useState({ title: '', characterName: '', description: '' });
  const load = useCallback(async () => { try { setList((await adminApi<{ series: Series[] }>('/admin/gallery/series')).series); } catch (e: any) { alert(e.message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await adminApi('/admin/gallery/series', { method: 'POST', json: form }); setForm({ title: '', characterName: '', description: '' }); await load(); } catch (err: any) { alert(err.message); } };
  const saveItems = async (s: Series) => { try { await adminApi(`/admin/gallery/series/${s.id}`, { method: 'PUT', json: { itemIds: draft.map((d) => d.id) } }); setOpen(null); await load(); } catch (e: any) { alert(e.message); } };
  const update = async (s: Series, json: any) => { try { await adminApi(`/admin/gallery/series/${s.id}`, { method: 'PUT', json }); await load(); } catch (e: any) { alert(e.message); } };
  const remove = async (s: Series) => { if (!confirm(`'${s.title}' 시리즈를 삭제할까요? (화보는 남고 묶음만 풀립니다)`)) return; await adminApi(`/admin/gallery/series/${s.id}`, { method: 'DELETE' }); await load(); };
  const input = 'rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">화보 시리즈</h1>
        <p className="mt-1 text-sm text-gray-400">여러 화보를 하나의 화보집으로 묶습니다. 사용자 화보 상세에 [같은 시리즈]가 순서대로 나오고, 시리즈명을 누르면 모아 볼 수 있습니다.</p>
        <form onSubmit={create} className="mt-4 flex flex-wrap gap-2 rounded-lg bg-gray-800 p-3">
          <input className={input} placeholder="시리즈명 (예: 성율 마법학교 화보집)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={input} placeholder="캐릭터명 (예: 은서율)" value={form.characterName} onChange={(e) => setForm({ ...form, characterName: e.target.value })} />
          <input className={`${input} flex-1`} placeholder="설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm font-bold"><Plus className="h-4 w-4" />시리즈 추가</button>
        </form>
        <ul className="mt-4 space-y-3">
          {list.length === 0 && <li className="rounded border border-dashed border-gray-700 p-8 text-center text-gray-500">시리즈가 없습니다.</li>}
          {list.map((s) => (
            <li key={s.id} className="rounded-lg bg-gray-800 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${input} font-bold`} defaultValue={s.title} onBlur={(e) => e.target.value !== s.title && void update(s, { title: e.target.value })} aria-label="시리즈명" />
                <span className="text-sm text-gray-400">{s.characterName || ''} · 화보 {s.items.length}</span>
                <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" checked={s.isActive} onChange={(e) => void update(s, { isActive: e.target.checked })} />사용</label>
                <button type="button" onClick={() => { setOpen(open === s.id ? null : s.id); setDraft(s.items); }} className="rounded bg-gray-700 px-2 py-1 text-xs">{open === s.id ? '닫기' : '포함 화보·순서'}</button>
                <button type="button" onClick={() => void remove(s)} className="rounded p-1 text-red-300" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
              </div>
              {open === s.id ? (
                <div className="mt-3"><PhotobookPicker value={draft} onChange={setDraft} /><div className="mt-2 text-right"><button type="button" onClick={() => void saveItems(s)} className="rounded bg-purple-600 px-3 py-1.5 text-sm font-bold">저장</button></div></div>
              ) : s.items.length > 0 && <p className="mt-2 text-xs text-gray-400">{s.items.map((i, n) => `${n + 1}. ${i.title}`).join('  ')}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
