'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Heart, Sparkles } from 'lucide-react';
import MainBannerRail, { MainBannerItem } from '@/components/ui/MainBannerRail';
import Skeleton from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import {
  localizeComicAuthor,
  localizeComicGenre,
  localizeComicSynopsis,
  localizeComicTitle,
  resolveComicGenre,
} from '@/lib/comic-localization';
import { getImageUrl } from '@/lib/utils';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { localizedPromoAsset } from '@/lib/promo-assets';
import { removeHiddenComicDuplicates } from '@/lib/comic-deduplication';

type Comic = any;

type RecentViewedWebtoon = {
  webtoonId: string;
  webtoonTitle?: string;
  lastEpisode?: number;
  viewedAt?: string;
  thumbnailUrl?: string;
};

const SAMAK_COMIC_ID = 'cmfgk7zw60000hfzdcb4xi7ie';
const WORLD_END_GENERAL_ID = 'cmfkt0q1a0001142ov9e5yqch';
const CULT_LOVER_GENERAL_ID = 'cmfkt9a7w000j142oi8vh7tm0';
const FORMER_BULLY_ID = 'cmhupnvhs0000cbnjbz2mg9l5';
const TAEKWON_HIGH_ID = 'cmfgk80p2000nhfzdetd5jkg6';
const ORDINARY_HIGH_STUDENT_ID = 'cmrbzm61x000011itpx93faas';
const RED_DRAGON_ID = 'cmhd1wrdp0000dtqp2vqkumzx';
const HIGH_SCHOOL_BOOST_ID = 'cmhd1z63y00h3dtqp6d0rsnuc';
const PROJECT_ETHER_ID = 'cmr7krmru0000hizzkwf4qaqj';
const SAMGUKJI_BYEONGUI_ID = 'cmhcw1u3d0000wcdwylb39b6i';
const ILJIN_SCHOOL_ID = 'cmrcomt1k0000ymjsmdcepx76';
const MEMORY_FIVE_YEARS_ID = 'cmrcokbhd000013p03boxrp10';
const OTAESEON_POJANGMACHA_ID = 'cmrcoks1r0000az2ud9wupoy5';
const DICE_GAME_ID = 'cmrcoup2n0000sjeecwxzyale';
const DEATH_DESERT_ID = 'cmrcowqbn000026hcnl74lq6v';
const OUR_FRIEND_JO_SEONGJE_ID = 'cmrbsvl8w0000uukvc3fkl5h0';

const uploadedComicImages = (title: string, version = 'banner-20260711') => {
  const base = `/uploads/webtoons/general/${encodeURIComponent(title)}`;
  return {
    thumbnail: `${base}/thumbnail.webp?v=${version}`,
    banner: `${base}/banner-4x3.webp?v=${version}`,
    poster: `${base}/poster.webp?v=recent-3x4-20260711`,
  };
};

const SPECIAL_COMIC_IMAGES: Record<string, { thumbnail: string; banner: string; poster: string }> = {
  [SAMAK_COMIC_ID]: uploadedComicImages('사막'),
  [WORLD_END_GENERAL_ID]: uploadedComicImages('세상의 종말'),
  [CULT_LOVER_GENERAL_ID]: uploadedComicImages('교주의 연인'),
  [FORMER_BULLY_ID]: uploadedComicImages('최강일진이었던 사나이'),
  [TAEKWON_HIGH_ID]: uploadedComicImages('태권고등학교', 'taekwon-illustration-20260830'),
  [ORDINARY_HIGH_STUDENT_ID]: uploadedComicImages('고교일반학생'),
  [RED_DRAGON_ID]: uploadedComicImages('고교전설 레드드래곤'),
  [HIGH_SCHOOL_BOOST_ID]: uploadedComicImages('고교전설 부스트'),
  [PROJECT_ETHER_ID]: uploadedComicImages('프로젝트 이더'),
  [SAMGUKJI_BYEONGUI_ID]: uploadedComicImages('삼국지병의'),
  [ILJIN_SCHOOL_ID]: uploadedComicImages('일진양성학교'),
  [MEMORY_FIVE_YEARS_ID]: uploadedComicImages('기억을 가지고 5년 전으로 돌아갈 기회가 생겼다', 'cel-2d-20260711'),
  [OTAESEON_POJANGMACHA_ID]: uploadedComicImages('오태선의 포장마차'),
  [DICE_GAME_ID]: uploadedComicImages('주사위게임', 'cel-2d-20260711'),
  [DEATH_DESERT_ID]: uploadedComicImages('죽음의 사막', 'cel-2d-20260711'),
};

