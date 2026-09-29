'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Check,
  Clock3,
  Filter,
  Gift,
  Heart,
  LayoutGrid,
  List,
  Palette,
  PenTool,
  Search,
  Unlock,
  User,
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import AppDownloadBanner from '@/components/ui/AppDownloadBanner';
import { api } from '@/lib/api';
import {
  localizeComicAuthor,
  localizeComicGenre,
  localizeComicStatus,
  localizeComicSynopsis,
  localizeComicTitle,
  resolveComicGenre,
} from '@/lib/comic-localization';
import { getImageUrl } from '@/lib/utils';
import { useAdultModeStore } from '@/store/adultMode';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { removeHiddenComicDuplicates } from '@/lib/comic-deduplication';
import { isMonochromeComic } from '@/lib/comic-content-format';
import { comicTimestamp, getComicFreeAccess, sortCatalog, type CatalogSort } from '@/lib/catalog-list';

type Comic = any;

type NormalizedComic = {
  id: string;
  isUp: boolean;
  isNew: boolean;
  title: string;
  author: string;
  image: string;
  synopsis: string;
  updatedAt: string;
  views: number;
  likes: number;
  tags: string[];
  genreText: string;
  isAdult: boolean;
  isFullyFree: boolean;
  isFirstEpisodeFree: boolean;
  isMonochrome: boolean;
  audience: 'male' | 'female';
  createdAtTimestamp: number;
  updatedAtTimestamp: number;
  status: string;
};

// 상태·분류 필터와 정렬 기준 (장르와 분리)
type StatusFilter = 'all' | 'new' | 'ongoing' | 'completed';
const NEW_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 신작 = 최근 90일 안에 등록
const statusFilterLabels: Record<Locale, Record<StatusFilter, string>> = {
  ko: { all: '전체', new: '신작', ongoing: '연재중', completed: '완결' },
  en: { all: 'All', new: 'New', ongoing: 'Ongoing', completed: 'Completed' },
  ja: { all: 'すべて', new: '新作', ongoing: '連載中', completed: '完結' },
  fr: { all: 'Tous', new: 'Nouveautés', ongoing: 'En cours', completed: 'Terminé' },
};
const sortChipLabels: Record<Locale, { heading: [string, string]; updated: string; popular: string; created: string }> = {
  ko: { heading: ['상태', '정렬'], updated: '실시간', popular: '인기순', created: '최신순' },
  en: { heading: ['Status', 'Sort'], updated: 'Real-time', popular: 'Popular', created: 'Newest' },
  ja: { heading: ['状態', '並び順'], updated: 'リアルタイム', popular: '人気順', created: '新着順' },
  fr: { heading: ['Statut', 'Tri'], updated: 'Temps réel', popular: 'Popularité', created: 'Récents' },
};

const matchesStatus = (comic: NormalizedComic, filter: StatusFilter) => {
  switch (filter) {
    case 'new':
      return comic.createdAtTimestamp > 0 && Date.now() - comic.createdAtTimestamp <= NEW_WINDOW_MS;
    case 'ongoing':
      return comic.status !== 'COMPLETED';
    case 'completed':
      return comic.status === 'COMPLETED';
    default:
      return true;
  }
};

interface GeneralComicListPageProps {
  title: string;
  description?: string;
  hideHeader?: boolean;
  queryKey?: string[];
  selectItems?: (homeData: any) => Comic[];
  emptyMessage?: string;
  beforeGrid?: ReactNode;
  /** 19 ON(성인인증 완료)일 때 성인 작품도 같은 목록·장르 탭([성인])에 섞는다 */
  includeAdult?: boolean;
}

const ITEMS_PER_PAGE = 10;
const GRID_ITEMS_PER_PAGE = 12;
type ComicViewMode = 'list' | 'grid';

const viewModeLabels: Record<Locale, Record<ComicViewMode, string>> = {
  ko: { list: '목록형', grid: '격자형' },
  en: { list: 'List', grid: 'Grid' },
  ja: { list: 'リスト', grid: 'グリッド' },
  fr: { list: 'Liste', grid: 'Grille' },
};

