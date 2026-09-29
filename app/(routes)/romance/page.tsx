'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function RomancePage() {
  return (
    <GeneralComicListPage
      title="로맨스"
      description="설렘과 관계의 감정을 담은 작품입니다."
      queryKey={['home-data', 'genre', 'romance']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => {
          const genre = String(comic.genre || '').toLowerCase();
          return genre.includes('romance') || genre.includes('로맨스') || genre.includes('로판');
        });
      }}
      emptyMessage="로맨스 장르 작품이 없습니다."
    />
  );
}
