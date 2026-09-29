'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function FantasyPage() {
  return (
    <GeneralComicListPage
      title="판타지"
      description="상상력과 세계관이 돋보이는 작품입니다."
      queryKey={['home-data', 'genre', 'fantasy']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => {
          const genre = String(comic.genre || '').toLowerCase();
          return genre.includes('fantasy') || genre.includes('판타지');
        });
      }}
      emptyMessage="판타지 장르 작품이 없습니다."
    />
  );
}
