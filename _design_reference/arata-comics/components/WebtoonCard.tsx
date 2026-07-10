import React from 'react';
import { Webtoon } from '../types';
import { Link } from 'react-router-dom';
import { useLike } from './LikeContext';
import { Heart } from 'lucide-react';

interface WebtoonCardProps {
  webtoon: Webtoon;
}

const WebtoonCard: React.FC<WebtoonCardProps> = ({ webtoon }) => {
  const { isLiked, toggleLike } = useLike();
  const liked = isLiked(webtoon.id);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(webtoon.id);
  };

  return (
    <div className="group flex flex-col relative">
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-md bg-gray-200 dark:bg-arata-gray aspect-[3/4] md:aspect-video shadow-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,220,100,0.2)] hover:ring-1 hover:ring-arata-green/50">
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
          {webtoon.isNew && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-md">
              UP
            </span>
          )}
          {webtoon.isAdult && (
            <span className="bg-black/80 backdrop-blur-sm text-arata-green border border-arata-green text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              19
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <Link to={`/webtoon/${webtoon.id}`} className="mt-3 px-0.5 block">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-200 text-sm md:text-base line-clamp-1 group-hover:text-arata-green transition-colors">
            {webtoon.title}
          </h3>
          <span className="text-xs text-gray-500 shrink-0">{webtoon.author}</span>
        </div>
        {webtoon.synopsis && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {webtoon.synopsis}
          </p>
        )}
      </Link>
    </div>
  );
};

export default WebtoonCard;
