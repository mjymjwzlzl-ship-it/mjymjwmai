'use client'

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, Share2, Star, User, Play, ArrowLeft, Eye, MessageCircle, Trophy } from 'lucide-react';
import CheerModal from '@/components/ui/CheerModal';
import { getImageUrl } from '@/lib/config';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAdultStore } from '@/store/adult';

// ?깆씤?몄쬆 紐⑤떖 ?숈쟻 濡쒕뱶
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

interface SimilarComic {
  id: string;
  title: string;
  author: string;
  genre: string;
  thumbnailUrl: string;
  viewCount: number;
  rating: number;
  totalEpisodes: number;
  isOfficial: boolean;
  paidStartEpisode?: number;
  episodeCoinPrice?: number;
}

interface UserProgress {
  lastReadEpisode: number;
  readEpisodes: number[];
}

const SAMAK_COMIC_ID = 'cmfgk7zw60000hfzdcb4xi7ie';
const WORLD_END_GENERAL_ID = 'cmfkt0q1a0001142ov9e5yqch';
const WORLD_END_ADULT_ID = 'cmfgk82x5002ghfzdampkgahf';
const CULT_LOVER_GENERAL_ID = 'cmfkt9a7w000j142oi8vh7tm0';
const CULT_LOVER_ADULT_ID = 'cmfgk83c6002rhfzdiw8gcsow';
const FORMER_BULLY_ID = 'cmhupnvhs0000cbnjbz2mg9l5';
const RED_DRAGON_ID = 'cmhd1wrdp0000dtqp2vqkumzx';
const HIGH_SCHOOL_BOOST_ID = 'cmhd1z63y00h3dtqp6d0rsnuc';
const PROJECT_ETHER_ID = 'cmr7krmru0000hizzkwf4qaqj';
const SAMGUKJI_BYEONGUI_ID = 'cmhcw1u3d0000wcdwylb39b6i';
const SPECIAL_COMIC_IMAGES: Record<string, { thumbnail: string; poster: string }> = {
  [SAMAK_COMIC_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%82%AC%EB%A7%89/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EC%82%AC%EB%A7%89/poster.webp?v=no-logo-20260709b',
  },
  [WORLD_END_GENERAL_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/poster.webp?v=no-logo-20260709b',
  },
  [WORLD_END_ADULT_ID]: {
    thumbnail: '/uploads/webtoons/adult/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/adult/%EC%84%B8%EC%83%81%EC%9D%98%20%EC%A2%85%EB%A7%90/poster.webp?v=no-logo-20260709b',
  },
  [CULT_LOVER_GENERAL_ID]: {
    thumbnail: '/uploads/webtoons/general/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/poster.webp?v=no-logo-20260709b',
  },
  [CULT_LOVER_ADULT_ID]: {
    thumbnail: '/uploads/webtoons/adult/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/adult/%EA%B5%90%EC%A3%BC%EC%9D%98%20%EC%97%B0%EC%9D%B8/poster.webp?v=no-logo-20260709b',
  },
  [FORMER_BULLY_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%B5%9C%EA%B0%95%EC%9D%BC%EC%A7%84%EC%9D%B4%EC%97%88%EB%8D%98%20%EC%82%AC%EB%82%98%EC%9D%B4/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EC%B5%9C%EA%B0%95%EC%9D%BC%EC%A7%84%EC%9D%B4%EC%97%88%EB%8D%98%20%EC%82%AC%EB%82%98%EC%9D%B4/poster.webp?v=no-logo-20260709b',
  },
  [RED_DRAGON_ID]: {
    thumbnail: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EB%A0%88%EB%93%9C%EB%93%9C%EB%9E%98%EA%B3%A4/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EB%A0%88%EB%93%9C%EB%93%9C%EB%9E%98%EA%B3%A4/poster.webp?v=no-logo-20260709b',
  },
  [HIGH_SCHOOL_BOOST_ID]: {
    thumbnail: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EC%8B%9C%EC%A6%8C2/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EA%B3%A0%EA%B5%90%EC%A0%84%EC%84%A4%20%EC%8B%9C%EC%A6%8C2/poster.webp?v=no-logo-20260709b',
  },
  [PROJECT_ETHER_ID]: {
    thumbnail: '/uploads/webtoons/general/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%20%EC%9D%B4%EB%8D%94/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%20%EC%9D%B4%EB%8D%94/poster.webp?v=no-logo-20260709b',
  },
  [SAMGUKJI_BYEONGUI_ID]: {
    thumbnail: '/uploads/webtoons/general/%EC%82%BC%EA%B5%AD%EC%A7%80%20%EB%B3%91%EC%9D%98/thumbnail.webp?v=no-logo-20260709b',
    poster: '/uploads/webtoons/general/%EC%82%BC%EA%B5%AD%EC%A7%80%20%EB%B3%91%EC%9D%98/poster.webp?v=no-logo-20260709b',
  },
};

