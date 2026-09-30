'use client';

import React, { useEffect, useState } from 'react';
import { adminApi, img } from '@/lib/works';
import PhotobookPicker, { type PickItem } from '@/components/PhotobookPicker';

// 화보 관리 > 추천·인기: [오늘의 추천]·[추천 화보]는 관리자가 직접 고르고, [인기 화보]는 조회 + 좋아요×5 + 저장×5 로 자동
export default function CurationPage() {
  const [today, setToday] = useState<PickItem[]>([]);
  const [picks, setPicks] = useState<PickItem[]>([]);
  const [popular, setPopular] = useState<(PickItem & { score: number; viewCount: number; likeCount: number })[]>([]);
  useEffect(() => { adminApi<any>('/admin/gallery/curation').then((d) => { setToday(d.today); setPicks(d.picks); setPopular(d.popular); }).catch((e) => alert(e.message)); }, []);
  const save = async (key: 'today' | 'picks', list: PickItem[]) => { try { await adminApi(`/admin/gallery/curation/${key}`, { method: 'PUT', json: { ids: list.map((i) => i.id) } }); alert('저장했습니다. 화보관 [추천] 탭에 바로 반영됩니다.'); } catch (e: any) { alert(e.message); } };
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold">추천·인기 화보</h1>
        {([['today', '오늘의 추천', today, setToday], ['picks', '추천 화보', picks, setPicks]] as const).map(([key, title, value, setValue]) => (
          <section key={key} className="rounded-lg bg-gray-800 p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">{title} <span className="text-sm text-gray-400">(최대 12개, 화보관 추천 탭)</span></h2><button type="button" onClick={() => void save(key, value)} className="rounded bg-purple-600 px-3 py-1.5 text-sm font-bold">저장</button></div>
            <PhotobookPicker value={value} onChange={setValue as any} max={12} />
          </section>
        ))}
        <section className="rounded-lg bg-gray-800 p-4">
          <h2 className="mb-2 font-bold">인기 화보 (자동)</h2>
          <ol className="space-y-1 text-sm">{popular.map((p, i) => <li key={p.id} className="flex items-center gap-2"><span className="w-5 text-gray-400">{i + 1}</span><img src={img(p.thumbnail)} alt="" className="h-8 w-6 rounded object-cover" /><span className="flex-1 truncate">{p.title}</span><span className="text-xs text-gray-400">점수 {p.score} · 조회 {p.viewCount} · ♥ {p.likeCount}</span></li>)}</ol>
        </section>
      </div>
    </div>
  );
}
