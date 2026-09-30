'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 화보 관리 > 태그: 사용 수, 추가(추천 태그 사전), 이름 바꾸기(화보에도 반영), 삭제(화보에서도 뺌). 사용자 검색·태그 필터와 연동
interface Tag { name: string; count: number; inDictionary: boolean }

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const load = useCallback(async () => { try { setTags((await adminApi<{ tags: Tag[] }>('/admin/gallery/tags')).tags); } catch (e: any) { alert(e.message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async (e: React.FormEvent) => { e.preventDefault(); try { await adminApi('/admin/gallery/tags', { method: 'POST', json: { name } }); setName(''); await load(); } catch (err: any) { alert(err.message); } };
  const rename = async (t: Tag) => { const to = prompt(`'${t.name}' 태그의 새 이름 (화보 ${t.count}개에 함께 반영)`, t.name); if (!to || to === t.name) return; try { await adminApi(`/admin/gallery/tags/${encodeURIComponent(t.name)}`, { method: 'PUT', json: { name: to } }); await load(); } catch (e: any) { alert(e.message); } };
  const remove = async (t: Tag) => { if (!confirm(`'${t.name}' 태그를 삭제할까요? 화보 ${t.count}개에서도 빠집니다.`)) return; await adminApi(`/admin/gallery/tags/${encodeURIComponent(t.name)}`, { method: 'DELETE' }); await load(); };
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">화보 태그</h1>
        <p className="mt-1 text-sm text-gray-400">사전에 넣은 태그는 화보 등록·사용자 화보 만들기에서 추천 태그로 보입니다. 사용 중인 태그는 사용자 화보관 태그 목록과 검색에 나옵니다.</p>
        <form onSubmit={add} className="mt-4 flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 교복" className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm" /><button type="submit" className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm font-bold"><Plus className="h-4 w-4" />추가</button></form>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {tags.map((t) => (
            <li key={t.name} className="flex items-center gap-2 rounded bg-gray-800 px-3 py-2 text-sm">
              <button type="button" onClick={() => void rename(t)} className="font-bold hover:underline">#{t.name}</button>
              <span className="text-xs text-gray-400">화보 {t.count}</span>{!t.inDictionary && <span className="text-[10px] text-gray-500">(사전 밖)</span>}
              <button type="button" onClick={() => void remove(t)} className="ml-auto text-red-300" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {tags.length === 0 && <li className="text-gray-500">태그가 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}