const isSamakWebtoon = (webtoon?: Pick<WebtoonDetail, 'id' | 'title'> | Pick<SimilarComic, 'id' | 'title'> | null) =>
  !!webtoon && !!SPECIAL_COMIC_IMAGES[String(webtoon.id)];

const getSamakAwareImage = (
  webtoon: Pick<WebtoonDetail, 'id' | 'title'> | Pick<SimilarComic, 'id' | 'title'> | null,
  fallback: string,
  variant: 'thumbnail' | 'poster' = 'thumbnail',
) => {
  if (isSamakWebtoon(webtoon)) {
    return SPECIAL_COMIC_IMAGES[String(webtoon!.id)][variant];
  }

  return fallback;
};

const WebtoonDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [webtoon, setWebtoon] = useState<WebtoonDetail | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [similarComics, setSimilarComics] = useState<SimilarComic[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<UserProgress>({ lastReadEpisode: 0, readEpisodes: [] });
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showAdultVerification, setShowAdultVerification] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cheerOpen, setCheerOpen] = useState(false);
  const [cheerInfo, setCheerInfo] = useState<{ totalCoins: number; supporterCount: number; hallOfFame: { name: string; coins: number }[] }>({
    totalCoins: 0,
    supporterCount: 0,
    hallOfFame: [],
  });
  const [hasAccessToAdultContent, setHasAccessToAdultContent] = useState(false);
  const setAdult = useAdultStore((s) => s.setAdult);

  // ?ъ슜???뺣낫 諛?李??곹깭 濡쒕뱶
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // 諛깆뿏?쒖뿉??李??곹깭 ?뺤씤
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
      console.error('李??곹깭 ?뺤씤 ?ㅽ뙣:', error);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchWebtoonDetail();
      fetchSimilarComics();
      fetchUserProgress();
      fetchCheerStatus();
    }
  }, [params.id]);

  const fetchCheerStatus = async () => {
    try {
      const response = await api.get(`/cheer/${params.id}`);
      if (response.data?.success) {
        setCheerInfo({
          totalCoins: response.data.totalCoins || 0,
          supporterCount: response.data.supporterCount || 0,
          hallOfFame: response.data.hallOfFame || [],
        });
      }
    } catch (error) {
      console.error('응원 현황 로드 실패:', error);
    }
  };

  // ?뱁댆 ?뺣낫 濡쒕뱶 ???먰뵾?뚮뱶 紐⑸줉 濡쒕뱶
  useEffect(() => {
    if (webtoon) {
      fetchAllEpisodes();

      // ?깆씤 ?뱁댆?대㈃ ?먮룞?쇰줈 19湲??좉? ON
      const isAdultWebtoon = webtoon.ageRating ? (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') : false;
      if (isAdultWebtoon) {
        setAdult('on');
      }
    }
  }, [webtoon, setAdult]);

  // ?깆씤 肄섑뀗痢??묎렐 沅뚰븳 泥댄겕
  useEffect(() => {
    if (webtoon && user) {
      checkAdultContentAccess();
    }
  }, [webtoon, user]);

  const fetchWebtoonDetail = async () => {
    try {
      const response = await api.get(`/frontend/comics/${params.id}`);
      if (response.data) {
        setWebtoon(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch webtoon detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEpisodes = async () => {
    try {
      const response = await api.get(`/frontend/comics/${params.id}/episodes`);
      if (response.data) {
        setAllEpisodes(response.data.episodes || []);
      }
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const fetchSimilarComics = async () => {
    try {
      const response = await api.get(`/frontend/comics/${params.id}/similar?limit=6`);
      if (response.data) {
        setSimilarComics(response.data.comics || []);
      }
    } catch (error) {
      console.error('Failed to fetch similar comics:', error);
    }
  };

  const checkAdultContentAccess = () => {
    if (!webtoon) return;

    const isAdultWebtoon = webtoon.ageRating ? (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') : false;

    if (isAdultWebtoon) {
      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/');
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

  const toggleFavorite = async () => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!user || !token) {
      alert('찜하기는 로그인 후 이용할 수 있습니다.');
      router.push('/login');
      return;
    }

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
      }

      window.dispatchEvent(new CustomEvent('favoriteToggled', {
        detail: { webtoonId: params.id, isFavorite: !isLiked }
      }));
    } catch (error) {
      console.error('찜 처리 실패:', error);
      alert('찜 처리 중 오류가 발생했습니다.');
    }
  };

  const handleEpisodeClick = (episode: Episode) => {
    if (webtoon && webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && !hasAccessToAdultContent) {
      if (!user) {
        alert('로그인이 필요합니다.');
        return;
      }
      if (!user.adultVerified) {
        setShowAdultVerification(true);
        return;
      }
    }

    router.push(`/webtoons/${params.id}/episode/${episode.id}`);
  };

  const formatNumber = (num: number | string | undefined) => {
    const n = typeof num === 'number' ? num : parseFloat(String(num)) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const hasBrokenKorean = (value?: string) => {
    if (!value) return false;
    return /[�濡臾梨李泥怨踰湲뱁쒓뚯寃꾨댁ㅼ묓꾩]/.test(value);
  };

  const safeText = (value: string | undefined, fallback: string) => {
    if (!value || hasBrokenKorean(value)) return fallback;
    return value;
  };

  const formatGenre = (genre?: string) => {
    const key = String(genre || '').trim().toLowerCase();
    const genreLabels: Record<string, string> = {
      action: '액션',
      romance: '로맨스',
      fantasy: '판타지',
      drama: '드라마',
      comedy: '코미디',
      thriller: '스릴러',
      school: '학원',
      daily: '일상',
      adult: '성인',
    };
    return genreLabels[key] || safeText(genre, '웹툰');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E7A5A]"></div>
      </div>
    );
  }

  if (!webtoon) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white flex items-center justify-center">
        <div className="text-gray-950 dark:text-white">웹툰을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const readProgress = (userProgress.readEpisodes.length / webtoon.totalEpisodes) * 100;
  const displayAuthor = safeText(webtoon.author, 'ARATA');
  const displayGenre = formatGenre(webtoon.genre);
  const displayDescription = safeText(webtoon.description, 'ARATA에서 연재 중인 웹툰입니다.');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      {/* ?ㅻ줈媛湲?踰꾪듉 */}
      <div className="sticky top-0 z-[60] bg-white/95 backdrop-blur-sm border-b border-gray-200 dark:bg-[#141414]/90 dark:border-gray-800">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <button
            onClick={() => {
              // ?깆씤 ?뱁댆 ?먮퀎: rating, ageRating, genre 紐⑤몢 ?뺤씤
              const isAdultContent =
                webtoon?.rating === 'ADULT' ||
                webtoon?.rating === '19' ||
                webtoon?.ageRating === '19' ||
                webtoon?.ageRating === 'ADULT' ||
                (webtoon?.ageRating && parseInt(webtoon.ageRating) >= 19) ||
                webtoon?.genre === 'adult';

              router.push(isAdultContent ? '/adult' : '/');
            }}
            className="flex items-center space-x-2 text-gray-500 hover:text-[#00a84c] transition-colors dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로</span>
          </button>
        </div>
      </div>

      {/* ?щ????ㅽ???3???덉씠?꾩썐 */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ?쇱そ ?ъ씠?쒕컮 - ?묓뭹 ?뺣낫 */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* ?몃꽕??*/}
              <div className="w-full aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl">
                <img
                  src={getImageUrl(getSamakAwareImage(webtoon, webtoon.thumbnailUrl, 'poster'))}
                  alt={webtoon.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>

              {/* ?묓뭹 ?뺣낫 */}
              <div className="bg-white dark:bg-[#1b1b1b] rounded-xl p-5 space-y-5 border border-gray-200 dark:border-gray-800 shadow-sm">
                <div>
                  <h1 className="text-2xl font-black text-gray-950 dark:text-white mb-1.5">{webtoon.title}</h1>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span>{displayAuthor}</span>
                  </div>
                </div>

                {/* ?λⅤ 諛??깃툒 */}
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {displayGenre}
                  </span>
                  {webtoon.ageRating && (webtoon.ageRating === '19' || String(webtoon.ageRating) === '19') && (
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">19+</span>
                  )}
                  {webtoon.isOfficial && (
                    <span className="rounded-full bg-[#00dc64] px-3 py-1 text-xs font-black text-black">공식연재</span>
                  )}
                </div>

                {/* ?듦퀎 */}
                <div className="grid grid-cols-4 divide-x divide-gray-100 rounded-xl bg-gray-50 py-3 text-center dark:divide-white/5 dark:bg-white/5">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-sm font-black text-gray-950 dark:text-white">
                      <Star className="h-3.5 w-3.5 fill-current text-yellow-400" />
                      {typeof webtoon.rating === 'number' ? webtoon.rating.toFixed(1) : webtoon.rating}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-400">평점</div>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-950 dark:text-white">{formatNumber(webtoon.viewCount)}</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">조회</div>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-950 dark:text-white">{formatNumber(webtoon.commentCount)}</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">댓글</div>
                  </div>
                  <div>
                    <div className="text-sm font-black text-gray-950 dark:text-white">{webtoon.totalEpisodes}화</div>
                    <div className="mt-0.5 text-[11px] text-gray-400">총 화수</div>
                  </div>
                </div>

                {/* 臾대즺/?좊즺 ?뺣낫 */}

                {/* ?쎄린 吏꾪뻾瑜?*/}
                {userProgress.readEpisodes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">읽기 진행률</span>
                      <span className="font-bold text-[#00a84c] dark:text-[#00dc64]">
                        {userProgress.readEpisodes.length}/{webtoon.totalEpisodes}화
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
                      <div
                        className="h-2 rounded-full bg-[#00dc64] transition-all duration-300"
                        style={{ width: `${readProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* ?≪뀡 踰꾪듉??*/}
                <div className="space-y-2">
                  <button
                    onClick={() => handleEpisodeClick(allEpisodes[0])}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00dc64] py-3.5 font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a]"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>첫 화 보기</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={toggleFavorite}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                        isLiked
                          ? 'border border-red-500/30 bg-red-500/10 text-red-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span>찜하기</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 dark:hover:text-white">
                      <Share2 className="w-4 h-4" />
                      <span>공유</span>
                    </button>
                  </div>
                </div>

                {/* 작품 응원 */}
                <div className="rounded-xl border border-[#00dc64]/25 bg-[#00dc64]/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-sm font-black text-gray-950 dark:text-white">
                      <Heart className="h-4 w-4 fill-[#00dc64] text-[#00dc64]" />
                      작품 응원
                    </h3>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {cheerInfo.supporterCount > 0
                        ? `${cheerInfo.supporterCount}명이 ${cheerInfo.totalCoins.toLocaleString()}코인 응원`
                        : '첫 응원의 주인공이 되어보세요'}
                    </span>
                  </div>

                  <button
                    onClick={() => setCheerOpen(true)}
                    className="h-11 w-full rounded-xl border border-[#00dc64] bg-white text-sm font-black text-[#00a84c] transition hover:bg-[#00dc64] hover:text-black dark:bg-transparent dark:text-[#00dc64] dark:hover:bg-[#00dc64] dark:hover:text-black"
                  >
                    💚 응원하기
                  </button>

                  {cheerInfo.hallOfFame.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-gray-400">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        명예의 전당
                      </p>
                      {cheerInfo.hallOfFame.map((supporter, index) => (
                        <div key={`${supporter.name}-${index}`} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-center font-black text-[#00a84c] dark:text-[#00dc64]">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-bold text-gray-700 dark:text-gray-300">{supporter.name}</span>
                          <span className="font-black text-gray-500 dark:text-gray-400">{supporter.coins.toLocaleString()}코인</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                    응원이 많은 작품은 외전·시즌2가 우선 제작됩니다.
                  </p>
                </div>

                {/* ?묓뭹 ?뚭컻 */}
                {displayDescription && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h3 className="mb-2 flex items-center gap-2 font-black text-gray-950 dark:text-white">
                      <span className="h-4 w-1 rounded-full bg-[#00dc64]" />
                      작품 소개
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{displayDescription}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* 以묒븰 硫붿씤 - ?먰뵾?뚮뱶 紐⑸줉 */}
          <main className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">전체 에피소드</h2>
                <span className="text-gray-500 dark:text-gray-400 text-sm">총 {allEpisodes.length}화</span>
              </div>

              {episodesLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {allEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        onClick={() => handleEpisodeClick(episode)}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          userProgress.readEpisodes.includes(episode.episodeNumber) ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          {/* ?먰뵾?뚮뱶 ?몃꽕??*/}
                          <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-gray-700 rounded overflow-hidden relative">
                            <img
                              src={getImageUrl(getSamakAwareImage(webtoon, episode.thumbnailUrl || episode.comicThumbnailUrl || webtoon.thumbnailUrl))}
                              alt={episode.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                        {/* ?먰뵾?뚮뱶 ?뺣낫 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-black text-[#00a84c] dark:text-[#00dc64]">
                              {episode.episodeNumber === 0 ? '프롤로그' : `${episode.episodeNumber}화`}
                            </span>
                            {userProgress.readEpisodes.includes(episode.episodeNumber) && (
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">읽음</span>
                            )}
                          </div>
                          <h3 className="text-gray-950 dark:text-white font-medium line-clamp-2">
                            {safeText(episode.title, episode.episodeNumber === 0 ? '프롤로그' : `${episode.episodeNumber}화`)}
                          </h3>
                          <p className="text-gray-500 text-xs mt-1">
                            {formatDate(episode.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* ?ъ깮 ?꾩씠肄?*/}
                      <div className="flex-shrink-0 ml-4">
                        <Play className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* ?ㅻⅨ履??ъ씠?쒕컮 - 鍮꾩듂???묓뭹 異붿쿇 */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-20">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-4">이 작품과 비슷한 인기작품</h3>

                {similarComics.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">추천 작품이 없습니다</p>
                ) : (
                  <div className="space-y-3">
                    {similarComics.map((comic) => (
                      <Link
                        key={comic.id}
                        href={`/webtoons/${comic.id}`}
                        className="flex space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="w-16 h-20 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                          <img
                            src={getImageUrl(getSamakAwareImage(comic, comic.thumbnailUrl, 'poster'))}
                            alt={comic.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-950 dark:text-white text-sm font-medium truncate mb-1">{safeText(comic.title, '추천 작품')}</h4>
                          <p className="text-gray-400 text-xs truncate mb-1">{safeText(comic.author, 'ARATA')}</p>
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">{comic.totalEpisodes}화</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ?깆씤?몄쬆 紐⑤떖 */}
      <AdultVerificationModal
        isOpen={showAdultVerification}
        onClose={() => {
          setShowAdultVerification(false);
          router.push('/');
        }}
        onSuccess={handleAdultVerificationSuccess}
        mode="simple"
      />

      {/* 작품 응원 모달 */}
      <CheerModal
        open={cheerOpen}
        onClose={() => setCheerOpen(false)}
        comicId={String(params.id)}
        comicTitle={webtoon?.title || ''}
        onSuccess={fetchCheerStatus}
      />
    </div>
  );
};

export default WebtoonDetailPage;

