'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookmarkCheck, Clock, Heart, Library, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { isMonochromeComic } from '@/lib/comic-content-format';
import { useLoginModalStore } from '@/store/loginModal';

type Tab = 'viewed' | 'liked' | 'purchased';
type ContentType = 'all' | 'webtoon' | 'book' | 'novel';
type Sort = 'recent' | 'updated' | 'title';

interface LibraryItem {
  comicId: string;
  title: string;
  thumbnail?: string;
  author?: string;
  lastEpisodeId?: string;
  lastEpisodeNumber?: number;
  totalEpisodes?: number;
  ownedEpisodes?: number;
  progress?: number;
  /** 탭 기준 시각: 열람=마지막으로 본 시각, 찜=찜한 시각, 구매=마지막 구매 시각 */
  at?: string;
  updatedAt?: string;
  status?: string;
  contentType: Exclude<ContentType, 'all'>;
}

const TABS: { key: Tab; label: string; icon: typeof Clock }[] = [
  { key: 'viewed', label: '열람한 작품', icon: Clock },
  { key: 'liked', label: '찜한 작품', icon: Heart },
  { key: 'purchased', label: '구매 작품', icon: BookmarkCheck },
];

const TYPES: { key: ContentType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'webtoon', label: '웹툰' },
  { key: 'book', label: '단행본' },
  { key: 'novel', label: '웹소설' },
];

const SORT_LABELS: Record<Tab, Record<Sort, string>> = {
  viewed: { recent: '최근 본 순', updated: '업데이트 순', title: '제목 순' },
  liked: { recent: '찜한 순', updated: '업데이트 순', title: '제목 순' },
  purchased: { recent: '최근 구매 순', updated: '업데이트 순', title: '제목 순' },
};

const EMPTY_TEXT: Record<Tab, string> = {
  viewed: '열람한 작품이 없습니다',
  liked: '찜한 작품이 없습니다',
  purchased: '소장한 작품이 없습니다',
};

function parseTab(value: string | null): Tab {
  if (value === 'liked' || value === 'purchased') return value;
  return 'viewed'; // 예전 링크(tab=recent)도 열람한 작품으로
}

function contentTypeOf(comicId: string): LibraryItem['contentType'] {
  return isMonochromeComic({ id: comicId }) ? 'book' : 'webtoon';
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

const time = (value?: string) => {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

function sortItems(items: LibraryItem[], sort: Sort) {
  const list = [...items];
  if (sort === 'title') return list.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  if (sort === 'updated') return list.sort((a, b) => time(b.updatedAt) - time(a.updatedAt) || time(b.at) - time(a.at));
  return list.sort((a, b) => time(b.at) - time(a.at));
}

// 브라우저에 남은 열람 기록 (로그인 전에도 보인다)
function readLocalViewed(): LibraryItem[] {
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
      contentType: contentTypeOf(String(item.webtoonId)),
    }));
  } catch {
    return [];
  }
}

