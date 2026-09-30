'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 커뮤니티 관리 > 카테고리 관리: 게시판 분류 추가·이름 변경·사용 여부·관리자 전용(공지)·순서·삭제(글 없는 분류만)
interface Cat { id: string; key: string; name: string; description?: string | null; order: number; isActive: boolean; adminOnly: boolean; posts: number }

export default function CategoriesPage() {
  const [list, setList] = useState<Cat[]>([]);
  const [form, setForm] = useState({ key: '', name: '', adminOnly: false });
  const load = useCallback(async () => { try { setList((await adminApi<{ categories: Cat[] }>('/admin/community/categories')).categories); } catch (e: any) { alert(e.message); } }, []);
  useEffect(() => { void load(); }, [load]);
  const update = async (c: Cat, json: Partial<Cat>) => { try { await adminApi(`/admin/community/categories/${c.id}`, { method: 'PUT', json }); await load(); } catch (e: any) { alert(e.message); } };
  const move = async (i: number, dir: -1 | 1) => { const n = [...list]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setList(n); await adminApi('/admin/community/categories/reorder', { method: 'POST', json: { ids: n.map((c) => c.id) } }); };
  const add = async (e: React.FormEvent) => { e.preventDefault(); try { await adminApi('/admin/community/categories', { method: 'POST', json: form }); setForm({ key: '', name: '', adminOnly: false }); await load(); } catch (err: any) { alert(err.message); } };
  const remove = async (c: Cat) => { if (!confirm(`'${c.name}' 분류를 삭제할까요?`)) return; try { await adminApi(`/admin/community/categories/${c.id}`, { method: 'DELETE' }); await load(); } catch (e: any) { alert(e.message); } };
  const input = 'rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <p className="mt-1 text-sm text-gray-400">사이트 게시판 분류 탭입니다. 순서가 탭 순서이고, [사용]을 끄면 탭과 글쓰기에서 빠집니다(글은 남음). [관리자 전용]은 관리자만 글을 쓸 수 있고 공지로 고정됩니다.</p>
        <ul className="mt-4 space-y-2">
          {list.map((c, i) => (
            <li key={c.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${c.isActive ? 'border-gray-700 bg-gray-800' : 'border-gray-800 bg-gray-800/40 text-gray-500'}`}>
              <span className="w-24 text-xs text-gray-400">{c.key}</span>
              <input className={input} defaultValue={c.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.name) void update(c, { name: e.target.value }); }} aria-label="이름" />
              <span className="text-xs text-gray-400">글 {c.posts}</span>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={c.isActive} onChange={(e) => void update(c, { isActive: e.target.checked })} />사용</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={c.adminOnly} onChange={(e) => void update(c, { adminOnly: e.target.checked })} />관리자 전용</label>
              <span className="ml-auto flex gap-1">
                <button type="button" aria-label="위로" disabled={i === 0} onClick={() => void move(i, -1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" aria-label="아래로" disabled={i === list.length - 1} onClick={() => void move(i, 1)} className="rounded bg-gray-700 p-1 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" aria-label="삭제" onClick={() => void remove(c)} className="rounded p-1 text-red-300 hover:bg-gray-700"><Trash2 className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-800 p-3 text-sm">
          <input className={input} placeholder="영문 키 (예: fanart)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          <input className={input} placeholder="이름 (예: 팬아트)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={form.adminOnly} onChange={(e) => setForm({ ...form, adminOnly: e.target.checked })} />관리자 전용</label>
          <button type="submit" className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 font-bold"><Plus className="h-4 w-4" />추가</button>
        </form>
      </div>
    </div>
  );
}
