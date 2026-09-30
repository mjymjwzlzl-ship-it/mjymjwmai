'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { selectBookComics } from '@/lib/comic-content-format';

const selectBookItems = (homeData: any) => {
  const data = homeData?.data || {};
  const categories = data.categories || {};
  const comics = data.allComics || categories.allComics || data.comics || [];
  return selectBookComics(comics);
};

export default function BooksPage() {
  const { t } = useLanguage();

  return (
    <GeneralComicListPage
      title={t('books.title')}
      description={t('books.description')}
      queryKey={['home-data', 'books']}
      bannerPlacement="BOOK"
      selectItems={selectBookItems}
      emptyMessage={t('books.empty')}
    />
  );
}
