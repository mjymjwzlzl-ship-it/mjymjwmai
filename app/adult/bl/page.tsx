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
    return genre.includes('bl');
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
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">BL</h1>
          <p className="text-gray-400 text-base md:text-lg">
            남성 간의 아름다운 로맨스. 섬세하고 감성적인 BL 작품들을 만나보세요.
          </p>
        </div>
        {genreComics.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            BL 장르 웹툰이 없습니다.
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