const SPECIAL_COMIC_IMAGES_BY_TITLE: Record<string, { thumbnail: string; banner: string; poster: string }> = {
  사막: uploadedComicImages('사막'),
  '세상의 종말': uploadedComicImages('세상의 종말'),
  '교주의 연인': uploadedComicImages('교주의 연인'),
  '최강일진이었던 사나이': uploadedComicImages('최강일진이었던 사나이'),
  태권고등학교: uploadedComicImages('태권고등학교', 'taekwon-illustration-20260830'),
  고교일반학생: uploadedComicImages('고교일반학생'),
  '고교전설 레드드래곤': uploadedComicImages('고교전설 레드드래곤'),
  '고교전설 시즌2': uploadedComicImages('고교전설 부스트'),
  '고교전설 부스트': uploadedComicImages('고교전설 부스트'),
  '프로젝트 이더': uploadedComicImages('프로젝트 이더'),
  삼국지병의: uploadedComicImages('삼국지병의'),
  '삼국지 병의': uploadedComicImages('삼국지병의'),
  일진양성학교: uploadedComicImages('일진양성학교'),
  '기억을 가지고 5년 전으로 돌아갈 기회가 생겼다': uploadedComicImages('기억을 가지고 5년 전으로 돌아갈 기회가 생겼다', 'cel-2d-20260711'),
  '오태선의 포장마차': uploadedComicImages('오태선의 포장마차'),
  주사위게임: uploadedComicImages('주사위게임', 'cel-2d-20260711'),
  '죽음의 사막': uploadedComicImages('죽음의 사막', 'cel-2d-20260711'),
};

const EXTRA_RECENT_POSTERS: Record<string, string> = {
  [OUR_FRIEND_JO_SEONGJE_ID]: '/uploads/webtoons/general/%EC%9A%B0%EB%A6%AC%EC%9D%98%20%EC%B9%9C%EA%B5%AC%20%EC%A1%B0%EC%84%B1%EC%A0%9C/poster.webp?v=recent-3x4-20260711',
};

const getComicImage = (comic: Comic, fallback: string, variant: 'thumbnail' | 'banner' | 'poster' = 'thumbnail') => {
  if (variant === 'poster') {
    const recentPoster = EXTRA_RECENT_POSTERS[String(comic?.id)];
    if (recentPoster) return recentPoster;
  }

  const idImage = SPECIAL_COMIC_IMAGES[String(comic?.id)]?.[variant];
  if (idImage) return idImage;

  const title = String(comic?.title || comic?.titleKo || comic?.name || '');
  return SPECIAL_COMIC_IMAGES_BY_TITLE[title]?.[variant] || fallback;
};

const promoCopy: Record<Locale, MainBannerItem> = {
  ko: {
    id: 'app-complete-download',
    title: 'ARATA 완전판 앱 다운로드',
    subtitle: '광고와 검열 없는 19+ 버전',
    badge: 'APP ONLY',
    imageUrl: localizedPromoAsset('ko', 'arata-complete-app-download-banner.png'),
    href: '/download',
  },
  en: {
    id: 'app-complete-download',
    title: 'Download ARATA Full Edition',
    subtitle: '19+ version with no ads or censorship',
    badge: 'APP ONLY',
    imageUrl: localizedPromoAsset('en', 'arata-complete-app-download-banner.png'),
    href: '/download',
  },
  ja: {
    id: 'app-complete-download',
    title: 'ARATA完全版アプリ',
    subtitle: '広告・検閲なしの19+版',
    badge: 'アプリ専用',
    imageUrl: localizedPromoAsset('ja', 'arata-complete-app-download-banner.png'),
    href: '/download',
  },
  fr: {
    id: 'app-complete-download',
    title: 'Télécharger ARATA complète',
    subtitle: 'Version 19+ sans pub ni censure',
    badge: 'APP ONLY',
    imageUrl: localizedPromoAsset('fr', 'arata-complete-app-download-banner.png'),
    href: '/download',
  },
};

