'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';

interface Banner {
  id: number;
  imageUrl: string;
  webtoonId?: number;
  link?: string;
  title?: string;
}

interface NetflixHeroProps {
  banners: Banner[];
}

const NetflixHero: React.FC<NetflixHeroProps> = ({ banners = [] }) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const totalItems = banners.length;

  if (!banners || banners.length === 0) {
    return null;
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  };

  // 스와이프 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const getSlideStyle = (index: number) => {
    const offset = index - currentIndex;
    const normalizedOffset = (offset + totalItems) % totalItems;

    let transform = '';
    let opacity = 0.8;
    let zIndex = totalItems - Math.abs(offset);

    if (normalizedOffset === 0) {
      transform = 'translateX(0) scale(1)';
      opacity = 1;
      zIndex = totalItems + 1;
    } else if (normalizedOffset === 1 || normalizedOffset === -1 * (totalItems - 1)) {
      transform = 'translateX(50%) scale(0.8)';
    } else if (normalizedOffset === totalItems - 1 || normalizedOffset === -1) {
      transform = 'translateX(-50%) scale(0.8)';
    } else {
      transform = `translateX(${offset > 0 ? 100 : -100}%) scale(0.7)`;
      opacity = 0;
    }

    return {
      transform,
      opacity,
      zIndex,
      transition: 'transform 0.5s ease, opacity 0.5s ease',
    };
  };

  const handleBannerClick = (banner: Banner) => {
    if (banner.webtoonId) {
      router.push(`/webtoons/${banner.webtoonId}`);
    } else if (banner.link) {
      if (banner.link.startsWith('http://') || banner.link.startsWith('https://')) {
        window.location.href = banner.link;
      } else {
        router.push(banner.link);
      }
    }
  };

  return (
    <div className="pb-8 md:pb-12 overflow-x-hidden">
      <div className="relative w-full flex items-center justify-center">
        {/* Slides */}
        <div
          className="relative w-[90vw] max-w-[352px] sm:max-w-[440px] md:max-w-[550px] aspect-[4/3]"
          style={{ perspective: '1000px' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="absolute w-full h-full cursor-pointer"
              style={getSlideStyle(index)}
              onClick={() => {
                if (index === currentIndex) {
                  handleBannerClick(banner);
                } else {
                  setCurrentIndex(index);
                }
              }}
            >
              <div className="relative w-full h-full rounded-lg shadow-2xl overflow-hidden">
                <img
                  src={getImageUrl(banner.imageUrl, { width: 1200 })}
                  alt={banner.title || `Banner ${index + 1}`}
                  loading={index < 2 ? "eager" : "lazy"}
                  className="absolute inset-0 w-full h-full object-cover touch-manipulation"
                />

                {banner.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 sm:p-6 md:p-8">
                    <h2 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl drop-shadow-2xl leading-tight" style={{ fontFamily: 'YGJALNAN, sans-serif' }}>
                      {banner.title}
                    </h2>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={prevSlide}
          className="absolute top-1/2 left-1 sm:left-4 transform -translate-y-1/2 bg-black/50 p-2 md:p-3 rounded-full text-white hover:bg-black/70 active:bg-black/80 focus:outline-none z-10 transition-all touch-manipulation"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon className="w-4 h-4 md:w-6 md:h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute top-1/2 right-1 sm:right-4 transform -translate-y-1/2 bg-black/50 p-2 md:p-3 rounded-full text-white hover:bg-black/70 active:bg-black/80 focus:outline-none z-10 transition-all touch-manipulation"
          aria-label="Next slide"
        >
          <ChevronRightIcon className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        {/* Pagination Dots */}
        <div className="absolute -bottom-6 md:-bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-all duration-300 touch-manipulation ${
                currentIndex === index ? 'bg-white scale-110' : 'bg-gray-500/80 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

export default NetflixHero;
