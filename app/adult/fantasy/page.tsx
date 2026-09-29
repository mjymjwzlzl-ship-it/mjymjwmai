'use client';

import { useQuery } from '@tanstack/react-query';
import WebtoonCard from '@/components/ui/WebtoonCard';
import { api } from '@/lib/api';

export default function GenrePage() {
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      const response = await api.get('/frontend/home');
      return response.data;
    },
  });

  const comics = homeData?.data?.allComics || [];

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return path.startsWith('/') ? path : `/${path}`;
  };

  const genreComics = comics.filter((comic: any) => {
    const genre = comic.genre?.toLowerCase() || '';
    return genre.includes('fantasy') || genre.includes('판타지');
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E7A5A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 md:px-8 lg:px-12 py-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">판타지</h1>
          <p className="text-gray-400 text-base md:text-lg">
            상상 속에서만 가능한 환상의 세계. 마법과 모험이 펼쳐지는 판타지 세계로 떠나보세요.
          </p>
        </div>
        {genreComics.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            판타지 장르 웹툰이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {genreComics.map((comic: any) => (
              <WebtoonCard
                key={comic.id}
                id={comic.id}
                title={comic.title}
                thumbnailUrl={getImageUrl(comic.thumbnail)}
                author={comic.authorName}
                genre={comic.genre}
                rating={comic.rating || 0}
                coinPrice={comic.episodeCoinPrice}
                paidStartEpisode={comic.paidStartEpisode}
                viewCount={comic.viewCount || 0}
                commentCount={comic.commentCount || 0}
                totalEpisodes={comic._count?.episodes || comic.episodeCount || 0}
                updatedAt={comic.updatedAt || new Date().toISOString()}
                ageRating={comic.ageRating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
