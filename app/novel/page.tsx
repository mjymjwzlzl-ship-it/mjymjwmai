'use client';

import GeneralComicListPage from '@/components/ui/GeneralComicListPage';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { selectNovelComics } from '@/lib/comic-content-format';

// 웹소설 목록: 작품(Comic.contentType = NOVEL) 데이터. 상세·회차·대여/소장은 웹툰과 같은 화면, 회차는 텍스트 뷰어로 열린다.
const selectNovelItems = (homeData: any) => {
  const data = homeData?.data || {};
  const categories = data.categories || {};
  const comics = data.allComics || categories.allComics || data.comics || [];
  return selectNovelComics(comics);
};

export default function NovelPage() {
  const { t } = useLanguage();
  return (
    <GeneralComicListPage
      hideHeader
      title={t('nav.novels')}
      queryKey={['home-data', 'novel']}
      bannerPlacement="NOVEL"
      selectItems={selectNovelItems}
      emptyMessage="등록된 웹소설이 없습니다."
    />
  );
}