const listLabels = {
  ko: { sort: '작품 정렬', updated: '업데이트순', created: '신작순', oldest: '오래된순', popular: '인기순', error: '작품을 불러오지 못했습니다.', retry: '다시 시도' },
  en: { sort: 'Sort works', updated: 'Updated', created: 'Newest', oldest: 'Oldest', popular: 'Popular', error: 'Unable to load works.', retry: 'Try again' },
  ja: { sort: '作品の並び順', updated: '更新順', created: '新作順', oldest: '古い順', popular: '人気順', error: '作品を読み込めませんでした。', retry: '再試行' },
  fr: { sort: 'Trier les œuvres', updated: 'Mise à jour', created: 'Nouveautés', oldest: 'Anciennes', popular: 'Popularité', error: 'Impossible de charger les œuvres.', retry: 'Réessayer' },
} as const;

const SPECIAL_COMIC_THUMBNAILS: Record<string, string> = {
  cmfgk7zw60000hfzdcb4xi7ie: '/uploads/webtoons/general/%EC%82%AC%EB%A7%89/thumbnail.webp?v=no-logo-20260709b',
  cmfkt0q1a0001142ov9e5yqch: '/uploads/webtoons/general/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/thumbnail.webp?v=no-logo-20260709b',
  cmfgk82x5002ghfzdampkgahf: '/uploads/webtoons/adult/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/thumbnail.webp?v=no-logo-20260709b',
  cmfkt9a7w000j142oi8vh7tm0: '/uploads/webtoons/general/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/thumbnail.webp?v=no-logo-20260709b',
  cmfgk83c6002rhfzdiw8gcsow: '/uploads/webtoons/adult/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/thumbnail.webp?v=no-logo-20260709b',
  cmhupnvhs0000cbnjbz2mg9l5: '/uploads/webtoons/general/%EC%B5%9C%EA%B0%95%EC%9D%BC%EC%A7%84%EC%9D%B4%EC%97%88%EB%8D%98%20%EC%82%AC%EB%82%98%EC%9D%B4/thumbnail.webp?v=no-logo-20260709b',
  cmhd1wrdp0000dtqp2vqkumzx: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EB%A0%88%EB%93%9C%EB%93%9C%EB%9E%98%EA%B3%A4/thumbnail.webp?v=no-logo-20260709b',
  cmhd1z63y00h3dtqp6d0rsnuc: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EC%8B%9C%EC%A6%8C2/thumbnail.webp?v=no-logo-20260709b',
  cmr7krmru0000hizzkwf4qaqj: '/uploads/webtoons/general/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%20%EC%9D%B4%EB%8D%94/thumbnail.webp?v=no-logo-20260709b',
  cmhcw1u3d0000wcdwylb39b6i: '/uploads/webtoons/general/%EC%82%BC%EA%B5%AD%EC%A7%80%20%EB%B3%91%EC%9D%98/thumbnail.webp?v=no-logo-20260709b',
  cmrcomt1k0000ymjsmdcepx76: '/uploads/webtoons/general/%EC%9D%BC%EC%A7%84%EC%96%91%EC%84%B1%ED%95%99%EA%B5%90/thumbnail.webp?v=no-logo-20260711',
  cmrbzm61x000011itpx93faas: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%9D%BC%EB%B0%98%ED%95%99%EC%83%9D/thumbnail.webp?v=no-logo-20260711',
  cmrcowqbn000026hcnl74lq6v: '/uploads/webtoons/general/%EC%A3%BD%EC%9D%8C%EC%9D%98%20%EC%82%AC%EB%A7%89/thumbnail.webp?v=cel-2d-20260711',
  cmrcoup2n0000sjeecwxzyale: '/uploads/webtoons/general/%EC%A3%BC%EC%82%AC%EC%9C%84%EA%B2%8C%EC%9E%84/thumbnail.webp?v=cel-2d-20260711',
  cmrcoks1r0000az2ud9wupoy5: '/uploads/webtoons/general/%EC%98%A4%ED%83%9C%EC%84%A0%EC%9D%98%20%ED%8F%AC%EC%9E%A5%EB%A7%88%EC%B0%A8/thumbnail.webp?v=no-logo-20260711',
  cmrcokbhd000013p03boxrp10: '/uploads/webtoons/general/%EA%B8%B0%EC%96%B5%EC%9D%84%20%EA%B0%80%EC%A7%80%EA%B3%A0%205%EB%85%84%20%EC%A0%84%EC%9C%BC%EB%A1%9C%20%EB%8F%8C%EC%95%84%EA%B0%88%20%EA%B8%B0%ED%9A%8C%EA%B0%80%20%EC%83%9D%EA%B2%BC%EB%8B%A4/thumbnail.webp?v=cel-2d-20260711',
};