const membershipPromoCopy = {
  ko: { title: '첫 달 990원', subtitle: '연간 결제 시 월 2,800원', error: '작품을 불러오지 못했습니다.', retry: '다시 시도' },
  en: { title: 'First month ₩990', subtitle: 'Annual plan: ₩2,800 per month', error: 'Unable to load works.', retry: 'Try again' },
  ja: { title: '初月990ウォン', subtitle: '年間払いで月2,800ウォン', error: '作品を読み込めませんでした。', retry: '再試行' },
  fr: { title: 'Premier mois 990 ₩', subtitle: 'Annuel : 2 800 ₩ par mois', error: 'Impossible de charger les œuvres.', retry: 'Réessayer' },
} as const;

const isAdultComic = (comic: Comic) => {
  const rating = String(comic?.rating || comic?.ageRating || '').toLowerCase();
  const genre = String(comic?.genre || '').toLowerCase();
  return rating === 'adult' || rating === '19' || rating.includes('19') || genre.includes('adult');
};

const formatViews = (value: unknown, locale: Locale) => {
  const views = Number(value || 0);
  if (!Number.isFinite(views) || views <= 0) return '0';
  if ((locale === 'en' || locale === 'fr') && views >= 1000) {
    const compact = Math.floor((views / 1000) * 10) / 10;
    return `${compact.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}K`;
  }
  if (views >= 10000) {
    const compact = Math.floor((views / 10000) * 10) / 10;
    return `${compact.toLocaleString(locale === 'ja' ? 'ja-JP' : 'ko-KR')}${locale === 'ja' ? '万' : '만'}`;
  }
  const numberLocale = locale === 'ja' ? 'ja-JP' : locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'ko-KR';
  return views.toLocaleString(numberLocale);
};

const normalizeComic = (comic: Comic, locale: Locale, defaultSynopsis: string) => {
  const genre = resolveComicGenre(comic);

  return {
    id: String(comic.id),
    title: localizeComicTitle(comic, locale),
    author: localizeComicAuthor(comic, locale, 'ARATA'),
    genre: localizeComicGenre(genre, locale, String(genre)),
    image: getComicImage(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || '', 'thumbnail'),
    bannerImage: getComicImage(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || '', 'banner'),
    posterImage: getComicImage(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || '', 'poster'),
    views: Number(comic.views || comic.viewCount || 0),
    synopsis: localizeComicSynopsis(comic, locale, defaultSynopsis),
    // [UP] 오늘(한국 시간) 새 회차가 올라온 작품, [NEW] 런칭 7일 이내 신작
    isUp: isTodayKst(comic.lastEpisodeAt),
    isNew: isWithinDays(comic.createdAt, 7),
    lastEpisodeAt: comic.lastEpisodeAt ? String(comic.lastEpisodeAt) : '',
  };
};

const KST_OFFSET = 9 * 60 * 60 * 1000;
const kstDateKey = (value: string | number | Date) => new Date(new Date(value).getTime() + KST_OFFSET).toISOString().slice(0, 10);
const isTodayKst = (value?: string) => Boolean(value) && !Number.isNaN(new Date(value as string).getTime()) && kstDateKey(value as string) === kstDateKey(Date.now());
const isWithinDays = (value: string | undefined, days: number) => {
  const time = value ? new Date(value).getTime() : NaN;
  return !Number.isNaN(time) && Date.now() - time <= days * 24 * 60 * 60 * 1000;
};

const WEEKDAY_TABS = [
  { key: 'all', label: '전체' },
  { key: 'mon', label: '월' },
  { key: 'tue', label: '화' },
  { key: 'wed', label: '수' },
  { key: 'thu', label: '목' },
  { key: 'fri', label: '금' },
  { key: 'sat', label: '토' },
  { key: 'sun', label: '일' },
] as const;
type WeekdayKey = (typeof WEEKDAY_TABS)[number]['key'];
const todayWeekdayKst = (): WeekdayKey => (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date(Date.now() + KST_OFFSET).getUTCDay()];

