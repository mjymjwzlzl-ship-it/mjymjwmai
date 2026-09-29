'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Users, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';

interface Character {
  id: string;
  name: string;
  role: string;
  gender: string;
  age: string;
  occupation: string;
  personality: string[];
  appearance: string;
  imageUrl: string;
  speechStyle: string;
}

interface WebtoonInfo {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  genre: string;
  description: string;
  totalEpisodes: number;
  userProgress: number;
}

export default function AdultChatWebtoonPage() {
  const params = useParams();
  const router = useRouter();
  const [webtoon, setWebtoon] = useState<WebtoonInfo | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && params.id) {
      loadWebtoonData();
    }
  }, [mounted, params.id]);

  const loadWebtoonData = async () => {
    if (!params.id) return;

    try {
      // 웹툰 정보 가져오기
      const webtoonResponse = await api.get(`/frontend/comics/${params.id}`);
      const webtoonData = webtoonResponse.data;

      setWebtoon({
        id: webtoonData.id,
        title: webtoonData.title,
        thumbnail: webtoonData.thumbnailUrl || webtoonData.thumbnail,
        author: webtoonData.author || '작가',
        genre: webtoonData.genre || '로맨스',
        description: webtoonData.description || '',
        totalEpisodes: webtoonData.totalEpisodes || webtoonData.episodeCount || 0,
        userProgress: 0
      });

      // 독자 진행도 가져오기
      try {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          const progressResponse = await api.get(`/users/webtoon-progress/${params.id}`);
          if (progressResponse.data?.success) {
            setUserProgress(progressResponse.data.data?.maxEpisodeViewed || 0);
          }
        }
      } catch (error) {
        console.log('진행도 로드 실패 (비로그인 또는 오류)');
      }

      // 캐릭터 정보 가져오기
      const charactersResponse = await api.get(`/chat/webtoon/${params.id}/characters`);
      if (charactersResponse.data?.success) {
        setCharacters(charactersResponse.data.characters || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const handleCharacterClick = (characterId: string) => {
    if (userProgress === 0) {
      alert('최소 1화 이상 읽어야 캐릭터와 대화할 수 있습니다.');
      return;
    }
    router.push(`/adult/chat/webtoon/${params.id}/character/${characterId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!webtoon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">웹툰을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 pt-14 md:pt-16">
      {/* 상단 네비게이션 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-14 md:top-16 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/adult/webtoons/${params.id}`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">캐릭터 선택</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* 웹툰 정보 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <div className="relative w-24 h-32 rounded-lg overflow-hidden flex-shrink-0">
              {webtoon.thumbnail ? (
                <img
                  src={getImageUrl(webtoon.thumbnail)}
                  alt={webtoon.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-400 to-pink-400"></div>
              )}
              <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 rounded-md">
                <span className="text-white text-xs font-bold">19+</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {webtoon.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {webtoon.author} · {webtoon.genre}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span>독자 진행: {userProgress}/{webtoon.totalEpisodes}화</span>
              </div>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        {userProgress === 0 && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-900 dark:text-rose-200 mb-1">
                  캐릭터 잠금
                </h4>
                <p className="text-sm text-rose-800 dark:text-rose-300">
                  캐릭터와 대화하려면 최소 1화 이상 읽어야 합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 캐릭터 목록 */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600" />
            캐릭터 목록
          </h3>

          {characters.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                아직 대화 가능한 캐릭터가 없습니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleCharacterClick(character.id)}
                  disabled={userProgress === 0}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-2 border-rose-100 dark:border-rose-900 text-left ${
                    userProgress === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    {/* 캐릭터 이미지 */}
                    <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-rose-400 to-pink-400">
                      {character.imageUrl ? (
                        <img
                          src={getImageUrl(character.imageUrl)}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-10 h-10 text-white" />
                        </div>
                      )}
                      {userProgress === 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* 캐릭터 정보 */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                        {character.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {character.occupation} · {character.age}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {character.personality.slice(0, 2).map((trait, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full text-xs"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
