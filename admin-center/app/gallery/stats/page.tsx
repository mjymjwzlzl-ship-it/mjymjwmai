'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminApi, img } from '@/lib/works';

// 화보 관리 > 통계: 화보별 조회·좋아요·저장·캐릭터 채팅 이동·작품 상세 이동, 인기 태그
interface Item { id: string; title: string; thumbnail?: string | null; character?: { name: string } | null; work?: { title: string } | null; viewCount: number; likeCount: number; saveCount: number; chatClicks: number; workClicks: number; status: string }
const SORTS: [keyof Item, string][] = [['viewCount', '조회'], ['likeCount', '좋아요'], ['saveCount', '저장'], ['chatClicks', '채팅 이동'], ['workClicks', '작품 이동']];

export default function GalleryStatsPage() {
  const [d, setD] = useState<{ totals: Record<string, number>; items: Item[]; tags: { tag: string; items: number; views: number; likes: number; saves: number }[] } | null>(null);
  const [sort, setSort] = useState<keyof Item>('viewCount');
  useEffect(() => { adminApi<any>('/admin/gallery/stats').then(setD).catch((e) => alert(e.message)); }, []);
  const items = useMemo(() => [...(d?.items || [])].sort((a, b) => Number(b[sort]) - Number(a[sort])), [d, sort]);
  const card = (label: string, v?: number) => <div className="rounded-lg bg-gray-800 p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold">{(v || 0).toLocaleString()}</p></div>;
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">화보 통계</h1>
        {!d ? <p className="py-20 text-center text-gray-400">집계 중...</p> : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">{card('화보', d.totals.items)}{card('조회', d.totals.views)}{card('좋아요', d.totals.likes)}{card('저장', d.totals.saves)}{card('캐릭터 채팅 이동', d.totals.chatClicks)}{card('작품 상세 이동', d.totals.workClicks)}</div>
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_280px]">
              <section>
                <div className="mb-2 flex items-center gap-2"><h2 className="font-bold">화보별</h2><select value={sort} onChange={(e) => setSort(e.target.value as keyof Item)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm">{SORTS.map(([k, v]) => <option key={k} value={k}>{v}순</option>)}</select></div>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 text-left text-gray-400"><tr><th className="p-2">화보</th><th className="p-2">조회</th><th className="p-2">좋아요</th><th className="p-2">저장</th><th className="p-2">채팅 이동</th><th className="p-2">작품 이동</th></tr></thead>
                    <tbody>{items.map((i) => <tr key={i.id} className="border-t border-gray-700"><td className="p-2"><Link href={`/gallery/edit?id=${i.id}`} className="flex items-center gap-2 hover:underline"><img src={img(i.thumbnail)} alt="" className="h-10 w-7 rounded object-cover" /><span className="truncate">{i.character?.name ? `${i.character.name} · ` : ''}{i.title}</span></Link></td><td className="p-2">{i.viewCount}</td><td className="p-2">{i.likeCount}</td><td className="p-2">{i.saveCount}</td><td className="p-2">{i.chatClicks}</td><td className="p-2">{i.workClicks}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>
              <section className="rounded-lg bg-gray-800 p-4">
                <h2 className="mb-2 font-bold">인기 태그</h2>
                <ol className="space-y-1 text-sm">{d.tags.slice(0, 20).map((t, i) => <li key={t.tag} className="flex justify-between"><span>{i + 1}. #{t.tag}</span><span className="text-xs text-gray-400">화보 {t.items} · 조회 {t.views} · ♥ {t.likes}</span></li>)}{d.tags.length === 0 && <li className="text-gray-500">태그 없음</li>}</ol>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
