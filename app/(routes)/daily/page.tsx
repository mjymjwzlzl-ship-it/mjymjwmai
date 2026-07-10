'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';

export default function DailyPage() {
  return (
    <GeneralComicListPage
      hideHeader
      title="매일 업데이트"
      queryKey={['home-data', 'daily']}
      selectItems={(homeData) => homeData?.data?.allComics || []}
      emptyMessage="업데이트된 작품이 없습니다."
    />
  );
}
