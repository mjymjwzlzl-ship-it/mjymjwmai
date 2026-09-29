'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home, List, MessageCircle, Heart, Share2, Settings, Eye, EyeOff, Coins, Lock, X, AlertTriangle } from 'lucide-react';
import FastImage from '@/components/ui/FastImage';
import CommentSection from '@/components/ui/CommentSection';
import RatingSection from '@/components/ui/RatingSection';
import EpisodeEndMembershipBanner from '@/components/ui/EpisodeEndMembershipBanner';
import { useAdultStore } from '@/store/adult';

// Dynamic Import로 모달 컴포넌트 로드 (초기 번들 사이즈 감소)
const AdultVerificationModal = dynamic(() => import('@/components/ui/AdultVerificationModal'), {
  ssr: false,
  loading: () => null
});
const CoinPurchaseModal = dynamic(() => import('@/components/ui/CoinPurchaseModal'), {
  ssr: false,
  loading: () => null
});
const ReportModal = dynamic(() => import('@/components/ui/ReportModal'), {
  ssr: false,
  loading: () => null
});
import { getImageUrl } from '@/lib/config';
import { api } from '@/lib/api';
import { eventBus, EVENTS } from '@/lib/events';
import { useTranslation } from '@/lib/i18n';
import { useLoginModalStore } from '@/store/loginModal';