const getSpecialComicThumbnail = (comic: Comic, fallback: string) => {
  return SPECIAL_COMIC_THUMBNAILS[String(comic?.id)] || fallback;
};

const categories = [
  { query: 'all', value: '전체' },
  { query: 'new', value: '신작' },
  { query: 'ranking', value: '랭킹' },
  { query: 'realtime', value: '실시간' },
  { query: 'romance', value: '로맨스' },
  { query: 'fantasy', value: '판타지' },
  { query: 'action', value: '액션' },
  { query: 'martial', value: '무협' },
  { query: 'drama', value: '드라마' },
  { query: 'school', value: '학원' },
  { query: 'comedy', value: '코미디' },
  { query: 'thriller', value: '스릴러' },
  { query: 'sports', value: '스포츠' },
  { query: 'daily', value: '일상' },
  { query: 'adult', value: '성인' },
];

const optionChips = [
  { value: '완전무료', labelKey: 'option.freeAll', icon: Gift },
  { value: '1화 무료', labelKey: 'option.firstFree', icon: Unlock },
  { value: '컬러만화', labelKey: 'option.color', icon: Palette },
  { value: '흑백만화', labelKey: 'option.blackWhite', icon: PenTool },
  { value: '남성향', labelKey: 'option.male', icon: User },
  { value: '여성향', labelKey: 'option.female', icon: Heart },
];

const genreLabels: Record<string, string> = {
  romance: '로맨스',
  fantasy: '판타지',
  action: '액션',
  martial: '무협',
  drama: '드라마',
  school: '학원',
  comedy: '코미디',
  thriller: '스릴러',
  sports: '스포츠',
  daily: '일상',
  'slice-of-life': '일상',
};

const brokenTextPattern = /\uFFFD/;

const safeText = (value: unknown, fallback: string) => {
  const text = String(value || '').trim();
  if (!text || brokenTextPattern.test(text)) return fallback;
  return text;
};

const compactSynopsis = (value: unknown, fallback: string) => {
  const text = safeText(value, fallback);
  return text.length > 68 ? `${text.slice(0, 68).trim()}...` : text;
};

const isAdultComic = (comic: Comic) => {
  const rating = String(comic?.rating || comic?.ageRating || '').toLowerCase();
  const genre = String(comic?.genre || '').toLowerCase();
  return rating === 'adult' || rating === '19' || rating.includes('19') || genre.includes('adult');
};

const resolveAudience = (comic: Comic, searchableText: string): 'male' | 'female' => {
  const explicitAudience = String(
    comic?.audience || comic?.targetAudience || comic?.targetGender || comic?.genderTarget || '',
  ).toLowerCase();

  if (/female|women|woman|여성|女性/.test(explicitAudience)) return 'female';
  if (/male|men|man|남성|男性/.test(explicitAudience)) return 'male';

  return /romance|로맨스|연인|恋愛|ロマンス|lover|bl\b/.test(searchableText.toLowerCase())
    ? 'female'
    : 'male';
};

