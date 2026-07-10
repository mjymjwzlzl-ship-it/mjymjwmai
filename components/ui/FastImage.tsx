'use client'

import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '@/lib/config';

interface FastImageProps {
  src: string;
  alt: string;
  index: number;
  viewMode: 'fit' | 'full';
  onLoad?: () => void;
  previousLoaded?: boolean; // 이전 이미지가 로드되었는지
}

const FastImage: React.FC<FastImageProps> = ({ 
  src, 
  alt, 
  index, 
  viewMode, 
  onLoad,
  previousLoaded = true // 첫 번째 이미지는 항상 로드
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(index === 0); // 첫 번째 이미지만 즉시 로드
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 첫 이미지 즉시, 나머지는 순차 로딩 (이전 이미지 로드 후)
  useEffect(() => {
    // 첫 번째는 즉시 로드 (빠른 초기 표시)
    if (index === 0) {
      setShouldLoad(true);
    }
    // 2번째부터는 이전 이미지가 로드된 후에만 로드
    else if (previousLoaded) {
      // 약간의 지연으로 부드러운 로딩 (네트워크 과부하 방지)
      const timeout = setTimeout(() => {
        setShouldLoad(true);
      }, index < 15 ? 50 : 100); // 첫 15개는 빠르게, 나머지는 조금 느리게

      return () => clearTimeout(timeout);
    }
  }, [index, previousLoaded]);

  // Intersection Observer는 사용하지 않음 (프리로드 방식 사용)

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    
    // WebP 실패 시 원본으로 폴백
    if (target.src.includes('.webp')) {
      const originalUrl = src.replace('.webp', '');
      target.src = originalUrl;
    } else {
      setError(true);
    }
  };

  // 이미지 URL - 에피소드 뷰어 이미지는 원본 해상도 유지
  const imageUrl = getImageUrl(src, { noResize: true });

  return (
    <div className="w-full flex justify-center relative">
      {/* 에러 상태만 표시 */}
      {error && (
        <div className="flex justify-center items-center p-8">
          <div className="text-gray-400 text-center">
            <p>이미지를 불러올 수 없습니다</p>
            <button 
              onClick={() => {
                setError(false);
                if (imgRef.current) {
                  imgRef.current.src = imageUrl;
                }
              }}
              className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 이미지 */}
      {!error && shouldLoad && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          loading={index === 0 ? 'eager' : (index < 15 ? 'eager' : 'lazy')}
          className={`${
            viewMode === 'fit'
              ? 'w-full max-w-4xl h-auto'
              : 'max-w-none h-auto'
          } block`}
          style={{
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'pan-y pinch-zoom',
            imageRendering: 'auto',
            width: '100%',
            height: 'auto'
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default FastImage;