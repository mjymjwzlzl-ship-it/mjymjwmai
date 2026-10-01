'use client';
import GeneralComicListPage from '@/components/ui/GeneralComicListPage';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function PopularPage() {
  const { t, locale } = useLanguage();
  return <GeneralComicListPage title={t('nav.popular')} initialSort="popular" description={locale === 'ko' ? '독자들이 가장 많이 찾은 작품 · 누적 조회 기준' : 'Reader favorites · total views'} queryKey={['home-data', 'popular']} selectItems={home => home?.data?.allComics || []} />;
}