interface Episode {
  id: number;
  title: string;
  episodeNumber: number;
  images: string[];
  createdAt: string;
  webtoonTitle?: string;
  author?: string;
  isFree?: boolean;
  coinPrice?: number;
  canView?: boolean;
  needsPurchase?: boolean;
  needsLogin?: boolean;
  needsSubscription?: boolean;
  requiresAdultVerification?: boolean;
  comic?: {
    title: string;
    thumbnailUrl?: string;
    rating?: string;
    genre?: string;
    ageRating?: string;
  };
}

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const setAdult = useAdultStore((s) => s.setAdult);
  const setLoginModalOpen = useLoginModalStore((s) => s.setOpen);

  // 로그인 팝업으로 로그인하면 열람 권한을 다시 확인한다
  useEffect(() => {
    const handleUserLogin = () => window.location.reload();
    window.addEventListener('userLogin', handleUserLogin);
    return () => window.removeEventListener('userLogin', handleUserLogin);
  }, []);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const [isFirstEpisode, setIsFirstEpisode] = useState(false);
  const [isLastEpisode, setIsLastEpisode] = useState(false);
  const [nextEpisodeId, setNextEpisodeId] = useState<number | null>(null);
  const [prevEpisodeId, setPrevEpisodeId] = useState<number | null>(null);
  const [showAdultVerification, setShowAdultVerification] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [showCoinPurchase, setShowCoinPurchase] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // fetchEpisodeData 함수를 useEffect 전에 정의
  const fetchEpisodeData = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // 먼저 모든 에피소드 목록을 가져와서 이전/다음 에피소드 ID를 찾기
      try {
        const episodesResponse = await api.get(`/frontend/comics/${params.id}/episodes`);
        if (episodesResponse.data && episodesResponse.data.episodes) {
          const allEpisodes = episodesResponse.data.episodes.sort((a: any, b: any) => 
            a.episodeNumber - b.episodeNumber
          );
          
          const currentIndex = allEpisodes.findIndex((ep: any) => 
            ep.id === params.episodeId || ep.id === parseInt(params.episodeId as string)
          );
          
          if (currentIndex !== -1) {
            // 이전화가 있는지 확인
            if (currentIndex > 0) {
              setPrevEpisodeId(allEpisodes[currentIndex - 1].id);
              setIsFirstEpisode(false);
            } else {
              setIsFirstEpisode(true);
            }
            
            // 다음화가 있는지 확인
            if (currentIndex < allEpisodes.length - 1) {
              setNextEpisodeId(allEpisodes[currentIndex + 1].id);
              setIsLastEpisode(false);
            } else {
              setIsLastEpisode(true);
            }
          }
        }
      } catch (error) {
        console.error('에피소드 목록을 불러오는데 실패했습니다', error);
      }
      
      const response = await api.get(`/episodes/${params.episodeId}`, {
        headers: token ? { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        } : {}
      });
      
      if (response.data) {
        const episodeData = response.data.episode;
        
        // 이미지 파싱
        let parsedImages: string[] = [];
        if (episodeData.images && episodeData.canView) {
          if (Array.isArray(episodeData.images)) {
            parsedImages = [...episodeData.images];
          } else {
            try {
              if (typeof episodeData.images === 'string') {
                parsedImages = JSON.parse(episodeData.images);
              }
            } catch (e) {
              if (typeof episodeData.images === 'string') {
                parsedImages = episodeData.images.split(',').map((img: string) => img.trim());
              }
            }
          }
          
          // 이미지 프리로드 - 첫 이미지 최우선, 나머지 순차 로드
          if (parsedImages.length > 0) {
            // 첫 번째 이미지만 최우선 즉시 로드 (빠른 초기 표시)
            const firstImg = new Image();
            firstImg.src = getImageUrl(parsedImages[0]);
            // @ts-ignore
            firstImg.fetchPriority = 'high';
            firstImg.decoding = 'sync'; // 동기식으로 즉시 디코딩

            // 2-15번째는 즉시 병렬 로드 (첫 페이지)
            if (parsedImages.length > 1) {
              parsedImages.slice(1, 15).forEach((url: string, idx: number) => {
                const img = new Image();
                img.src = getImageUrl(url);
                // @ts-ignore
                img.fetchPriority = 'auto';
                img.decoding = 'async';
              });
            }

            // 16번째부터는 백그라운드에서 계속 프리로드
            if (parsedImages.length > 15) {
              setTimeout(() => {
                parsedImages.slice(15).forEach((url: string) => {
                  const img = new Image();
                  img.src = getImageUrl(url);
                  // @ts-ignore
                  img.fetchPriority = 'low';
                  img.decoding = 'async';
                });
              }, 200);
            }
          }
        }
        
        // 데이터 설정
        const nextEpisode: Episode = {
          id: episodeData.id,
          title: episodeData.title,
          episodeNumber: episodeData.episodeNumber,
          images: parsedImages,
          createdAt: episodeData.createdAt,
          webtoonTitle: episodeData.comic?.title || '',
          author: episodeData.comic?.author?.nickname || '작가',
          isFree: episodeData.isFree,
          coinPrice: episodeData.coinPrice,
          canView: episodeData.canView,
          needsPurchase: episodeData.needsPurchase,
          needsLogin: episodeData.needsLogin,
          needsSubscription: episodeData.needsSubscription,
          requiresAdultVerification: episodeData.requiresAdultVerification,
          comic: episodeData.comic
        };

        setEpisode(nextEpisode);

        // 성인 웹툰이면 자동으로 19금 토글 ON
        const isAdultEpisode = episodeData.comic?.ageRating ? (episodeData.comic.ageRating === '19' || String(episodeData.comic.ageRating) === '19') : false;
        if (isAdultEpisode) {
          setAdult('on');
        }
        
        // 성인인증이 필요한 경우
        if (episodeData.requiresAdultVerification) {
          setShowAdultVerification(true);
          return;
        }

        // 로그인/구독이 필요한 경우는 화면 내 안내 패널로 처리 (needsLogin / needsSubscription)

        // 에피소드를 볼 수 있는 경우 시청 기록 업데이트
        if (episodeData.canView) {
          updateViewHistory(nextEpisode);
          // 백엔드에서 이미 조회수와 읽음 상태를 처리함 (episodes/:id GET 요청 시)
        }
      }
      
      // 좋아요/싫어요 상태 확인
      if (token) {
        try {
          const reactionResponse = await api.get(`/episodes/${params.episodeId}/reaction`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsLiked(reactionResponse.data.isLiked || false);
          setIsDisliked(reactionResponse.data.isDisliked || false);
          setLikeCount(reactionResponse.data.likeCount || 0);
          setDislikeCount(reactionResponse.data.dislikeCount || 0);
        } catch (error) {
          console.error('반응 상태 확인 실패:', error);
        }
      }
    } catch (error) {
      console.error('에피소드 데이터를 불러오는데 실패했습니다', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, params.episodeId, router]);

  // 초기 데이터 로드
  useEffect(() => {
    // 사용자 정보를 서버에서 가져오기
    const fetchUserData = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          const response = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            setUser(response.data);
            setCoinBalance(response.data.coinBalance || 0);
            setUserDataLoaded(true);
            
            // localStorage도 업데이트
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('사용자 정보를 불러오는데 실패했습니다', error);
          // 실패 시 localStorage 사용
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setCoinBalance(parsedUser.coinBalance || 0);
            setUserDataLoaded(true);
          }
        }
      } else {
        setUserDataLoaded(true); // 로그인하지 않은 경우에도 로드 완료 표시
      }
    };

    fetchUserData();

    if (params.id && params.episodeId) {
      fetchEpisodeData();
    }
  }, [params.id, params.episodeId, fetchEpisodeData]);

  // 스크롤 진행률 추적
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setScrollProgress(Math.min(progress, 100));
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 자동 컨트롤 숨기기
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  const updateViewHistory = (currentEpisode = episode) => {
    if (!params.id || !currentEpisode) return;
    
    try {
      // 조회 기록 업데이트
      const viewHistory = JSON.parse(localStorage.getItem('viewedWebtoons') || '[]');
      const existingIndex = viewHistory.findIndex((item: any) => item.webtoonId.toString() === params.id?.toString());
      
      const viewRecord = {
        webtoonId: params.id,
        webtoonTitle: currentEpisode.webtoonTitle || t('webtoon.defaultTitle'),
        lastEpisode: currentEpisode.episodeNumber || 1,
        lastEpisodeTitle: currentEpisode.title || '',
        viewedAt: new Date().toISOString(),
        thumbnailUrl: currentEpisode.comic?.thumbnailUrl || ''
      };

      if (existingIndex >= 0) {
        viewHistory[existingIndex] = viewRecord;
      } else {
        viewHistory.unshift(viewRecord);
      }
      
      // 읽음 상태 업데이트
      if (currentEpisode.episodeNumber) {
        const progressKey = `webtoon_progress_${params.id}`;
        const progress = localStorage.getItem(progressKey);
        let progressData = { lastReadEpisode: 0, readEpisodes: [] as number[] };
        
        if (progress) {
          progressData = JSON.parse(progress);
        }
        
        if (!progressData.readEpisodes.includes(currentEpisode.episodeNumber)) {
          progressData.readEpisodes.push(currentEpisode.episodeNumber);
          progressData.lastReadEpisode = Math.max(progressData.lastReadEpisode, currentEpisode.episodeNumber);
          localStorage.setItem(progressKey, JSON.stringify(progressData));
        }
      }

      localStorage.setItem('viewedWebtoons', JSON.stringify(viewHistory.slice(0, 50)));
      window.dispatchEvent(new Event('viewedWebtoonsUpdated'));
    } catch (error) {
      console.error(t('webtoon.viewHistorySaveFailed'), error);
    }
  };

  const handlePurchaseConfirm = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert(t('webtoon.loginRequiredGeneral'));
      router.push('/login');
      return;
    }

    try {
      // 코인 구매 API 호출
      const response = await api.post(
        `/episodes/${params.episodeId}/purchase`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log('[Episode] 구매 API 응답:', response.data);
        // 사용자 정보 업데이트
        const newCoinBalance = response.data.coinBalance !== undefined ? response.data.coinBalance : response.data.newCoinBalance;
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.coinBalance = newCoinBalance;
        localStorage.setItem('user', JSON.stringify(userData));
        setCoinBalance(newCoinBalance);
        
        // 헤더의 코인 잔액 업데이트 이벤트 발생
        console.log('[Episode] 코인 업데이트 이벤트 발생:', { coinBalance: newCoinBalance });
        eventBus.emit(EVENTS.COIN_BALANCE_UPDATED, { coinBalance: newCoinBalance });
        
        // 모달 닫기
        setShowCoinPurchase(false);
        
        // 구매한 에피소드 이미지 바로 설정
        if (response.data.episode && response.data.episode.images) {
          setEpisode(prev => prev ? {
            ...prev,
            images: response.data.episode.images,
            canView: true,
            needsPurchase: false,
            purchaseDate: response.data.episode.purchaseDate
          } : null);
          
          // 구매 성공 메시지 표시
          alert(t('webtoon.episodePurchaseComplete'));
          
          // 에피소드 구매 이벤트 발생
          eventBus.emit(EVENTS.EPISODE_PURCHASED, { 
            episodeId: params.episodeId,
            episodeNumber: episode?.episodeNumber || 0,
            webtoonId: params.id
          });
        } else {
          // 데이터가 없으면 전체 다시 로드
          await fetchEpisodeData();
        }
      }
    } catch (error: any) {
      console.error(t('webtoon.purchaseFailed'), error);
      alert(error.response?.data?.message || t('webtoon.episodePurchaseError'));
    }
  };


  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleAdultVerificationSuccess = () => {
    setShowAdultVerification(false);
    
    // 사용자 정보 업데이트
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    userData.adultVerified = true;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // 에피소드 데이터 새로고침
    fetchEpisodeData();
  };

  // 좋아요 토글
  const handleLikeToggle = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert(t('webtoon.loginRequiredGeneral'));
      router.push('/login');
      return;
    }
    
    try {
      const response = await api.post(`/episodes/${params.episodeId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setIsLiked(response.data.isLiked);
        setIsDisliked(response.data.isDisliked || false);
        setLikeCount(response.data.likeCount || likeCount);
        setDislikeCount(response.data.dislikeCount || dislikeCount);
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };


  // 공유하기
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${episode?.webtoonTitle} - ${episode?.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: t('webtoon.checkOutWebtoon', { title: shareText }),
          url: shareUrl
        });
      } catch (error) {
        console.log(t('webtoon.shareCanceled'));
      }
    } else {
      // 클립보드에 복사
      navigator.clipboard.writeText(shareUrl);
      alert(t('webtoon.linkCopied'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">에피소드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">에피소드를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 text-gray-950 dark:bg-black dark:text-white">
      {/* 상단 네비게이션 - 안드로이드 WebView 호환성 개선 */}
      <div className={`fixed top-0 left-0 right-0 border-b border-gray-200 bg-white/95 backdrop-blur-sm z-[60] transition-all duration-300 dark:border-gray-800 dark:bg-black/90 ${
        showControls ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        WebkitTransform: showControls ? 'translateY(0)' : 'translateY(-100%)', // WebView 호환성
        transform: showControls ? 'translateY(0)' : 'translateY(-100%)'
      }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              // 성인 콘텐츠 판별
              const isAdultContent =
                episode?.comic?.rating === 'ADULT' ||
                episode?.comic?.rating === '19' ||
                episode?.comic?.ageRating === '19' ||
                episode?.comic?.ageRating === 'ADULT' ||
                (episode?.comic?.ageRating && parseInt(episode.comic.ageRating) >= 19) ||
                episode?.comic?.genre === 'adult';

              // 웹툰 상세 페이지로 이동 (홈이 아닌 상세 페이지)
              router.push(`/webtoons/${params.id}`);
            }}
            className="text-gray-800 hover:text-[#00d86a] transition-colors dark:text-white dark:hover:text-purple-400"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center text-gray-950 dark:text-white">
            <h1 className="text-sm font-medium">{episode?.webtoonTitle || t('webtoon.defaultTitle')}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {episode.episodeNumber === 0 ? t('webtoon.prologue') : t('webtoon.episodeNumber', { number: episode.episodeNumber })} - {episode.title}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode(viewMode === 'fit' ? 'full' : 'fit')}
              className="text-gray-800 hover:text-[#00d86a] transition-colors dark:text-white dark:hover:text-purple-400"
            >
              {viewMode === 'fit' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => router.push(`/webtoons/${params.id}`)}
              className="text-gray-800 hover:text-[#00d86a] transition-colors dark:text-white dark:hover:text-purple-400"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* 진행률 바 */}
        <div className="h-1 bg-gray-200 dark:bg-gray-800">
          <div 
            className="h-full bg-[#00d86a] transition-all duration-300 dark:bg-purple-600"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      {/* 메인 스크롤 영역 - 안드로이드 WebView 호환성 개선 */}
      <div
        ref={scrollRef}
        className="h-screen overflow-y-auto scrollbar-hide bg-gray-100 dark:bg-black"
        onClick={toggleControls}
        style={{
          paddingTop: showControls ? '80px' : '0px',
          paddingBottom: showControls ? '80px' : '0px',
          transition: 'padding 0.3s ease',
          WebkitOverflowScrolling: 'touch', // iOS 스크롤 개선
        }}
      >
        {/* 웹툰 이미지들 또는 유료 콘텐츠 안내 */}
        <div className="flex flex-col items-center">
          {episode.canView && episode.images && episode.images.length > 0 ? (
            // 구매했거나 무료 에피소드인 경우 이미지 표시
            episode.images.map((imageUrl, index) => (
              <FastImage
                key={index}
                src={imageUrl}
                alt={`${episode.title} - ${index + 1}`}
                index={index}
                viewMode={viewMode}
                previousLoaded={index === 0 || loadedImages.has(index - 1)} // 이전 이미지가 로드되었는지 확인
                onLoad={() => {
                  setLoadedImages(prev => {
                    const newSet = new Set(prev);
                    newSet.add(index);
                    return newSet;
                  });
                }}
              />
            ))
          ) : episode.needsLogin || episode.needsSubscription ? (
            // 2화부터는 로그인 + 정액제 구독 필요
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-[#1b1b1b]">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00dc64]/15">
                  <Lock className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
                </span>
                <h2 className="text-lg font-black text-gray-950 dark:text-white">
                  {episode.needsLogin ? '로그인이 필요해요' : '구독 회원 전용 회차예요'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {episode.needsLogin
                    ? '2화부터는 로그인 후 감상할 수 있어요.'
                    : '월정액 구독으로 모든 회차를 기다림 없이 감상하세요.'}
                </p>
                {episode.needsLogin ? (
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="mt-5 h-12 w-full rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a]"
                  >
                    로그인하고 이어보기
                  </button>
                ) : (
                  <Link
                    href="/subscribe"
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a]"
                  >
                    첫 달 990원으로 시작하기
                  </Link>
                )}
                <button
                  onClick={() => router.push(`/webtoons/${params.id}`)}
                  className="mt-2 h-11 w-full rounded-xl bg-gray-100 text-sm font-bold text-gray-600 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
                >
                  작품 홈으로 돌아가기
                </button>
              </div>
            </div>
          ) : (
            // 기타 오류
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400">에피소드를 불러올 수 없습니다.</p>
              </div>
            </div>
          )}
          
          {/* 웹툰 이미지가 끝난 후 댓글 섹션 (네이버 웹툰 스타일) */}
          {episode?.canView && episode?.images && episode.images.length > 0 && (
            <div className="w-full bg-gray-50 mt-8 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800">
              <EpisodeEndMembershipBanner />
              {/* 다음화/이전화 네비게이션 */}
              <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => {
                      if (prevEpisodeId) {
                        router.push(`/webtoons/${params.id}/episode/${prevEpisodeId}`);
                      }
                    }}
                    disabled={isFirstEpisode}
                    className={`flex-1 mr-2 px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      isFirstEpisode 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' 
                        : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-700'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전화
                  </button>
                  <button
                    onClick={() => {
                      if (nextEpisodeId) {
                        router.push(`/webtoons/${params.id}/episode/${nextEpisodeId}`);
                      }
                    }}
                    disabled={isLastEpisode}
                    className={`flex-1 ml-2 px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      isLastEpisode 
                        ? 'bg-purple-100 text-purple-300 cursor-not-allowed dark:bg-purple-800 dark:text-gray-400' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    다음화
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
                
                {/* 작품 정보 */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 mb-2 dark:text-white">{episode.webtoonTitle}</h3>
                    <p className="text-gray-500 text-sm dark:text-gray-400">
                      {episode.episodeNumber === 0 ? t('webtoon.prologue') : t('webtoon.episodeNumber', { number: episode.episodeNumber })} - {episode.title}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleShare}
                      title="공유하기"
                      aria-label="공유하기"
                      className="p-2 rounded-full text-gray-500 hover:text-purple-500 bg-gray-100 transition-colors dark:text-gray-400 dark:hover:text-purple-400 dark:bg-gray-700"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="p-2 rounded-full text-gray-500 hover:text-red-500 bg-gray-100 transition-colors dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700"
                      title="신고하기"
                    >
                      <AlertTriangle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 작품 평점 및 댓글 */}
              <div className="max-w-2xl mx-auto px-4 pb-20">
                {/* 작품 평점: 작품 소개의 평점과 같은 기록 (여기서 매겨도 작품 전체 평점에 반영) */}
                <div className="mb-4">
                  <RatingSection comicId={params.id} title="이 작품 어떠셨나요?" />
                </div>
                <CommentSection
                  episodeId={params.episodeId}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 네비게이션 - 안드로이드 WebView 호환성 개선 */}
      <div className={`fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm z-40 transition-all duration-300 dark:border-gray-800 dark:bg-black/90 ${
        showControls ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        WebkitTransform: showControls ? 'translateY(0)' : 'translateY(100%)', // WebView 호환성
        transform: showControls ? 'translateY(0)' : 'translateY(100%)'
      }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              if (prevEpisodeId) {
                router.push(`/webtoons/${params.id}/episode/${prevEpisodeId}`);
              }
            }}
            disabled={isFirstEpisode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isFirstEpisode 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>이전화</span>
          </button>


          <button
            onClick={() => {
              if (nextEpisodeId) {
                router.push(`/webtoons/${params.id}/episode/${nextEpisodeId}`);
              }
            }}
            disabled={isLastEpisode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isLastEpisode 
                ? 'bg-purple-100 text-purple-300 cursor-not-allowed dark:bg-purple-800 dark:text-gray-400' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <span>다음화</span>
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      </div>

      {/* 성인인증 모달 */}
      <AdultVerificationModal
        isOpen={showAdultVerification}
        onClose={() => {
          setShowAdultVerification(false);
          // 성인 콘텐츠면 성인 홈으로, 아니면 일반 홈으로
          const isAdultContent = episode?.comic?.genre === 'adult' || 
                                (episode?.comic?.ageRating && (episode.comic.ageRating === '19' || parseInt(episode.comic.ageRating) >= 19));
          router.push(isAdultContent ? '/adult' : '/');
        }}
        onSuccess={handleAdultVerificationSuccess}
        mode="simple"
      />

      {/* 코인 구매 모달 */}
      <CoinPurchaseModal
        isOpen={showCoinPurchase}
        onClose={() => {
          setShowCoinPurchase(false);
          router.back();
        }}
        onConfirm={handlePurchaseConfirm}
        episodeTitle={episode?.title || ''}
        episodeNumber={episode?.episodeNumber || 1}
        coinPrice={episode?.coinPrice || 3}
        userCoinBalance={coinBalance}
        webtoonTitle={episode?.webtoonTitle || ''}
      />

      {/* 신고 모달 */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="EPISODE"
        targetId={params.episodeId as string}
        targetName={`${episode?.webtoonTitle} - ${episode?.title}`}
      />

    </div>
  );
}
