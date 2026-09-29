'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function CompletePage() {
  return (
    <GeneralComicListPage
      title="완결 웹툰"
      queryKey={['home-data', 'complete']}
      selectItems={(homeData) => {
        const categories = homeData?.data?.categories || {};
        const comics = homeData?.data?.allComics || [];
        return categories.completed?.length > 0
          ? categories.completed
          : comics.filter((comic: any) => comic.status === 'COMPLETED');
      }}
      emptyMessage="완결 작품이 없습니다."
    />
  );
}
