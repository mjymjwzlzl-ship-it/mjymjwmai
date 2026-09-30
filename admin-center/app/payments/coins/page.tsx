'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/works';

// 결제 관리 > 코인 가격: 사이트 코인 충전 화면과 결제 준비가 이 가격표를 쓴다
interface Pkg { id: string; coins: number; price: number; bonus: number; description?: string; popular?: boolean; active?: boolean }

export default function CoinPackagesPage() {
  const [list, setList] = useState<Pkg[]>([]);
  const [custom, setCustom] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { adminApi<{ packages: Pkg[]; custom: boolean }>('/admin/ops/coin-packages').then((d) => { setList(d.packages.map((p) => ({ ...p, active: p.active !== false }))); setCustom(d.custom); }).catch((e) => alert(e.message)); }, []);
  const set = (i: number, patch: Partial<Pkg>) => { setList(list.map((p, j) => (j === i ? { ...p, ...patch } : p))); setDirty(true); };
  const save = async () => {
    try { const d = await adminApi<{ packages: Pkg[] }>('/admin/ops/coin-packages', { method: 'PUT', json: { packages: list } }); setList(d.packages); setCustom(true); setDirty(false); alert('코인 가격표를 저장했습니다. 사이트 코인 충전 화면에 바로 반영됩니다.'); } catch (e: any) { alert(e.message); }
  };
  const input = 'w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm';
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">코인 가격</h1>
        <p className="mt-1 text-sm text-gray-400">코인 충전 상품(코인 수·가격·보너스)입니다. {custom ? '관리자가 저장한 가격표를 쓰는 중.' : '아직 기본 가격표를 쓰는 중 (저장하면 이 표가 기준이 됩니다).'} 판매 끄기는 삭제 대신 숨김. 첫 결제 50% 할인은 충전 화면에서 자동 적용됩니다.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">ID</th><th className="p-2">코인</th><th className="p-2">보너스</th><th className="p-2">가격(원)</th><th className="p-2">코인당</th><th className="p-2">설명</th><th className="p-2">추천</th><th className="p-2">판매</th><th className="p-2" /></tr></thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="p-2"><input className={input} value={p.id} onChange={(e) => set(i, { id: e.target.value })} /></td>
                  <td className="p-2"><input type="number" className={input} value={p.coins} onChange={(e) => set(i, { coins: Number(e.target.value) })} /></td>
                  <td className="p-2"><input type="number" className={input} value={p.bonus} onChange={(e) => set(i, { bonus: Number(e.target.value) })} /></td>
                  <td className="p-2"><input type="number" className={input} value={p.price} onChange={(e) => set(i, { price: Number(e.target.value) })} /></td>
                  <td className="p-2 text-xs text-gray-400">{p.coins + p.bonus > 0 ? `${Math.round(p.price / (p.coins + p.bonus)).toLocaleString()}원` : '-'}</td>
                  <td className="p-2"><input className={input} value={p.description || ''} onChange={(e) => set(i, { description: e.target.value })} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!p.popular} onChange={(e) => set(i, { popular: e.target.checked })} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={p.active !== false} onChange={(e) => set(i, { active: e.target.checked })} /></td>
                  <td className="p-2"><button type="button" aria-label="삭제" onClick={() => { setList(list.filter((_, j) => j !== i)); setDirty(true); }} className="rounded p-1 text-red-300 hover:bg-gray-700"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-between">
          <button type="button" onClick={() => { setList([...list, { id: `pack${list.length + 1}`, coins: 10, price: 2000, bonus: 0, active: true }]); setDirty(true); }} className="flex items-center gap-1 rounded bg-gray-700 px-3 py-1.5 text-sm"><Plus className="h-4 w-4" />상품 추가</button>
          <button type="button" disabled={!dirty} onClick={() => void save()} className="rounded bg-purple-600 px-4 py-1.5 text-sm font-bold disabled:opacity-40">저장</button>
        </div>
      </div>
    </div>
  );
}
