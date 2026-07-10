import React from 'react';
import { LATEST_WEBTOONS, LATEST_NOVELS } from '../constants';
import WebtoonCard from './WebtoonCard';
import { useLike } from './LikeContext';
import { Heart } from 'lucide-react';

const LikedWebtoonsPage: React.FC = () => {
  const { likedWebtoons } = useLike();

  // Combine both lists to search for liked items
  const allWorks = [...LATEST_WEBTOONS, ...LATEST_NOVELS];
  const likedList = allWorks.filter(work => likedWebtoons.includes(work.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-arata-gray pb-4">
        <Heart className="text-red-500 fill-red-500" size={28} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          좋아요한 작품
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          총 {likedList.length}개
        </span>
      </div>

      {likedList.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8">
          {likedList.map((webtoon) => (
            <WebtoonCard key={webtoon.id} webtoon={webtoon} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-arata-dark rounded-xl border border-gray-200 dark:border-arata-gray">
          <Heart size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-2">아직 좋아요한 작품이 없습니다.</p>
          <p className="text-sm">마음에 드는 작품에 하트를 눌러보세요!</p>
        </div>
      )}
    </div>
  );
};

export default LikedWebtoonsPage;
