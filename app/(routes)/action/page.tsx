'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function ActionPage() {
  return (
    <GeneralComicListPage
      title="액션"
      description="박진감 있는 전투와 모험을 담은 작품입니다."
      queryKey={['home-data', 'genre', 'action']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => {
          const genre = String(comic.genre || '').toLowerCase();
          return genre.includes('action') || genre.includes('액션');
        });
      }}
      emptyMessage="액션 장르 작품이 없습니다."
    />
  );
}
