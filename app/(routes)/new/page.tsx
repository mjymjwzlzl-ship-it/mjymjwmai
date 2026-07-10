'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function NewPage() {
  return (
    <GeneralComicListPage
      title="신작 웹툰"
      queryKey={['home-data', 'new']}
      selectItems={(homeData) => {
        const categories = homeData?.data?.categories || {};
        const comics = homeData?.data?.allComics || [];
        return categories.new?.length > 0
          ? categories.new
          : comics.filter((comic: any) => comic.status === 'ONGOING');
      }}
      emptyMessage="신작 웹툰이 없습니다."
    />
  );
}
