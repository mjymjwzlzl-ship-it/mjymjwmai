'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { selectWebtoonComics } from '@/lib/comic-content-format';

const selectDailyItems = (homeData: any) => {
  const data = homeData?.data || {};
  const categories = data.categories || {};
  const comics = data.allComics || categories.allComics || data.comics || [];
  return selectWebtoonComics(comics);
};

export default function DailyPage() {
  const { t } = useLanguage();

  return (
    <GeneralComicListPage
      hideHeader
      title={t('nav.webtoons')}
      queryKey={['home-data', 'daily']}
      selectItems={selectDailyItems}
      emptyMessage={t('list.empty')}
    />
  );
}
