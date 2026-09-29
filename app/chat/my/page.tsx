'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useLoginModalStore } from '@/store/loginModal';

// 내 채팅: 대화했던 캐릭터 목록 (최근 대화순). 누르면 기존 대화를 그대로 이어서 연다.
interface Conversation {
  webtoonId: string;
  webtoonTitle: string;
  characterId: string;
  characterName: string;
  unnamed: boolean;
  imageUrl: string;
  isAdult: boolean;
  lastMessage: string;
  lastRole: 'user' | 'assistant' | null;
  lastAt: string;
  messageCount: number;
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 6) return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

export default function MyChatsPage() {
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const [loggedIn, setLoggedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<Conversation[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    api.get('/chat/conversations', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setItems(Array.isArray(data?.conversations) ? data.conversations : []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 dark:bg-[#121212] dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-center gap-2">
          <Link href="/chat" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="채팅 홈">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <MessageCircle className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />내 채팅
          </h1>
        </div>

        {!loggedIn ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
            <p className="mb-4 font-bold text-gray-600 dark:text-gray-300">로그인하면 대화했던 캐릭터를 다시 볼 수 있어요</p>
            <button type="button" onClick={() => openLogin(true)} className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black">로그인 / 회원가입</button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" /></div>
        ) : failed ? (
          <p className="py-16 text-center text-sm text-gray-500">대화 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
            <p className="mb-4 font-bold text-gray-600 dark:text-gray-300">아직 대화한 캐릭터가 없어요</p>
            <Link href="/chat" className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black">캐릭터 만나러 가기</Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-[#1b1b1b]">
            {items.map((item) => {
              const href = `${item.isAdult ? '/adult' : ''}/chat/webtoon/${item.webtoonId}/character/${item.characterId}`;
              return (
                <li key={`${item.webtoonId}-${item.characterId}`}>
                  <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-gray-50 dark:hover:bg-white/5">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      {item.imageUrl ? <img src={getImageUrl(item.imageUrl, { width: 120 })} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <strong className="truncate text-[15px] font-black">{item.characterName}</strong>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatWhen(item.lastAt)}</span>
                      </span>
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                        {item.unnamed ? '주인공' : `《${item.webtoonTitle}》`}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-gray-700 dark:text-gray-300">
                        {item.lastRole === 'user' ? '나: ' : ''}{item.lastMessage}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
