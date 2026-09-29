'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Send, User } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

interface Character {
  id: string;
  name: string;
  imageUrl: string;
  occupation: string;
}

interface WebtoonInfo {
  id: string;
  title: string;
  thumbnail: string;
}

const toParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const buildFallbackCharacter = (webtoon: WebtoonInfo | null): Character => ({
  id: 'main',
  name: webtoon?.title || 'ARATA 캐릭터',
  imageUrl: webtoon?.thumbnail || '',
  occupation: webtoon?.title ? `《${webtoon.title}》 · 주인공` : '주인공',
});

const buildGreeting = (character: Character, webtoon: WebtoonInfo | null) =>
  `안녕하세요. ${character.id === 'main' && character.name === webtoon?.title ? `《${webtoon.title}》의 주인공` : character.name}입니다.\n${webtoon?.title ? `"${webtoon.title}" 세계관에서 ` : ''}궁금한 장면이나 캐릭터 이야기를 편하게 물어봐 주세요.`;

const buildLocalReply = (character: Character, userInput: string) =>
  `${character.name}: 지금 서버 답변이 잠시 늦어지고 있어요. 그래도 "${userInput}"에 대해 이야기할 준비는 되어 있어요. 작품 속 장면이나 캐릭터 관계를 조금 더 구체적으로 물어보면 바로 이어서 대화해볼게요.`;

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const webtoonId = toParam(params.id);
  const characterId = toParam(params.characterId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [character, setCharacter] = useState<Character | null>(null);
  const [webtoon, setWebtoon] = useState<WebtoonInfo | null>(null);
  const [userProgress, setUserProgress] = useState(1);
  const [dailyCount, setDailyCount] = useState({ remaining: 20 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!webtoonId || !characterId) return;
    initChat();
  }, [webtoonId, characterId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const initChat = async () => {
    if (!webtoonId || !characterId) return;

    setInitialLoading(true);
    try {
      const nextWebtoon = await loadWebtoon();
      const nextCharacter = await loadCharacter(nextWebtoon);
      const progress = await loadProgress();
      await loadChatHistory(nextCharacter, nextWebtoon, progress);
      loadDailyCount();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadWebtoon = async (): Promise<WebtoonInfo | null> => {
    try {
      const response = await api.get(`/frontend/comics/${webtoonId}`);
      const data = response.data;
      const nextWebtoon = {
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnailUrl || data.thumbnail || '',
      };
      setWebtoon(nextWebtoon);
      return nextWebtoon;
    } catch (error) {
      console.error('작품 정보 로드 실패:', error);
      return null;
    }
  };

  const loadCharacter = async (nextWebtoon: WebtoonInfo | null): Promise<Character> => {
    try {
      const response = await api.get(`/chat/webtoon/${webtoonId}/characters`);
      if (response.data?.success) {
        const found = response.data.characters?.find((c: any) => c.id === characterId);
        if (found) {
          const nextCharacter = {
            id: found.id,
            name: found.name,
            imageUrl: found.imageUrl || nextWebtoon?.thumbnail || '',
            occupation: found.occupation || '작품 캐릭터',
          };
          setCharacter(nextCharacter);
          return nextCharacter;
        }
      }
    } catch (error) {
      console.log('캐릭터 정보 로드 실패, 기본 캐릭터로 대체합니다.');
    }

    const fallback = buildFallbackCharacter(nextWebtoon);
    setCharacter(fallback);
    return fallback;
  };

  const loadProgress = async () => {
    let progress = 1;
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (authToken) {
        const response = await api.get(`/users/webtoon-progress/${webtoonId}`);
        if (response.data?.success) {
          progress = Math.max(1, response.data.data?.maxEpisodeViewed || 1);
        }
      }
    } catch (error) {
      console.log('진행도 로드 실패');
    }
    setUserProgress(progress);
    return progress;
  };

  const loadDailyCount = async () => {
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await api.get('/chat/daily-count', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (response.data?.success) {
        setDailyCount({ remaining: response.data.remaining ?? 20 });
      }
    } catch (error) {
      console.log('무료 대화 횟수 로드 실패');
    }
  };

  const loadChatHistory = async (
    nextCharacter: Character,
    nextWebtoon: WebtoonInfo | null,
    progress: number,
  ) => {
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!authToken) {
        setMessages([createGreetingMessage(nextCharacter, nextWebtoon)]);
        return;
      }

      const response = await api.get(`/chat/history/${webtoonId}/${characterId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { progress },
      });

      if (response.data?.success && response.data.messages?.length > 0) {
        setMessages(response.data.messages.map((msg: any) => ({
          id: msg.id || String(Date.now() + Math.random()),
          role: msg.role,
          content: msg.content,
          imageUrl: msg.imageUrl,
          timestamp: new Date(msg.timestamp || Date.now()),
        })));
      } else {
        setMessages([createGreetingMessage(nextCharacter, nextWebtoon)]);
      }
    } catch (error) {
      console.log('채팅 기록 로드 실패');
      setMessages([createGreetingMessage(nextCharacter, nextWebtoon)]);
    }
  };

  const createGreetingMessage = (nextCharacter: Character, nextWebtoon: WebtoonInfo | null): Message => ({
    id: `greeting-${Date.now()}`,
    role: 'assistant',
    content: buildGreeting(nextCharacter, nextWebtoon),
    timestamp: new Date(),
  });

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        role: 'assistant',
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading || !character || !webtoonId || !characterId) return;

    const userInput = inputText.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      },
    ]);
    setInputText('');
    setLoading(true);

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          webtoonId,
          characterId,
          message: userInput,
          userProgress,
        }),
      });

      if (!response.ok || !response.body) {
        appendAssistantMessage(buildLocalReply(character, userInput));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = String(Date.now() + 1);

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: assistantContent } : msg
              ));
            }
          } catch {
            // Ignore malformed stream fragments.
          }
        }
      }

      if (!assistantContent.trim()) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: buildLocalReply(character, userInput) } : msg
        ));
      }
      loadDailyCount();
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      appendAssistantMessage(buildLocalReply(character, userInput));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !character) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-arata-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-950 dark:bg-gray-950 dark:text-white">
      <div className="fixed left-0 right-0 top-[calc(96px+env(safe-area-inset-top,0px))] z-40 md:top-[calc(104px+env(safe-area-inset-top,0px))] border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(`/chat/webtoon/${webtoonId}`)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="캐릭터 선택으로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                {character.imageUrl ? (
                  <img
                    src={getImageUrl(character.imageUrl)}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-arata-green font-bold">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold truncate">{character.name}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{character.occupation}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            무료 대화 {dailyCount.remaining}/20
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 pt-[calc(176px+env(safe-area-inset-top,0px))] md:pt-[calc(184px+env(safe-area-inset-top,0px))]">
        <div className="w-full md:max-w-3xl md:mx-auto px-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                  {character.imageUrl ? (
                    <img
                      src={getImageUrl(character.imageUrl)}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-arata-green font-bold">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2 max-w-[85%]">
                <div
                  className={`${
                    msg.role === 'user'
                      ? 'bg-arata-green text-black'
                      : 'bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100'
                  } rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-800`}
                >
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="생성 이미지"
                      className="mt-3 w-full h-auto object-cover rounded-lg max-w-[320px]"
                    />
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {character.imageUrl ? (
                  <img
                    src={getImageUrl(character.imageUrl)}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-arata-green font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-4 pb-3 pt-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="w-full md:max-w-3xl md:mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="메시지를 입력하세요"
                disabled={loading}
                className="flex-1 bg-transparent outline-none text-gray-950 placeholder-gray-400 dark:text-white text-[16px] leading-normal resize-none max-h-32 overflow-y-auto"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                rows={1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={loading || !inputText.trim()}
              className="p-3 rounded-full bg-arata-green text-black hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="메시지 보내기"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2 px-1 text-gray-500 dark:text-gray-400">
            <p>독자 진행: {userProgress}화까지 반영</p>
            <p>오늘 무료: {dailyCount.remaining}/20회</p>
          </div>
        </div>
      </div>
    </div>
  );
}
