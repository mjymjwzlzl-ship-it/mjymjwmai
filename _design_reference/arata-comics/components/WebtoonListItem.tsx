import React from 'react';
import { Webtoon } from '../types';
import { Clock, Eye, ThumbsUp, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLike } from './LikeContext';

interface WebtoonListItemProps {
  webtoon: Webtoon;
}

const WebtoonListItem: React.FC<WebtoonListItemProps> = ({ webtoon }) => {
  const { isLiked, toggleLike } = useLike();
  const liked = isLiked(webtoon.id);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(webtoon.id);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-200 dark:border-arata-gray hover:bg-gray-100 dark:hover:bg-arata-dark/50 transition-colors group relative">
      {/* Thumbnail */}
      <div className="flex-shrink-0 relative w-full md:w-64 aspect-video rounded-md overflow-hidden bg-gray-200 dark:bg-arata-gray">
        <Link to={`/webtoon/${webtoon.id}`} className="block w-full h-full">
          <img 
            src={webtoon.thumbnail} 
            alt={webtoon.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        </Link>
        
        {/* Like Button */}
        <button 
          onClick={handleLike}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors z-10"
        >
          <Heart 
            size={18} 
            className={`transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} 
          />
        </button>

        {/* Mobile Badges */}
        <div className="absolute top-2 left-2 flex gap-1 md:hidden pointer-events-none">
            {webtoon.isAdult && <span className="bg-black text-arata-green border border-arata-green text-[10px] font-bold px-1 rounded">19</span>}
        </div>
      </div>

      {/* Content */}
      <Link to={`/webtoon/${webtoon.id}`} className="flex-1 min-w-0 flex flex-col justify-start">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-arata-green transition-colors line-clamp-1 md:line-clamp-none">
                {webtoon.title}
            </h3>
        </div>

        {/* Synopsis */}
        {webtoon.synopsis && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {webtoon.synopsis}
            </p>
        )}

        {/* Meta Data */}
        <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500 mb-3">
            {webtoon.updatedAt && (
                <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                    <Clock size={14} />
                    <span>{webtoon.updatedAt}</span>
                </div>
            )}
            <div className="flex items-center gap-1">
                <ThumbsUp size={14} />
                <span>{webtoon.likes || 0}</span>
            </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
            {webtoon.tags && webtoon.tags.map((tag, index) => (
                <span 
                    key={index} 
                    className="px-2 py-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-300 text-[11px] md:text-xs rounded hover:border-arata-green hover:text-arata-green transition-colors"
                >
                    {tag}
                </span>
            ))}
        </div>
      </Link>
    </div>
  );
};

export default WebtoonListItem;
