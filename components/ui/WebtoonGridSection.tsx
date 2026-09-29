'use client';

import React from 'react';
import WebtoonGridCard from './WebtoonGridCard';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface Webtoon {
  id: number;
  title: string;
  author?: string;
  authorName?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  views?: number;
  viewCount?: number;
  isNew?: boolean;
  isAdult?: boolean;
  ageRating?: string;
}

interface WebtoonGridSectionProps {
  title: string;
  data: Webtoon[];
  viewAllLink?: string;
  isAdult?: boolean;
  maxItems?: number;
}

const WebtoonGridSection: React.FC<WebtoonGridSectionProps> = ({
  title,
  data,
  viewAllLink,
  isAdult = false,
  maxItems = 8,
}) => {
  const displayedWebtoons = data.slice(0, maxItems);

  return (
    <section className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] p-4 md:p-6 rounded-lg shadow-sm mb-8 transition-colors">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-200 dark:border-[#2a2a2a]">
        <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
          <span className="w-1 h-6 bg-[#00dc64] rounded-full inline-block" />
          {title}
        </h2>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-gray-500 dark:text-gray-400 hover:text-[#00dc64] transition-colors text-sm font-medium flex items-center gap-0.5"
          >
            더보기
            <Plus size={14} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8">
        {displayedWebtoons.length > 0 ? (
          displayedWebtoons.map((webtoon) => (
            <WebtoonGridCard key={webtoon.id} webtoon={webtoon} isAdult={isAdult} />
          ))
        ) : (
          <div className="col-span-full py-10 text-center text-gray-500 dark:text-gray-400">
            표시할 웹툰이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
};

export default WebtoonGridSection;
