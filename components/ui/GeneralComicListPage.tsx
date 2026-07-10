'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Book,
  Check,
  Clock3,
  Filter,
  Gift,
  Heart,
  Palette,
  PenTool,
  Search,
  Smartphone,
  Unlock,
  User,
} from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import SubscriptionBanner from '@/components/ui/SubscriptionBanner';
import { referenceComics } from '@/components/ui/referenceContent';
import { api } from '@/lib/api';
import { localizeComicTitle } from '@/lib/comic-localization';
import { getImageUrl } from '@/lib/utils';
import { useAdultModeStore } from '@/store/adultMode';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';

type Comic = any;

type NormalizedComic = {
  id: string;
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
};

interface GeneralComicListPageProps {
  title: string;
  description?: string;
  hideHeader?: boolean;
  queryKey?: string[];
  selectItems?: (homeData: any) => Comic[];
  emptyMessage?: string;
  beforeGrid?: ReactNode;
}

const ITEMS_PER_PAGE = 10;

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
};

const getSpecialComicThumbnail = (comic: Comic, fallback: string) => {
  return SPECIAL_COMIC_THUMBNAILS[String(comic?.id)] || fallback;
};

const categories = [
  { value: '전체', labelKey: 'category.all' },
  { value: '실시간', labelKey: 'category.realtime' },
  { value: '로맨스', labelKey: 'category.romance' },
  { value: '판타지', labelKey: 'category.fantasy' },
  { value: '액션', labelKey: 'category.action' },
  { value: '무협', labelKey: 'category.martial' },
  { value: '드라마', labelKey: 'category.drama' },
  { value: '학원', labelKey: 'category.school' },
  { value: '코미디', labelKey: 'category.comedy' },
  { value: '스릴러', labelKey: 'category.thriller' },
  { value: '스포츠', labelKey: 'category.sports' },
  { value: '일상', labelKey: 'category.daily' },
];

