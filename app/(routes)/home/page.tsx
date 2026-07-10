'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Heart } from 'lucide-react';
import MainBannerRail, { MainBannerItem } from '@/components/ui/MainBannerRail';
import Skeleton from '@/components/ui/Skeleton';
import { referenceBanners, referenceComics } from '@/components/ui/referenceContent';
import { api } from '@/lib/api';
import { localizeComicTitle } from '@/lib/comic-localization';
import { getImageUrl } from '@/lib/utils';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';
import { localizedPromoAsset } from '@/lib/promo-assets';

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
const RED_DRAGON_ID = 'cmhd1wrdp0000dtqp2vqkumzx';
const HIGH_SCHOOL_BOOST_ID = 'cmhd1z63y00h3dtqp6d0rsnuc';
const PROJECT_ETHER_ID = 'cmr7krmru0000hizzkwf4qaqj';
const SAMGUKJI_BYEONGUI_ID = 'cmhcw1u3d0000wcdwylb39b6i';
const SPECIAL_COMIC_IMAGES: Record<string, { thumbnail: string; banner: string }> = {
  [SAMAK_COMIC_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%82%AC%EB%A7%89/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%EC%82%AC%EB%A7%89/banner-4x3.webp?v=no-logo-20260709b',
  },
  [WORLD_END_GENERAL_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/banner-4x3.webp?v=no-logo-20260709b',
  },
  [CULT_LOVER_GENERAL_ID]: {
    thumbnail: '/uploads/webtoons/general/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/banner-4x3.webp?v=no-logo-20260709b',
  },
  [FORMER_BULLY_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%B5%9C%EA%B0%95%EC%9D%BC%EC%A7%84%EC%9D%B4%EC%97%88%EB%8D%98%20%EC%82%AC%EB%82%98%EC%9D%B4/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%EC%B5%9C%EA%B0%95%EC%9D%BC%EC%A7%84%EC%9D%B4%EC%97%88%EB%8D%98%20%EC%82%AC%EB%82%98%EC%9D%B4/banner-4x3.webp?v=no-logo-20260709b',
  },
  [RED_DRAGON_ID]: {
    thumbnail: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EB%A0%88%EB%93%9C%EB%93%9C%EB%9E%98%EA%B3%A4/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EB%A0%88%EB%93%9C%EB%93%9C%EB%9E%98%EA%B3%A4/banner-4x3.webp?v=no-logo-20260709b',
  },
  [HIGH_SCHOOL_BOOST_ID]: {
    thumbnail: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EC%8B%9C%EC%A6%8C2/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EC%8B%9C%EC%A6%8C2/banner-4x3.webp?v=no-logo-20260709b',
  },
  [PROJECT_ETHER_ID]: {
    thumbnail: '/uploads/webtoons/general/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%20%EC%9D%B4%EB%8D%94/thumbnail.webp?v=no-logo-20260709b',
    banner: '/uploads/webtoons/general/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%20%EC%9D%B4%EB%8D%94/banner-4x3.webp?v=no-logo-20260709b',
  },
  [SAMGUKJI_BYEONGUI_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%82%BC%EA%B5%AD%EC%A7%80%20%EB%B3%91%EC%9D%98/thumbnail.webp?v=original-art-20260710',
    banner: '/uploads/webtoons/general/%EC%82%BC%EA%B5%AD%EC%A7%80%20%EB%B3%91%EC%9D%98/banner-4x3.webp?v=original-art-20260710',
  },
};

const getComicImage = (comic: Comic, fallback: string, variant: 'thumbnail' | 'banner' = 'thumbnail') => {
  return SPECIAL_COMIC_IMAGES[String(comic?.id)]?.[variant] || fallback;
};

