'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, RotateCcw, Send, User } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';
import { useLoginModalStore } from '@/store/loginModal';

interface Message {
  id: string;
  // notice = 캐릭터 대사가 아닌 시스템 안내 (서버 지연·오류·로그인 등)
  role: 'user' | 'assistant' | 'notice';
  content: string;
  imageUrl?: string;
  timestamp: Date;
  failed?: boolean;
  retryText?: string;
  action?: 'retry' | 'login' | 'coin';
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

// 캐릭터 이름 데이터가 없는 작품: 작품명을 대표 명칭으로, 역할은 주인공
const buildFallbackCharacter = (webtoon: WebtoonInfo | null): Character => ({
  id: 'main',
  name: webtoon?.title || 'ARATA 캐릭터',
  imageUrl: webtoon?.thumbnail || '',
  occupation: webtoon?.title ? `《${webtoon.title}》 · 주인공` : '주인공',
});

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const authToken = () => (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const openLogin = useLoginModalStore((state) => state.setOpen);
  const webtoonId = toParam(params.id);
  const characterId = toParam(params.characterId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [greetingLoading, setGreetingLoading] = useState(false);
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
  }, [messages, loading, greetingLoading]);

  const initChat = async () => {
    if (!webtoonId || !characterId) return;
    setInitialLoading(true);
    let progress = 1;
    try {
      const nextWebtoon = await loadWebtoon();
      await loadCharacter(nextWebtoon);
      progress = await loadProgress();
      loadDailyCount();
    } finally {
      setInitialLoading(false);
    }
    await loadChatHistory(progress);
  };

  const loadWebtoon = async (): Promise<WebtoonInfo | null> => {
    try {
      const response = await api.get(`/frontend/comics/${webtoonId}`);
      const data = response.data;
      const nextWebtoon = { id: data.id, title: data.title, thumbnail: data.thumbnailUrl || data.thumbnail || '' };
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
      const found = response.data?.characters?.find((c: any) => c.id === characterId);
      if (found) {
        const nextCharacter = {
          id: found.id,
          name: found.name,
          imageUrl: found.imageUrl || nextWebtoon?.thumbnail || '',
          occupation: nextWebtoon?.title ? `《${nextWebtoon.title}》 · ${found.occupation || '등장인물'}` : (found.occupation || '등장인물'),
        };
        setCharacter(nextCharacter);
        return nextCharacter;
      }
    } catch {
      // 기본 캐릭터로 대체
    }
    const fallback = buildFallbackCharacter(nextWebtoon);
    setCharacter(fallback);
    return fallback;
  };

  const loadProgress = async () => {
    let progress = 1;
    try {
      if (authToken()) {
        const response = await api.get(`/users/webtoon-progress/${webtoonId}`);
        if (response.data?.success) progress = Math.max(1, response.data.data?.maxEpisodeViewed || 1);
      }
    } catch {
      // 진행도 없으면 1화 기준
    }
    setUserProgress(progress);
    return progress;
  };