const optionChips = [
  { value: '완전무료', labelKey: 'option.freeAll', icon: Gift },
  { value: '1화 무료', labelKey: 'option.firstFree', icon: Unlock },
  { value: '웹툰', labelKey: 'option.webtoon', icon: Smartphone },
  { value: '코믹스', labelKey: 'option.comics', icon: Book },
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

const brokenTextPattern = /[占썸에?억㎖筌∽㎗?②린疫뀀콅?볥슣野껉쑬?곥끉臾볤쑴]/;

const safeText = (value: unknown, fallback: string) => {
  const text = String(value || '').trim();
  if (!text || brokenTextPattern.test(text)) return fallback;
  return text;
};

const compactSynopsis = (value: unknown) => {
  const text = safeText(value, '연재 중인 작품입니다.');
  return text.length > 68 ? `${text.slice(0, 68).trim()}...` : text;
};

const isAdultComic = (comic: Comic) => {
  const rating = String(comic?.rating || comic?.ageRating || '').toLowerCase();
  const genre = String(comic?.genre || '').toLowerCase();
  return rating === 'adult' || rating === '19' || rating.includes('19') || genre.includes('adult');
};

const normalizeComic = (comic: Comic, index: number, locale: Locale): NormalizedComic => {
  const genre = String(comic.genre || '').trim();
  const genreLabel = genreLabels[genre.toLowerCase()] || safeText(genre, '?뱁댆');
  const statusLabel = comic.status === 'COMPLETED' ? '?꾧껐' : '?곗옱';

  return {
    id: String(comic.id),
    title: localizeComicTitle(comic, locale, safeText(comic.title, '제목 없음')),
    author: safeText(comic.authorName || comic.author?.username || comic.author?.name || comic.author, 'ARATA'),
    image: getSpecialComicThumbnail(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || ''),
    synopsis: compactSynopsis(comic.description || comic.synopsis || comic.subtitle),
    updatedAt: comic.updatedAtText || comic.updatedAtLabel || `${String(Math.max(8, 11 - Math.floor(index / 2))).padStart(2, '0')}:${index % 2 === 0 ? '06' : '02'}`,
    views: Number(comic.views || comic.viewCount || 0),
    likes: Number(comic.likes || comic.likeCount || comic.favoriteCount || 0),
    tags: [genreLabel, statusLabel].filter(Boolean),
    genreText: `${genre} ${genreLabel}`.toLowerCase(),
    isAdult: isAdultComic(comic),
  };
};

const normalizeReferenceComic = (comic: (typeof referenceComics)[number]): NormalizedComic => ({
  ...comic,
  synopsis: compactSynopsis(comic.synopsis),
  image: comic.image,
  views: comic.views,
  likes: comic.likes,
  genreText: comic.tags.join(' ').toLowerCase(),
  isAdult: false,
});

export default function GeneralComicListPage({
  title,
  description = '작품명, 작가명, 태그로 검색해보세요.',
  hideHeader = false,
  queryKey = ['frontend-home', title],
  selectItems,
  emptyMessage = '표시할 작품이 없습니다.',
  beforeGrid,
}: GeneralComicListPageProps) {
  const { locale, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const adultEnabled = useAdultModeStore((state) => state.enabled);
  const hydrateAdultMode = useAdultModeStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAdultMode();
  }, [hydrateAdultMode]);

  const { data: homeData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get('/frontend/home', { timeout: 8000 });
      return response.data;
    },
    retry: false,
  });

  const baseItems = useMemo<NormalizedComic[]>(() => {
    const data = homeData?.data || {};
    const fallback = data.categories?.allComics || data.allComics || data.comics || [];
    const selected = selectItems ? selectItems(homeData) : fallback;
    const backendItems = (selected || []).filter((comic: Comic) => adultEnabled || !isAdultComic(comic));

    if (backendItems.length > 0) {
      return backendItems.map((comic: Comic, index: number) => normalizeComic(comic, index, locale));
    }

    if (isLoading) {
      return [];
    }

    return referenceComics.map(normalizeReferenceComic);
  }, [homeData, selectItems, adultEnabled, isLoading, locale]);

  const items = useMemo<NormalizedComic[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    return baseItems.filter((comic) => {
      const categoryOk =
        activeCategory === '전체' ||
        activeCategory === '실시간' ||
        comic.tags.includes(activeCategory) ||
        comic.genreText.includes(activeCategory.toLowerCase());

      const optionOk =
        !activeOption ||
        comic.tags.includes(activeOption) ||
        comic.genreText.includes(activeOption.toLowerCase()) ||
        (activeOption === '웹툰' && true);

      const searchOk =
        !query ||
        comic.title.toLowerCase().includes(query) ||
        comic.author.toLowerCase().includes(query) ||
        comic.synopsis.toLowerCase().includes(query) ||
        comic.tags.some((tag) => tag.toLowerCase().includes(query));

      return categoryOk && optionOk && searchOk;
    });
  }, [activeCategory, activeOption, baseItems, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, activeOption, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <SubscriptionBanner />
        {beforeGrid && <div className="mb-6">{beforeGrid}</div>}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-colors dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="border-b border-gray-100 p-5 dark:border-gray-800">
            {!hideHeader && (
              <div className="mb-5">
                <h1 className="text-2xl font-black">{title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            )}

            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('list.searchPlaceholder')}
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
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
                      onClick={() => setActiveOption(active ? null : value)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
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

              <button className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                {t('list.dateSort')}
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setActiveCategory(category.value)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-black transition ${
                    activeCategory === category.value
                      ? 'bg-[#00dc64] text-black shadow-md shadow-green-500/10'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                  }`}
                >
                  {t(category.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-4 p-4">
                  <Skeleton className="h-[146px] w-[260px] shrink-0 dark:bg-gray-800 max-sm:h-[104px] max-sm:w-[138px]" />
                  <div className="flex-1 py-1">
                    <Skeleton className="h-5 w-1/3 dark:bg-gray-800" />
                    <Skeleton className="mt-3 h-4 w-2/3 dark:bg-gray-800" />
                    <Skeleton className="mt-2 h-4 w-1/2 dark:bg-gray-800" />
                  </div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{emptyMessage || t('list.empty')}</div>
            ) : (
              pagedItems.map((comic) => (
                <Link
                  key={comic.id}
                  href={`/webtoons/${comic.id}`}
                  className="group flex gap-4 p-4 transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <div className="relative h-[146px] w-[260px] shrink-0 overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 max-sm:h-[104px] max-sm:w-[138px]">
                    {comic.image ? (
                      <img
                        src={getImageUrl(comic.image, { width: 480 })}
                        alt={comic.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                    {comic.isAdult && (
                      <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white">
                        19
                      </span>
                    )}
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white">
                      <Heart className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="line-clamp-1 text-base font-black text-gray-950 group-hover:text-[#00dc64] dark:text-white sm:text-lg">
                        {comic.title}
                      </h2>
                      <span className="shrink-0 text-xs text-gray-400">{comic.author}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                      {comic.synopsis}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {comic.updatedAt}
                      </span>
                      <span>{t('list.likes', { count: comic.likes.toLocaleString() })}</span>
                      <span>{t('list.views', { count: comic.views.toLocaleString() })}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {comic.tags.slice(0, 3).map((tag) => (
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
                      className={`h-8 min-w-8 rounded-md px-2 text-sm font-black ${
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

