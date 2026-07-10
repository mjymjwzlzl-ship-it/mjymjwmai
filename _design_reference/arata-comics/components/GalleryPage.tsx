import React from 'react';
import { Link } from 'react-router-dom';
import { GALLERY_CHARACTERS } from '../constants';
import { Heart } from 'lucide-react';

const GalleryPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-[21/9] md:aspect-[32/9] shadow-lg">
        <img 
            src="https://picsum.photos/1200/400?random=900" 
            alt="Gallery Banner" 
            className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl md:text-4xl font-black text-white mb-2 uppercase tracking-tight">Secret Gallery</h2>
            <p className="text-gray-200 text-sm md:text-base max-w-lg">
                웹툰 속 주인공들의 비밀스러운 모습을 만나보세요.<br/>
                오직 아라타 화보관에서만 공개됩니다.
            </p>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-arata-dark border border-gray-200 dark:border-arata-gray rounded-xl p-4 md:p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-arata-green rounded-full"></span>
            인기 캐릭터 화보
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {GALLERY_CHARACTERS.map((char) => (
                <Link to={`/gallery/${char.id}`} key={char.id} className="group cursor-pointer">
                    {/* Character Card */}
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 mb-3 shadow-md group-hover:shadow-[0_0_20px_rgba(0,220,100,0.3)] transition-all duration-300 ring-0 group-hover:ring-2 ring-arata-green/50">
                        <img 
                            src={char.thumbnail} 
                            alt={char.name} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
                        
                        {/* Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <span className="text-[10px] text-arata-green font-bold uppercase tracking-wider mb-1 block">
                                {char.webtoonTitle}
                            </span>
                            <h4 className="text-white font-bold text-lg md:text-xl leading-none mb-1">
                                {char.name}
                            </h4>
                            <div className="flex items-center gap-1 text-gray-300 text-xs">
                                <Heart size={12} fill="currentColor" className="text-pink-500" />
                                <span>화보 {char.photobooks.length}개</span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryPage;