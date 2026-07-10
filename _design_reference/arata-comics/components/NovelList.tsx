import React, { useState } from 'react';
import { LATEST_NOVELS } from '../constants';
import WebtoonListItem from './WebtoonListItem';

const NovelList: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("전체");
  const categories = ["전체", "판타지", "무협", "로맨스", "현대물", "라이트노벨", "BL", "GL"];

  return (
    <div className="bg-white dark:bg-arata-dark rounded-lg shadow-lg border border-gray-200 dark:border-arata-gray overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-arata-gray bg-gray-50 dark:bg-[#252525]">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">인기 소설</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">매일 업데이트되는 다양한 장르의 소설을 만나보세요.</p>
        </div>

      {/* Filter Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-arata-gray bg-gray-100 dark:bg-[#202020]">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all ${
                        activeCategory === cat
                        ? 'bg-arata-green text-black shadow-md border border-arata-green' // Updated to Brand Green
                        : 'bg-white dark:bg-arata-black text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-300 dark:border-arata-gray'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {/* Novel List */}
      <div className="divide-y divide-gray-200 dark:divide-arata-gray">
        {LATEST_NOVELS.map((novel) => (
          <WebtoonListItem key={novel.id} webtoon={novel} />
        ))}
      </div>
      
      {/* Pagination Placeholder */}
      <div className="p-6 flex justify-center gap-2">
         {[1, 2, 3].map(num => (
             <button key={num} className={`w-8 h-8 flex items-center justify-center rounded border ${num === 1 ? 'border-arata-green text-arata-green' : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                 {num}
             </button>
         ))}
      </div>
    </div>
  );
};

export default NovelList;