  const loadDailyCount = async () => {
    try {
      const token = authToken();
      const response = await api.get('/chat/daily-count', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (response.data?.success) setDailyCount({ remaining: response.data.remaining ?? 20 });
    } catch {
      // 표시만 생략
    }
  };

  // 저장된 대화가 있으면 그대로 이어서 보여준다. 없을 때만 캐릭터 인사를 새로 받는다.
  const loadChatHistory = async (progress: number) => {
    const token = authToken();
    if (token) {
      try {
        const response = await api.get(`/chat/history/${webtoonId}/${characterId}`, { headers: { Authorization: `Bearer ${token}` } });
        const saved = (response.data?.messages || []).filter((msg: any) => msg.role === 'user' || msg.role === 'assistant');
        if (saved.length > 0) {
          setMessages(saved.map((msg: any) => ({
            id: msg.id || newId(),
            role: msg.role,
            content: msg.content,
            imageUrl: msg.imageUrl,
            timestamp: new Date(msg.timestamp || Date.now()),
          })));
          return;
        }
      } catch {
        // 기록을 못 불러오면 인사로 시작
      }
    }
    await requestGreeting(progress);
  };

  const requestGreeting = async (progress: number = userProgress) => {
    setGreetingLoading(true);
    try {
      const token = authToken();
      const response = await api.post('/chat/greeting', { webtoonId, characterId, userProgress: progress }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.data?.greeting) {
        setMessages([{ id: newId(), role: 'assistant', content: response.data.greeting, timestamp: new Date() }]);
      } else if (response.data?.alreadyStarted) {
        await loadChatHistory(progress);
      }
    } catch {
      setMessages([{ id: newId(), role: 'notice', content: '캐릭터가 아직 대화할 준비를 하지 못했어요. 메시지를 보내면 바로 이어서 답해요.', timestamp: new Date() }]);
    } finally {
      setGreetingLoading(false);
    }
  };

  const pushNotice = (content: string, extra: Partial<Message> = {}) => {
    setMessages((prev) => [...prev.filter((msg) => msg.role !== 'notice'), { id: newId(), role: 'notice', content, timestamp: new Date(), ...extra }]);
  };

  const sendText = async (userInput: string, existingId?: string) => {
    if (!userInput || loading || !character || !webtoonId || !characterId) return;
    const token = authToken();
    if (!token) {
      pushNotice('대화를 하려면 로그인이 필요해요.', { action: 'login' });
      openLogin(true);
      return;
    }
    const userMsgId = existingId || newId();
    setMessages((prev) => {
      const cleaned = prev.filter((msg) => msg.role !== 'notice');
      if (existingId) return cleaned.map((msg) => (msg.id === existingId ? { ...msg, failed: false } : msg));
      return [...cleaned, { id: userMsgId, role: 'user', content: userInput, timestamp: new Date() }];
    });
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ webtoonId, characterId, message: userInput, userProgress }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        setMessages((prev) => prev.map((msg) => (msg.id === userMsgId ? { ...msg, failed: true } : msg)));
        if (response.status === 401) pushNotice('로그인이 만료됐어요. 다시 로그인해 주세요.', { action: 'login' });
        else if (response.status === 402) pushNotice(data.message || '오늘 무료 대화를 모두 사용했어요.', { action: 'coin' });
        else pushNotice(data.message || '캐릭터가 잠시 응답하지 못했어요.', { action: 'retry', retryText: userInput, id: `notice-${userMsgId}` });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) assistantContent += parsed.content;
          } catch {
            // 조각 무시
          }
        }
      }
      if (!assistantContent.trim()) throw new Error('empty reply');
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: assistantContent, timestamp: new Date() }]);
      loadDailyCount();
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setMessages((prev) => prev.map((msg) => (msg.id === userMsgId ? { ...msg, failed: true } : msg)));
      pushNotice('연결이 원활하지 않아 답을 받지 못했어요.', { action: 'retry', retryText: userInput, id: `notice-${userMsgId}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    const userInput = inputText.trim();
    if (!userInput) return;
    setInputText('');
    void sendText(userInput);
  };

  const handleRetry = (notice: Message) => {
    if (!notice.retryText) return;
    const failedId = notice.id.startsWith('notice-') ? notice.id.slice(7) : undefined;
    void sendText(notice.retryText, failedId);
  };

  // 사용자가 직접 고를 때만 대화를 지운다
  const handleNewConversation = async () => {
    const token = authToken();
    if (!token) {
      setMessages([]);
      await requestGreeting();
      return;
    }
    if (!confirm('지금까지의 대화를 지우고 새로 시작할까요? 지운 대화는 되돌릴 수 없어요.')) return;
    try {
      await api.delete(`/chat/history/${webtoonId}/${characterId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages([]);
      await requestGreeting();
    } catch {
      pushNotice('대화를 초기화하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
          <div className="flex shrink-0 items-center gap-2">
            <p className="hidden text-xs font-medium text-gray-600 dark:text-gray-300 sm:block">
              무료 대화 {dailyCount.remaining}/20
            </p>
            <button
              type="button"
              onClick={handleNewConversation}
              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-arata-green hover:text-arata-green dark:border-gray-600 dark:text-gray-200"
              title="대화를 지우고 처음부터 시작"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              새 대화
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 pt-[calc(176px+env(safe-area-inset-top,0px))] md:pt-[calc(184px+env(safe-area-inset-top,0px))]">
        <div className="w-full md:max-w-3xl md:mx-auto px-4 space-y-4">
          {messages.map((msg) => msg.role === 'notice' ? (
            <div key={msg.id} className="flex justify-center">
              <div className="flex max-w-[90%] flex-col items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-center text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <p className="flex items-center gap-1.5 font-medium"><AlertCircle className="h-4 w-4 shrink-0" />{msg.content}</p>
                {msg.action === 'retry' && (
                  <button type="button" onClick={() => handleRetry(msg)} disabled={loading} className="inline-flex items-center gap-1 rounded-full bg-arata-green px-4 py-1.5 text-xs font-black text-black disabled:opacity-60">
                    <RotateCcw className="h-3.5 w-3.5" />다시 시도
                  </button>
                )}
                {msg.action === 'login' && (
                  <button type="button" onClick={() => openLogin(true)} className="rounded-full bg-arata-green px-4 py-1.5 text-xs font-black text-black">로그인</button>
                )}
                {msg.action === 'coin' && (
                  <button type="button" onClick={() => router.push('/coin')} className="rounded-full bg-arata-green px-4 py-1.5 text-xs font-black text-black">코인 충전</button>
                )}
              </div>
            </div>
          ) : (
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
                      ? `bg-arata-green text-gray-950 border-arata-green ${msg.failed ? 'opacity-60' : ''}`
                      : 'bg-white text-gray-900 border-gray-100 dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700'
                  } rounded-2xl px-4 py-3 shadow-sm border`}
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
                  <p className={`mt-2 text-xs ${msg.role === 'user' ? 'text-gray-800' : 'text-gray-500 dark:text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    {msg.failed && ' · 전송 실패'}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {(loading || greetingLoading) && (
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
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
            <div className="flex-1 bg-gray-100 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2">
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
                className="flex-1 bg-transparent outline-none text-gray-950 placeholder-gray-500 dark:text-white dark:placeholder-gray-400 text-[16px] leading-normal resize-none max-h-32 overflow-y-auto"
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
              className="p-3 rounded-full bg-arata-green text-black hover:brightness-95 transition disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-300"
              aria-label="메시지 보내기"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 px-1 font-medium text-gray-600 dark:text-gray-300">
            <p>독자 진행: {userProgress}화까지 반영</p>
            <p>오늘 무료: {dailyCount.remaining}/20회</p>
          </div>
        </div>
      </div>
    </div>
  );
}
