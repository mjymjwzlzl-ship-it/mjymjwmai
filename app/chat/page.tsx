'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Heart,
  Home,
  MessageCircle,
  RefreshCw,
  Search,
  Settings,
  Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { referenceComics } from '@/components/ui/referenceContent';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { localizeComicAuthor, localizeComicSynopsis, localizeComicTitle } from '@/lib/comic-localization';
import { removeHiddenComicDuplicates } from '@/lib/comic-deduplication';

type Comic = any;

type ChatComic = {
  id: string;
  title: string;
  author: string;
  image: string;
  synopsis: string;
  isNew: boolean;
  views: number;
};

// 채팅 홈에 노출하는 단위는 작품이 아니라 캐릭터다
type ChatCharacter = {
  key: string;
  name: string;
  occupation: string;
  image: string;
  scenario: string;
  href: string;
  webtoonId: string;
  webtoonTitle: string;
  isNew: boolean;
  views: number;
  /** 캐릭터 이름이 없어 작품명으로 대신 보여주는지 */
  unnamed: boolean;
  /** 역할(주인공·조연 등) */
  role: string;
};

// characters.json 의 role 값을 한국어 역할명으로
const ROLE_LABELS: Record<string, string> = { main: '주인공', protagonist: '주인공', heroine: '히로인', sub: '조연', supporting: '조연', villain: '악역' };
const roleLabel = (character: any) =>
  ROLE_LABELS[String(character?.role || '').toLowerCase()] || safeText(character?.role, '') || '등장인물';
// 보조 정보: 이름이 있으면 《작품》 · 역할, 없으면 역할만 (작품명이 이미 대표 명칭이므로)
const bannerMeta = (character: ChatCharacter) =>
  character.unnamed ? character.role : `《${character.webtoonTitle}》 · ${character.role}`;
const cardTags = (character: ChatCharacter) =>
  character.unnamed ? `#${character.role}` : `#${character.webtoonTitle} #${character.role}`;

const brokenTextPattern = /[�濡臾梨李泥怨踰湲뱁쒓뚯寃꾨댁ㅼ묓꾩]/;

const safeText = (value: unknown, fallback: string) => {
  const text = String(value || '').trim();
  if (!text || brokenTextPattern.test(text)) return fallback;
  return text;
};

const isAdultComic = (comic: Comic) => {
  const rating = String(comic?.rating || comic?.ageRating || '').toLowerCase();
  const genre = String(comic?.genre || '').toLowerCase();
  return rating === 'adult' || rating === '19' || rating.includes('19') || genre.includes('adult');
};

const normalizeComic = (comic: Comic, locale: string): ChatComic => ({
  id: String(comic.id),
  title: localizeComicTitle(comic, locale, safeText(comic.title, '채팅 가능한 작품')),
  author: localizeComicAuthor(comic, locale, 'ARATA'),
  image: comic.thumbnailUrl || comic.thumbnail || comic.image || '',
  synopsis: localizeComicSynopsis(comic, locale, ''),
  isNew: comic.isNew || comic.status === 'ONGOING',
  views: Number(comic.views || comic.viewCount || 0),
});

const fallbackComics: ChatComic[] = referenceComics.map((comic) => ({
  id: comic.id,
  title: comic.title,
  author: comic.author,
  image: comic.image,
  synopsis: comic.synopsis,
  isNew: Boolean(comic.isNew),
  views: comic.views || 0,
}));

const sideMenu = [
  { labelKey: 'chat.home', href: '/chat', icon: Home, active: true },
  { labelKey: 'chat.explore', href: '#popular', icon: Compass },
  { labelKey: 'chat.ranking', href: '#ranking', icon: Trophy },
  { labelKey: 'chat.myChat', href: '/chat/my', icon: MessageCircle },
  { labelKey: 'chat.favorites', href: '/favorites', icon: Heart },
  { labelKey: 'common.checkIn', href: '/attendance', icon: CalendarCheck },
  { labelKey: 'chat.settings', href: '/settings', icon: Settings },
];

