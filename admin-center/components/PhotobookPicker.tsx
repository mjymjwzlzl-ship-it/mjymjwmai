'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import { adminApi, img } from '@/lib/works';

// 화보 고르기 (시리즈·테마 화보전·추천 화보 공용): 고른 목록(순서·빼기) + 공개 화보 검색해서 추가
export interface PickItem { id: string; title: string; thumbnail?: string | null; character?: { name: string } | null; work?: { title: string } | null; status?: string }

export default function PhotobookPicker({ value, onChange, max = 60 }: { value: PickItem[]; onChange: (list: PickItem[]) => void; max?: number }) {
  const [all, setAll] = useState<PickItem[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { adminApi<{ items: PickItem[] }>('/admin/gallery/items?status=PUBLISHED').then((d) => setAll(d.items)).catch(() => {}); }, []);
  const candidates = useMemo(() => all.filter((i) => !value.some((v) => v.id === i.id) && (!q.trim() || [i.title, i.character?.name, i.work?.title].some((s) => String(s || '').includes(q.trim())))).slice(0, 40), [all, value, q]);
  const move = (i: number, d: -1 | 1) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ol className="max-h-80 space-y-1 overflow-y-auto">
        {value.length === 0 && <li className="rounded border border-dashed border-gray-700 p-4 text-center text-xs text-gray-500">고른 화보 없음</li>}
        {value.map((v, i) => (
          <li key={v.id} className="flex items-center gap-2 rounded bg-gray-900 p-1.5 text-xs">
            <span className="w-5 text-center text-gray-400">{i + 1}</span><img src={img(v.thumbnail)} alt="" className="h-10 w-8 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate">{v.character?.name ? `${v.character.name} · ` : ''}{v.title}</span>
            <button type="button" aria-label="위로" onClick={() => move(i, -1)} className="rounded bg-gray-700 p-0.5"><ArrowUp className="h-3 w-3" /></button>
            <button type="button" aria-label="아래로" onClick={() => move(i, 1)} className="rounded bg-gray-700 p-0.5"><ArrowDown className="h-3 w-3" /></button>
            <button type="button" aria-label="빼기" onClick={() => onChange(value.filter((x) => x.id !== v.id))} className="rounded bg-red-700 p-0.5"><X className="h-3 w-3" /></button>
          </li>
        ))}
      </ol>
      <div>
        <label className="mb-1 flex items-center gap-1 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-3.5 w-3.5 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공개 화보 검색해서 추가" className="w-full bg-transparent py-1 text-xs outline-none" /></label>
        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {candidates.map((c) => <li key={c.id}><button type="button" disabled={value.length >= max} onClick={() => onChange([...value, c])} className="flex w-full items-center gap-2 rounded p-1 text-left text-xs hover:bg-gray-800 disabled:opacity-40"><Plus className="h-3 w-3 text-purple-300" /><img src={img(c.thumbnail)} alt="" className="h-8 w-6 rounded object-cover" /><span className="truncate">{c.character?.name ? `${c.character.name} · ` : ''}{c.title}{c.work ? ` 《${c.work.title}》` : ''}</span></button></li>)}
        </ul>
      </div>
    </div>
  );
}
