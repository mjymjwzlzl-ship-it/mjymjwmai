'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Image as ImageIcon, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  timestamp: Date;
  imageUrl?: string;
}

interface Character {
  id: string;
  name: string;
  webtoonTitle: string;
  thumbnail: string;
  description: string;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // TODO: 실제 API에서 캐릭터 정보 가져오기
    const mockCharacter: Character = {
      id: characterId,
      name: '미정',
      webtoonTitle: '가정교사',
      thumbnail: '/uploads/webtoons/adult/가정교사/thumbnail.jpg',
      description: '가정교사 주인공'
    };

    setCharacter(mockCharacter);

    // 환영 메시지
    const welcomeMessage: Message = {
      id: '1',
      content: `안녕하세요! ${mockCharacter.name}입니다. 무엇을 도와드릴까요?`,
      sender: 'character',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  }, [characterId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      // TODO: 실제 AI API 호출
      // 임시 응답
      await new Promise(resolve => setTimeout(resolve, 1000));

      const characterResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `"${inputMessage}"에 대한 응답입니다. (AI 연동 예정)`,
        sender: 'character',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, characterResponse]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateImage = async () => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);

    try {
      // TODO: 실제 이미지 생성 API 호출
      await new Promise(resolve => setTimeout(resolve, 2000));

      const imageMessage: Message = {
        id: Date.now().toString(),
        content: '이미지를 생성했어요!',
        sender: 'character',
        timestamp: new Date(),
        imageUrl: 'https://via.placeholder.com/400x300?text=Generated+Image'
      };

      setMessages(prev => [...prev, imageMessage]);
    } catch (error) {
      console.error('이미지 생성 실패:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 pt-14 md:pt-16">
      {/* 캐릭터 정보 바 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* 뒤로가기 */}
            <button
              onClick={() => router.back()}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* 캐릭터 정보 */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                {character.thumbnail && (
                  <img
                    src={character.thumbnail}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {character.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {character.webtoonTitle}
                </p>
              </div>
            </div>

            {/* 이미지 생성 버튼 */}
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors disabled:opacity-50"
              title="이미지 생성"
            >
              {isGeneratingImage ? (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5 text-purple-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] ${
                  message.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                } rounded-2xl px-4 py-3 shadow-sm`}
              >
                {message.imageUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden">
                    <img
                      src={message.imageUrl}
                      alt="Generated"
                      className="w-full h-auto"
                    />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user'
                      ? 'text-purple-200'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력 영역 - 모바일 키보드 대응 */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="메시지를 입력하세요..."
              className="flex-1 resize-none rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white max-h-32"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '128px'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending}
              className="flex-shrink-0 w-11 h-11 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* 안전 영역 (iOS notch 대응) */}
        <div className="h-safe-area-inset-bottom"></div>
      </div>
    </div>
  );
}
