'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Clock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useAdultStore } from '@/store/adult';

export default function AdultLibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'history' | 'likes' | 'recommendations'>('history');
  const [history, setHistory] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const setAdult = useAdultStore((s) => s.setAdult);

  useEffect(() => {
    // 성인 라이브러리 페이지 진입 시 자동으로 19금 토글 ON
    setAdult('on');
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    console.log('[Adult Library] 초기화 - userData:', !!userData, 'token:', !!token);

    if (!userData || !token) {
      console.log('[Adult Library] 로그인 필요 - /login으로 이동');
      router.push('/login');
      return;
    }

    // user 객체에서 성인 인증 체크
    const parsedUser = JSON.parse(userData);
    const isAdultVerified = parsedUser?.adultVerified === true;

    console.log('[Adult Library] adultVerified:', isAdultVerified);

    // 성인 인증 체크
    if (!isAdultVerified) {
      console.log('[Adult Library] 성인 인증 필요 - /adult로 이동');
      router.push('/adult');
      return;
    }

    setUser(parsedUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      if (!token) return;

      // 백엔드에서 최근 본 웹툰 가져오기 (Purchase + View 병합)
      let historyData = [];
      try {
        const readingRes = await api.get('/users/library/reading', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('[Adult Library] 백엔드 최근 본 웹툰:', readingRes.data);

        // 성인 웹툰만 필터링
        historyData = (readingRes.data?.webtoons || [])
          .filter((item: any) => {
            const isAdult = item.comic.rating === 'ADULT' || item.comic.rating === '19' || item.comic.genre?.includes('adult');
            return isAdult;
          })
          .map((item: any) => ({
            id: item.id,
            comicId: item.comicId,
            lastReadEpisodeNumber: item.lastReadEpisodeNumber,
            lastReadAt: item.lastReadAt,
            totalEpisodes: item.totalEpisodes,
            viewedEpisodes: item.viewedEpisodes,
            progress: item.progress,
            comic: {
              id: item.comic.id,
              title: item.comic.title,
              thumbnail: item.comic.thumbnail,
              authorName: item.comic.authorName,
              genre: item.comic.genre,
              rating: item.comic.rating
            }
          }));

        console.log('[Adult Library] 성인 웹툰 필터링 후:', historyData.length);
      } catch (error) {
        console.error('[Adult Library] 백엔드 최근 본 웹툰 로드 실패:', error);
        historyData = [];
      }

      // 찜한 성인 웹툰 가져오기
      let likesData = [];
      try {
        const favoritesRes = await api.get('/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('[Adult Library] 찜한 웹툰 API 응답:', favoritesRes.data);

        // 성인 웹툰만 필터링
        likesData = (favoritesRes.data?.favorites || [])
          .filter((fav: any) => {
            const isAdult = fav.rating === 'ADULT' || fav.rating === '19' || fav.genre?.includes('adult');
            return isAdult;
          })
          .map((fav: any) => ({
            id: fav.id,
            comicId: fav.id,
            createdAt: fav.addedAt,
            comic: {
              id: fav.id,
              title: fav.title,
              thumbnail: fav.thumbnailUrl,
              authorName: fav.author,
              genre: fav.genre,
              rating: fav.rating
            }
          }));

        console.log('[Adult Library] 찜한 성인 웹툰:', likesData.length);
      } catch (error) {
        console.error('[Adult Library] 찜한 웹툰 로드 실패:', error);
        likesData = [];
      }

      setHistory(historyData);
      setLikes(likesData);

      // 추천 성인 웹툰 로직
      const userGenres = new Set<string>();
      const viewedComicIds = new Set<string>();

      historyData.forEach((item: any) => {
        if (item.comic?.genre) userGenres.add(item.comic.genre);
        if (item.comicId) viewedComicIds.add(item.comicId);
      });

      likesData.forEach((item: any) => {
        if (item.comic?.genre) userGenres.add(item.comic.genre);
        if (item.comicId) viewedComicIds.add(item.comicId);
      });

      // 추천 성인 작품 가져오기 (성인 웹툰만)
      try {
        console.log('[Adult Library] 추천 성인 작품 로드 시작');
        console.log('[Adult Library] 사용자가 본 장르:', Array.from(userGenres));

        // excludeAdult를 false로 설정하여 성인 웹툰만 가져오기
        const popularRes = await api.get('/frontend/comics/popular', {
          params: {
            limit: 50,
            excludeAdult: false,  // 성인 웹툰 포함
            locale: 'ko'
          }
        });

        console.log('[Adult Library] 인기 작품 API 응답:', popularRes.data);
        const allComics = (popularRes.data?.comics || []).filter((comic: any) => {
          // 성인 웹툰만 필터링
          return comic.rating === 'ADULT' || comic.rating === '19' || comic.genre?.includes('adult');
        });

        console.log('[Adult Library] 성인 웹툰 필터링 후:', allComics.length);

        // 추천 로직 개선: 같은 장르 우선, 이미 본 작품도 포함
        // 1. 같은 장르 + 안 본 작품 (최우선)
        const genreMatchedNotViewed = allComics.filter((comic: any) =>
          !viewedComicIds.has(comic.id) && userGenres.has(comic.genre)
        );

        // 2. 같은 장르 + 이미 본 작품 (차선)
        const genreMatchedViewed = allComics.filter((comic: any) =>
          viewedComicIds.has(comic.id) && userGenres.has(comic.genre)
        );

        // 3. 다른 장르 + 안 본 작품
        const otherNotViewed = allComics.filter((comic: any) =>
          !viewedComicIds.has(comic.id) && !userGenres.has(comic.genre)
        );

        // 4. 다른 장르 + 이미 본 작품 (최후)
        const otherViewed = allComics.filter((comic: any) =>
          viewedComicIds.has(comic.id) && !userGenres.has(comic.genre)
        );

        // 우선순위대로 추천 목록 구성 (최대 6개)
        const recommendedComics = [
          ...genreMatchedNotViewed,
          ...genreMatchedViewed,
          ...otherNotViewed,
          ...otherViewed
        ].slice(0, 6);

        const filtered = recommendedComics.map((comic: any) => ({
          id: comic.id,
          comicId: comic.id,
          comic: {
            id: comic.id,
            title: comic.title,
            thumbnail: comic.thumbnailUrl,
            authorName: comic.author,
            genre: comic.genre,
            rating: comic.rating
          }
        }));

        console.log('[Adult Library] 추천 성인 작품:', filtered.length);
        console.log('[Adult Library] 같은 장르(안봄):', genreMatchedNotViewed.length, '같은 장르(봄):', genreMatchedViewed.length, '다른 장르(안봄):', otherNotViewed.length, '다른 장르(봄):', otherViewed.length);
        setRecommendations(filtered);
      } catch (error) {
        console.error('[Adult Library] 추천 작품 로드 실패:', error);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('[Adult Library] 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '/next.svg';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return path.startsWith('/') ? path : `/${path}`;
  };

  const getVoiceVideoUrl = (title: string) => {
    if (title === '가정교사') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/1화_음성/voice.mp4`);
    } else if (title === '개자식') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/voice.mp4`);
    } else if (title === '거유 왁싱샵 실장님들') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/voice.mp4`);
    } else if (title === '신도시 미시들의 비밀 동아리') {
      return getImageUrl(`/uploads/webtoons/adult/신도시 미시 (NEW)/voice.mp4`);
    } else if (title === '엘리베이터에 갇힌 두 남녀') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/voice.mp4`);
    } else if (title === '군도') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/voice.mp4`);
    } else if (title === '그녀들에게 배달') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/voice.mp4`);
    } else if (title === '유토피아') {
      return getImageUrl(`/uploads/webtoons/adult/${title}/voice.mp4`);
    }
    return null;
  };

  // 모바일 감지
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      );
    }

    const items = activeTab === 'history' ? history : activeTab === 'likes' ? likes : recommendations;

    if (items.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="text-gray-400 mb-4">
            {activeTab === 'history' && '최근 본 성인 웹툰이 없습니다'}
            {activeTab === 'likes' && '좋아요한 성인 웹툰이 없습니다'}
            {activeTab === 'recommendations' && '추천할 성인 웹툰이 없습니다'}
          </div>
          <Link
            href="/adult"
            className="inline-block px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-colors"
          >
            성인 웹툰 둘러보기
          </Link>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item: any) => {
          const voiceUrl = getVoiceVideoUrl(item.comic?.title);
          return (
            <Link
              key={item.id}
              href={`/webtoons/${item.comicId || item.comic?.id}`}
              className="group cursor-pointer"
            >
              <div
                className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800"
                onMouseEnter={(e) => {
                  if (isMobile) return;
                  const imgEl = e.currentTarget.querySelector('img');
                  const videoWrapper = e.currentTarget.querySelector('div[data-video-wrapper]') as HTMLDivElement;
                  const video = e.currentTarget.querySelector('video');

                  if (video && videoWrapper && imgEl) {
                    (imgEl as HTMLImageElement).style.opacity = '0';
                    videoWrapper.style.opacity = '1';
                    video.play().catch(() => {});
                  }
                }}
                onMouseLeave={(e) => {
                  const imgEl = e.currentTarget.querySelector('img');
                  const videoWrapper = e.currentTarget.querySelector('div[data-video-wrapper]') as HTMLDivElement;
                  const video = e.currentTarget.querySelector('video');

                  if (video && videoWrapper && imgEl) {
                    video.pause();
                    video.currentTime = 0;
                    videoWrapper.style.opacity = '0';
                    (imgEl as HTMLImageElement).style.opacity = '1';
                  }
                }}
              >
                <img
                  src={getImageUrl(item.comic?.thumbnail)}
                  alt={item.comic?.title}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                  style={{ zIndex: 10, opacity: 1 }}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/next.svg';
                  }}
                />
                {voiceUrl && !isMobile && (
                  <div
                    data-video-wrapper
                    className="absolute inset-0 w-full h-full transition-opacity duration-300"
                    style={{ zIndex: 20, opacity: 0 }}
                  >
                    <video
                      src={voiceUrl}
                      className="w-full h-full object-cover"
                      loop
                      muted
                      playsInline
                      preload="none"
                    />
                  </div>
                )}
              {/* 그라데이션 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" style={{ zIndex: 30 }}></div>

              {activeTab === 'history' && item.progress !== undefined && (
                <>
                  {/* 진행률 텍스트 */}
                  <div className="absolute bottom-8 left-2 right-2 text-white" style={{ zIndex: 40 }}>
                    <div className="text-xs font-medium mb-1">
                      {item.viewedEpisodes || 0} / {item.totalEpisodes || 0} 화
                    </div>
                  </div>

                  {/* 녹색 프로그레스 바 - 직선 */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-600" style={{ zIndex: 40 }}>
                    <div
                      className="h-full bg-[#3E7A5A] transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </>
              )}
              {activeTab === 'history' && item.progress === undefined && item.lastReadEpisodeNumber && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2" style={{ zIndex: 40 }}>
                  <div className="text-white text-xs">
                    {item.lastReadEpisodeNumber}화까지 읽음
                  </div>
                </div>
              )}
              </div>
              <div className="mt-2">
                <h3 className="font-medium text-sm line-clamp-2 dark:text-white">
                  {item.comic?.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.comic?.authorName || '작가'}
                </p>
                {activeTab === 'history' && item.lastReadAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(item.lastReadAt).toLocaleDateString('ko-KR')}
                  </p>
                )}
                {activeTab === 'likes' && item.createdAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#141414]">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-6 md:px-8 lg:px-12 py-6">
        {/* 탭 메뉴 */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>최근 본</span>
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'likes'
                ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>좋아요</span>
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>추천</span>
          </button>
        </div>

        {/* 콘텐츠 */}
        {renderContent()}
      </div>
    </div>
  );
}
