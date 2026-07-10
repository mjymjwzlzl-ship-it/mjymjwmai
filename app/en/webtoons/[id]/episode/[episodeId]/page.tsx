'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home, List, MessageCircle, Heart, ThumbsDown, Share2, Settings, Eye, EyeOff, Coins, Lock, X, AlertTriangle } from 'lucide-react';
import FastImage from '@/components/ui/FastImage';
import CommentSection from '@/components/ui/CommentSection';
import RatingSection from '@/components/ui/RatingSection';
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
  requiresAdultVerification?: boolean;
  comic?: {
    title: string;
    rating?: string;
    genre?: string;
    ageRating?: string;
  };
}

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const setAdult = useAdultStore((s) => s.setAdult);

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

  const fetchEpisodeData = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');

      try {
        const episodesResponse = await api.get(`/frontend/comics/${params.id}/episodes`, {
          params: { locale: 'en' }
        });
        if (episodesResponse.data && episodesResponse.data.episodes) {
          const allEpisodes = episodesResponse.data.episodes.sort((a: any, b: any) =>
            a.episodeNumber - b.episodeNumber
          );

          const currentIndex = allEpisodes.findIndex((ep: any) =>
            ep.id === params.episodeId || ep.id === parseInt(params.episodeId as string)
          );

          if (currentIndex !== -1) {
            if (currentIndex > 0) {
              setPrevEpisodeId(allEpisodes[currentIndex - 1].id);
              setIsFirstEpisode(false);
            } else {
              setIsFirstEpisode(true);
            }

            if (currentIndex < allEpisodes.length - 1) {
              setNextEpisodeId(allEpisodes[currentIndex + 1].id);
              setIsLastEpisode(false);
            } else {
              setIsLastEpisode(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch episode list', error);
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

          if (parsedImages.length > 0) {
            parsedImages.slice(0, 3).forEach((url: string, idx: number) => {
              const img = new Image();
              img.src = getImageUrl(url);
              // @ts-ignore
              img.fetchPriority = idx === 0 ? 'high' : 'low';
              img.decoding = 'async';
            });

            setTimeout(() => {
              parsedImages.slice(3, 10).forEach((url: string) => {
                const img = new Image();
                img.src = getImageUrl(url);
                // @ts-ignore
                img.fetchPriority = 'auto';
                img.decoding = 'async';
              });
            }, 100);
          }
        }

        setEpisode({
          id: episodeData.id,
          title: episodeData.title,
          episodeNumber: episodeData.episodeNumber,
          images: parsedImages,
          createdAt: episodeData.createdAt,
          webtoonTitle: episodeData.comic?.title || '',
          author: episodeData.comic?.author?.nickname || 'Author',
          isFree: episodeData.isFree,
          coinPrice: episodeData.coinPrice,
          canView: episodeData.canView,
          needsPurchase: episodeData.needsPurchase,
          needsLogin: episodeData.needsLogin,
          requiresAdultVerification: episodeData.requiresAdultVerification,
          comic: episodeData.comic
        });

        // 성인 웹툰이면 자동으로 19금 토글 ON
        const isAdultEpisode = episodeData.comic?.ageRating ? (episodeData.comic.ageRating === '19' || String(episodeData.comic.ageRating) === '19') : false;
        if (isAdultEpisode) {
          setAdult('on');
        }

        if (episodeData.needsLogin) {
          alert('Login required');
          router.push(`/login?redirect=/en/webtoons/${params.id}/episode/${params.episodeId}`);
          return;
        }

        if (episodeData.requiresAdultVerification) {
          setShowAdultVerification(true);
          return;
        }

        if (episodeData.needsPurchase && !episodeData.canView) {
          setTimeout(() => {
            setShowCoinPurchase(true);
          }, 500);
          return;
        }

        if (episodeData.canView) {
          updateViewHistory();
        }
      }

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
          console.error('Failed to check reaction status:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch episode data', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, params.episodeId, router]);

  useEffect(() => {
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

            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('Failed to fetch user data', error);
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setCoinBalance(parsedUser.coinBalance || 0);
            setUserDataLoaded(true);
          }
        }
      } else {
        setUserDataLoaded(true);
      }
    };

    fetchUserData();

    if (params.id && params.episodeId) {
      fetchEpisodeData();
    }
  }, [params.id, params.episodeId, fetchEpisodeData]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  const updateViewHistory = () => {
    if (!params.id || !episode) return;

    try {
      const viewHistory = JSON.parse(localStorage.getItem('viewedWebtoons') || '[]');
      const existingIndex = viewHistory.findIndex((item: any) => item.webtoonId.toString() === params.id?.toString());

      const viewRecord = {
        webtoonId: params.id,
        webtoonTitle: episode?.webtoonTitle || 'Webtoon',
        lastEpisode: episode?.episodeNumber || 1,
        lastEpisodeTitle: episode?.title || '',
        viewedAt: new Date().toISOString(),
        thumbnailUrl: '/api/placeholder/300/400'
      };

      if (existingIndex >= 0) {
        viewHistory[existingIndex] = viewRecord;
      } else {
        viewHistory.unshift(viewRecord);
      }

      if (episode.episodeNumber) {
        const progressKey = `webtoon_progress_${params.id}`;
        const progress = localStorage.getItem(progressKey);
        let progressData = { lastReadEpisode: 0, readEpisodes: [] as number[] };

        if (progress) {
          progressData = JSON.parse(progress);
        }

        if (!progressData.readEpisodes.includes(episode.episodeNumber)) {
          progressData.readEpisodes.push(episode.episodeNumber);
          progressData.lastReadEpisode = Math.max(progressData.lastReadEpisode, episode.episodeNumber);
          localStorage.setItem(progressKey, JSON.stringify(progressData));
        }
      }

      localStorage.setItem('viewedWebtoons', JSON.stringify(viewHistory.slice(0, 50)));

      const token = localStorage.getItem('authToken');
      if (!token) {
        const savedProgress = JSON.parse(localStorage.getItem(`webtoon_progress_${params.id}`) || '{"readEpisodes": []}');
        if (!savedProgress.readEpisodes.includes(episode?.episodeNumber)) {
          savedProgress.readEpisodes.push(episode?.episodeNumber || 1);
          savedProgress.lastReadEpisode = Math.max(...savedProgress.readEpisodes);
          localStorage.setItem(`webtoon_progress_${params.id}`, JSON.stringify(savedProgress));
        }
      }
    } catch (error) {
      console.error('Failed to save view history', error);
    }
  };

  const handlePurchaseConfirm = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Login required');
      router.push('/login');
      return;
    }

    try {
      const response = await api.post(
        `/episodes/${params.episodeId}/purchase`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log('[Episode] Purchase API response:', response.data);
        const newCoinBalance = response.data.coinBalance !== undefined ? response.data.coinBalance : response.data.newCoinBalance;
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.coinBalance = newCoinBalance;
        localStorage.setItem('user', JSON.stringify(userData));
        setCoinBalance(newCoinBalance);

        console.log('[Episode] Coin update event triggered:', { coinBalance: newCoinBalance });
        eventBus.emit(EVENTS.COIN_BALANCE_UPDATED, { coinBalance: newCoinBalance });

        setShowCoinPurchase(false);

        if (response.data.episode && response.data.episode.images) {
          setEpisode(prev => prev ? {
            ...prev,
            images: response.data.episode.images,
            canView: true,
            needsPurchase: false,
            purchaseDate: response.data.episode.purchaseDate
          } : null);

          alert('Episode purchased successfully');

          eventBus.emit(EVENTS.EPISODE_PURCHASED, {
            episodeId: params.episodeId,
            episodeNumber: episode?.episodeNumber || 0,
            webtoonId: params.id
          });
        } else {
          await fetchEpisodeData();
        }
      }
    } catch (error: any) {
      console.error('Purchase failed', error);
      alert(error.response?.data?.message || 'Failed to purchase episode');
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleAdultVerificationSuccess = () => {
    setShowAdultVerification(false);

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    userData.adultVerified = true;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    fetchEpisodeData();
  };

  const handleLikeToggle = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Login required');
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
      console.error('Failed to toggle like:', error);
      alert('Failed to update like status.');
    }
  };

  const handleDislikeToggle = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Login required');
      router.push('/login');
      return;
    }

    try {
      const response = await api.post(`/episodes/${params.episodeId}/dislike`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setIsLiked(response.data.isLiked || false);
        setIsDisliked(response.data.isDisliked);
        setLikeCount(response.data.likeCount || likeCount);
        setDislikeCount(response.data.dislikeCount || dislikeCount);
      }
    } catch (error) {
      console.error('Failed to toggle dislike:', error);
      alert('Failed to update dislike status.');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${episode?.webtoonTitle} - ${episode?.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: `Check out this webtoon: ${shareText}`,
          url: shareUrl
        });
      } catch (error) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Episode not found.</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className={`fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-40 transition-all duration-300 ${
        showControls ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        WebkitTransform: showControls ? 'translateY(0)' : 'translateY(-100%)',
        transform: showControls ? 'translateY(0)' : 'translateY(-100%)'
      }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="text-white hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="text-center text-white">
            <h1 className="text-sm font-medium">{episode?.webtoonTitle || 'Webtoon'}</h1>
            <p className="text-xs text-gray-400">
              {episode.episodeNumber === 0 ? 'Prologue' : `Episode ${episode.episodeNumber}`} - {episode.title}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode(viewMode === 'fit' ? 'full' : 'fit')}
              className="text-white hover:text-purple-400 transition-colors"
            >
              {viewMode === 'fit' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => router.push(`/en/webtoons/${params.id}`)}
              className="text-white hover:text-purple-400 transition-colors"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-screen overflow-y-auto scrollbar-hide"
        onClick={toggleControls}
        style={{
          paddingTop: showControls ? '80px' : '0px',
          paddingBottom: showControls ? '80px' : '0px',
          transition: 'padding 0.3s ease',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        <div className="flex flex-col items-center">
          {episode.canView && episode.images && episode.images.length > 0 ? (
            episode.images.map((imageUrl, index) => (
              <FastImage
                key={index}
                src={imageUrl}
                alt={`${episode.title} - ${index + 1}`}
                index={index}
                viewMode={viewMode}
                previousLoaded={index === 0 || loadedImages.has(index - 1)}
                onLoad={() => {
                  setLoadedImages(prev => {
                    const newSet = new Set(prev);
                    newSet.add(index);
                    return newSet;
                  });
                }}
              />
            ))
          ) : episode.needsPurchase ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400">Verifying purchase...</p>
              </div>
            </div>
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400">Unable to load episode.</p>
              </div>
            </div>
          )}

          {episode?.canView && episode?.images && episode.images.length > 0 && (
            <div className="w-full bg-gray-900 mt-8">
              <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => {
                      if (prevEpisodeId) {
                        router.push(`/en/webtoons/${params.id}/episode/${prevEpisodeId}`);
                      }
                    }}
                    disabled={isFirstEpisode}
                    className={`flex-1 mr-2 px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      isFirstEpisode
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      if (nextEpisodeId) {
                        router.push(`/en/webtoons/${params.id}/episode/${nextEpisodeId}`);
                      }
                    }}
                    disabled={isLastEpisode}
                    className={`flex-1 ml-2 px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      isLastEpisode
                        ? 'bg-purple-800 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{episode.webtoonTitle}</h3>
                    <p className="text-gray-400 text-sm">
                      {episode.episodeNumber === 0 ? 'Prologue' : `Episode ${episode.episodeNumber}`} - {episode.title}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLikeToggle}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full transition-colors ${
                          isLiked ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:text-red-400 bg-gray-700'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="text-sm">{likeCount || 0}</span>
                      </button>
                      <button
                        onClick={handleDislikeToggle}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full transition-colors ${
                          isDisliked ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-blue-400 bg-gray-700'
                        }`}
                      >
                        <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
                        <span className="text-sm">{dislikeCount || 0}</span>
                      </button>
                    </div>
                    <button
                      onClick={handleShare}
                      className="p-2 rounded-full text-gray-400 hover:text-purple-400 bg-gray-700 transition-colors"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="p-2 rounded-full text-gray-400 hover:text-red-400 bg-gray-700 transition-colors"
                      title="Report"
                    >
                      <AlertTriangle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-w-2xl mx-auto px-4 pb-20">
                <RatingSection episodeId={params.episodeId} />
                <CommentSection
                  episodeId={params.episodeId}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm z-40 transition-all duration-300 ${
        showControls ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        WebkitTransform: showControls ? 'translateY(0)' : 'translateY(100%)',
        transform: showControls ? 'translateY(0)' : 'translateY(100%)'
      }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              if (prevEpisodeId) {
                router.push(`/en/webtoons/${params.id}/episode/${prevEpisodeId}`);
              }
            }}
            disabled={isFirstEpisode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isFirstEpisode
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => {
              if (nextEpisodeId) {
                router.push(`/en/webtoons/${params.id}/episode/${nextEpisodeId}`);
              }
            }}
            disabled={isLastEpisode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isLastEpisode
                ? 'bg-purple-800 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      </div>

      <AdultVerificationModal
        isOpen={showAdultVerification}
        onClose={() => {
          setShowAdultVerification(false);
          const isAdultContent = episode?.comic?.genre === 'adult' ||
                                (episode?.comic?.ageRating && (episode.comic.ageRating === '19' || parseInt(episode.comic.ageRating) >= 19));
          router.push(isAdultContent ? '/adult' : '/en');
        }}
        onSuccess={handleAdultVerificationSuccess}
        mode="simple"
      />

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
