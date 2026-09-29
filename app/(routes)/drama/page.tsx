'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function DramaPage() {
  return (
    <GeneralComicListPage
      title="드라마"
      description="현실감과 감정선을 담은 이야기입니다."
      queryKey={['home-data', 'genre', 'drama']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => {
          const genre = String(comic.genre || '').toLowerCase();
          return genre.includes('drama') || genre.includes('드라마');
        });
      }}
      emptyMessage="드라마 장르 작품이 없습니다."
    />
  );
}