const promoCopy: Record<Locale, { app: MainBannerItem; founder: MainBannerItem }> = {
  ko: {
    app: {
      id: 'app-complete-download',
      title: 'ARATA 완전판 앱 다운로드',
      subtitle: '광고와 검열 없는 19+ 버전',
      badge: 'APP ONLY',
      imageUrl: '/uploads/promo/i18n/ko/arata-complete-app-download-banner.png',
      href: '/download',
    },
    founder: {
      id: 'founder-signup',
      title: '첫 달 990원',
      subtitle: '연간 결제 시 월 2,800원',
      badge: 'ARATA 창립회원 모집',
      imageUrl: '/uploads/promo/i18n/ko/arata-founder-signup-banner.png',
      href: '/register',
    },
  },
  en: {
    app: {
      id: 'app-complete-download',
      title: 'Download ARATA Full Edition',
      subtitle: '19+ version with no ads or censorship',
      badge: 'APP ONLY',
      imageUrl: '/uploads/promo/i18n/en/arata-complete-app-download-banner.png',
      href: '/download',
    },
    founder: {
      id: 'founder-signup',
      title: 'First month ₩990',
      subtitle: 'Annual plan: ₩2,800 per month',
      badge: 'Founding Member Offer',
      imageUrl: '/uploads/promo/i18n/en/arata-founder-signup-banner.png',
      href: '/register',
    },
  },
  ja: {
    app: {
      id: 'app-complete-download',
      title: 'ARATA完全版アプリ',
      subtitle: '広告・検閲なしの19+版',
      badge: 'アプリ専用',
      imageUrl: '/uploads/promo/i18n/ja/arata-complete-app-download-banner.png',
      href: '/download',
    },
    founder: {
      id: 'founder-signup',
      title: '初月990ウォン',
      subtitle: '年間払いで月2,800ウォン',
      badge: '創立メンバー募集',
      imageUrl: '/uploads/promo/i18n/ja/arata-founder-signup-banner.png',
      href: '/register',
    },
  },
  fr: {
    app: {
      id: 'app-complete-download',
      title: 'Télécharger ARATA complète',
      subtitle: 'Version 19+ sans pub ni censure',
      badge: 'APP ONLY',
      imageUrl: '/uploads/promo/i18n/fr/arata-complete-app-download-banner.png',
      href: '/download',
    },
    founder: {
      id: 'founder-signup',
      title: 'Premier mois 990 ₩',
      subtitle: 'Annuel : 2 800 ₩ par mois',
      badge: 'Offre membre fondateur',
      imageUrl: '/uploads/promo/i18n/fr/arata-founder-signup-banner.png',
      href: '/register',
    },
  },
};

const isAdultComic = (comic: Comic) => {
  const rating = String(comic?.rating || comic?.ageRating || '').toLowerCase();
  const genre = String(comic?.genre || '').toLowerCase();
  return rating === 'adult' || rating === '19' || rating.includes('19') || genre.includes('adult');
};

const formatViews = (value: unknown) => {
  const views = Number(value || 0);
  if (!Number.isFinite(views) || views <= 0) return '0';
  if (views >= 10000) {
    const compact = Math.floor((views / 10000) * 10) / 10;
    return `${compact.toLocaleString('ko-KR')}\uB9CC`;
  }
  return views.toLocaleString('ko-KR');
};

const normalizeComic = (comic: Comic, locale: Locale) => ({
  id: String(comic.id),
  title: localizeComicTitle(comic, locale),
  author: comic.authorName || comic.author?.username || comic.author?.name || comic.author || 'ARATA',
  image: getComicImage(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || '', 'thumbnail'),
  bannerImage: getComicImage(comic, comic.thumbnailUrl || comic.thumbnail || comic.image || '', 'banner'),
  views: Number(comic.views || comic.viewCount || 0),
  synopsis: comic.description || comic.synopsis || comic.subtitle || 'ARATA?먯꽌 ?곗옱 以묒씤 ?뱁댆?낅땲??',
  isNew: comic.isNew || comic.status === 'ONGOING',
});

