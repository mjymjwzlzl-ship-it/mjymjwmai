'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pin } from 'lucide-react';
import { adminApi, siteBase } from '@/lib/works';

// 커뮤니티 관리 > 게시판 관리: 분류별 글 수, 글·댓글 상태, 처리할 신고, 고정(공지·중요) 글
interface Overview { categories: { id: string; key: string; name: string; isActive: boolean; adminOnly: boolean; posts: number }[]; postStatus: Record<string, number>; commentStatus: Record<string, number>; pinned: { id: string; title: string; noticeType?: string | null; pinnedUntil?: string | null }[]; openReports: number }

export default function CommunityOverview() {
  const [d, setD] = useState<Overview | null>(null);
  useEffect(() => { adminApi<Overview>('/admin/community/overview').then(setD).catch((e) => alert(e.message)); }, []);
  const card = (label: string, value: React.ReactNode, href: string, tone = '') => <Link href={href} className={`rounded-lg bg-gray-800 p-4 hover:bg-gray-700 ${tone}`}><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Link>;
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">게시판 관리</h1>
          <a href={`${siteBase()}/community`} target="_blank" rel="noreferrer" className="rounded bg-gray-700 px-3 py-2 text-sm">사이트 커뮤니티 보기</a>
        </div>
        <p className="mt-1 text-sm text-gray-400">사용자 커뮤니티 게시판 현황입니다. 신고 처리 자체는 [신고 관리](게시판 글·댓글 필터)에서, 작성자 이용 제한은 [사용자 관리]에서 합니다.</p>
        {!d ? <p className="py-20 text-center text-gray-400">불러오는 중...</p> : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {card('정상 게시글', d.postStatus.NORMAL || 0, '/community/posts?status=NORMAL')}
              {card('숨김 게시글', d.postStatus.HIDDEN || 0, '/community/posts?status=HIDDEN')}
              {card('삭제 게시글', d.postStatus.DELETED || 0, '/community/posts?status=DELETED')}
              {card('댓글 (숨김)', `${(d.commentStatus.NORMAL || 0) + (d.commentStatus.HIDDEN || 0)} (${d.commentStatus.HIDDEN || 0})`, '/community/comments')}
              {card('처리할 신고', d.openReports, '/reports?type=BOARD', d.openReports ? 'ring-1 ring-red-500/60' : '')}
            </div>
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-800 p-4">
                <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">분류별 게시글</h2><Link href="/community/categories" className="text-xs text-purple-300 underline">카테고리 관리</Link></div>
                <ul className="space-y-1 text-sm">{d.categories.map((c) => <li key={c.id} className="flex justify-between"><Link href={`/community/posts?category=${c.key}`} className="hover:underline">{c.name}{!c.isActive && <span className="ml-1 text-xs text-gray-500">(숨김)</span>}{c.adminOnly && <span className="ml-1 text-xs text-amber-300">관리자 전용</span>}</Link><span>{c.posts}</span></li>)}</ul>
              </div>
              <div className="rounded-lg bg-gray-800 p-4">
                <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">상단 고정 글 (공지·중요)</h2><Link href="/community/posts?pinned=true" className="text-xs text-purple-300 underline">관리</Link></div>
                {d.pinned.length === 0 ? <p className="text-sm text-gray-500">고정된 글이 없습니다. [게시글 관리]에서 [공지]·[중요]로 지정하세요.</p> : (
                  <ul className="space-y-1 text-sm">{d.pinned.map((p) => <li key={p.id} className="flex items-center gap-2"><Pin className="h-3.5 w-3.5 text-amber-300" /><span className={`rounded px-1 text-[10px] ${p.noticeType === 'IMPORTANT' ? 'bg-red-600' : 'bg-gray-600'}`}>{p.noticeType === 'IMPORTANT' ? '중요' : '공지'}</span><Link href={`/community/posts?focus=${p.id}`} className="truncate hover:underline">{p.title}</Link>{p.pinnedUntil && <span className="ml-auto text-xs text-gray-400">~{new Date(p.pinnedUntil).toLocaleDateString('ko-KR')}</span>}</li>)}</ul>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
