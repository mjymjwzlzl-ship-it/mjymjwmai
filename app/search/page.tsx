'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { localizeComicAuthor, localizeComicTitle } from '@/lib/comic-localization';
import { getImageUrl } from '@/lib/utils';
import { removeHiddenComicDuplicates } from '@/lib/comic-deduplication';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAdultModeStore } from '@/store/adultMode';

interface SearchResult {
  id: string;
  title: string;
  author?: string;
  authorName?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  type: 'webtoon' | 'novel';
  ageRating?: string;
  rating?: string;
}

function SearchResults() {
  const { locale, t } = useLanguage();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  // 태그로 찾기: /search?tag=회귀 (작품 상세 태그·인기 태그에서 들어온다)
  const tag = searchParams.get('tag') || '';
  const [popularTags, setPopularTags] = useState<{ name: string; count: number }[]>([]);
  useEffect(() => {
    api.get('/frontend/tags').then(({ data }) => setPopularTags((data?.tags || []).slice(0, 20))).catch(() => {});
  }, []);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query);

  // 19 ON/OFF: 헤더와 같은 저장값(arata-adult-mode). 켜고 끄면 바로 다시 검색한다.
  // 서버는 19 ON + 로그인 + 성인 인증일 때만 성인 작품을 함께 돌려주고, 아니면 가려진 수(hiddenAdult)만 준다.
  const adultEnabled = useAdultModeStore((state) => state.enabled);
  const [hydrated, setHydrated] = useState(false);
  const [hiddenAdult, setHiddenAdult] = useState(0);
  const [adultIncluded, setAdultIncluded] = useState(false);
  useEffect(() => { useAdultModeStore.getState().hydrate(); setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (query || tag) {
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query, tag, adultEnabled, hydrated]);

  const performSearch = async (searchTerm: string) => {
    try {
      setLoading(true);
      // adultMode 는 api 클라이언트가 붙인다
      const response = await api.get(`/search?q=${encodeURIComponent(searchTerm)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`);
      setResults(removeHiddenComicDuplicates(response.data.results || []));
      setHiddenAdult(Number(response.data.hiddenAdult) || 0);
      setAdultIncluded(!!response.data.adultMode);
    } catch (error) {
      console.error('검색 실패:', error);
      setResults([]);
      setHiddenAdult(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSearchSubmit} className="relative mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full rounded-xl border border-gray-200 bg-white px-6 py-4 pr-14 text-lg text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#00a84c]"
            aria-label={t('common.search')}
          >
            <Search className="h-6 w-6" />
          </button>
        </form>

        {popularTags.length > 0 && (
          <div className="-mt-4 mb-8 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-black text-gray-400">인기 태그</span>
            {popularTags.map((item) => (
              <Link key={item.name} href={`/search?tag=${encodeURIComponent(item.name)}`}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${tag === item.name ? 'bg-[#00dc64] text-black' : 'bg-white text-gray-600 hover:text-[#00a84c] dark:bg-white/5 dark:text-gray-300'}`}>
                #{item.name}
              </Link>
            ))}
          </div>
        )}

        {(query || tag) && (
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-black">{tag && !query ? `#${tag} 태그 작품` : t('search.resultsTitle', { query })}</h1>
            {!loading && (
              <p className="flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-400">
                {t('search.resultCount', { count: results.length })}
                {adultIncluded && <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">19 ON · 성인 작품 포함</span>}
              </p>
            )}
            {!loading && hiddenAdult > 0 && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                성인 작품 {hiddenAdult}개는 검색 결과에서 제외했어요. 성인 인증 후 19 ON 상태에서 볼 수 있어요.
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#00dc64]" />
          </div>
        )}

        {!loading && (query || tag) && (
          results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => {
                const imageUrl = getImageUrl(item.thumbnailUrl || item.thumbnail || '');
                const author = localizeComicAuthor(item, locale, 'ARATA');
                const is19Plus = ['19', '19+', 'ADULT'].includes(String(item.rating || item.ageRating || '').toUpperCase());
                const displayTitle = item.type === 'webtoon'
                  ? localizeComicTitle(item, locale, item.title)
                  : item.title;

                return (
                  <Link key={item.id} href={`/webtoons/${item.id}`} className="group">
                    <div className="relative mb-2 aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                      <img
                        src={imageUrl}
                        alt={displayTitle}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/placeholder.png';
                        }}
                      />
                      {is19Plus && (
                        <div className="absolute right-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-black text-white">19+</div>
                      )}
                      {item.type === 'novel' && (
                        <div className="absolute left-2 top-2 rounded bg-purple-600 px-2 py-1 text-xs font-black text-white">{t('search.novel')}</div>
                      )}
                    </div>
                    <h3 className="truncate text-sm font-bold text-gray-950 transition group-hover:text-[#00a84c] md:text-base dark:text-white">
                      {displayTitle}
                    </h3>
                    {author && <p className="truncate text-xs text-gray-500 md:text-sm dark:text-gray-400">{author}</p>}
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptySearchState title={t('search.noResultsTitle')} description={t('search.noResultsDescription')} />
          )
        )}

        {!loading && !query && !tag && (
          <EmptySearchState title={t('search.promptTitle')} description={t('search.promptDescription')} />
        )}
      </div>
    </div>
  );
}

function EmptySearchState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-20 text-center">
      <Search className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700" />
      <h2 className="mb-2 text-xl font-black text-gray-700 dark:text-gray-300">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#141414]">
          <Loader2 className="h-8 w-8 animate-spin text-[#00dc64]" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