// 홈 [요일별 연재]와 같은 기준: [UP] 오늘(KST) 새 회차, [NEW] 런칭 7일 이내
const KST_OFFSET = 9 * 60 * 60 * 1000;
const kstDay = (value: string | number) => new Date(new Date(value).getTime() + KST_OFFSET).toISOString().slice(0, 10);
const isTodayKst = (value?: string) => Boolean(value) && !Number.isNaN(new Date(value as string).getTime()) && kstDay(value as string) === kstDay(Date.now());
const isWithin7Days = (value?: string) => {
  const time = value ? new Date(value).getTime() : NaN;
  return !Number.isNaN(time) && Date.now() - time <= 7 * 24 * 60 * 60 * 1000;
};
const WEEKDAY_TABS = [
  { key: 'all', label: '전체' }, { key: 'mon', label: '월' }, { key: 'tue', label: '화' }, { key: 'wed', label: '수' },
  { key: 'thu', label: '목' }, { key: 'fri', label: '금' }, { key: 'sat', label: '토' }, { key: 'sun', label: '일' },
] as const;
type WeekdayKey = (typeof WEEKDAY_TABS)[number]['key'];
const todayWeekdayKst = (): WeekdayKey => (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date(Date.now() + KST_OFFSET).getUTCDay()];

