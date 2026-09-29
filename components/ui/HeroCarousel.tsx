"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

type HeroItem = {
  id: string;
  title: string;
  tags: string[];
  image?: string;
  link?: string;
};

const defaultItems: HeroItem[] = [];

export default function HeroCarousel({ items = defaultItems }: { items?: HeroItem[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const [episodesData, setEpisodesData] = useState<{ [key: string]: any }>({});

  // 웹툰별 에피소드 정보 로드
  useEffect(() => {
    const fetchEpisodesForWebtoons = async () => {
      const episodes: { [key: string]: any } = {};
      
      for (const item of items) {
        // link에서 webtoon ID 추출
        const match = item.link?.match(/\/webtoons\/([^\/]+)/);
        if (match) {
          const webtoonId = match[1];
          try {
            const response = await api.get(`/frontend/comics/${webtoonId}/episodes`);
            if (response.data?.episodes) {
              episodes[item.id] = response.data.episodes;
            }
          } catch (error) {
            console.error(`Failed to fetch episodes for ${webtoonId}:`, error);
          }
        }
      }
      
      setEpisodesData(episodes);
    };
    
    if (items.length > 0) {
      fetchEpisodesForWebtoons();
    }
  }, [items]);

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(min-width:1024px)').matches) setPerView(3);
      else if (window.matchMedia('(min-width:768px)').matches) setPerView(2);
      else setPerView(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const pages = Math.max(1, items.length - perView + 1);
  const onPrev = () => setIndex((v) => Math.max(0, v - 1));
  const onNext = () => setIndex((v) => Math.min(pages - 1, v + 1));
  
  // 이어보기 핸들러
  const handleContinueReading = (item: HeroItem) => {
    const match = item.link?.match(/\/webtoons\/([^\/]+)/);
    if (!match) return;
    
    const webtoonId = match[1];
    const episodes = episodesData[item.id];
    
    if (!episodes || episodes.length === 0) {
      // 에피소드 데이터가 없으면 웹툰 페이지로 이동
      router.push(`/webtoons/${webtoonId}`);
      return;
    }
    
    // localStorage에서 읽은 진행률 가져오기
    const progress = localStorage.getItem(`webtoon_progress_${webtoonId}`);
    if (progress) {
      try {
        const progressData = JSON.parse(progress);
        const lastRead = progressData.lastReadEpisode;
        
        // 다음 에피소드 찾기
        const nextEpisode = episodes.find((ep: any) => ep.episodeNumber === lastRead + 1);
        if (nextEpisode) {
          router.push(`/webtoons/${webtoonId}/episode/${nextEpisode.id}`);
          return;
        }
        
        // 마지막 읽은 에피소드 찾기
        const lastEpisode = episodes.find((ep: any) => ep.episodeNumber === lastRead);
        if (lastEpisode) {
          router.push(`/webtoons/${webtoonId}/episode/${lastEpisode.id}`);
          return;
        }
      } catch (error) {
        console.error('Failed to parse progress:', error);
      }
    }
    
    // 진행률이 없으면 첫 번째 에피소드로
    const firstEpisode = episodes.sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)[0];
    if (firstEpisode) {
      router.push(`/webtoons/${webtoonId}/episode/${firstEpisode.id}`);
    } else {
      router.push(`/webtoons/${webtoonId}`);
    }
  };
  
  // 1화보기 핸들러
  const handleFirstEpisode = (item: HeroItem) => {
    const match = item.link?.match(/\/webtoons\/([^\/]+)/);
    if (!match) return;
    
    const webtoonId = match[1];
    const episodes = episodesData[item.id];
    
    if (!episodes || episodes.length === 0) {
      // 에피소드 데이터가 없으면 웹툰 페이지로 이동
      router.push(`/webtoons/${webtoonId}`);
      return;
    }
    
    // 첫 번째 에피소드 찾기 (episodeNumber 기준으로 정렬)
    const firstEpisode = episodes.sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)[0];
    if (firstEpisode) {
      router.push(`/webtoons/${webtoonId}/episode/${firstEpisode.id}`);
    } else {
      router.push(`/webtoons/${webtoonId}`);
    }
  };

  // 배너가 없으면 아무것도 렌더링하지 않음
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section aria-label="히어로 배너" className="relative">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="relative w-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex transition-transform duration-300"
            style={{ transform: `translateX(-${(index * 100) / perView}%)` }}
          >
            {items.map((item) => (
              <article
                key={item.id}
                className="relative shrink-0 basis-full px-2 md:basis-1/2 lg:basis-1/3"
              >
                <div className="block group">
                  <div className="aspect-square overflow-hidden rounded-2xl relative cursor-pointer transform transition-transform duration-300 hover:scale-[1.02]" 
                       style={{ 
                         background: item.image ? `url(${item.image})` : 'var(--surface)', 
                         backgroundSize: 'cover',
                         backgroundPosition: 'center',
                         color: 'var(--ui-text)' 
                       }}
                       onClick={() => {
                         if (item.link) {
                           window.location.href = item.link;
                         }
                       }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-200/80 via-emerald-100/40 to-transparent dark:from-black/80 dark:via-black/40 dark:to-transparent p-5 flex flex-col justify-end group-hover:from-emerald-200/90 group-hover:dark:from-black/90 transition-all duration-300">
                      <div className="max-w-[75%]">
                        <h3 className="mb-2 text-2xl font-bold md:text-3xl lg:text-4xl text-gray-900 dark:text-white drop-shadow-lg">{item.title}</h3>
                        <div className="mb-4 flex flex-wrap gap-2 text-xs md:text-sm">
                          {item.tags.slice(0, 2).map((t) => (
                            <span key={t} className="rounded-full px-2 py-1 bg-gray-900/20 dark:bg-white/20 text-gray-900 dark:text-white backdrop-blur-sm">#{t}</span>
                          ))}
                        </div>
                        <div className="flex gap-2 relative z-10">
                          <button 
                            className="h-10 rounded-full bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 md:h-11 inline-flex items-center justify-center cursor-pointer hover:scale-105 transform shadow-lg hover:shadow-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContinueReading(item);
                            }}
                          >
                            {t('home.hero.continue')}
                          </button>
                          <button 
                            className="h-10 rounded-full border-2 border-white bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/30 active:bg-white/40 transition-all duration-200 md:h-11 inline-flex items-center justify-center cursor-pointer hover:scale-105 transform shadow-lg hover:shadow-xl hover:border-white/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFirstEpisode(item);
                            }}
                          >
                            {t('home.hero.firstEpisode')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {/* Overlay arrows inside gutter */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-between px-2 md:flex md:px-4">
            <button
              aria-label="이전"
              onClick={onPrev}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-500/25 dark:border-white/25 bg-emerald-200/40 dark:bg-black/40 text-gray-900 dark:text-white hover:bg-emerald-300/60 dark:hover:bg-black/60"
            >
              <span className="-mt-[1px] text-xl">‹</span>
            </button>
            <button
              aria-label="다음"
              onClick={onNext}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-500/25 dark:border-white/25 bg-emerald-200/40 dark:bg-black/40 text-gray-900 dark:text-white hover:bg-emerald-300/60 dark:hover:bg-black/60"
            >
              <span className="-mt-[1px] text-xl">›</span>
            </button>
          </div>
        </div>
        {/* Dots */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <span key={i} className={i === index ? 'h-1.5 w-5 rounded-full' : 'h-1.5 w-1.5 rounded-full'} style={{ background: i === index ? 'var(--dot-active)' : 'var(--dot-inactive)' }} />
          ))}
        </div>
      </div>
    </section>
  );
}


