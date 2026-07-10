import React from 'react';
import { LATEST_WEBTOONS } from '../constants';
import WebtoonCard from './WebtoonCard';
import { Plus } from 'lucide-react';
import { useTheme } from './ThemeContext';

const WebtoonGrid: React.FC = () => {
  const { isAdult } = useTheme();

  // Strict filtering based on isAdult mode
  const displayedWebtoons = isAdult 
    ? LATEST_WEBTOONS.filter(w => w.isAdult) 
    : LATEST_WEBTOONS.filter(w => !w.isAdult);

  return (
    <section className="bg-white dark:bg-arata-dark border border-gray-200 dark:border-arata-gray p-4 md:p-6 rounded-lg shadow-lg mb-8 transition-colors">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-arata-gray pb-2 relative">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white relative flex items-center gap-2">
          <span className="w-1 h-6 bg-arata-green rounded-full inline-block"></span>
          {isAdult ? '성인 인기 웹툰' : '최신 작품'}
        </h2>
        <button className="text-gray-500 hover:text-arata-green transition-colors flex items-center gap-1 text-sm">
            더보기 <Plus size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8">
        {displayedWebtoons.length > 0 ? (
            displayedWebtoons.slice(0, 12).map((webtoon) => (
            <WebtoonCard key={webtoon.id} webtoon={webtoon} />
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

export default WebtoonGrid;