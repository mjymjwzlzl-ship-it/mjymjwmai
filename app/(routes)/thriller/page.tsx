'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function ThrillerPage() {
  return (
    <GeneralComicListPage
      title="스릴러"
      description="긴장감 있는 전개와 반전이 있는 작품입니다."
      queryKey={['home-data', 'genre', 'thriller']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => {
          const genre = String(comic.genre || '').toLowerCase();
          return genre.includes('thriller') || genre.includes('스릴러');
        });
      }}
      emptyMessage="스릴러 장르 작품이 없습니다."
    />
  );
}
