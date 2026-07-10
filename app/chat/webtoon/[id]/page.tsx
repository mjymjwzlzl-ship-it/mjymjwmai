'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Sparkles, Users } from 'lucide-react';
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

const toParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const buildFallbackCharacter = (webtoon: WebtoonInfo): Character => ({
  id: 'main',
  name: `${webtoon.title} 주인공`,
  role: 'main',
  gender: '',
  age: '',
  occupation: '작품 캐릭터',
  personality: ['친근함', '호기심'],
  appearance: '',
  imageUrl: webtoon.thumbnail,
  speechStyle: '친근하고 자연스러운 말투',
});

export default function ChatWebtoonPage() {
  const params = useParams();
  const router = useRouter();
  const webtoonId = toParam(params.id);
  const [webtoon, setWebtoon] = useState<WebtoonInfo | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && webtoonId) {
      loadWebtoonData();
    }
  }, [mounted, webtoonId]);

  const loadWebtoonData = async () => {
    if (!webtoonId) return;

    try {
      const webtoonResponse = await api.get(`/frontend/comics/${webtoonId}`);
      const webtoonData = webtoonResponse.data;
      const nextWebtoon: WebtoonInfo = {
        id: webtoonData.id,
        title: webtoonData.title,
        thumbnail: webtoonData.thumbnailUrl || webtoonData.thumbnail || '',
        author: webtoonData.author || 'ARATA',
        genre: webtoonData.genre || '웹툰',
        description: webtoonData.description || '',
        totalEpisodes: webtoonData.totalEpisodes || webtoonData.episodeCount || 0,
        userProgress: 0,
      };

      setWebtoon(nextWebtoon);

      try {
        if (typeof window !== 'undefined') {
          const authToken = localStorage.getItem('authToken');
          if (authToken) {
            const progressResponse = await api.get(`/users/webtoon-progress/${webtoonId}`);
            if (progressResponse.data?.success) {
              setUserProgress(progressResponse.data.data?.maxEpisodeViewed || 0);
            }
          }
        }
      } catch (error) {
        console.log('진행도 로드 실패');
      }

      let nextCharacters: Character[] = [];
      try {
        const charactersResponse = await api.get(`/chat/webtoon/${webtoonId}/characters`);
        if (charactersResponse.data?.success) {
          nextCharacters = charactersResponse.data.characters || [];
        }
      } catch (error) {
        console.log('캐릭터 데이터 로드 실패, 기본 캐릭터로 대체합니다.');
      }

      setCharacters(nextCharacters.length > 0 ? nextCharacters : [buildFallbackCharacter(nextWebtoon)]);
    } catch (error) {
      console.error('채팅 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterClick = (characterId: string) => {
    router.push(`/chat/webtoon/${webtoonId}/character/${characterId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-arata-green"></div>
      </div>
    );
  }

  if (!webtoon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">작품을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 dark:bg-gray-950 dark:text-white">
      <div className="fixed top-14 md:top-16 left-0 right-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(`/webtoons/${webtoonId}`)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="작품으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-bold">캐릭터 선택</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 pt-[120px] md:pt-[128px] pb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex gap-4">
            <div className="w-24 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
              {webtoon.thumbnail ? (
                <img
                  src={getImageUrl(webtoon.thumbnail)}
                  alt={webtoon.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-cyan-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-2">{webtoon.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {webtoon.author} · {webtoon.genre}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span>독자 진행: {userProgress}/{webtoon.totalEpisodes}화</span>
              </div>
            </div>
          </div>
        </div>

        {userProgress === 0 && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-arata-green flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-950 dark:text-emerald-100 mb-1">
                  바로 대화할 수 있어요
                </h4>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  작품을 더 읽으면 캐릭터 답변이 더 풍부해집니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-arata-green" />
            캐릭터 목록
          </h3>

          {characters.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl">
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
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-800 text-left hover:scale-[1.02]"
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-emerald-400 to-cyan-500">
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
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold mb-1">{character.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {character.occupation}{character.age ? ` · ${character.age}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {character.personality.slice(0, 2).map((trait, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs"
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
