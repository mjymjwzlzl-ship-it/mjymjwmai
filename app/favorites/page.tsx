'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Search } from 'lucide-react';

interface Webtoon {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  genre: string;
  rating: string;
  status: string;
  latestEpisode: number;
  addedAt: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Webtoon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'author'>('recent');
  const [filterGenre, setFilterGenre] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (!token) {
          router.push('/login');
          return;
        }

        const { api } = await import('@/lib/api');
        const response = await api.get('/users/library/liked', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const webtoons = response.data?.webtoons || [];
        setFavorites(webtoons.map((item: any) => ({
          id: item.comicId || item.id,
          title: item.comic?.title || '',
          thumbnail: item.comic?.thumbnail || '',
          author: item.comic?.authorName || '작가',
          genre: item.comic?.genre || 'general',
          rating: item.comic?.rating || 'all',
          status: item.comic?.status || 'ONGOING',
          latestEpisode: item.comic?._count?.episodes || 0,
          addedAt: item.createdAt || new Date().toISOString(),
        })));
      } catch (error) {
        console.error('찜한 작품 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, [router]);

  const filteredFavorites = favorites
    .filter((webtoon) =>
      webtoon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      webtoon.author.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((webtoon) => filterGenre === 'all' || webtoon.genre === filterGenre)
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

  const handleRemoveFavorite = async (webtoonId: string) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const { api } = await import('@/lib/api');
      await api.post(`/users/likes/${webtoonId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFavorites((prev) => prev.filter((w) => w.id !== webtoonId));
    } catch (error) {
      console.error('찜 취소 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#141414]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#00dc64]" />
          <p className="text-gray-500 dark:text-gray-400">찜한 작품을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 flex items-center text-sm font-bold text-gray-500 transition hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                돌아가기
              </button>
              <div className="flex items-center">
                <Heart className="mr-2 h-6 w-6 text-red-500" />
                <h1 className="text-2xl font-black">찜한 작품 ({favorites.length})</h1>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="작품명이나 작가명으로 검색"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              >
                <option value="recent">최근 추가순</option>
                <option value="title">제목순</option>
                <option value="author">작가순</option>
              </select>

              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 outline-none focus:border-[#00dc64] dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              >
                <option value="all">모든 장르</option>
                <option value="romance">로맨스</option>
                <option value="comedy">코미디</option>
                <option value="fantasy">판타지</option>
                <option value="action">액션</option>
                <option value="drama">드라마</option>
              </select>
            </div>
          </div>
        </section>

        {filteredFavorites.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
            <Heart className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-700" />
            <h3 className="mb-2 text-lg font-black">
              {searchTerm || filterGenre !== 'all' ? '검색 결과가 없습니다' : '찜한 작품이 없습니다'}
            </h3>
            <p className="mb-4 text-gray-500 dark:text-gray-400">
              {searchTerm || filterGenre !== 'all' ? '다른 검색어나 필터를 시도해보세요' : '마음에 드는 작품을 찜해보세요'}
            </p>
            {!searchTerm && filterGenre === 'all' && (
              <button
                onClick={() => router.push('/')}
                className="rounded-lg bg-[#00dc64] px-6 py-2 font-black text-black transition hover:bg-[#00c85a]"
              >
                작품 둘러보기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredFavorites.map((webtoon) => (
              <div
                key={webtoon.id}
                className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-[#1b1b1b]"
              >
                <div className="relative aspect-[3/4]" onClick={() => router.push(`/webtoons/${webtoon.id}`)}>
                  <Image
                    src={webtoon.thumbnail}
                    alt={webtoon.title}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(webtoon.id);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition hover:bg-red-600"
                    aria-label="찜 취소"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                </div>

                <div className="p-3">
                  <h3 className="mb-1 line-clamp-1 font-bold text-gray-950 dark:text-white">{webtoon.title}</h3>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{webtoon.author}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className={`rounded px-2 py-1 ${webtoon.status === 'ONGOING' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {webtoon.status === 'ONGOING' ? '연재중' : '완결'}
                    </span>
                    <span>{webtoon.latestEpisode}화</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