function fromServer(item: any, at: string | undefined): LibraryItem {
  const comicId = String(item.comicId || item.comic?.id);
  return {
    comicId,
    title: item.comic?.title || '',
    thumbnail: item.comic?.thumbnail,
    author: item.comic?.authorName,
    totalEpisodes: item.totalEpisodes ?? item.comic?._count?.episodes,
    updatedAt: item.lastUpdatedAt,
    status: item.comic?.status,
    at,
    contentType: contentTypeOf(comicId),
  };
}

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const [tab, setTab] = useState<Tab>(parseTab(searchParams.get('tab')));
  const [type, setType] = useState<ContentType>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [loggedIn, setLoggedIn] = useState(false);
  const [viewed, setViewed] = useState<LibraryItem[]>([]);
  const [liked, setLiked] = useState<LibraryItem[]>([]);
  const [purchased, setPurchased] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setLoggedIn(!!token);
    const local = readLocalViewed();
    setViewed(local);

    if (!token) {
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    Promise.allSettled([
      api.get('/users/library/reading', { headers }),
      api.get('/users/library/liked', { headers }),
      api.get('/users/library/purchased', { headers }),
    ]).then(([readingResult, likedResult, purchasedResult]) => {
      if (readingResult.status === 'fulfilled') {
        const server: LibraryItem[] = (readingResult.value.data?.webtoons || []).map((item: any) => ({
          ...fromServer(item, item.lastReadAt),
          lastEpisodeId: item.lastReadEpisodeId,
          lastEpisodeNumber: item.lastReadEpisodeNumber,
          progress: item.progress,
        }));
        // 서버 기록 우선, 서버에 없는 브라우저 기록은 뒤에 붙인다
        const seen = new Set(server.map((item) => item.comicId));
        setViewed([...server, ...local.filter((item) => !seen.has(item.comicId))]);
      }
      if (likedResult.status === 'fulfilled') {
        setLiked((likedResult.value.data?.webtoons || []).map((item: any) => fromServer(item, item.createdAt)));
      }
      if (purchasedResult.status === 'fulfilled') {
        setPurchased((purchasedResult.value.data?.webtoons || []).map((item: any) => ({
          ...fromServer(item, item.lastPurchasedAt),
          ownedEpisodes: item.ownedEpisodes,
          lastEpisodeId: item.lastOwnedEpisodeId,
          lastEpisodeNumber: item.lastOwnedEpisodeNumber,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const selectTab = (next: Tab) => {
    setTab(next);
    router.replace(`/my/library?tab=${next}`, { scroll: false });
  };

  const byTab: Record<Tab, LibraryItem[]> = { viewed, liked, purchased };
  const tabItems = byTab[tab];
  const typeCount = (key: ContentType) => (key === 'all' ? tabItems.length : tabItems.filter((item) => item.contentType === key).length);
  const items = useMemo(
    () => sortItems(type === 'all' ? tabItems : tabItems.filter((item) => item.contentType === type), sort),
    [tabItems, type, sort],
  );
  const needsLogin = tab !== 'viewed' && !loggedIn;

  const subtitle = (item: LibraryItem) => {
    if (sort === 'updated' && item.updatedAt) return `${formatDate(item.updatedAt)} 업데이트`;
    if (tab === 'viewed') return [item.lastEpisodeNumber ? `${item.lastEpisodeNumber}화까지 봄` : '', formatDate(item.at)].filter(Boolean).join(' · ');
    if (tab === 'purchased') return [item.ownedEpisodes ? `${item.ownedEpisodes}개 회차 소장` : '', formatDate(item.at)].filter(Boolean).join(' · ');
    return [item.author, item.totalEpisodes ? `${item.totalEpisodes}화` : ''].filter(Boolean).join(' · ');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black">
              <Library className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
              내 서재
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">열람한 작품을 이어 보고, 찜하거나 소장한 작품을 모아 봅니다.</p>
          </div>
          {loggedIn && (
            <Link href="/profile" className="shrink-0 text-sm font-bold text-gray-500 hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]">
              마이페이지 →
            </Link>
          )}
        </div>

        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-800" role="tablist">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(key)}
                className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-black transition ${
                  active
                    ? 'border-[#00dc64] text-gray-950 dark:text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className="text-xs font-bold text-gray-400">{byTab[key].length}</span>
              </button>
            );
          })}
        </div>

        {!needsLogin && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="콘텐츠 유형">
              {TYPES.map(({ key, label }) => {
                const active = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(key)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-black transition ${
                      active
                        ? 'border-gray-950 bg-gray-950 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500 dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-300'
                    }`}
                  >
                    {label} <span className={active ? 'opacity-70' : 'text-gray-400'}>{typeCount(key)}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              <span className="sr-only">정렬</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-100"
              >
                {(Object.keys(SORT_LABELS[tab]) as Sort[]).map((key) => (
                  <option key={key} value={key}>{SORT_LABELS[tab][key]}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {needsLogin ? (
          <EmptyState
            title={`로그인하면 ${tab === 'liked' ? '찜한' : '구매한'} 작품을 볼 수 있어요`}
            action="로그인 / 회원가입"
            onAction={() => openLogin(true)}
          />
        ) : loading && items.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#00dc64]" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={type === 'all' ? EMPTY_TEXT[tab] : `${TYPES.find((t) => t.key === type)?.label} 작품이 없습니다`}
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
                    {(item.status === 'HIATUS' || item.status === 'SUSPENDED') && (
                      <span className={`absolute bottom-2 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-black ${item.status === 'SUSPENDED' ? 'bg-red-600 text-white' : 'bg-amber-400 text-black'}`}>
                        {item.status === 'SUSPENDED' ? '판매중지' : '휴재'}
                      </span>
                    )}
                    {item.contentType === 'book' && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">단행본</span>
                    )}
                    {tab === 'viewed' && time(item.updatedAt) > time(item.at) && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">UP</span>
                    )}
                    {typeof item.progress === 'number' && item.progress > 0 && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                        <div className="h-full bg-[#00dc64]" style={{ width: `${Math.min(item.progress, 100)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-1 text-sm font-black">{item.title || '제목 없음'}</h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle(item)}</p>
                  </div>
                </Link>
                {tab !== 'liked' && item.lastEpisodeId && (
                  <div className="px-3 pb-3">
                    <Link
                      href={`/webtoons/${item.comicId}/episode/${item.lastEpisodeId}`}
                      className="flex h-8 items-center justify-center gap-1 rounded-lg bg-[#00dc64] text-xs font-black text-black transition hover:bg-[#00c85a]"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {tab === 'viewed' ? '이어보기' : `${item.lastEpisodeNumber}화 보기`}
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
