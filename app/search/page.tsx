'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(query);

  const isAdultMode = pathname.startsWith('/adult') ||
    (typeof window !== 'undefined' && localStorage.getItem('adult') === 'on');

  useEffect(() => {
    if (query) {
      performSearch(query);
    } else {
      setLoading(false);
    }
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/search?q=${encodeURIComponent(searchTerm)}&adult=${isAdultMode}`);
      setResults(response.data.results || []);
    } catch (error) {
      console.error('검색 실패:', error);
      setResults([]);
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
            placeholder="제목, 작가, 태그로 검색"
            className="w-full rounded-xl border border-gray-200 bg-white px-6 py-4 pr-14 text-lg text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#00a84c]"
            aria-label="검색"
          >
            <Search className="h-6 w-6" />
          </button>
        </form>

        {query && (
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-black">&quot;{query}&quot; 검색 결과</h1>
            {!loading && <p className="text-gray-500 dark:text-gray-400">{results.length}개의 작품을 찾았습니다</p>}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#00dc64]" />
          </div>
        )}

        {!loading && query && (
          results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => {
                const imageUrl = getImageUrl(item.thumbnailUrl || item.thumbnail || '');
                const author = item.authorName || item.author;
                const is19Plus = item.rating === '19' || item.ageRating === '19';

                return (
                  <Link key={item.id} href={`/webtoons/${item.id}`} className="group">
                    <div className="relative mb-2 aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                      <img
                        src={imageUrl}
                        alt={item.title}
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
                        <div className="absolute left-2 top-2 rounded bg-purple-600 px-2 py-1 text-xs font-black text-white">소설</div>
                      )}
                    </div>
                    <h3 className="truncate text-sm font-bold text-gray-950 transition group-hover:text-[#00a84c] md:text-base dark:text-white">
                      {item.title}
                    </h3>
                    {author && <p className="truncate text-xs text-gray-500 md:text-sm dark:text-gray-400">{author}</p>}
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptySearchState title="검색 결과가 없습니다" description="다른 검색어로 시도해보세요" />
          )
        )}

        {!loading && !query && (
          <EmptySearchState title="검색어를 입력해주세요" description="제목, 작가, 태그로 작품을 찾을 수 있습니다" />
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
