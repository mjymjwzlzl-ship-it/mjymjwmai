'use client';

import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Image as ImageIcon, Mic, Volume2, VolumeX, MoreVertical, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: Date;
}

interface Character {
  id: string;
  name: string;
  imageUrl: string;
  occupation: string;
}

export default function AdultChatPage() {
  const params = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'text' | 'image'>('text'); // 로딩 타입 구분
  const [character, setCharacter] = useState<Character | null>(null);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [userProgress, setUserProgress] = useState(1); // 기본값 1화
  const [mounted, setMounted] = useState(false);
  const [dailyCount, setDailyCount] = useState({ count: 0, remaining: 20, needsCoins: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isInitialLoad = useRef(true); // 초기 로드 체크용

  // 첫 번째 - mounted 설정
  useEffect(() => {
    setMounted(true);
  }, []);

  // 모바일 줌 방지 (채팅 입력 시 확대 방지)
  useEffect(() => {
    if (!mounted) return;
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    return () => {
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, [mounted]);

  useEffect(() => {
    if (mounted && params.id && params.characterId) {
      const init = async () => {
        const progress = await loadCharacterData();
        loadChatHistory(progress);
        loadDailyCount(); // 대화 횟수 조회
      };
      init();
    }
  }, [mounted, params.id, params.characterId]);

  const loadDailyCount = async () => {
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await api.get('/chat/daily-count', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (response.data?.success) {
        setDailyCount(response.data);
      }
    } catch (error) {
      console.error('대화 횟수 조회 실패:', error);
    }
  };

  // 메시지 추가 시 자동 스크롤 (초기 로드는 완전히 제외)
  useEffect(() => {
    // 초기 로드 시에는 스크롤하지 않음
    if (isInitialLoad.current && messages.length > 0) {
      isInitialLoad.current = false;
      return;
    }

    // 메시지가 추가될 때만 스크롤 (사용자가 메시지 보낼 때)
    if (!isInitialLoad.current && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const loadCharacterData = async (): Promise<number> => {
    if (!params.id || !params.characterId) return 1;

    try {
      const response = await api.get(`/chat/webtoon/${params.id}/characters`);
      if (response.data?.success) {
        const char = response.data.characters.find((c: any) => c.id === params.characterId);
        if (char) {
          setCharacter({
            id: char.id,
            name: char.name,
            imageUrl: char.imageUrl,
            occupation: char.occupation
          });
        }
      }

      // 독자 진행도 확인
      let progress = 1; // 기본값 1화 (0화는 없음)
      if (typeof window !== 'undefined') {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          const progressResponse = await api.get(`/users/webtoon-progress/${params.id}`);
          if (progressResponse.data?.success) {
            progress = Math.max(1, progressResponse.data.data?.maxEpisodeViewed || 1);
          }
        }
      }
      setUserProgress(progress);
      return progress;
    } catch (error) {
      console.error('캐릭터 정보 로드 실패:', error);
      setUserProgress(1); // 오류 시에도 1화로 설정
      return 1;
    }
  };

  const loadChatHistory = async (progress: number) => {
    if (!params.id || !params.characterId) return;

    try {
      if (typeof window === 'undefined') {
        await loadGreetingMessage(progress);
        return;
      }

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        // 비로그인 시 인사 메시지만 표시
        await loadGreetingMessage(progress);
        return;
      }

      const response = await api.get(`/chat/history/${params.id}/${params.characterId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data?.success && response.data.messages.length > 0) {
        setMessages(response.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } else {
        // 대화 기록이 없으면 인사 메시지 표시
        await loadGreetingMessage(progress);
      }
    } catch (error) {
      console.error('대화 기록 로드 실패:', error);
      await loadGreetingMessage(progress);
    }
  };

  const loadGreetingMessage = async (progress: number) => {
    try {
      // 캐릭터 정보에서 인사 메시지 구성
      const response = await api.get(`/chat/webtoon/${params.id}/characters`);
      if (response.data?.success) {
        const char = response.data.characters.find((c: any) => c.id === params.characterId);
        if (char && char.episodeKnowledge) {
          const episodeKnowledge = char.episodeKnowledge[progress.toString()] || char.episodeKnowledge['1'];

          // 줄거리 기반 인사 메시지 생성
          let greetingText = '';

          if ((progress === 1 || progress === 0) && char.id === 'kim_jaehyuk') {
            greetingText = `안녕하세요... 저는 김재혁이라고 합니다.

어느 날 아침, 눈을 떴을 때 세상은 이미 끝나있었어요. 사람들이... 모두 피를 토하며 죽어있었습니다. 거리에, 집 안에, 어디든지요.

처음에는 믿을 수가 없었어요. 이게 꿈이 아닐까, 악몽이 아닐까... 그런 생각만 했습니다. 하지만 며칠이 지나도 아무도 깨어나지 않았고, 전화도 울리지 않았어요.

텅 빈 도시를 걸을 때마다 바람 소리만 들리는 게... 정말 견딜 수 없을 만큼 외로웠습니다. 밤이 되면 어둠이 너무 무서워서 잠도 제대로 못 잤어요.

그러다 편의점에서 행복이를 만났어요. 강아지예요. 이 녀석이 없었다면 저는 진작 미쳐버렸을 거예요. 매일 같이 편의점을 돌아다니면서 먹을 것도 찾고... 그게 제 일상이 됐습니다.

그런데 오늘... 행복이를 따라가다가 정말 믿을 수 없는 사람을 만났어요. 직장 상사였던 윤지윤 팀장님이었어요. 살아계셨어요...! 제가 혼자가 아니었던 거예요.`;
          } else if (progress === 2 && char.id === 'kim_jaehyuk') {
            greetingText = `안녕하세요, 김재혁입니다.

윤지윤 팀장님을 만난 이후로 많은 게 달라졌어요. 혼자가 아니라는 것만으로도 이렇게 큰 힘이 될 줄은 몰랐습니다.

팀장님은 정말 대단한 분이에요. 바이러스 연구원이셨다고 하더라고요. 큰 건물의 비상 발전기를 돌려서 전기를 쓸 수 있게 해주시고, 물도 나오는 곳을 찾아주셨어요. 덕분에 샤워도 하고, 따뜻한 물도 마실 수 있게 됐습니다.

그리고... 팀장님이 요리도 정말 잘하세요. 통조림이랑 라면만 먹다가 제대로 된 음식을 먹으니까 눈물이 날 뻔했어요.

함께 지내면서 팀장님의 다른 모습도 많이 봤어요. 회사에서는 무서운 상사셨는데, 지금은... 많이 달라 보여요. 가끔 웃기도 하시고, 외로움을 느끼시는 것 같기도 하고.

어제... 우리 키스를 했어요. 아직도 믿기지 않아요. 이 끔찍한 세상에서 이런 감정을 느낄 수 있을 거라고는 생각도 못했거든요.

이제는 희망이 생긴 것 같아요. 우리 둘만이 아니라 다른 생존자도 분명히 있을 거예요. 팀장님... 아니, 지윤 씨와 함께라면 찾을 수 있을 것 같습니다.`;
          } else if ((progress === 1 || progress === 0) && char.id === 'yoon_jiyoon') {
            greetingText = `...안녕. 윤지윤이야.

세상이 이렇게 될 줄은 정말 몰랐어. 바이러스 연구원으로 일했지만, 설마 이런 식으로 끝날 줄은...

그날 아침, 연구소에 출근하려고 밖에 나갔을 때 거리가 이미 지옥이었어. 사람들이 피를 토하며 쓰러져 있었고, 차들은 충돌해서 불타고 있었지.

처음에는 연구소로 가려고 했어. 백신을 만들 수 있을지도 모른다고 생각했거든. 하지만... 연구소에 도착했을 때는 이미 모두 죽어있었어. 동료들도, 교수님도.

그 후로는 그냥... 살아있기 위해서 움직였어. 큰 건물들의 비상 발전기를 돌려서 전기를 만들고, 수도 탱크에서 물을 구하고. 식료품은 마트나 편의점에서 가져오고.

더워서 옷을 벗고 있었는데... 김재혁을 만났어. 회사 부하였던 애야. 살아있더라고. 나만 혼자가 아니었던 거야.

좀 민망했지만... 어쨌든 반가웠어. 이제 혼자가 아니니까.`;
          } else if (progress === 2 && char.id === 'yoon_jiyoon') {
            greetingText = `안녕하세요, 윤지윤입니다.

재혁이와 함께 지낸 지 며칠 됐어요. 처음에는 회사 부하였던 애라 좀 어색했는데, 이제는... 많이 편해졌어요.

혼자 있을 때는 몰랐는데, 누군가와 함께 밥을 먹고 대화를 나눈다는 게 이렇게 소중한 일이었구나 싶어요. 재혁이가 제 요리를 맛있게 먹어줄 때, 작은 일상적인 이야기를 나눌 때... 살아있다는 게 느껴져요.

이 애는 정말 착해요. 회사에서는 제가 너무 독하게 대했던 것 같은데, 전혀 원망하는 기색이 없어요. 오히려 저를 배려해주고, 제가 힘들어하면 위로해주려고 해요.

어제... 우리 키스를 했어요. 사실 제가 먼저 했어요. 재혁이가 너무 순수하게 저를 바라보길래... 참을 수가 없었어요.

이상하죠? 세상이 끝났는데 사랑에 빠지다니. 하지만 오히려 이런 상황이기 때문에 더 간절한 것 같아요.

재혁이 말로는 우리 외에도 면역을 가진 생존자가 더 있을 거래요. 저도 그렇게 생각해요. 바이러스 학적으로 봤을 때 면역 반응은 여러 사람에게 나타날 가능성이 높거든요.

다른 생존자들을 찾아야 해요. 그리고... 새로운 세상을 만들어야죠.`;
          } else {
            // 기본 인사
            greetingText = `안녕하세요! ${char.name}입니다. ${progress}화까지 읽어주셔서 감사해요. 대화 나눠요!`;
          }

          const greetingMessage: Message = {
            id: 'greeting-' + Date.now(),
            role: 'assistant',
            content: greetingText,
            timestamp: new Date()
          };

          setMessages([greetingMessage]);
        }
      }
    } catch (error) {
      console.error('인사 메시지 로드 실패:', error);
    }
  };

  const scrollToBottom = () => {
    // ChatGPT처럼 맨 아래로 스크롤 (최신 메시지가 아래)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputText.trim();
    setInputText('');
    setLoadingType('text');
    setLoading(true);

    // AI 응답 메시지 생성 (빈 내용으로 시작)
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

      // fetch API를 사용한 스트리밍
      const response = await fetch(`${apiUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          webtoonId: params.id,
          characterId: params.characterId,
          message: userInput,
          userProgress: userProgress
        })
      });

      if (!response.ok) {
        if (response.status === 402) {
          alert(`토큰이 부족합니다!\n\n오늘 무료 대화 20회를 모두 사용하셨습니다.\n계속 대화하려면 토큰을 충전해주세요.`);
          router.push('/coin');
          setLoading(false);
          return;
        }
        throw new Error('응답 실패');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) {
        throw new Error('스트림을 읽을 수 없습니다');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setLoading(false);
          loadDailyCount();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setLoading(false);
              loadDailyCount();
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                console.error('스트리밍 에러:', parsed.error);
                alert(parsed.error);
                setLoading(false);
                return;
              }

              if (parsed.content) {
                fullContent += parsed.content;

                // 메시지 업데이트 (타이핑 효과) - flushSync로 즉시 렌더링
                flushSync(() => {
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  ));
                });
              }
            } catch (e) {
              // JSON 파싱 에러 무시
            }
          }
        }
      }

    } catch (error: any) {
      console.error('메시지 전송 실패:', error);

      // 토큰 부족 에러 처리
      if (error.response?.status === 402 && error.response?.data?.needsCoins) {
        alert(`토큰이 부족합니다!\n\n오늘 무료 대화 20회를 모두 사용하셨습니다.\n계속 대화하려면 토큰을 충전해주세요.`);
        router.push('/coin');
        return;
      }

      alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const handleGenerateImage = async (messageContent: string) => {
    if (loading) return;

    setLoadingType('image');
    setLoading(true);

    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await api.post(
        `/chat/generate-image`,
        {
          webtoonId: params.id,
          characterId: params.characterId,
          userProgress: userProgress,
          messageContent: messageContent
        },
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      );

      if (response.data?.success) {
        const imageMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '', // 텍스트 없이 이미지만 표시
          imageUrl: response.data.imageUrl,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, imageMessage]);
      }
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      alert('이미지 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.error);
    }
  };

  if (!character) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* 헤더 */}
      <div className="bg-[#1c1c1c] border-b border-gray-800 fixed left-0 right-0 top-[calc(96px+env(safe-area-inset-top,0px))] z-40 md:top-[calc(104px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/adult/chat/webtoon/${params.id}`)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800">
                {character.imageUrl ? (
                  <img
                    src={getImageUrl(character.imageUrl)}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-400 font-bold">
                    {character.name[0]}
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-bold text-white">{character.name}</h1>
                <p className="text-xs text-gray-400">{character.occupation}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* TTS 기능 제거 */}
          </div>
        </div>
      </div>

      {/* 메시지 영역 - ChatGPT 스타일 중앙 정렬 */}
      <div className="flex-1 overflow-y-auto pb-6 pt-[calc(176px+env(safe-area-inset-top,0px))] md:pt-[calc(184px+env(safe-area-inset-top,0px))] space-y-4">
        <div className="w-full md:max-w-3xl md:mx-auto px-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-[#2c2c2c]">
              {character.imageUrl ? (
                <img
                  src={getImageUrl(character.imageUrl)}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-purple-400 font-bold">
                  {character.name[0]}
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">{character.name}</h2>
            <p className="text-gray-400 text-sm mb-4">{character.occupation}</p>
            <p className="text-gray-500 text-sm">
              대화를 시작해보세요. {character.name}이(가) 당신의 이야기를 기다리고 있어요.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-[#2c2c2c]">
                  {character.imageUrl ? (
                    <img
                      src={getImageUrl(character.imageUrl)}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-purple-400 font-bold">
                      {character.name[0]}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2" style={{ maxWidth: '85%' }}>
                <div
                  className={`${
                    msg.role === 'user'
                      ? 'bg-[#5b21b6] text-white'
                      : 'bg-[#2c2c2c] text-gray-100'
                  } rounded-2xl ${msg.content ? 'px-4 py-3' : 'p-0'} shadow-md inline-block`}
                  style={{ width: 'fit-content', maxWidth: '100%' }}
                >
                  {msg.content && (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}
                  {msg.imageUrl && (
                    <div className={msg.content ? "mt-3" : ""}>
                      <img
                        src={msg.imageUrl}
                        alt="Generated"
                        className="w-full h-auto object-cover rounded-lg"
                        style={{ maxWidth: '320px' }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* 어시스턴트 메시지 하단 버튼 */}
                {msg.role === 'assistant' && !msg.imageUrl && (
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => handleGenerateImage(msg.content)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#2c2c2c] hover:bg-[#3c3c3c] rounded-full text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>이미지 생성</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* 타이핑 인디케이터 - AI가 응답 중일 때 표시 */}
        {loading && (
          <div className="flex items-end gap-2 mb-4">
            {/* 캐릭터 프로필 이미지 */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-400 to-pink-400">
              {character?.imageUrl ? (
                <img
                  src={`https://arata.co.kr${character.imageUrl}`}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-purple-400 font-bold">
                  {character?.name[0]}
                </div>
              )}
            </div>
            {/* 타이핑 애니메이션 */}
            <div className="bg-[#2c2c2c] rounded-2xl px-5 py-3 shadow-md">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력 영역 - ChatGPT 스타일 중앙 정렬 */}
      <div className="bg-[#1c1c1c] border-t border-gray-800 pb-0 pt-3 px-4">
        <div className="w-full md:max-w-3xl md:mx-auto">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-[#2c2c2c] rounded-2xl px-4 py-3 flex items-center gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
              disabled={loading}
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-[15px] leading-normal resize-none max-h-32 overflow-y-auto"
              style={{ fontSize: '16px' }}
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
            className="p-3 rounded-full bg-[#5b21b6] hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1 mb-0 px-1">
          <p className="text-gray-600">
            독자 진행: {userProgress}화까지 대화 가능
          </p>
          {dailyCount.remaining > 0 ? (
            <p className="text-green-500">
              💬 오늘 무료: {dailyCount.remaining}/20회
            </p>
          ) : (
            <p className="text-yellow-500">
              🪙 다음 대화부터 1토큰
            </p>
          )}
        </div>
        </div>
      </div>

      {/* 숨김 오디오 */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