export default function HomePage() {
  const { locale, t } = useLanguage();
  const [recentViewed, setRecentViewed] = useState<RecentViewedWebtoon[]>([]);

  const { data: homeData, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['frontend-home'],
    queryFn: async () => {
      const response = await api.get('/frontend/home', { timeout: 8000 });
      return response.data;
    },
    retry: false,
  });

  useEffect(() => {
    const loadRecentViewed = () => {
      try {
        const history = JSON.parse(window.localStorage.getItem('viewedWebtoons') || '[]');
        setRecentViewed(Array.isArray(history) ? history.slice(0, 12) : []);
      } catch {
        setRecentViewed([]);
      }
    };

    loadRecentViewed();
    window.addEventListener('storage', loadRecentViewed);
    window.addEventListener('viewedWebtoonsUpdated', loadRecentViewed);

    return () => {
      window.removeEventListener('storage', loadRecentViewed);
      window.removeEventListener('viewedWebtoonsUpdated', loadRecentViewed);
    };
  }, []);

  const [weekday, setWeekday] = useState<WeekdayKey | null>(null);

  const { banners, comics, weekdayIds } = useMemo(() => {
    const data = homeData?.data || {};
    const categories = data.categories || {};
    const allComics = removeHiddenComicDuplicates(
      (categories.allComics || data.allComics || data.comics || []) as Comic[],
    );
    // 理쒖떊 ?낅뜲?댄듃 ?묓뭹???욎뿉 ?먭퀬, latest???녿뒗 ?섎㉧吏 ?묓뭹???댁뼱???몄텧 (臾댁젣???뱁댆 紐⑸줉怨??쇱튂)
    const latestList = removeHiddenComicDuplicates((categories.latest || []) as Comic[]);
    const latestIds = new Set(latestList.map((comic: Comic) => String(comic.id)));
    const latestSource = [...latestList, ...allComics.filter((comic: Comic) => !latestIds.has(String(comic.id)))];
    const latest = latestSource
      .filter((comic) => !isAdultComic(comic))
      .map((comic) => normalizeComic(comic, locale, t('list.defaultSynopsis')));
    const promoBanners: MainBannerItem[] = [
      { ...promoCopy[locale], showTitle: false },
      {
        id: 'membership-basic-yearly',
        title: membershipPromoCopy[locale].title,
        subtitle: membershipPromoCopy[locale].subtitle,
        imageUrl: localizedPromoAsset(locale, 'arata-founder-signup-banner.png'),
        href: '/subscribe?plan=BASIC&billing=YEARLY',
        description: membershipPromoCopy[locale].subtitle,
        showTitle: false,
      },
    ];

    const comicBanners: MainBannerItem[] = latest
      .filter((comic) => comic.id !== DICE_GAME_ID)
      .slice(0, 7)
      .map((comic) => ({
      id: `comic-${comic.id}`,
      title: comic.title,
      subtitle: comic.author,
      imageUrl: comic.bannerImage || comic.image,
      href: `/webtoons/${comic.id}`,
      badge: comic.genre,
      description: comic.synopsis,
      showTitle: true,
      }));

    const seenBannerIds = new Set<string>();
    const mergedBanners = [...promoBanners, ...comicBanners].filter((banner) => {
      const key = `${banner.id}-${banner.imageUrl}`;
      if (seenBannerIds.has(key)) return false;
      seenBannerIds.add(key);
      return true;
    });

    const weekdayIds: Record<string, string[]> = {};
    for (const tab of WEEKDAY_TABS) {
      if (tab.key === 'all') continue;
      weekdayIds[tab.key] = ((categories[`week_${tab.key}`] || []) as Comic[]).map((comic: Comic) => String(comic.id));
    }

    return {
      weekdayIds,
      banners: mergedBanners,
      // 濡쒕뵫 以묒뿉??李멸퀬???붾? 肄섑뀗痢좊? ?몄텧?섏? ?딅뒗??(?ㅼ펷?덊넠 ?쒖떆)
      comics: latest,
    };
  }, [homeData, locale, t]);

  // 기본 탭: 오늘 요일에 편성된 작품이 있으면 오늘, 없으면 전체
  const activeWeekday: WeekdayKey = weekday ?? ((weekdayIds[todayWeekdayKst()] || []).length > 0 ? todayWeekdayKst() : 'all');
  const updateComics = useMemo(() => {
    const byUpdate = (a: { lastEpisodeAt: string }, b: { lastEpisodeAt: string }) =>
      (new Date(b.lastEpisodeAt).getTime() || 0) - (new Date(a.lastEpisodeAt).getTime() || 0);
    if (activeWeekday === 'all') return [...comics].sort(byUpdate);
    const ids = new Set(weekdayIds[activeWeekday] || []);
    return comics.filter((comic) => ids.has(String(comic.id))).sort(byUpdate);
  }, [comics, weekdayIds, activeWeekday]);

  const recentComics = useMemo(() => {
    const comicMap = new Map(comics.map((comic) => [String(comic.id), comic]));

    return recentViewed
      .map((item) => {
        const id = String(item.webtoonId || '');
        const matched = comicMap.get(id);
        const matchedPoster = matched?.posterImage || matched?.image;

        return {
          id,
          title: matched?.title || localizeComicTitle({ id, title: item.webtoonTitle }, locale, item.webtoonTitle || ''),
          author: matched?.author || '',
          image: matchedPoster || item.thumbnailUrl || '',
          lastEpisode: item.lastEpisode,
          viewedAt: item.viewedAt,
        };
      })
      .filter((item) => item.id && item.title);
  }, [comics, locale, recentViewed]);

  const recommendedComics = useMemo(() => {
    const preferredIds = [FORMER_BULLY_ID, RED_DRAGON_ID, SAMAK_COMIC_ID, WORLD_END_GENERAL_ID];
    const comicMap = new Map(comics.map((comic) => [String(comic.id), comic]));
    const preferred = preferredIds
      .map((id) => comicMap.get(id))
      .filter((comic): comic is (typeof comics)[number] => Boolean(comic));
    const selectedIds = new Set(preferred.map((comic) => String(comic.id)));
    const fallback = comics.filter(
      (comic) => String(comic.id) !== DICE_GAME_ID && !selectedIds.has(String(comic.id)),
    );

    return [...preferred, ...fallback].slice(0, 4);
  }, [comics]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-6">
        <MainBannerRail items={banners} />

        <section className="rounded-xl border border-gray-300 bg-white p-3 shadow-md shadow-gray-200/70 transition-colors sm:p-5 dark:border-gray-800 dark:bg-[#1b1b1b] dark:shadow-none">
          <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
            <h1 className="flex items-center gap-2 text-xl font-black">
              <span className="h-7 w-1 rounded-full bg-[#00dc64]" />
              {t('home.latest')}
            </h1>
            <Link href="/week" className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-gray-500 hover:text-[#00dc64]">
              {t('common.more')}
            </Link>
          </div>

          <div className="no-scrollbar -mt-2 mb-4 flex gap-1.5 overflow-x-auto" role="tablist" aria-label="연재 요일">
            {WEEKDAY_TABS.map((tab) => {
              const active = activeWeekday === tab.key;
              const isToday = tab.key === todayWeekdayKst();
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setWeekday(tab.key)}
                  className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-black transition ${
                    active
                      ? 'bg-[#00dc64] text-black'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:bg-[#181818] dark:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {isToday && <span className="ml-1 text-[10px] font-bold opacity-70">오늘</span>}
                </button>
              );
            })}
          </div>
          <p className="-mt-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
            {activeWeekday === 'all' ? '최근 회차가 올라온 순서입니다.' : `${WEEKDAY_TABS.find((tab) => tab.key === activeWeekday)?.label}요일 연재 작품 · 최근 업데이트 순`}
            <span className="ml-2 font-bold"><span className="text-red-600">UP</span> 오늘 새 회차 · <span className="text-[#00a84c] dark:text-[#00dc64]">NEW</span> 런칭 7일 이내</span>
          </p>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {!isLoading && comics.length > 0 && updateComics.length === 0 && (
              <div role="status" className="col-span-full py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                이 요일에 연재하는 작품이 없습니다.
              </div>
            )}
            {!isLoading && comics.length === 0 && (
              <div role={isError ? 'alert' : 'status'} className="col-span-full py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>{isError ? membershipPromoCopy[locale].error : t('list.empty')}</p>
                {isError && <button type="button" disabled={isFetching} onClick={() => void refetch()} className="mt-3 rounded-lg bg-[#00dc64] px-4 py-2 font-bold text-black disabled:opacity-50">{membershipPromoCopy[locale].retry}</button>}
              </div>
            )}
            {isLoading && comics.length === 0 &&
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-[16/9] w-full rounded-md dark:bg-gray-800" />
                  <Skeleton className="mt-3 h-5 w-2/3 dark:bg-gray-800" />
                </div>
              ))}
            {updateComics.slice(0, 8).map((comic) => (
              <Link
                key={comic.id}
                href={`/webtoons/${comic.id}`}
                className="group min-w-0 rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-[#181818] dark:shadow-none dark:hover:border-gray-600"
              >
                <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-800">
                  {comic.image ? (
                    <img
                      src={getImageUrl(comic.image, { width: 700 })}
                      alt={comic.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                  {(comic.isUp || comic.isNew) && (
                    <span className="absolute left-2 top-2 flex gap-1">
                      {comic.isUp && <span className="rounded-sm bg-red-600 px-2 py-1 text-[10px] font-black text-white">UP</span>}
                      {comic.isNew && <span className="rounded-sm bg-[#00dc64] px-2 py-1 text-[10px] font-black text-black">NEW</span>}
                    </span>
                  )}
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white">
                    <Heart className="h-4 w-4" />
                  </span>
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViews(comic.views, locale)}
                  </span>
                </div>

                <div className="mt-2 px-0.5 pb-0.5">
                  <h2 className="line-clamp-2 min-h-[2.75em] break-words text-sm font-black leading-snug sm:text-base group-hover:text-[#00dc64]">
                    {comic.title}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words text-xs text-gray-500 dark:text-gray-400">
                      {comic.author}
                    </span>
                    <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {comic.genre}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-gray-300 bg-white p-3 shadow-md shadow-gray-200/70 transition-colors sm:mt-8 sm:p-5 dark:border-gray-800 dark:bg-[#1b1b1b] dark:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-black">
                <Eye className="h-5 w-5" />
                {t('home.recentWebtoons')}
              </h2>
            </div>

            {recentComics.length > 0 ? (
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                {recentComics.map((comic) => (
                  <Link
                    key={comic.id}
                    href={`/webtoons/${comic.id}`}
                    className="group w-[150px] shrink-0 rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition hover:border-gray-300 hover:shadow-md md:w-[168px] dark:border-gray-700 dark:bg-[#181818] dark:shadow-none"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-gray-200 shadow-sm transition duration-300 group-hover:-translate-y-0.5 dark:bg-gray-800">
                      {comic.image ? (
                        <img
                          src={getImageUrl(comic.image, { width: 360 })}
                          alt={comic.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent p-2 text-white">
                        <p className="break-words text-sm font-black leading-snug">{comic.title}</p>
                        {comic.lastEpisode ? (
                          <p className="mt-0.5 text-[11px] font-bold text-white/80">
                            {t('recent.episode', { episode: comic.lastEpisode })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 min-w-0">
                      <p className="break-words text-sm font-black leading-snug group-hover:text-[#00dc64]">{comic.title}</p>
                      {comic.author ? (
                        <p className="mt-0.5 break-words text-xs text-gray-500 dark:text-gray-400">{comic.author}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {t('home.noRecentWebtoons')}
              </div>
            )}
          </section>

        <section className="mt-4 rounded-xl border border-gray-300 bg-white p-3 shadow-md shadow-gray-200/70 transition-colors sm:mt-8 sm:p-5 dark:border-gray-800 dark:bg-[#1b1b1b] dark:shadow-none">
          <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Sparkles className="h-5 w-5 text-[#00dc64]" />
                {t('home.recommended')}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('home.recommendSub')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            {recommendedComics.map((comic) => (
              <Link
                key={comic.id}
                href={`/webtoons/${comic.id}`}
                className="group min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-[#181818] dark:shadow-none"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-200 dark:bg-gray-800">
                  {comic.image ? (
                    <img
                      src={getImageUrl(comic.image, { width: 640 })}
                      alt={comic.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="absolute bottom-2 left-2 rounded bg-[#00dc64] px-2 py-1 text-[10px] font-black text-black shadow-sm">
                    {comic.genre}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 min-h-[2.75em] break-words text-sm font-black leading-snug sm:text-base group-hover:text-[#00dc64]">
                    {comic.title}
                  </h3>
                  {'synopsis' in comic && comic.synopsis ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                      {comic.synopsis}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