export default function HomePage() {
  const { locale, t } = useLanguage();
  const [recentViewed, setRecentViewed] = useState<RecentViewedWebtoon[]>([]);

  const { data: homeData, isLoading } = useQuery({
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

  const { banners, comics } = useMemo(() => {
    const data = homeData?.data || {};
    const categories = data.categories || {};
    const allComics = (categories.allComics || data.allComics || data.comics || []) as Comic[];
    // 理쒖떊 ?낅뜲?댄듃 ?묓뭹???욎뿉 ?먭퀬, latest???녿뒗 ?섎㉧吏 ?묓뭹???댁뼱???몄텧 (臾댁젣???뱁댆 紐⑸줉怨??쇱튂)
    const latestList = (categories.latest || []) as Comic[];
    const latestIds = new Set(latestList.map((comic: Comic) => String(comic.id)));
    const latestSource = [...latestList, ...allComics.filter((comic: Comic) => !latestIds.has(String(comic.id)))];
    const latest = latestSource.filter((comic) => !isAdultComic(comic)).map((comic) => normalizeComic(comic, locale));
    const promoBanners = [promoCopy[locale].app, promoCopy[locale].founder];

    const comicBanners: MainBannerItem[] = latest.slice(0, 8).map((comic) => ({
      id: `comic-${comic.id}`,
      title: comic.title,
      subtitle: comic.author,
      imageUrl: comic.bannerImage || comic.image,
      href: `/webtoons/${comic.id}`,
      badge: comic.isNew ? 'UP' : 'AI',
    }));

    const seenBannerIds = new Set<string>();
    const mergedBanners = [...promoBanners, ...comicBanners].filter((banner) => {
      const key = `${banner.id}-${banner.imageUrl}`;
      if (seenBannerIds.has(key)) return false;
      seenBannerIds.add(key);
      return true;
    });

    return {
      banners: mergedBanners.length > 0 ? mergedBanners : referenceBanners,
      // 濡쒕뵫 以묒뿉??李멸퀬???붾? 肄섑뀗痢좊? ?몄텧?섏? ?딅뒗??(?ㅼ펷?덊넠 ?쒖떆)
      comics: latest.length > 0 ? latest : isLoading ? [] : referenceComics,
    };
  }, [homeData, isLoading, locale]);

  const recentComics = useMemo(() => {
    const comicMap = new Map(comics.map((comic) => [String(comic.id), comic]));

    return recentViewed
      .map((item) => {
        const id = String(item.webtoonId || '');
        const matched = comicMap.get(id);

        return {
          id,
          title: matched?.title || localizeComicTitle({ id, title: item.webtoonTitle }, locale, item.webtoonTitle || ''),
          author: matched?.author || '',
          image: matched?.image || item.thumbnailUrl || '',
          lastEpisode: item.lastEpisode,
          viewedAt: item.viewedAt,
        };
      })
      .filter((item) => item.id && item.title);
  }, [comics, locale, recentViewed]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <MainBannerRail items={banners} />

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <h1 className="flex items-center gap-2 text-xl font-black">
              <span className="h-7 w-1 rounded-full bg-[#00dc64]" />
              {t('home.latest')}
            </h1>
            <Link href="/daily" className="text-sm font-medium text-gray-500 hover:text-[#00dc64]">
              {t('common.more')}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
            {isLoading && comics.length === 0 &&
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-[16/9] w-full rounded-md dark:bg-gray-800" />
                  <Skeleton className="mt-3 h-5 w-2/3 dark:bg-gray-800" />
                </div>
              ))}
            {comics.slice(0, 8).map((comic) => (
              <Link key={comic.id} href={`/webtoons/${comic.id}`} className="group min-w-0">
                <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-gray-200 shadow-sm dark:bg-gray-800">
                  {comic.image ? (
                    <img
                      src={getImageUrl(comic.image, { width: 700 })}
                      alt={comic.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                  {comic.isNew && (
                    <span className="absolute left-2 top-2 rounded-sm bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                      UP
                    </span>
                  )}
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white">
                    <Heart className="h-4 w-4" />
                  </span>
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViews(comic.views)}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-1 text-base font-black group-hover:text-[#00dc64]">{comic.title}</h2>
                    <span className="shrink-0 text-xs text-gray-500">{comic.author}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-[#1b1b1b]">
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
                    className="group w-[150px] shrink-0 md:w-[168px]"
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
                        <p className="line-clamp-1 text-sm font-black">{comic.title}</p>
                        {comic.lastEpisode ? (
                          <p className="mt-0.5 text-[11px] font-bold text-white/80">
                            {t('recent.episode', { episode: comic.lastEpisode })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 min-w-0">
                      <p className="line-clamp-1 text-sm font-black group-hover:text-[#00dc64]">{comic.title}</p>
                      {comic.author ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{comic.author}</p>
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

        <Link
          href="/register"
          aria-label="연간 결제 시 월 2,800원 웹툰 무제한"
          className="mx-auto mt-8 block max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-[#1b1b1b]"
        >
          <img
            src={localizedPromoAsset(locale, 'arata-annual-2800-wide-banner.png')}
            alt="연간 결제 시 월 2,800원 웹툰 무제한"
            className="w-full object-contain"
            loading="lazy"
          />
        </Link>

        <section className="mt-8 rounded-lg border border-gray-200 bg-white px-6 py-16 text-center shadow-sm transition-colors dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl dark:bg-gray-800">
            ?슙
          </div>
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100">
            {t('home.recommendReady')}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {t('home.recommendSub')}
          </p>
        </section>
      </div>
    </div>
  );
}

