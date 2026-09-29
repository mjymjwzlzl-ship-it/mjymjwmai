'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function BLPage() {
  return (
    <GeneralComicListPage
      title="BL"
      queryKey={['home-data', 'genre', 'bl']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => String(comic.genre || '').toLowerCase().includes('bl'));
      }}
      emptyMessage="BL 장르 작품이 없습니다."
    />
  );
}
