'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, BookOpen, Users, Lock, Flame } from 'lucide-react';
import { api } from '@/lib/api';

interface Webtoon {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  genre: string;
  totalEpisodes: number;
  characterCount: number; // 등장 캐릭터 수 (임시)
  userProgress: number; // 독자가 읽은 화수
  viewCount: number;
}

export default function AdultChatHomePage() {
  const router = useRouter();
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [hotWebtoons, setHotWebtoons] = useState<Webtoon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWebtoons();
  }, []);

  const loadWebtoons = async () => {
    try {
      // 성인 웹툰 목록 가져오기
      const response = await api.get('/frontend/adult-home');
      const allComics = response.data?.data?.allComics || [];

      // 성인 웹툰만 필터링
      const adultComics = allComics.filter((comic: any) =>
        comic.rating === 'ADULT' ||
        comic.rating === '19' ||
        comic.genre === 'adult' ||
        (comic.ageRating && (comic.ageRating === '19' || parseInt(comic.ageRating) >= 19))
      );

      // 독자 진행도 가져오기 (로그인 상태인 경우)
      let progressMap = new Map<string, number>();
      try {
        if (typeof window !== 'undefined') {
          const authToken = localStorage.getItem('authToken');
          console.log('🔐 [Adult Chat] authToken 체크:', authToken ? '있음 ✅' : '없음 ❌');

          if (authToken) {
            console.log('📡 [Adult Chat] /users/webtoon-progress API 호출 중...');
            const progressResponse = await api.get('/users/webtoon-progress');
            console.log('📊 [Adult Chat] 진행도 API 응답:', progressResponse.data);

            if (progressResponse.data?.success) {
              const progressData = progressResponse.data.data || [];
              console.log('✅ [Adult Chat] 진행도 데이터:', progressData.length, '개', progressData.slice(0, 3));
              progressData.forEach((item: any) => {
                progressMap.set(item.comicId, item.maxEpisodeViewed || 0);
              });
              console.log('📍 [Adult Chat] progressMap 생성됨:', progressMap.size, '개 웹툰');
            } else {
              console.warn('⚠️ [Adult Chat] API success=false:', progressResponse.data);
            }
          } else {
            console.warn('⚠️ [Adult Chat] authToken 없음 - 로그인 필요');
          }
        }
      } catch (progressError: any) {
        console.error('❌ [Adult Chat] 진행도 로드 실패:', progressError);
        console.error('❌ [Adult Chat] 에러 상세:', progressError.response?.data || progressError.message);
      }

      // 웹툰 데이터 생성
      const webtoonsData: Webtoon[] = adultComics.map((comic: any) => {
        const totalEpisodes = comic._count?.episodes || comic.episodeCount || 0;
        const userProgress = progressMap.get(comic.id) || 0;

        // 디버깅: 에피소드 수가 0인 경우 로그
        if (totalEpisodes === 0) {
          console.warn(`⚠️ [Adult] ${comic.title}: totalEpisodes = 0`, {
            _count: comic._count,
            episodeCount: comic.episodeCount
          });
        }

        // 디버깅: 독자 진행도 확인
        if (userProgress > 0) {
          console.log(`📖 [Adult] ${comic.title}: ${userProgress}/${totalEpisodes}화`);
        }

        return {
          id: comic.id,
          title: comic.title,
          thumbnail: comic.thumbnail,
          description: comic.description || '이 웹툰의 캐릭터들과 대화해보세요',
          genre: comic.genre || '로맨스',
          totalEpisodes,
          characterCount: Math.floor(Math.random() * 4) + 2, // 2-5명 (임시 - 추후 DB에서)
          userProgress,
          viewCount: comic.viewCount || 0
        };
      });

      // 조회수 기준 정렬
      const sorted = webtoonsData.sort((a, b) => b.viewCount - a.viewCount);

      setWebtoons(sorted);
      setHotWebtoons(sorted.slice(0, 6)); // 인기 작품 6개
      setIsLoading(false);
    } catch (error) {
      console.error('웹툰 로드 실패:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 pt-20 md:pt-24">
      {/* 메인 컨텐츠 */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* 소개 섹션 */}
        <div className="mb-10 text-center">
          <div className="inline-block mb-3 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <span className="text-red-600 dark:text-red-400 font-bold text-sm">🔞 성인 전용 콘텐츠</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
            성인 웹툰 캐릭터와 대화하세요
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            읽은 화수만큼 캐릭터와 자유롭게 대화할 수 있어요
          </p>
        </div>

        {/* HOT 작품 섹션 (작품별 보기) */}
        {hotWebtoons.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="w-6 h-6 text-rose-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                HOT 작품
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {hotWebtoons.map((webtoon) => (
                <button
                  key={webtoon.id}
                  onClick={() => router.push(`/adult/chat/webtoon/${webtoon.id}`)}
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-rose-200 dark:border-rose-800"
                >
                  {/* 썸네일 */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {webtoon.thumbnail ? (
                      <img
                        src={webtoon.thumbnail}
                        alt={webtoon.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                    {/* 19+ 배지 */}
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 rounded-md">
                      <span className="text-white text-xs font-bold">19+</span>
                    </div>

                    {/* 하단 정보 */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="font-bold text-white text-sm mb-1 line-clamp-1">
                        {webtoon.title}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-gray-200">
                        <Users className="w-3 h-3" />
                        <span>캐릭터 {webtoon.characterCount}명</span>
                      </div>
                    </div>
                  </div>

                  {/* 진행도 */}
                  <div className="p-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>독자 진행</span>
                      <span>{webtoon.userProgress}/{webtoon.totalEpisodes}화</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(webtoon.userProgress / webtoon.totalEpisodes) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 전체 작품 목록 */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-rose-600" />
            모든 작품
          </h3>

          {webtoons.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                아직 대화 가능한 작품이 없습니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {webtoons.map((webtoon) => (
                <button
                  key={webtoon.id}
                  onClick={() => router.push(`/adult/chat/webtoon/${webtoon.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-2 border-rose-100 dark:border-rose-900 text-left"
                >
                  <div className="flex gap-4 p-4">
                    {/* 썸네일 */}
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-rose-400 to-pink-400">
                      {webtoon.thumbnail ? (
                        <img
                          src={webtoon.thumbnail}
                          alt={webtoon.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {/* 19+ 배지 */}
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600 rounded">
                        <span className="text-white text-[10px] font-bold">19+</span>
                      </div>
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                        {webtoon.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {webtoon.genre}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mb-2">
                        <Users className="w-3 h-3" />
                        <span>캐릭터 {webtoon.characterCount}명</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>독자 진행도</span>
                          <span>{webtoon.userProgress}/{webtoon.totalEpisodes}화</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full"
                            style={{ width: `${(webtoon.userProgress / webtoon.totalEpisodes) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-10 p-6 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-rose-200 dark:border-rose-800">
          <h4 className="font-bold text-rose-900 dark:text-rose-200 mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            캐릭터 잠금 시스템
          </h4>
          <p className="text-sm text-rose-800 dark:text-rose-300">
            • 읽은 화수만큼만 캐릭터와 대화할 수 있어요<br />
            • 캐릭터는 독자가 읽은 화수까지의 내용만 알고 있어요<br />
            • 스포일러 걱정 없이 안전하게 대화하세요!
          </p>
        </div>
      </div>
    </div>
  );
}
