import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LATEST_WEBTOONS, LATEST_NOVELS } from '../constants';
import { ChevronLeft, ChevronRight, List, Heart } from 'lucide-react';
import { useLike } from './LikeContext';

const WebtoonViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const totalEpisodes = 10; // Mock total episodes
  const { isLiked, toggleLike } = useLike();

  // Find webtoon in both lists
  const webtoon = LATEST_WEBTOONS.find(w => w.id === id) || LATEST_NOVELS.find(n => n.id === id);
  
  const liked = webtoon ? isLiked(webtoon.id) : false;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentEpisode]);

  if (!webtoon) {
    return <div className="text-gray-900 dark:text-white p-10 text-center">작품을 찾을 수 없습니다.</div>;
  }

  const handlePrev = () => {
    if (currentEpisode > 0) {
      setCurrentEpisode(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentEpisode < totalEpisodes) {
      setCurrentEpisode(prev => prev + 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-black min-h-screen pb-10 flex flex-col transition-colors duration-300">
        {/* Title Header */}
        <div className="sticky top-[60px] md:top-[73px] z-40 bg-white dark:bg-arata-dark border-b border-gray-200 dark:border-arata-gray p-4 flex items-center justify-between shadow-md transition-colors">
             <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate px-2 flex-1">
                {webtoon.title}
             </h1>
             <div className="flex items-center gap-3">
                <button 
                    onClick={() => toggleLike(webtoon.id)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                    <Heart 
                        size={24} 
                        className={`transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-gray-400 dark:text-gray-300'}`} 
                    />
                </button>
                <span className="text-arata-green font-bold whitespace-nowrap text-sm md:text-base">
                    {currentEpisode === 0 ? '프롤로그' : `${currentEpisode}화`}
                </span>
             </div>
        </div>

        {/* Episode Selector */}
        <div className="bg-gray-100 dark:bg-[#202020] p-3 overflow-x-auto whitespace-nowrap border-b border-gray-200 dark:border-arata-gray no-scrollbar transition-colors">
            {/* Generate 0 to totalEpisodes */}
            {Array.from({ length: totalEpisodes + 1 }, (_, i) => i).map(ep => (
                <button
                    key={ep}
                    onClick={() => setCurrentEpisode(ep)}
                    className={`inline-block px-4 py-2 mx-1 rounded text-xs md:text-sm font-bold transition-colors ${
                        currentEpisode === ep
                        ? 'bg-arata-green text-black shadow-[0_0_10px_rgba(0,220,100,0.4)]'
                        : 'bg-white dark:bg-arata-gray text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white border border-gray-300 dark:border-transparent'
                    }`}
                >
                    {ep === 0 ? '0화' : `${ep}화`}
                </button>
            ))}
        </div>

        {/* Viewer Content (Images) */}
        <div className="flex flex-col items-center w-full bg-white dark:bg-black min-h-[500px] transition-colors">
             {/* Simulating webtoon strip with repeated images for demo */}
             <div className="w-full max-w-3xl">
                {currentEpisode === 0 && (
                    <div className="w-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-500 py-10 text-center mb-0 text-sm">
                        프롤로그 페이지입니다.
                    </div>
                )}
                <img src={webtoon.thumbnail} alt="content 1" className="w-full object-cover" />
                <img src={webtoon.thumbnail} alt="content 2" className="w-full object-cover" />
                <img src={webtoon.thumbnail} alt="content 3" className="w-full object-cover" />
             </div>
        </div>

        {/* Bottom Navigation */}
        <div className="max-w-3xl w-full mx-auto px-4 mt-8 grid grid-cols-2 gap-4">
            <button
                onClick={handlePrev}
                disabled={currentEpisode === 0}
                className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-arata-gray text-gray-700 dark:text-white py-4 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={20} />
                이전화
            </button>
            <button
                onClick={handleNext}
                disabled={currentEpisode === totalEpisodes}
                className="flex items-center justify-center gap-2 bg-arata-green text-black py-4 rounded-lg font-bold hover:bg-green-400 disabled:opacity-50 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                다음화
                <ChevronRight size={20} />
            </button>
        </div>
        
        {/* List Button */}
        <div className="mt-4 px-4 w-full">
            <button 
                onClick={() => navigate(-1)}
                className="w-full bg-gray-200 dark:bg-[#333] text-gray-600 dark:text-gray-300 py-3 rounded-lg font-medium hover:text-black dark:hover:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
                <List size={18}/> 목록으로 돌아가기
            </button>
        </div>
    </div>
  );
};

export default WebtoonViewer;