import React from 'react';
import { SHORTS_VIDEOS } from '../constants';
import { Play, Clock, Eye, Lock } from 'lucide-react';
import { useTheme } from './ThemeContext';

const ShortsPage: React.FC = () => {
  const { isAdult } = useTheme();

  if (!isAdult) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-6">
                <Lock size={40} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">성인 인증이 필요합니다</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                이 페이지는 19세 이상 이용 가능한 콘텐츠를 포함하고 있습니다.<br/>
                상단의 19+ 모드를 켜주세요.
            </p>
        </div>
    );
  }

  return (
    <div className="bg-white dark:bg-arata-black min-h-screen text-gray-900 dark:text-gray-100">
      {/* Hero / Featured */}
      <div className="relative aspect-video md:aspect-[21/9] bg-black overflow-hidden mb-8 group cursor-pointer">
         <img 
            src="https://picsum.photos/1200/600?random=666" 
            alt="Featured Short" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
         />
         <div className="absolute inset-0 flex flex-col items-center justify-center">
             <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-arata-green/90 text-black flex items-center justify-center pl-1 shadow-[0_0_30px_rgba(0,220,100,0.5)] group-hover:scale-110 transition-transform">
                 <Play size={32} fill="currentColor" />
             </div>
             <div className="mt-4 text-center">
                 <span className="inline-block bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded mb-2">HOT</span>
                 <h2 className="text-2xl md:text-4xl font-black text-white uppercase drop-shadow-lg">Premium Collection</h2>
                 <p className="text-gray-200 text-sm mt-1">이달의 인기 숏추 영상 모음</p>
             </div>
         </div>
      </div>

      <div className="px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                실시간 인기 숏추
            </h2>
            <div className="flex gap-2">
                <span className="text-xs font-bold px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded cursor-pointer">최신순</span>
                <span className="text-xs font-bold px-2 py-1 text-gray-500 hover:text-arata-green cursor-pointer">인기순</span>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {SHORTS_VIDEOS.map((video) => (
                <div key={video.id} className="group cursor-pointer">
                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800 mb-3 shadow-md group-hover:shadow-[0_0_15px_rgba(255,0,0,0.2)] dark:group-hover:shadow-[0_0_15px_rgba(255,50,50,0.2)]">
                        <img 
                            src={video.thumbnail} 
                            alt={video.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                        
                        {/* Duration Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock size={10} />
                            {video.duration}
                        </div>

                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                <Play size={20} fill="currentColor" />
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="px-1">
                        <h3 className="font-bold text-gray-900 dark:text-gray-200 text-base mb-1 line-clamp-1 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                            {video.title}
                        </h3>
                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{video.author}</span>
                            <div className="flex items-center gap-1">
                                <Eye size={12} />
                                <span>{video.views.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {video.tags.map(tag => (
                                <span key={tag} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ShortsPage;