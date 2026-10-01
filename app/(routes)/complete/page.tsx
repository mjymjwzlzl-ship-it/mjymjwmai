'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function CompletePage() {
  const { t } = useLanguage();
  return (
    <GeneralComicListPage
      title={t('nav.complete')}
      initialSort="created"
      queryKey={['home-data', 'complete']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics.filter((comic: any) => comic.status === 'COMPLETED');
      }}
      emptyMessage="완결 작품이 없습니다."
    />
  );
}
