'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import SubscriptionBanner from '@/components/ui/SubscriptionBanner';

const posts = [
  { no: '공지', type: '공지', title: '아라타 코믹스 정식 오픈 기념 이벤트 안내', writer: '관리자', date: '2024.03.20', views: 5420, comments: 15, pinned: true },
  { no: '공지', type: '점검', title: '3월 25일(월) 정기 점검 안내 (02:00 ~ 06:00)', writer: '관리자', date: '2024.03.19', views: 2300, comments: 0, pinned: true },
  { no: 15, type: '잡담', title: '이 웹툰 진짜 재밌네요 추천합니다', writer: '웹툰조아', date: '14:30', views: 124, comments: 5 },
  { no: 14, type: '문의', title: '코인 충전 오류 문의드립니다', writer: 'user123', date: '13:15', views: 45, comments: 2 },
  { no: 13, type: '질문', title: '소설 업데이트 시간 언제인가요?', writer: '독서왕', date: '12:40', views: 89, comments: 1 },
  { no: 12, type: '후기', title: '사이트 속도가 빨라져서 좋네요', writer: '스피드', date: '12:10', views: 210, comments: 8 },
  { no: 11, type: '질문', title: '다음 화 언제 올라오나요?', writer: '기다림', date: '11:55', views: 300, comments: 3 },
];

export default function CommunityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-[#141414]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <SubscriptionBanner />

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
            <div>
              <h1 className="text-2xl font-black text-gray-950 dark:text-white">자유게시판</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">유저들과 자유롭게 이야기를 나누어보세요.</p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/community/write')}
              className="rounded bg-[#00dc64] px-5 py-3 text-sm font-black text-black transition hover:bg-[#20ef7b]"
            >
              글쓰기
            </button>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-200 bg-gray-100 px-5 py-3 text-sm font-bold text-gray-500 dark:border-gray-800 dark:bg-[#202020]">
            <div className="col-span-1">번호</div>
            <div className="col-span-1">분류</div>
            <div className="col-span-6">제목</div>
            <div className="col-span-2 text-center">글쓴이</div>
            <div className="col-span-1 text-center">날짜</div>
            <div className="col-span-1 text-center">조회</div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {posts.map((post) => (
              <button
                key={`${post.no}-${post.title}`}
                type="button"
                className={`grid w-full grid-cols-12 px-5 py-4 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-white/5 ${post.pinned ? 'bg-red-50/70 dark:bg-red-950/10' : ''}`}
              >
                <div className="col-span-1">
                  {post.pinned ? <span className="rounded bg-red-500 px-2 py-1 text-xs font-black text-white">공지</span> : post.no}
                </div>
                <div className="col-span-1 text-gray-500">{post.type}</div>
                <div className="col-span-6 min-w-0 font-bold text-gray-950 dark:text-white">
                  <span className="truncate">{post.title}</span>
                  {post.comments > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-black text-[#00a84c]">
                      <MessageSquare className="h-3 w-3 fill-[#00dc64] text-[#00dc64]" />
                      {post.comments}
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-center text-gray-500">{post.writer}</div>
                <div className="col-span-1 text-center text-gray-500">{post.date}</div>
                <div className="col-span-1 text-center text-gray-500">{post.views}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-2 border-t border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-[#202020]">
            <select className="rounded border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-[#151515] dark:text-white">
              <option>제목</option>
            </select>
            <input placeholder="검색어를 입력하세요" className="w-72 rounded border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#151515] dark:text-white" />
            <button className="rounded bg-gray-800 px-5 py-2 text-sm font-bold text-white dark:bg-gray-700">검색</button>
          </div>
        </section>
      </div>
    </div>
  );
}
