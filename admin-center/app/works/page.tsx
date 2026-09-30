'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Library, Search } from 'lucide-react';
import { STATUS_LABEL, TYPE_LABEL, apiBase, authHeaders, img } from '@/lib/works';

// 작품 관리 목록: 작품을 골라 상세(정보·판매·회차·예약 공개)로 들어간다.
interface Work {
  id: string; title: string; authorName?: string | null; thumbnail?: string | null; rating: string; status: string; type: 'webtoon' | 'book' | 'novel';
  isPublished: boolean; paidStartEpisode: number; episodeCoinPrice: number; viewCount: number; createdAt: string; episodes: number; lastEpisodeAt?: string | null;
  badges: { up: boolean; new: boolean };
}

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState('');

  useEffect(() => {
    fetch(`${apiBase()}/admin/works`, { headers: authHeaders() })
      .then((r) => r.json().then((d) => { if (!r.ok) throw new Error(d.message); return d; }))
      .then((d) => setWorks(d.works || []))
      .catch((e) => alert(e.message || '불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => works.filter((w) =>
    (!q || w.title.includes(q) || (w.authorName || '').includes(q)) && (!type || w.type === type) && (!status || w.status === status) &&
    (!rating || (rating === 'adult' ? ['19', 'ADULT'].includes(w.rating) : !['19', 'ADULT'].includes(w.rating)))), [works, q, type, status, rating]);
  const select = 'rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';

  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Library className="h-6 w-6" />작품 관리</h1>
        <p className="mt-1 text-sm text-gray-400">작품을 눌러 정보·판매 설정·회차(등록·공개 일시·예약 공개)를 조정합니다. 배지: <b className="text-red-400">UP</b> 오늘 공개된 회차 · <b className="text-green-400">NEW</b> 런칭 7일 이내.</p>
        <div className="my-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded border border-gray-600 bg-gray-800 px-2"><Search className="h-4 w-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·작가" className="bg-transparent py-1.5 text-sm outline-none" /></label>
          <select className={select} value={type} onChange={(e) => setType(e.target.value)}><option value="">모든 유형</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={select} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">모든 상태</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={select} value={rating} onChange={(e) => setRating(e.target.value)}><option value="">전체 연령</option><option value="general">일반</option><option value="adult">19+</option></select>
          <span className="text-sm text-gray-400">{list.length}개</span>
        </div>
        {loading ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-left text-gray-400">
                <tr><th className="p-3">작품</th><th className="p-3">유형</th><th className="p-3">상태</th><th className="p-3">회차</th><th className="p-3">판매</th><th className="p-3">런칭</th><th className="p-3">최근 공개</th><th className="p-3">조회</th></tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="border-t border-gray-700 hover:bg-gray-800/60">
                    <td className="p-3">
                      <Link href={`/works/${w.id}`} className="flex items-center gap-3">
                        <img src={img(w.thumbnail)} alt="" className="h-14 w-10 shrink-0 rounded bg-gray-700 object-cover" />
                        <span>
                          <span className="flex items-center gap-1 font-bold hover:underline">
                            {w.title}
                            {w.badges.up && <span className="rounded bg-red-600 px-1 text-[10px]">UP</span>}
                            {w.badges.new && <span className="rounded bg-green-500 px-1 text-[10px] text-black">NEW</span>}
                            {!w.isPublished && <span className="rounded bg-gray-600 px-1 text-[10px]">미공개</span>}
                            {['19', 'ADULT'].includes(w.rating) && <span className="rounded bg-red-800 px-1 text-[10px]">19</span>}
                          </span>
                          <span className="text-xs text-gray-400">{w.authorName || '-'}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="p-3">{TYPE_LABEL[w.type]}</td>
                    <td className="p-3">{STATUS_LABEL[w.status] || w.status}</td>
                    <td className="p-3">{w.episodes}</td>
                    <td className="p-3 text-xs">{w.paidStartEpisode === 0 ? '전편 무료' : `${w.paidStartEpisode}화부터 ${w.episodeCoinPrice}코인`}</td>
                    <td className="p-3 text-xs">{new Date(w.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="p-3 text-xs">{w.lastEpisodeAt ? new Date(w.lastEpisodeAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="p-3">{w.viewCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
