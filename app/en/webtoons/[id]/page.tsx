'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, Share2, MessageCircle, Star, Calendar, User, Play, List, ArrowLeft } from 'lucide-react';
import { getImageUrl } from '@/lib/config';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import { useAdultStore } from '@/store/adult';

// 성인인증 모달 동적 로드
const AdultVerificationModal = dynamic(() => import('@/components/ui/AdultVerificationModal'), {
  ssr: false
});

interface Episode {
  id: number;
  title: string;
  episodeNumber: number;
  thumbnail?: string;
  thumbnailUrl?: string;
  hasEpisodeThumbnail?: boolean;
  comicThumbnailUrl?: string;
  createdAt: string;
  isFree?: boolean;
  coinPrice?: number;
}

interface WebtoonDetail {
  id: number;
  title: string;
  author: string;
  genre: string;
  description?: string;
  thumbnailUrl: string;
  viewCount: number;
  commentCount: number;
  rating: number | string;
  ageRating?: string;
  totalEpisodes: number;
  updatedAt: string;
  isOfficial: boolean;
  episodes?: Episode[];
  paidStartEpisode?: number;
  episodeCoinPrice?: number;
}

interface UserProgress {
  lastReadEpisode: number;
  readEpisodes: number[];
}

const WebtoonDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const setAdult = useAdultStore((s) => s.setAdult);
  const [webtoon, setWebtoon] = useState<WebtoonDetail | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress>({ lastReadEpisode: 0, readEpisodes: [] });
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showAdultVerification, setShowAdultVerification] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasAccessToAdultContent, setHasAccessToAdultContent] = useState(false);
  const [purchasedEpisodes, setPurchasedEpisodes] = useState<number[]>([]);

  // 사용자 정보 및 찜 상태 로드
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    checkFavoriteStatus();
  }, [params.id]);

  const checkFavoriteStatus = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/favorites/check/${params.id}`);
      if (response.data) {
        setIsLiked(response.data.isFavorite);
      }
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      alert('Login required.');
      router.push('/login');
      return;
    }

    try {
      if (isLiked) {
        await api.delete(`/favorites/${params.id}`);
        setIsLiked(false);
      } else {
        await api.post(`/favorites/${params.id}`);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Failed to update favorite status.');
    }
  };

  useEffect(() => {
    if (params.id) {
      const isApp = (window as any).isArataApp;
      const delay = isApp ? 300 : 0;

      setTimeout(() => {
        fetchWebtoonDetail();
        fetchUserProgress();
        fetchPurchasedEpisodes();
      }, delay);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setTimeout(() => {
        fetchRecentEpisodes();
      }, isApp ? 800 : (isMobile ? 500 : 100));
    }
  }, [params.id]);

  useEffect(() => {
    if (webtoon && user) {
      checkAdultContentAccess();
    }
  }, [webtoon, user]);

  const fetchPurchasedEpisodes = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/episodes/comic/${params.id}/purchases`);
      if (response.data && response.data.purchasedEpisodes) {
        const episodeNumbers = response.data.purchasedEpisodes.map((p: any) => p.episodeNumber);
        setPurchasedEpisodes(episodeNumbers);

        const localProgress = localStorage.getItem(`webtoon_progress_${params.id}`);
        if (localProgress) {
          const progress = JSON.parse(localProgress);
          const mergedEpisodes = Array.from(new Set([...progress.readEpisodes, ...episodeNumbers]));
          const maxEpisode = Math.max(...mergedEpisodes, 0);
          const newProgress = {
            lastReadEpisode: maxEpisode,
            readEpisodes: mergedEpisodes
          };
          setUserProgress(newProgress);
          localStorage.setItem(`webtoon_progress_${params.id}`, JSON.stringify(newProgress));
        } else {
          const maxEpisode = Math.max(...episodeNumbers, 0);
          const newProgress = {
            lastReadEpisode: maxEpisode,
            readEpisodes: episodeNumbers
          };
          setUserProgress(newProgress);
          localStorage.setItem(`webtoon_progress_${params.id}`, JSON.stringify(newProgress));
        }
      }
    } catch (error) {
      console.error('Failed to fetch purchased episodes:', error);
    }
  };

  const fetchWebtoonDetail = async () => {
    try {
      const response = await api.get(`/frontend/comics/${params.id}`, {
        params: { locale: 'en' }
      });
      if (response.data) {
        setWebtoon(response.data);

        // 성인 웹툰이면 자동으로 19금 토글 ON
        const isAdultWebtoon = response.data.ageRating ? (response.data.ageRating === '19' || String(response.data.ageRating) === '19') : false;
        if (isAdultWebtoon) {
          setAdult('on');
        }
      }
    } catch (error) {
      console.error('Failed to fetch webtoon detail:', error);
      if ((window as any).isArataApp) {
        setTimeout(() => {
          fetchWebtoonDetail();
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEpisodes = async () => {
    try {
      const response = await api.get(`/frontend/comics/${params.id}/episodes`, {
        params: { locale: 'en' }
      });
      if (response.data) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const limit = isMobile ? 4 : 6;
        const episodes = response.data.episodes || [];
        setRecentEpisodes(episodes.slice(0, limit));
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const checkAdultContentAccess = () => {
    if (!webtoon) return;

    const isAdultWebtoon = webtoon.ageRating ? (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') : false;

    if (isAdultWebtoon) {
      if (!user) {
        alert('Login required.');
        router.push('/en');
        return;
      }

      if (!user.adultVerified) {
        setShowAdultVerification(true);
        return;
      }
    }

    setHasAccessToAdultContent(true);
  };

  const handleAdultVerificationSuccess = () => {
    setShowAdultVerification(false);
    setHasAccessToAdultContent(true);

    const userData = localStorage.getItem('user');
    if (userData) {
      const updatedUser = JSON.parse(userData);
      updatedUser.adultVerified = true;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const fetchUserProgress = () => {
    const progress = localStorage.getItem(`webtoon_progress_${params.id}`);
    if (progress) {
      setUserProgress(JSON.parse(progress));
    }
  };

  const updateUserProgress = (episodeNumber: number) => {
    const newProgress = {
      lastReadEpisode: episodeNumber,
      readEpisodes: Array.from(new Set([...userProgress.readEpisodes, episodeNumber]))
    };
    setUserProgress(newProgress);
    localStorage.setItem(`webtoon_progress_${params.id}`, JSON.stringify(newProgress));
  };

  const handleFirstEpisodeRead = useCallback(() => {
    if (webtoon && webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && !hasAccessToAdultContent) {
      if (!user) {
        alert('Login required.');
        return;
      }
      if (!user.adultVerified) {
        setShowAdultVerification(true);
        return;
      }
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (recentEpisodes.length > 0) {
      const firstEpisode = recentEpisodes[recentEpisodes.length - 1];
      router.push(`/en/webtoons/${params.id}/episode/${firstEpisode.id}`);
    } else {
      router.push(`/en/webtoons/${params.id}`);
    }
  }, [webtoon, hasAccessToAdultContent, user, recentEpisodes, params.id, router]);

  const handleContinueReading = useCallback(() => {
    if (webtoon && webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && !hasAccessToAdultContent) {
      if (!user) {
        alert('Login required.');
        return;
      }
      if (!user.adultVerified) {
        setShowAdultVerification(true);
        return;
      }
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (webtoon && userProgress.lastReadEpisode > 0) {
      const nextEpisode = recentEpisodes.find(ep => ep.episodeNumber === userProgress.lastReadEpisode + 1);
      if (nextEpisode) {
        router.push(`/en/webtoons/${params.id}/episode/${nextEpisode.id}`);
      } else {
        router.push(`/en/webtoons/${params.id}`);
      }
    } else {
      handleFirstEpisodeRead();
    }
  }, [webtoon, hasAccessToAdultContent, user, userProgress, recentEpisodes, params.id, router, handleFirstEpisodeRead]);

  const formatNumber = (num: number | string | undefined) => {
    const n = typeof num === 'number' ? num : parseFloat(String(num)) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!webtoon) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Webtoon not found.</div>
      </div>
    );
  }

  const readProgress = (userProgress.readEpisodes.length / webtoon.totalEpisodes) * 100;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 뒤로가기 버튼 */}
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <button
            onClick={() => {
              const isAdultContent = webtoon?.genre === 'adult' ||
                                    (webtoon?.ageRating && (webtoon.ageRating === '19' || parseInt(webtoon.ageRating) >= 19));
              router.push(isAdultContent ? '/adult' : '/en');
            }}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Home</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 웹툰 정보 섹션 */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* 썸네일 */}
          <div className="flex-shrink-0">
            <div className="w-48 md:w-64 h-60 md:h-80 bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={webtoon.thumbnailUrl}
                alt={webtoon.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          </div>

          {/* 웹툰 정보 */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{webtoon.title}</h1>
                <div className="flex items-center space-x-4 text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{webtoon.author}</span>
                  </div>
                  <span>•</span>
                  <span>{webtoon.genre}</span>
                  {webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && (
                    <>
                      <span>•</span>
                      <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded">18+</span>
                    </>
                  )}
                  {webtoon.isOfficial && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">Official</span>
                    </>
                  )}
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                    if (!user || !token) {
                      alert('Login required to add to favorites.');
                      router.push('/login');
                      return;
                    }

                    const newLikedState = !isLiked;

                    try {
                      const response = await api.post(`/favorites/${params.id}`, {
                        title: webtoon?.title || '',
                        author: webtoon?.author || '',
                        thumbnailUrl: webtoon?.thumbnailUrl || '',
                        totalEpisodes: webtoon?.totalEpisodes || 0,
                        genre: webtoon?.genre,
                        viewCount: webtoon?.viewCount || 0,
                        rating: webtoon?.rating || 0,
                        lastReadEpisode: userProgress.lastReadEpisode
                      });

                      if (response.data) {
                        setIsLiked(response.data.action === 'added');

                        if (response.data.action === 'added') {
                          alert('Added to favorites.');
                        } else {
                          alert('Removed from favorites.');
                        }
                      }

                      window.dispatchEvent(new CustomEvent('favoriteToggled', {
                        detail: { webtoonId: params.id, isFavorite: newLikedState }
                      }));
                    } catch (error) {
                      console.error('Failed to toggle favorite:', error);
                      alert('Failed to update favorite status.');
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isLiked ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                  title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <button className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 통계 정보 */}
            <div className="flex items-center space-x-6 mb-6 text-sm">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-white font-semibold">{typeof webtoon.rating === 'number' ? webtoon.rating.toFixed(1) : webtoon.rating}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300">{formatNumber(webtoon.commentCount)}</span>
              </div>
              <div className="text-gray-400">{formatNumber(webtoon.viewCount)} views</div>
              <div className="text-gray-400">{webtoon.totalEpisodes} episodes</div>
              {(!webtoon.paidStartEpisode || webtoon.paidStartEpisode === 0) ? (
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm px-3 py-1.5 rounded-full font-bold shadow-lg">
                  ✨ All Free
                </span>
              ) : (
                <div className="flex items-center space-x-2">
                  {webtoon.paidStartEpisode && webtoon.paidStartEpisode > 1 && (
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs px-2 py-1 rounded font-semibold">
                      Free {webtoon.paidStartEpisode - 1} ep
                    </span>
                  )}
                  {webtoon.paidStartEpisode && webtoon.paidStartEpisode <= webtoon.totalEpisodes && (
                    <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded font-semibold flex items-center">
                      {webtoon.episodeCoinPrice || 3} coins from ep {webtoon.paidStartEpisode}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 읽기 진행률 */}
            {userProgress.readEpisodes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Reading Progress</span>
                  <span className="text-emerald-400 text-sm">
                    {userProgress.readEpisodes.length}/{webtoon.totalEpisodes} episodes ({Math.round(readProgress)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${readProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="flex space-x-4">
              {userProgress.lastReadEpisode > 0 ? (
                <button
                  onClick={handleContinueReading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 md:px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  <Play className="w-5 h-5" />
                  <span className="text-sm md:text-base">Continue (Ep {userProgress.lastReadEpisode + 1})</span>
                </button>
              ) : (
                <button
                  onClick={handleFirstEpisodeRead}
                  className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 md:px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  <Play className="w-5 h-5" />
                  <span className="text-sm md:text-base">Start Reading</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (webtoon && webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && !hasAccessToAdultContent) {
                    if (!user) {
                      alert('Login required.');
                      return;
                    }
                    if (!user.adultVerified) {
                      setShowAdultVerification(true);
                      return;
                    }
                  }

                  router.push(`/en/webtoons/${params.id}`);
                }}
                className="flex items-center space-x-2 bg-gray-800 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 active:scale-95 touch-manipulation"
              >
                <List className="w-5 h-5" />
                <span className="text-sm md:text-base">All Episodes</span>
              </button>
            </div>

            {/* 설명 */}
            {webtoon.description && (
              <div className="mt-6">
                <h3 className="text-white font-semibold mb-3">Description</h3>
                <p className="text-gray-300 leading-relaxed">{webtoon.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* 최근 에피소드 미리보기 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Latest Episodes</h3>
            <button
              onClick={() => {
                if (webtoon && webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && !hasAccessToAdultContent) {
                  if (!user) {
                    alert('Login required.');
                    return;
                  }
                  if (!user.adultVerified) {
                    setShowAdultVerification(true);
                    return;
                  }
                }

                router.push(`/en/webtoons/${params.id}/episodes`);
              }}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              View All →
            </button>
          </div>

          {episodesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-700" />
                  <div className="p-3">
                    <div className="h-4 bg-gray-700 rounded mb-2" />
                    <div className="h-3 bg-gray-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {recentEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer touch-manipulation active:scale-95"
                  onClick={() => {
                    if (webtoon && webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && !hasAccessToAdultContent) {
                      if (!user) {
                        alert('Login required.');
                        return;
                      }
                      if (!user.adultVerified) {
                        setShowAdultVerification(true);
                        return;
                      }
                    }

                    router.push(`/en/webtoons/${params.id}/episode/${episode.id}`);
                  }}
                >
                  <div className="aspect-[3/4] bg-gray-700 relative">
                    <img
                      src={episode.thumbnailUrl || episode.comicThumbnailUrl || webtoon.thumbnailUrl || 'https://via.placeholder.com/300x400/4A5568/FFFFFF?text=Thumbnail'}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = episode.comicThumbnailUrl || webtoon.thumbnailUrl || 'https://via.placeholder.com/300x400/4A5568/FFFFFF?text=Thumbnail';
                      }}
                    />
                    {episode.hasEpisodeThumbnail && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        EP
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2">
                      {episode.isFree ? (
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-2 py-1 rounded">
                          Free
                        </span>
                      ) : (
                        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center inline-flex w-fit">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8"/>
                          </svg>
                          {episode.coinPrice || 3}
                        </span>
                      )}
                    </div>
                    {userProgress.readEpisodes.includes(episode.episodeNumber) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs px-2 py-1 rounded">Read</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-emerald-400 text-xs mb-1">
                      {episode.episodeNumber === 0 ? 'Prologue' : `Episode ${episode.episodeNumber}`}
                    </div>
                    <div className="text-white text-sm font-medium line-clamp-2">{episode.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 성인인증 모달 */}
      <AdultVerificationModal
        isOpen={showAdultVerification}
        onClose={() => {
          setShowAdultVerification(false);
          router.push('/en');
        }}
        onSuccess={handleAdultVerificationSuccess}
        mode="simple"
      />
    </div>
  );
};

export default WebtoonDetailPage;