const normalizeComic = (
  comic: Comic,
  index: number,
  locale: Locale,
  defaultSynopsis: string,
  noTitle: string,
): NormalizedComic => {
  const genre = String(resolveComicGenre(comic)).trim();
  const sourceGenreLabel = genreLabels[genre.toLowerCase()] || safeText(genre, '미상');
  const genreLabel = localizeComicGenre(genre, locale, sourceGenreLabel);
  const statusLabel = localizeComicStatus(comic.status, locale);
  const localizedTitle = localizeComicTitle(comic, locale, safeText(comic.title, noTitle));
  const localizedSynopsis = compactSynopsis(localizeComicSynopsis(comic, locale, defaultSynopsis), defaultSynopsis);
  const freeAccess = getComicFreeAccess(comic);
  const updatedAtTimestamp = comicTimestamp(comic.updatedAt) || comicTimestamp(comic.createdAt);
  const dateLocale = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR' }[locale];
  const searchableAudienceText = `${genre} ${sourceGenreLabel} ${localizedTitle} ${localizedSynopsis}`;

  return {
    id: String(comic.id),
    isUp: isTodayKst(comic.lastEpisodeAt),
    isNew: isWithin7Days(comic.createdAt),
    title: localizedTitle,
    author: localizeComicAuthor(comic, locale, 'ARATA'),
    image: getSpecialComicThumbnail(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || ''),
    synopsis: localizedSynopsis,
    updatedAt: comic.updatedAtText || comic.updatedAtLabel || (updatedAtTimestamp
      ? new Intl.DateTimeFormat(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' }).format(updatedAtTimestamp)
      : '—'),
    views: Number(comic.views || comic.viewCount || 0),
    likes: Number(comic.likes || comic.likeCount || comic.favoriteCount || 0),
    tags: [genreLabel, statusLabel].filter(Boolean),
    genreText: `${genre} ${sourceGenreLabel} ${genreLabel}`.toLowerCase(),
    isAdult: isAdultComic(comic),
    ...freeAccess,
    isMonochrome: isMonochromeComic(comic),
    audience: resolveAudience(comic, searchableAudienceText),
    createdAtTimestamp: comicTimestamp(comic.createdAt),
    updatedAtTimestamp,
    status: String(comic.status || '').toUpperCase(),
  };
};

const matchesOption = (comic: NormalizedComic, option: string | null) => {
  switch (option) {
    case '완전무료':
      return comic.isFullyFree;
    case '1화 무료':
      return comic.isFirstEpisodeFree;
    case '컬러만화':
      return !comic.isMonochrome;
    case '흑백만화':
      return comic.isMonochrome;
    case '남성향':
      return comic.audience === 'male';
    case '여성향':
      return comic.audience === 'female';
    default:
      return true;
  }
};

export default function GeneralComicListPage({
  title,
  description = '작품명, 작가명, 태그로 검색해보세요.',
  hideHeader = false,
  queryKey = ['frontend-home', title],
  selectItems,
  emptyMessage = '표시할 작품이 없습니다.',
  beforeGrid,
  includeAdult = false,
}: GeneralComicListPageProps) {
  const { locale, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ComicViewMode>('list');
  const [sort, setSort] = useState<CatalogSort>('updated');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [weekday, setWeekday] = useState<WeekdayKey>('all');
  // 검수용: ?badgeTest=1 이면 앞의 세 작품에 UP / NEW / UP+NEW 를 강제로 표시 (홈과 동일)
  const [badgeTest, setBadgeTest] = useState(false);
  useEffect(() => {
    try { setBadgeTest(new URLSearchParams(window.location.search).get('badgeTest') === '1'); } catch {}
  }, []);
  const labels = listLabels[locale];
  const [page, setPage] = useState(1);
  const adultEnabled = useAdultModeStore((state) => state.enabled);
  const hydrateAdultMode = useAdultModeStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAdultMode();
  }, [hydrateAdultMode]);

  useEffect(() => {
    try {
    const savedViewMode = window.localStorage.getItem('arata-comic-view-mode');
    if (savedViewMode === 'list' || savedViewMode === 'grid') {
      setViewMode(savedViewMode);
    }
    } catch { /* The view toggle still works when storage is unavailable. */ }
  }, []);

  const changeViewMode = (nextViewMode: ComicViewMode) => {
    setViewMode(nextViewMode);
    setPage(1);
    try { window.localStorage.setItem('arata-comic-view-mode', nextViewMode); } catch {}
  };

  useEffect(() => {
    const applyCategory = (queryCategory: string) => {
      // 예전 링크 호환: ?category=new/ranking/realtime 은 장르가 아니라 상태·정렬로 바꿔 적용
      const legacy = ['new', 'ranking', 'realtime'].includes(queryCategory);
      setActiveCategory(legacy ? '전체' : categories.find((category) => category.query === queryCategory)?.value || '전체');
      setStatusFilter(queryCategory === 'new' ? 'new' : 'all');
      setSort(queryCategory === 'ranking' ? 'popular' : 'updated');
    };
    const syncFromLocation = () => {
      applyCategory(new URLSearchParams(window.location.search).get('category') || 'all');
    };
    const handleCategoryChange = (event: Event) => {
      applyCategory((event as CustomEvent<string>).detail || 'all');
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('arata-content-category-change', handleCategoryChange);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('arata-content-category-change', handleCategoryChange);
    };
  }, []);

  const { data: homeData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get('/frontend/home', { timeout: 8000 });
      return response.data;
    },
    retry: false,
  });

  // 성인 작품은 성인 전용 API(성인인증 + 19 ON 필요)에서 따로 받는다
  const { data: adultHomeData } = useQuery({
    queryKey: ['adult-home-list'],
    queryFn: async () => (await api.get('/frontend/adult-home', { timeout: 8000 })).data,
    enabled: includeAdult && adultEnabled,
    retry: false,
  });

  // 19 OFF 로 바꾸면 [성인] 탭에서 전체로 돌아간다
  useEffect(() => {
    if (!adultEnabled && activeCategory === '성인') {
      setActiveCategory('전체');
      if (new URLSearchParams(window.location.search).get('category') === 'adult') {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [adultEnabled, activeCategory]);

  const baseItems = useMemo<NormalizedComic[]>(() => {
    const data = homeData?.data || {};
    const fallback = data.categories?.allComics || data.allComics || data.comics || [];
    const general = selectItems ? selectItems(homeData) : fallback;
    const adultComics = includeAdult && adultEnabled ? (adultHomeData?.data?.allComics || []) : [];
    const generalIds = new Set((general || []).map((comic: Comic) => String(comic?.id)));
    const selected = [...(general || []), ...adultComics.filter((comic: Comic) => !generalIds.has(String(comic?.id)))];
    const backendItems = removeHiddenComicDuplicates(selected || []).filter(
      (comic: Comic) => adultEnabled || !isAdultComic(comic),
    );

    if (backendItems.length > 0) {
      return backendItems.map((comic: Comic, index: number) => normalizeComic(
        comic,
        index,
        locale,
        t('list.defaultSynopsis'),
        t('list.noTitle'),
      ));
    }

    if (isLoading) {
      return [];
    }

    return [];
  }, [homeData, adultHomeData, includeAdult, selectItems, adultEnabled, isLoading, locale, t]);

  // 요일 편성 (관리자 > 카테고리 요일, /frontend/home 의 categories.week_mon…)
  const weekdayIds = useMemo(() => {
    if (weekday === 'all') return new Set<string>();
    return new Set<string>(((homeData?.data?.categories?.[`week_${weekday}`] || []) as Comic[]).map((comic: Comic) => String(comic.id)));
  }, [homeData, weekday]);

  const items = useMemo<NormalizedComic[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    const filteredItems = baseItems.filter((comic) => {
      const categoryOk = activeCategory === '성인' ? comic.isAdult : (
        activeCategory === '전체' ||
        activeCategory === '실시간' ||
        activeCategory === '신작' ||
        activeCategory === '랭킹' ||
        comic.tags.includes(activeCategory) ||
        comic.genreText.includes(activeCategory.toLowerCase()));

      const optionOk = matchesOption(comic, activeOption);

      const searchOk =
        !query ||
        comic.title.toLowerCase().includes(query) ||
        comic.author.toLowerCase().includes(query) ||
        comic.synopsis.toLowerCase().includes(query) ||
        comic.tags.some((tag) => tag.toLowerCase().includes(query));

      const weekdayOk = weekday === 'all' || weekdayIds.has(comic.id);
      return categoryOk && optionOk && searchOk && weekdayOk && matchesStatus(comic, statusFilter);
    });

    const sorted = sortCatalog(filteredItems, sort);
    return badgeTest ? sorted.map((comic, index) => (index < 3 ? { ...comic, isUp: index !== 1, isNew: index !== 0 } : comic)) : sorted;
  }, [activeCategory, activeOption, baseItems, searchQuery, sort, statusFilter, weekday, weekdayIds, badgeTest]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, activeOption, searchQuery, sort, statusFilter]);

  const itemsPerPage = viewMode === 'grid' ? GRID_ITEMS_PER_PAGE : ITEMS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-6">
        <AppDownloadBanner />
        {beforeGrid && <div className="mb-6">{beforeGrid}</div>}

        <section className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-md shadow-gray-200/70 transition-colors dark:border-gray-800 dark:bg-[#1b1b1b] dark:shadow-none">
          <div className="border-b border-gray-200 p-3 sm:p-5 dark:border-gray-800">
            {!hideHeader && (
              <div className="mb-5">
                <h1 className="text-2xl font-black">{title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            )}

            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                aria-label={t('list.searchPlaceholder')}
                type="search"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('list.searchPlaceholder')}
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              />
            </label>

            <div className="mt-3 flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div data-catalog-filters="true" className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                <div className="mr-2 hidden items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 sm:flex">
                  <Filter className="h-4 w-4" />
                  Option
                </div>
                  {optionChips.map(({ value, labelKey, icon: Icon }) => {
                  const active = activeOption === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveOption(active ? null : value)}
                      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition sm:min-h-8 ${
                        active
                          ? 'border-[#00dc64] bg-[#00dc64] text-black shadow-md shadow-green-500/10'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-[#00dc64] hover:text-[#00a84c] dark:border-gray-700 dark:bg-[#1b1b1b] dark:text-gray-400'
                      }`}
                    >
                      {active ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>

              <div className="flex w-full min-w-0 items-center justify-between gap-1 sm:w-auto sm:gap-2 sm:self-end lg:self-auto">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-[#121212]" aria-label="View mode">
                  {(['list', 'grid'] as ComicViewMode[]).map((mode) => {
                    const active = viewMode === mode;
                    const Icon = mode === 'list' ? List : LayoutGrid;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={active}
                        aria-label={viewModeLabels[locale][mode]}
                        title={viewModeLabels[locale][mode]}
                        onClick={() => changeViewMode(mode)}
                        className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition sm:h-8 sm:min-w-0 ${
                          active
                            ? 'bg-[#00dc64] text-black shadow-sm'
                            : 'text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{viewModeLabels[locale][mode]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 요일별 연재 (홈과 같은 탭) */}
            <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto border-t border-gray-100 pt-3 dark:border-gray-800" role="tablist" aria-label="연재 요일">
              <span className="mr-1 shrink-0 text-xs font-black text-gray-400">요일</span>
              {WEEKDAY_TABS.map((tab) => {
                const active = weekday === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setWeekday(tab.key); setPage(1); }}
                    className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${active ? 'bg-[#00dc64] text-black' : 'bg-gray-100 text-gray-500 hover:text-gray-900 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white'}`}
                  >
                    {tab.label}{tab.key === todayWeekdayKst() && <span className="ml-0.5 text-[10px] opacity-70">오늘</span>}
                  </button>
                );
              })}
            </div>

            {/* 상태·분류 필터 / 정렬·집계 기준 (장르와 다른 줄) */}
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div className="no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto" role="group" aria-label={sortChipLabels[locale].heading[0]}>
                <span className="mr-1 shrink-0 text-xs font-black text-gray-400">{sortChipLabels[locale].heading[0]}</span>
                {(['all', 'new', 'ongoing', 'completed'] as StatusFilter[]).map((value) => {
                  const active = statusFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatusFilter(value)}
                      className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${
                        active
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                          : 'bg-gray-100 text-gray-500 hover:text-gray-900 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {statusFilterLabels[locale][value]}
                    </button>
                  );
                })}
              </div>
              <div className="flex shrink-0 items-center gap-1" role="group" aria-label={labels.sort}>
                <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-gray-400" />
                <span className="mr-1 text-xs font-black text-gray-400">{sortChipLabels[locale].heading[1]}</span>
                {(['updated', 'popular', 'created'] as const).map((value, index) => {
                  const active = sort === value;
                  return (
                    <span key={value} className="flex items-center">
                      {index > 0 && <span className="mx-1 text-gray-300 dark:text-gray-700">·</span>}
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSort(value)}
                        className={`min-h-9 px-1 text-xs font-black transition ${
                          active ? 'text-[#00a84c] dark:text-[#00dc64]' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        {sortChipLabels[locale][value]}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2 p-2 sm:gap-4 sm:p-4 md:grid-cols-3' : 'divide-y divide-gray-200 dark:divide-gray-800'}>
            {isLoading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={viewMode === 'grid' ? 'overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700' : 'flex gap-4 p-4'}>
                  <Skeleton className={viewMode === 'grid' ? 'aspect-[16/9] w-full dark:bg-gray-800' : 'h-[146px] w-[260px] shrink-0 dark:bg-gray-800 max-sm:h-[104px] max-sm:w-[138px]'} />
                  <div className={viewMode === 'grid' ? 'p-3' : 'flex-1 py-1'}>
                    <Skeleton className="h-5 w-1/3 dark:bg-gray-800" />
                    <Skeleton className="mt-3 h-4 w-2/3 dark:bg-gray-800" />
                    <Skeleton className="mt-2 h-4 w-1/2 dark:bg-gray-800" />
                  </div>
                </div>
              ))
            ) : isError && baseItems.length === 0 ? (
              <div role="alert" className="col-span-full py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>{labels.error}</p>
                <button type="button" disabled={isFetching} onClick={() => void refetch()} className="mt-3 rounded-lg bg-[#00dc64] px-4 py-2 font-bold text-black disabled:opacity-50">{labels.retry}</button>
              </div>
            ) : items.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage || t('list.empty')}</div>
            ) : (
              pagedItems.map((comic) => (
                <Link
                  key={comic.id}
                  href={`/webtoons/${comic.id}`}
                  className={viewMode === 'grid'
                    ? 'group block min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-[#00dc64] hover:shadow-md dark:border-gray-700 dark:bg-[#181818]'
                    : 'group flex min-w-0 gap-3 p-3 transition hover:bg-gray-50/90 sm:gap-4 sm:p-4 dark:hover:bg-white/5'}
                >
                  <div className={viewMode === 'grid'
                    ? 'relative aspect-[16/9] w-full overflow-hidden bg-gray-200 dark:bg-gray-800'
                    : 'relative aspect-[16/9] w-[40%] max-w-[160px] shrink-0 self-start overflow-hidden rounded-md border border-gray-200 bg-gray-200 shadow-sm sm:h-[146px] sm:w-[260px] sm:max-w-none dark:border-gray-700 dark:bg-gray-800 dark:shadow-none'}>
                    {comic.image ? (
                      <img
                        src={getImageUrl(comic.image, { width: 480 })}
                        alt={comic.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                    {(comic.isAdult || comic.isUp || comic.isNew) && (
                      <span className="absolute left-2 top-2 flex items-center gap-1">
                        {comic.isAdult && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white">19</span>}
                        {comic.isUp && <span className="rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">UP</span>}
                        {comic.isNew && <span className="rounded-sm bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">NEW</span>}
                      </span>
                    )}
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white">
                      <Heart className="h-4 w-4" />
                    </span>
                    {(comic.status === 'HIATUS' || comic.status === 'SUSPENDED') && (
                      <span className={`absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[11px] font-black ${comic.status === 'SUSPENDED' ? 'bg-red-600 text-white' : 'bg-amber-400 text-black'}`}>
                        {comic.status === 'SUSPENDED' ? '판매중지' : '휴재'}
                      </span>
                    )}
                  </div>

                  <div className={viewMode === 'grid' ? 'min-w-0 p-2 sm:p-3' : 'min-w-0 flex-1 py-0.5'}>
                    <h2 className={`line-clamp-2 break-words font-black leading-snug text-gray-950 group-hover:text-[#00dc64] dark:text-white ${viewMode === 'grid' ? 'min-h-[2.75em] text-sm sm:text-base' : 'text-sm sm:text-lg'}`}>
                      {comic.title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {comic.author}
                    </p>
                    <p className={`${viewMode === 'grid' ? 'line-clamp-2 min-h-10 text-xs leading-5' : 'hidden line-clamp-1 text-sm leading-6 sm:block'} mt-1 text-gray-600 dark:text-gray-400`}>
                      {comic.synopsis}
                    </p>
                    <div className={`${viewMode === 'grid' ? 'gap-2' : 'gap-3'} mt-2 flex flex-wrap items-center text-xs text-gray-500`}>
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {comic.updatedAt}
                      </span>
                      <span className="hidden sm:inline">{t('list.likes', { count: comic.likes.toLocaleString() })}</span>
                      <span>{t('list.views', { count: comic.views.toLocaleString() })}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                      {comic.tags.slice(0, viewMode === 'grid' ? 2 : 3).map((tag) => (
                        <span key={tag} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="flex flex-col items-center gap-3 border-t border-gray-100 p-6 dark:border-gray-800">
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: pageCount }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      aria-current={pageNumber === currentPage ? 'page' : undefined}
                      className={`h-11 min-w-11 rounded-md px-2 text-sm font-black ${
                        pageNumber === currentPage
                          ? 'bg-[#00dc64] text-black shadow-md shadow-green-500/20'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

