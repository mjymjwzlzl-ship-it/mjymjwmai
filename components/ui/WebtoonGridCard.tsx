'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  localizeComicAuthor,
  localizeComicGenre,
  localizeComicTitle,
  resolveComicGenre,
} from '@/lib/comic-localization';
import { getImageUrl } from '@/lib/utils';

interface Webtoon {
  id: number | string;
  title: string;
  author?: string | { username?: string; name?: string };
  authorName?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  views?: number;
  viewCount?: number;
  isNew?: boolean;
  isAdult?: boolean;
  ageRating?: string;
  genre?: string;
}

interface WebtoonGridCardProps {
  webtoon: Webtoon;
  isAdult?: boolean;
}

const WebtoonGridCard: React.FC<WebtoonGridCardProps> = ({ webtoon, isAdult = false }) => {
  const { locale, t } = useLanguage();
  const thumbnailUrl = getImageUrl(webtoon.thumbnailUrl || webtoon.thumbnail || '');
  const displayTitle = localizeComicTitle(webtoon, locale, webtoon.title);
  const author = localizeComicAuthor(webtoon, locale, 'ARATA');
  const genre = localizeComicGenre(resolveComicGenre(webtoon), locale);
  const views = webtoon.views || webtoon.viewCount || 0;
  const href = isAdult ? `/adult/webtoons/${webtoon.id}` : `/webtoons/${webtoon.id}`;

  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toLocaleString();
  };

  return (
    <Link href={href} className="group cursor-pointer flex flex-col">
      <div className="relative overflow-hidden rounded-md bg-gray-200 dark:bg-[#2a2a2a] aspect-[3/4] md:aspect-video shadow-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,220,100,0.22)] hover:ring-1 hover:ring-[#00dc64]/50">
        <img
          src={thumbnailUrl}
          alt={displayTitle}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
          {webtoon.isNew && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-md">
              UP
            </span>
          )}
          {(webtoon.isAdult || webtoon.ageRating === '19+') && (
            <span className="bg-black/80 text-[#00dc64] border border-[#00dc64] text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              19
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 px-0.5">
        <h3 className="break-words text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#00dc64] dark:text-gray-100 md:text-base">
          {displayTitle}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="min-w-0 break-words">{author}</span>
          <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] dark:border-gray-700">
            {genre}
          </span>
          <span className="ml-auto shrink-0">{t('list.views', { count: formatViews(views) })}</span>
        </div>
      </div>
    </Link>
  );
};

export default WebtoonGridCard;
