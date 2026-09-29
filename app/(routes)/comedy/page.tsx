'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function ComedyPage() {
  return (
    <GeneralComicListPage
      title="코미디"
      description="가볍게 웃으며 볼 수 있는 작품입니다."
      queryKey={['home-data', 'genre', 'comedy']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => {
          const genre = String(comic.genre || '').toLowerCase();
          return genre.includes('comedy') || genre.includes('코미디') || genre.includes('개그');
        });
      }}
      emptyMessage="코미디 장르 작품이 없습니다."
    />
  );
}