export default function ChatHomePage() {
  const { locale, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);
  // 한 화면에 카드 4~5개가 보이도록 슬라이드 폭(%)을 화면 크기에 따라 조절
  const [slidePct, setSlidePct] = useState(30);

  useEffect(() => {
    const updateSlidePct = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setSlidePct(30);
      } else if (window.matchMedia('(min-width: 640px)').matches) {
        setSlidePct(46);
      } else {
        setSlidePct(74);
      }
    };
    updateSlidePct();
    window.addEventListener('resize', updateSlidePct);
    return () => window.removeEventListener('resize', updateSlidePct);
  }, []);

  const { data: homeData, isLoading: loading } = useQuery({
    queryKey: ['frontend-home'],
    queryFn: async () => {
      const response = await api.get('/frontend/home', { timeout: 8000 });
      return response.data;
    },
    retry: false,
  });

  const comics = useMemo<ChatComic[]>(() => {
    const data = homeData?.data || {};
    const categories = data.categories || {};
    // 채팅은 회차 발행 여부와 무관하므로 allComics를 우선 사용 (채팅 전용 작품 포함)
    const allComics = (categories.allComics || data.allComics || data.comics || []) as Comic[];
    const source = removeHiddenComicDuplicates(allComics.length > 0 ? allComics : categories.latest || []);
    const normalized = source
      .filter((comic: Comic) => comic?.id && !isAdultComic(comic))
      .map((comic: Comic) => normalizeComic(comic, locale));

    if (normalized.length > 0) return normalized;
    return loading ? [] : fallbackComics;
  }, [homeData, loading, locale]);

  // 작품별 캐릭터 목록 로드 (없는 작품은 주인공 폴백)
  const comicIds = useMemo(() => comics.map((comic) => comic.id).join(','), [comics]);
  const { data: characterMap } = useQuery({
    queryKey: ['chat-characters', comicIds],
    enabled: comics.length > 0,
    retry: false,
    queryFn: async () => {
      const targets = comics;
      const results = await Promise.all(
        targets.map(async (comic) => {
          try {
            const response = await api.get(`/chat/webtoon/${comic.id}/characters`, { timeout: 8000 });
            return [comic.id, response.data?.characters || []] as const;
          } catch {
            return [comic.id, []] as const;
          }
        })
      );
      return Object.fromEntries(results) as Record<string, any[]>;
    },
  });

  const characters = useMemo<ChatCharacter[]>(() => {
    return comics.flatMap((comic) => {
      const loaded = (characterMap?.[comic.id] || []).slice(0, 12);

      if (loaded.length === 0) {
        return [
          {
            key: `${comic.id}-main`,
            // 캐릭터 이름 데이터가 없는 작품: 작품명을 대표 명칭으로, 역할은 '주인공'
            name: comic.title,
            unnamed: true,
            role: '주인공',
            occupation: comic.author,
            image: comic.image,
            scenario: comic.synopsis,
            href: `/chat/webtoon/${comic.id}`,
            webtoonId: comic.id,
            webtoonTitle: comic.title,
            isNew: comic.isNew,
            views: comic.views,
          },
        ];
      }

      return loaded.map((character: any) => ({
        key: `${comic.id}-${character.id}`,
        name: safeText(character.name, comic.title),
        unnamed: !safeText(character.name, ''),
        role: roleLabel(character),
        occupation: safeText(character.occupation || character.role, comic.author),
        image: character.imageUrl || comic.image,
        scenario: comic.synopsis,
        href: `/chat/webtoon/${comic.id}/character/${character.id}`,
        webtoonId: comic.id,
        webtoonTitle: comic.title,
        isNew: comic.isNew,
        views: comic.views,
      }));
    });
  }, [comics, characterMap, t]);

  const filteredCharacters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return characters;
    return characters.filter((character) =>
      [character.name, character.webtoonTitle, character.occupation, character.scenario].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [characters, searchQuery]);

  // 상단 배너는 4~5개만 노출
  const heroCharacters = filteredCharacters.slice(0, 5);
  const popularCharacters = useMemo(
    () => [...filteredCharacters].sort((a, b) => b.views - a.views).slice(0, 12),
    [filteredCharacters]
  );
  // 전체 캐릭터: 인기 여부와 관계없이 모든 캐릭터 (작품명 가나다순)
  const [showAllCharacters, setShowAllCharacters] = useState(false);
  const allCharacters = useMemo(
    () => [...filteredCharacters].sort((a, b) => a.webtoonTitle.localeCompare(b.webtoonTitle, 'ko') || a.name.localeCompare(b.name, 'ko')),
    [filteredCharacters]
  );
  const visibleAllCharacters = showAllCharacters ? allCharacters : allCharacters.slice(0, 12);
  const rankingCharacters = useMemo(
    () => [...filteredCharacters].sort((a, b) => b.views - a.views).slice(0, 5),
    [filteredCharacters]
  );

  // 히어로 자동 전환
  useEffect(() => {
    if (heroCharacters.length < 2) return;
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroCharacters.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroCharacters.length]);

  useEffect(() => {
    setHeroIndex((index) => (heroCharacters.length === 0 ? 0 : Math.min(index, heroCharacters.length - 1)));
  }, [heroCharacters.length]);

  const heroCharacter = heroCharacters[heroIndex];

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-950 transition-colors dark:bg-[#0f0f10] dark:text-white">
      {/* 페이지 헤더 (전역 헤더 아래) */}
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 pt-6 sm:px-6">
        {/* 검색창: 모바일은 본문과 같은 좌우 여백으로 꽉 차게, 넓은 화면은 가운데 정렬 */}
        <label className="mx-auto flex h-10 w-full items-center sm:max-w-[560px] gap-2.5 rounded-full border border-gray-200 bg-white px-4 text-gray-400 transition focus-within:border-[#00dc64] focus-within:ring-2 focus-within:ring-[#00dc64]/15 dark:border-white/10 dark:bg-white/5">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-gray-950 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
            placeholder={t('chat.searchPlaceholder')}
          />
        </label>
      </div>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-5 sm:px-6">
        {/* 왼쪽 사이드바 */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-28 space-y-5">
            <nav className="space-y-1">
              {sideMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.labelKey}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      item.active
                        ? 'bg-white text-gray-950 shadow-sm dark:bg-white/10 dark:text-white'
                        : 'text-gray-500 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${item.active ? 'text-[#00a84c] dark:text-[#00dc64]' : ''}`} />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-gray-200 pt-4 dark:border-white/10">
              <p className="px-4 text-[11px] font-black uppercase tracking-wider text-gray-400">{t('chat.event')}</p>
              <Link
                href="/register"
                className="mt-1 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-white hover:text-[#00a84c] dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-[#00dc64]"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                {t('chat.subscriptionSale')}
              </Link>
            </div>

            {/* 실시간 캐릭터 랭킹 */}
            <div id="ranking" className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-black">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00dc64]" />
                  {t('chat.ranking')}
                </h2>
                <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div className="space-y-1">
                {rankingCharacters.slice(0, 3).map((character, index) => (
                  <Link
                    key={character.key}
                    href={character.href}
                    className="flex items-center gap-2.5 rounded-lg p-1.5 transition hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      {character.image ? (
                        <img src={getImageUrl(character.image, { width: 96 })} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-black">{character.name}</p>
                        {index === 0 && (
                          <span className="shrink-0 rounded bg-[#00dc64] px-1 py-0.5 text-[9px] font-black text-black">NEW</span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{cardTags(character)}</p>
                    </div>
                    {character.views > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-red-500">
                        <Flame className="h-3 w-3 fill-current" />
                        {character.views.toLocaleString()}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <a
                href="#all-characters"
                className="mt-3 flex h-8 items-center justify-center rounded-full border border-gray-200 text-xs font-bold text-gray-500 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-white/15 dark:text-gray-400 dark:hover:text-[#00dc64]"
              >
                {t('chat.viewAll')}
              </a>
            </div>
          </div>
        </aside>

        {/* 메인 영역 */}
        <main className="min-w-0 flex-1">
          {/* 모바일: PC 왼쪽 사이드바와 같은 메뉴를 가로 칩으로 (탐색·랭킹·내 채팅·즐겨찾기·출석 체크·설정·이벤트) */}
          <nav className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden" aria-label="캐릭터 채팅 메뉴">
            {sideMenu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.labelKey}
                  href={item.href === '#ranking' ? '#ranking-mobile' : item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-black transition ${
                    item.active
                      ? 'border-[#00dc64] bg-[#00dc64]/10 text-[#00a84c] dark:text-[#00dc64]'
                      : 'border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
            <Link href="/register" className="flex shrink-0 items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-black text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              <Flame className="h-4 w-4" />
              {t('chat.event')} · {t('chat.subscriptionSale')}
            </Link>
          </nav>

          {/* 히어로 캐러셀 */}
          {loading && comics.length === 0 ? (
            <div className="h-[300px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5 sm:h-[380px]" />
          ) : heroCharacter ? (
            <section className="relative overflow-hidden">
              {/* 탑툰 스타일 멀티 카드 캐러셀: 가운데 활성 카드 + 양옆 카드 4~5개 동시 노출 */}
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{
                  transform: `translateX(${50 - slidePct / 2 - (heroCharacters.length + heroIndex) * slidePct}%)`,
                }}
              >
                {[...heroCharacters, ...heroCharacters, ...heroCharacters].map((character, position) => {
                  const index = position % heroCharacters.length;
                  const isActive = position === heroCharacters.length + heroIndex;
                  return (
                    <div
                      key={`${character.key}-${position}`}
                      className="shrink-0 px-1.5"
                      style={{ flexBasis: `${slidePct}%`, maxWidth: `${slidePct}%` }}
                    >
                      <Link
                        href={character.href}
                        onClick={(event) => {
                          if (!isActive) {
                            event.preventDefault();
                            setHeroIndex(index);
                          }
                        }}
                        className={`group relative block h-[300px] overflow-hidden rounded-2xl bg-gray-900 transition-all duration-500 sm:h-[360px] ${
                          isActive ? '' : 'scale-[0.94] brightness-[0.45] hover:brightness-75'
                        }`}
                      >
                        {character.image ? (
                          <img
                            src={getImageUrl(character.image, { width: 700 })}
                            alt={character.name}
                            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                            loading={position < heroCharacters.length + 3 ? 'eager' : 'lazy'}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                          {isActive && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <span className="rounded bg-[#00dc64] px-2 py-0.5 text-[10px] font-black text-black">{t('chat.popularCharacters')}</span>
                              {character.isNew && (
                                <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">{t('chat.newScenario')}</span>
                              )}
                            </div>
                          )}
                          <h2 className={`font-black text-white ${isActive ? 'line-clamp-2 text-lg sm:text-xl' : 'line-clamp-1 text-sm'}`}>
                            {character.name}
                          </h2>
                          <p className={`mt-1 font-bold text-gray-300 ${isActive ? 'text-sm' : 'text-xs'}`}>
                            {bannerMeta(character)}
                          </p>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {heroCharacters.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label={t('chat.previousCharacter')}
                    onClick={() => setHeroIndex((heroIndex - 1 + heroCharacters.length) % heroCharacters.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 p-2 text-white shadow-lg transition hover:bg-black/70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('chat.nextCharacter')}
                    onClick={() => setHeroIndex((heroIndex + 1) % heroCharacters.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/45 p-2 text-white shadow-lg transition hover:bg-black/70"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {heroCharacters.map((character, index) => (
                      <button
                        key={character.key}
                        type="button"
                        aria-label={t('chat.characterPage', { index: index + 1 })}
                        onClick={() => setHeroIndex(index)}
                        className={`h-1 rounded-full transition-all ${
                          index === heroIndex ? 'w-6 bg-[#00dc64]' : 'w-3 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-500 dark:border-white/15 dark:text-gray-400">
              {t('chat.noChatTitles')}
            </div>
          )}

          {/* 공지 바 */}
          <Link
            href="/register"
            className="mt-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-3.5 transition hover:border-[#00dc64]/50 dark:border-white/10 dark:bg-white/5"
          >
            <span className="shrink-0 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">{t('chat.notice')}</span>
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-700 dark:text-gray-200">
              🎉 {t('chat.openNotice')}
            </p>
            <img src="/uploads/promo/arata-launch-mascot.svg" alt="" className="h-10 w-10 shrink-0" loading="lazy" />
          </Link>

          {/* 모바일: 실시간 캐릭터 랭킹 (PC는 왼쪽 사이드바) */}
          <section id="ranking-mobile" className="mt-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 lg:hidden">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-black">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00dc64]" />
                {t('chat.ranking')}
              </h2>
              <a href="#all-characters" className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('chat.viewAll')} →</a>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {rankingCharacters.slice(0, 5).map((character, index) => (
                <Link key={character.key} href={character.href} className="flex items-center gap-3 py-2">
                  <span className={`w-5 text-center text-sm font-black italic ${index < 3 ? 'text-[#00a84c] dark:text-[#00dc64]' : 'text-gray-400'}`}>{index + 1}</span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    {character.image ? <img src={getImageUrl(character.image, { width: 96 })} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{character.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{cardTags(character)}</p>
                  </div>
                  {character.views > 0 && (
                    <span className="flex items-center gap-1 text-xs font-black text-red-500"><Flame className="h-3 w-3 fill-current" />{character.views.toLocaleString()}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* 인기 캐릭터 */}
          <section id="popular" className="mt-7">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-black">
                {t('chat.popularCharacters')} <Flame className="h-5 w-5 fill-orange-500 text-orange-500" />
              </h2>
              <Link
                href="/daily"
                className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]"
              >
                {t('chat.moreTitles')} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {popularCharacters.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {popularCharacters.map((character, index) => (
                  <Link key={character.key} href={character.href} className="group min-w-0">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                      {character.image ? (
                        <img
                          src={getImageUrl(character.image, { width: 420 })}
                          alt={character.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : null}
                      {(character.isNew || index < 2) && (
                        <span className="absolute left-2 top-2 rounded bg-[#00dc64] px-1.5 py-0.5 text-[10px] font-black text-black">NEW</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-8">
                        <h3 className="line-clamp-1 text-sm font-black text-white">{character.name}</h3>
                        <p className="line-clamp-1 text-[11px] text-gray-300">{cardTags(character)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-500 dark:border-white/15 dark:text-gray-400">
                {t('chat.noResults')}
              </div>
            )}
          </section>

          {/* 전체 캐릭터 */}
          <section id="all-characters" className="mt-10 scroll-mt-32">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-xl font-black">
                전체 캐릭터 <span className="text-base font-bold text-gray-400">{allCharacters.length}</span>
              </h2>
            </div>
            {allCharacters.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                  {visibleAllCharacters.map((character) => (
                    <Link key={`all-${character.key}`} href={character.href} className="group min-w-0">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        {character.image ? (
                          <img
                            src={getImageUrl(character.image, { width: 420 })}
                            alt={character.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-8">
                          <h3 className="line-clamp-1 text-sm font-black text-white">{character.name}</h3>
                          <p className="line-clamp-1 text-[11px] text-gray-300">{cardTags(character)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {allCharacters.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCharacters((open) => !open)}
                    className="mt-5 flex h-11 w-full items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-600 transition hover:border-[#00dc64] hover:text-[#00a84c] dark:border-white/15 dark:text-gray-300"
                  >
                    {showAllCharacters ? '접기' : `전체보기 (${allCharacters.length})`}
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 py-14 text-center text-gray-500 dark:border-white/15 dark:text-gray-400">
                {t('chat.noResults')}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
