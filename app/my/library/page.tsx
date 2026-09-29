'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Clock, Heart, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { useLoginModalStore } from '@/store/loginModal';

type Tab = 'recent' | 'liked';

interface LibraryItem {
  comicId: string;
  title: string;
  thumbnail?: string;
  author?: string;
  lastEpisodeId?: string;
  lastEpisodeNumber?: number;
  totalEpisodes?: number;
  progress?: number;
  at?: string;
}

const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
  { key: 'recent', label: '최근 본 작품', icon: Clock },
  { key: 'liked', label: '찜한 작품', icon: Heart },
];

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

// 브라우저에 남은 최근 본 기록 (로그인 전에도 보인다)
function readLocalRecent(): LibraryItem[] {
  try {
    const history = JSON.parse(localStorage.getItem('viewedWebtoons') || '[]');
    if (!Array.isArray(history)) return [];
    return history.map((item: any) => ({
      comicId: String(item.webtoonId),
      title: item.webtoonTitle || '',
      thumbnail: item.thumbnailUrl,
      lastEpisodeId: item.episodeId ? String(item.episodeId) : undefined,
      lastEpisodeNumber: item.lastEpisode || item.episodeNumber,
      at: item.viewedAt,
    }));
  } catch {
    return [];
  }
}

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const initialTab = searchParams.get('tab') === 'liked' ? 'liked' : 'recent';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loggedIn, setLoggedIn] = useState(false);
  const [recent, setRecent] = useState<LibraryItem[]>([]);
  const [liked, setLiked] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'liked' ? 'liked' : 'recent');
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setLoggedIn(!!token);
    const local = readLocalRecent();
    setRecent(local);

    if (!token) {
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    Promise.allSettled([
      api.get('/users/library/reading', { headers }),
      api.get('/users/library/liked', { headers }),
    ]).then(([readingResult, likedResult]) => {
      if (readingResult.status === 'fulfilled') {
        const server: LibraryItem[] = (readingResult.value.data?.webtoons || []).map((item: any) => ({
          comicId: String(item.comicId),
          title: item.comic?.title || '',
          thumbnail: item.comic?.thumbnail,
          author: item.comic?.authorName,
          lastEpisodeId: item.lastReadEpisodeId,
          lastEpisodeNumber: item.lastReadEpisodeNumber,
          totalEpisodes: item.totalEpisodes,
          progress: item.progress,
          at: item.lastReadAt,
        }));
        // 서버 기록 우선, 서버에 없는 브라우저 기록은 뒤에 붙인다
        const seen = new Set(server.map((item) => item.comicId));
        setRecent([...server, ...local.filter((item) => !seen.has(item.comicId))]);
      }
      if (likedResult.status === 'fulfilled') {
        setLiked((likedResult.value.data?.webtoons || []).map((item: any) => ({
          comicId: String(item.comicId || item.comic?.id),
          title: item.comic?.title || '',
          thumbnail: item.comic?.thumbnail,
          author: item.comic?.authorName,
          totalEpisodes: item.comic?._count?.episodes,
          at: item.createdAt,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const selectTab = (next: Tab) => {
    setTab(next);
    router.replace(`/my/library?tab=${next}`, { scroll: false });
  };

  const items = tab === 'recent' ? recent : liked;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <BookOpen className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
              내 서재
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">보던 작품을 이어 보고, 찜한 작품을 모아 봅니다.</p>
          </div>
          {loggedIn && (
            <Link href="/profile" className="shrink-0 text-sm font-bold text-gray-500 hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]">
              마이페이지 →
            </Link>
          )}
        </div>

        <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-800" role="tablist">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = key === 'recent' ? recent.length : liked.length;
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(key)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-black transition ${
                  active
                    ? 'border-[#00dc64] text-gray-950 dark:text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className="text-xs font-bold text-gray-400">{count}</span>
              </button>
            );
          })}
        </div>

        {tab === 'liked' && !loggedIn ? (
          <EmptyState
            title="로그인하면 찜한 작품을 볼 수 있어요"
            action="로그인 / 회원가입"
            onAction={() => openLogin(true)}
          />
        ) : loading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={tab === 'recent' ? '최근 본 작품이 없습니다' : '찜한 작품이 없습니다'}
            action="작품 둘러보기"
            onAction={() => router.push('/home')}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <li key={`${tab}-${item.comicId}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-[#1b1b1b]">
                <Link href={`/webtoons/${item.comicId}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-200 dark:bg-gray-800">
                    {item.thumbnail ? (
                      <img
                        src={getImageUrl(item.thumbnail, { width: 360 })}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : null}
                    {typeof item.progress === 'number' && item.progress > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                        <div className="h-full bg-[#00dc64]" style={{ width: `${Math.min(item.progress, 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-1 text-sm font-black">{item.title || '제목 없음'}</h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {tab === 'recent'
                        ? [item.lastEpisodeNumber ? `${item.lastEpisodeNumber}화까지 봄` : '', formatDate(item.at)].filter(Boolean).join(' · ')
                        : [item.author, item.totalEpisodes ? `${item.totalEpisodes}화` : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Link>
                {tab === 'recent' && item.lastEpisodeId && (
                  <div className="px-3 pb-3">
                    <Link
                      href={`/webtoons/${item.comicId}/episode/${item.lastEpisodeId}`}
                      className="flex h-8 items-center justify-center gap-1 rounded-lg bg-[#00dc64] text-xs font-black text-black transition hover:bg-[#00c85a]"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      이어보기
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-[#1b1b1b]">
      <p className="mb-4 font-bold text-gray-500 dark:text-gray-400">{title}</p>
      <button
        type="button"
        onClick={onAction}
        className="rounded-lg bg-[#00dc64] px-6 py-2 text-sm font-black text-black transition hover:bg-[#00c85a]"
      >
        {action}
      </button>
    </div>
  );
}

export default function MyLibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryContent />
    </Suspense>
  );
}
