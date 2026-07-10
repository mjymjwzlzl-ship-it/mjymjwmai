'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';

interface Webtoon {
  id: number;
  title: string;
  author?: string;
  authorName?: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  views?: number;
  viewCount?: number;
  rank?: number;
  rating?: string;
  ageRating?: string;
}

interface NetflixContentRowProps {
  title: string;
  data: Webtoon[];
  type?: 'ranked' | 'watching' | 'default';
  viewAllLink?: string;
}

const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (views >= 1000) {
    return `${Math.floor(views / 1000)}K`;
  }
  return views.toString();
};

const NetflixContentRow: React.FC<NetflixContentRowProps> = ({ title, data, type = 'default', viewAllLink }) => {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('매일');
  const rankingCategories = ['매일', '요일', '신작', '완결'];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, stop observing
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Load 200px before entering viewport
        threshold: 0.01
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      checkArrows();
    }
  }, [data, isVisible]);

  const checkArrows = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const targetScroll = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });

    setTimeout(checkArrows, 300);
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className="relative group/section mb-4 sm:mb-5 md:mb-6">
      <div className="flex justify-between items-center mb-2 md:mb-3">
        <h2
          className="text-lg sm:text-xl md:text-2xl font-bold flex items-center cursor-pointer touch-manipulation text-white hover:text-gray-300 transition-colors"
          onClick={() => viewAllLink && router.push(viewAllLink)}
        >
          {title} <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ml-1" />
        </h2>
        {type === 'ranked' && (
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
            {rankingCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`transition-colors duration-200 rounded-md px-2 sm:px-3 py-1 touch-manipulation ${
                  activeCategory === category
                    ? 'bg-[#2a2a2a] text-white font-semibold'
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-[45] w-12 h-full bg-gradient-to-r from-[#141414] to-transparent items-center justify-start opacity-0 hover:opacity-100 transition-opacity duration-200"
          aria-label="이전"
        >
          <div className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-[45] w-12 h-full bg-gradient-to-l from-[#141414] to-transparent items-center justify-end opacity-0 hover:opacity-100 transition-opacity duration-200"
          aria-label="다음"
        >
          <div className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={checkArrows}
        className="flex space-x-3 sm:space-x-4 md:space-x-6 overflow-x-auto md:overflow-x-auto overflow-y-visible pb-4 -mb-4 scrollbar-hide no-scrollbar scroll-smooth"
        style={{ cursor: 'default', WebkitOverflowScrolling: 'touch' }}
      >
        {isVisible ? (
          data.map((item, index) => (
            <div key={item.id} className="flex-shrink-0 group">
              {type === 'ranked' ? (
                <RankedCard item={item} index={index} />
              ) : (
                <DefaultCard item={item} />
              )}
            </div>
          ))
        ) : (
          // Placeholder to maintain layout before content loads
          <div className="h-72 w-full" />
        )}
      </div>
    </section>
  );
};

const RankedCard: React.FC<{ item: Webtoon; index: number }> = ({ item, index }) => {
  const router = useRouter();
  const imageUrl = getImageUrl(item.thumbnailUrl || item.thumbnail || '');
  const author = item.authorName || item.author;
  const viewCount = item.viewCount || item.views || 0;
  const rank = item.rank || (index + 1);

  return (
    <div className="w-28 sm:w-36 md:w-48 cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 touch-manipulation" onClick={() => router.push(`/webtoons/${item.id}`)}>
      <div className="relative w-28 h-40 sm:w-36 sm:h-52 md:w-48 md:h-72">
        {/* 썸네일 이미지 */}
        <img
          src={imageUrl}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-lg z-0"
        />
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-lg z-10" />
        {/* 조회수 */}
        {viewCount > 0 && (
          <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-black/60 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded flex items-center backdrop-blur-sm z-20">
            <EyeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1" />
            {formatViews(viewCount)}
          </div>
        )}
        {/* 랭크 숫자 - 카드 밖으로 빠져나오게 */}
        <span
          className="absolute bottom-[-6px] left-[-3px] sm:bottom-[-8px] sm:left-[-4px] md:bottom-[-10px] md:left-[-5px] text-5xl sm:text-6xl md:text-8xl font-black z-20"
          style={{
            color: 'white',
            WebkitTextFillColor: 'white',
            WebkitTextStroke: '1px #1E392A',
            paintOrder: 'stroke fill',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {rank}
        </span>
      </div>
      <h3 className="mt-1.5 md:mt-2 text-xs sm:text-sm md:text-base font-medium text-gray-200 truncate">{item.title}</h3>
      {author && <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">{author}</p>}
    </div>
  );
};

const DefaultCard: React.FC<{ item: Webtoon }> = ({ item }) => {
  const router = useRouter();
  const imageUrl = getImageUrl(item.thumbnailUrl || item.thumbnail || '');
  const author = item.authorName || item.author;
  const viewCount = item.viewCount || item.views || 0;
  const is19Plus = item.rating === '19' || item.ageRating === '19';

  return (
    <div className="w-28 sm:w-36 md:w-48 cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 touch-manipulation" onClick={() => router.push(`/webtoons/${item.id}`)}>
      <div className="relative w-28 h-40 sm:w-36 sm:h-52 md:w-48 md:h-72 rounded-lg overflow-hidden shadow-lg">
        {/* 썸네일 이미지 */}
        <img
          src={imageUrl}
          alt={item.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
        {/* 조회수 */}
        {viewCount > 0 && (
          <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-black/60 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded flex items-center backdrop-blur-sm z-20">
            <EyeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1" />
            {formatViews(viewCount)}
          </div>
        )}
        {is19Plus && (
          <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded z-20">
            19+
          </div>
        )}
      </div>
      <h3 className="mt-1.5 md:mt-2 text-xs sm:text-sm md:text-base font-medium text-gray-200 truncate">{item.title}</h3>
      {author && <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 truncate">{author}</p>}
    </div>
  );
};

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.18A13.489 13.489 0 0 1 10 1.5c4.26 0 8.05 2.007 10.336 5.09a1.651 1.651 0 0 1 0 1.18A13.489 13.489 0 0 1 10 18.5c-4.26 0-8.05-2.007-10.336-5.09ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
  </svg>
);

export default NetflixContentRow;
