'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function NewPage() {
  const { t } = useLanguage();
  return (
    <GeneralComicListPage
      title={t('nav.new')}
      initialSort="created"
      queryKey={['home-data', 'new']}
      selectItems={(homeData) => {
        const comics = homeData?.data?.allComics || [];
        return comics;
      }}
      emptyMessage="신작 웹툰이 없습니다."
    />
  );
}
