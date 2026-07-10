'use client'

import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Eye, Star, Calendar, User, Coins } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useInteractionStore } from '@/store/interaction';

interface WebtoonCardProps {
  id: number | string;
  title: string;
  author: string;
  genre: string;
  thumbnailUrl: string;
  viewCount: number;
  commentCount: number;
  rating: number;
  totalEpisodes: number;
  viewedEpisodes?: number;
  updatedAt: string;
  isLiked?: boolean;
  isOfficial?: boolean;
  ageRating?: number; // 15, 19 등
  recentComments?: Array<{
    user: string;
    content: string;
  }>;
  className?: string;
  freeEpisodes?: number;
  coinPrice?: number;
  paidStartEpisode?: number;
  voiceVideoUrl?: string; // voice.mp4 URL 추가
  hoveredCardId?: number | string | null; // 현재 호버된 카드 ID
  onHoverChange?: (id: number | string | null) => void; // 호버 변경 콜백
}

const WebtoonCard: React.FC<WebtoonCardProps> = memo(({
  id,
  title,
  author,
  genre,
  thumbnailUrl,
  viewCount,
  commentCount,
  rating,
  totalEpisodes,
  viewedEpisodes = 0,
  updatedAt,
  isLiked = false,
  isOfficial = false,
  ageRating,
  recentComments = [],
  className = "",
  freeEpisodes = 0,
  coinPrice = 0,
  paidStartEpisode,
  voiceVideoUrl,
  hoveredCardId,
  onHoverChange
}) => {
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  const [showComments, setShowComments] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const { t } = useTranslation();

  // 터치 디바이스 감지
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  // 모바일 감지 (화면 너비 기준)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // 외부에서 제어되는 호버 상태 (hoveredCardId가 있으면 사용, 없으면 내부 상태 사용)
  const [internalIsHovered, setInternalIsHovered] = useState(false);
  const isHovered = hoveredCardId !== undefined ? hoveredCardId === id : internalIsHovered;

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInteracted = useInteractionStore((state) => state.hasInteracted);

  // 비디오 핸들러 (모바일에서는 비활성화)
  const handleVideoMouseEnter = useCallback(() => {
    // 모바일에서는 비디오 재생 안 함
    if (isTouchDevice) return;

    if (videoRef.current && videoWrapperRef.current && imgRef.current && voiceVideoUrl) {
      // 이미지 투명도를 0으로
      imgRef.current.style.opacity = '0';
      // 비디오 래퍼의 투명도를 1로
      videoWrapperRef.current.style.opacity = '1';

      // 먼저 muted 상태로 재생 시작 (autoplay 정책 우회)
      videoRef.current.play()
        .then(() => {
          // 사용자가 페이지와 상호작용했을 경우에만 소리 켜기
          if (videoRef.current && hasInteracted) {
            videoRef.current.muted = false;
          }
        })
        .catch(() => {});
    }
  }, [voiceVideoUrl, hasInteracted, isTouchDevice]);

  const handleVideoMouseLeave = useCallback(() => {
    // 모바일에서는 아무 작업도 하지 않음
    if (isTouchDevice) return;

    if (videoRef.current && videoWrapperRef.current && imgRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      // 소리 끄기
      videoRef.current.muted = true;

      // 비디오 래퍼를 다시 투명하게
      videoWrapperRef.current.style.opacity = '0';
      // 이미지를 다시 보이게
      imgRef.current.style.opacity = '1';
    }
  }, [isTouchDevice]);

  const progress = totalEpisodes > 0 ? (viewedEpisodes / totalEpisodes) * 100 : 0;

  // 컴포넌트 마운트 시 찜 상태 확인
  useEffect(() => {
    checkFavoriteStatus();
  }, [id]);

  const checkFavoriteStatus = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/favorites/check/${id}`);
      if (response.data) {
        setLiked(response.data.isFavorite);
      }
    } catch (error) {
      console.error('찜 상태 확인 실패:', error);
    }
  };

  const formatNumber = (num: number | string | undefined) => {
    const n = typeof num === 'number' ? num : parseFloat(String(num)) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return t('webtoon.daysAgo', { count: 1 });
    if (diffDays < 7) return t('webtoon.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('webtoon.weeksAgo', { count: Math.ceil(diffDays / 7) });
    return t('webtoon.monthsAgo', { count: Math.ceil(diffDays / 30) });
  };

  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) return;
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      alert(t('webtoon.loginRequired'));
      return;
    }

    setIsProcessing(true);
    const newLikedState = !liked;
    
    try {
      const response = await api.post(`/favorites/${id}`, {
        title,
        author,
        thumbnailUrl,
        totalEpisodes,
        genre,
        viewCount,
        rating
      });

      if (response.data) {
        setLiked(response.data.action === 'added');
      }

      // 전역 이벤트 발생 (다른 컴포넌트 동기화용)
      window.dispatchEvent(new CustomEvent('favoriteToggled', {
        detail: { webtoonId: id, isFavorite: newLikedState }
      }));
    } catch (error) {
      console.error('찜 처리 실패:', error);
      alert(t('webtoon.favoriteError'));
    } finally {
      setIsProcessing(false);
    }
  }, [liked, id, title, author, thumbnailUrl, totalEpisodes, genre, viewCount, rating, isProcessing]);

  // 터치 디바이스용 탭 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    // 터치 디바이스이고 voice video가 있는 경우에만 처리
    if (!isTouchDevice || !voiceVideoUrl) return;

    e.preventDefault();
    e.stopPropagation();

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    if (newTapCount === 1) {
      // 첫 번째 탭: 영상 재생
      if (onHoverChange) {
        onHoverChange(id);
      } else {
        setInternalIsHovered(true);
      }
      setShowComments(true);
      handleVideoMouseEnter();
      // 자동 리셋 제거 - 사용자가 수동으로 닫거나 다시 탭
    } else if (newTapCount === 2) {
      // 두 번째 탭: 영상 중지하고 페이지 이동
      setTapCount(0);
      if (onHoverChange) {
        onHoverChange(null);
      } else {
        setInternalIsHovered(false);
      }
      setShowComments(false);
      handleVideoMouseLeave();
      router.push(`/webtoons/${id}`);
    } else {
      // 세 번째 이상 탭: 영상 중지
      setTapCount(0);
      if (onHoverChange) {
        onHoverChange(null);
      } else {
        setInternalIsHovered(false);
      }
      setShowComments(false);
      handleVideoMouseLeave();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  // 앱에서는 a 태그 사용, 웹에서는 Link 사용
  const isApp = typeof window !== 'undefined' && (window as any).isArataApp;

  const CardWrapper = ({ children, ...props }: any) => {
    // voice video가 있으면 Fragment로 반환 (Link 없음) - 웹과 모바일 모두
    if (voiceVideoUrl) {
      return <>{children}</>;
    }

    // 일반적인 경우 Link 또는 a 태그 사용
    if (isApp) {
      return (
        <a href={`/webtoons/${id}`} {...props}>
          {children}
        </a>
      );
    }
    return (
      <Link href={`/webtoons/${id}`} prefetch={false} {...props}>
        {children}
      </Link>
    );
  };

  // 호버 핸들러
  const handleMouseEnterCard = () => {
    if (onHoverChange) {
      onHoverChange(id);
    } else {
      setInternalIsHovered(true);
    }
  };

  const handleMouseLeaveCard = () => {
    if (onHoverChange) {
      onHoverChange(null);
    } else {
      setInternalIsHovered(false);
    }
  };

  // 웹 브라우저에서 voiceVideoUrl이 있을 때 클릭 핸들러
  const handleCardClick = () => {
    if (voiceVideoUrl && !isTouchDevice) {
      router.push(`/webtoons/${id}`);
    }
  };

  return (
    <div
      className={`group relative overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 ${isHovered ? (isTouchDevice ? 'scale-105 z-[999]' : 'scale-110 z-[999]') : 'z-0'} ${className}`}
      data-webtoon-id={id}
      onMouseEnter={isTouchDevice || voiceVideoUrl ? undefined : handleMouseEnterCard}
      onMouseLeave={isTouchDevice || voiceVideoUrl ? undefined : handleMouseLeaveCard}
      onTouchStart={isTouchDevice && voiceVideoUrl ? handleTouchStart : undefined}
    >
      <CardWrapper>
        {/* 썸네일 컨테이너 */}
        <div
          className="relative aspect-[4/5] overflow-visible"
          onClick={voiceVideoUrl && !isTouchDevice ? handleCardClick : undefined}
          onMouseEnter={handleVideoMouseEnter}
          onMouseLeave={handleVideoMouseLeave}
          style={voiceVideoUrl && !isTouchDevice ? { cursor: 'pointer' } : undefined}
        >
          {/* 썸네일 이미지 (z-index: 10) */}
          <img
            ref={imgRef}
            src={getImageUrl(thumbnailUrl) || 'https://via.placeholder.com/300x400/4A5568/FFFFFF?text=썸네일'}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ zIndex: 10, opacity: 1 }}
          />

          {/* 비디오 래퍼 (z-index: 20) - 모바일에서는 렌더링 안 함 */}
          {voiceVideoUrl && !isMobile && (
            <div
              ref={videoWrapperRef}
              className="absolute inset-0 w-full h-full transition-opacity duration-300"
              style={{ zIndex: 20, opacity: 0 }}
            >
              <video
                ref={videoRef}
                src={voiceVideoUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="none"
              />
            </div>
          )}

          {/* 그라데이션 오버레이 (z-index: 30) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ zIndex: 30 }} />

          {/* 상단 우측 찜 버튼 (z-index: 40) */}
          <button
            onClick={handleLikeClick}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors duration-200"
            style={{ zIndex: 40 }}
            aria-label="찜하기"
          >
            <Heart 
              className={`w-4 h-4 transition-colors duration-200 ${
                liked ? 'text-red-500 fill-red-500' : 'text-white hover:text-red-400'
              }`} 
            />
          </button>

          {/* 공식/유저 배지 */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOfficial && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold px-2 py-1 rounded">
                OFFICIAL
              </div>
            )}
            {/* 연령 등급 배지 */}
            {ageRating && ageRating >= 15 && (
              <div className={`text-white text-xs font-bold px-2 py-1 rounded ${
                ageRating >= 19 ? 'bg-red-600' : 'bg-orange-500'
              }`}>
                {ageRating}+
              </div>
            )}
          </div>

          {/* 가격 정보 표시 - 제거됨 */}

          {/* 진행률 바 */}
          {viewedEpisodes > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* 호버 시 댓글 미리보기 */}
          {showComments && recentComments.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 rounded-lg p-3 transform transition-all duration-300">
              <h4 className="text-white text-sm font-medium mb-2">{t('webtoon.recentComments')}</h4>
              <div className="space-y-1">
                {recentComments.slice(0, 2).map((comment, index) => (
                  <div key={index} className="text-xs">
                    <span className="text-purple-300 font-medium">{comment.user}: </span>
                    <span className="text-gray-300">{comment.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 카드 정보 */}
        <div className="p-3">
          {/* 제목 */}
          <h3 className="text-gray-950 dark:text-gray-100 font-semibold text-sm mb-1 line-clamp-1 group-hover:text-[#00c853] transition-colors duration-200">
            {title}
          </h3>

          {/* 작가 */}
          <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-2">
            <User className="w-3 h-3 mr-1" />
            <span className="truncate">{author}</span>
          </div>

          {/* 장르 태그 */}
          <div className="mb-2">
            <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded">
              {genre}
            </span>
          </div>

          {/* 통계 정보 */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              {/* 조회수 */}
              <div className="flex items-center">
                <Eye className="w-3 h-3 mr-0.5" />
                <span>{formatNumber(viewCount)}</span>
              </div>

              {/* 평점 - rating이 0보다 크면 표시 */}
              {rating > 0 && (
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current mr-0.5" />
                  <span>{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
                </div>
              )}
            </div>

            {/* 에피소드 수 */}
            <span className="text-xs">{t('webtoon.totalEpisodes', { count: totalEpisodes })}</span>
          </div>
        </div>
      </CardWrapper>
    </div>
  );
});

WebtoonCard.displayName = 'WebtoonCard';

export default WebtoonCard;
