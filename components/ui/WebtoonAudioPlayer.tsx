'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Play, MessageCircle } from 'lucide-react';

interface Speech {
  text: string;
  speaker: string;
  position_y: number;
  position_percent: number;
  audio_file: string;
  index: number;
  voice: string;
  gender: string;
  type: string;
}

interface AudioTiming {
  episode: string;
  image: string;
  speeches: Speech[];
}

interface WebtoonAudioPlayerProps {
  comicTitle: string;
  episodeNumber: number;
  audioBasePath: string; // 예: "/uploads/webtoons/adult/가정교사/1화_음성"
  enabled?: boolean;
}

export default function WebtoonAudioPlayer({
  comicTitle,
  episodeNumber,
  audioBasePath,
  enabled = true
}: WebtoonAudioPlayerProps) {
  const [audioData, setAudioData] = useState<AudioTiming[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState<Speech | null>(null);
  const [currentImageNum, setCurrentImageNum] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [speechHistory, setSpeechHistory] = useState<Array<{speech: Speech, imageNum: string}>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [markerPosition, setMarkerPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedSpeeches = useRef<Set<string>>(new Set());

  // 음성 데이터 로드
  useEffect(() => {
    if (!enabled) return;

    const loadAudioData = async () => {
      try {
        // 1화부터 순서대로 타이밍 JSON 로드 시도
        const promises: Promise<AudioTiming | null>[] = [];

        // 최대 20개 이미지 가정 (필요시 조정)
        for (let i = 1; i <= 20; i++) {
          const imageNum = String(i).padStart(3, '0');
          const jsonUrl = `${audioBasePath}/가정교사_${String(episodeNumber).padStart(2, '0')}_${imageNum}_타이밍.json`;

          promises.push(
            fetch(jsonUrl)
              .then(res => {
                if (res.ok) return res.json();
                // 404는 조용히 무시 (없는 파일)
                if (res.status === 404) return null;
                console.warn(`[WebtoonAudio] Failed to load: ${jsonUrl}`);
                return null;
              })
              .catch(() => null)
          );
        }

        const results = await Promise.all(promises);
        const validData = results.filter((data): data is AudioTiming => data !== null);

        console.log('[WebtoonAudio] ✅ Loaded timing data:', validData.length, 'files');
        setAudioData(validData);
      } catch (error) {
        console.error('[WebtoonAudio] Failed to load audio data:', error);
      }
    };

    loadAudioData();
  }, [audioBasePath, episodeNumber, enabled]);

  // 스크롤 감지 및 음성 재생
  useEffect(() => {
    if (!enabled || audioData.length === 0 || isMuted || !userInteracted) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      // 화면 하단 = 대사가 화면에 들어오기 직전
      const viewportTrigger = scrollTop + windowHeight;

      // 웹툰 이미지 컨테이너의 모든 img 요소를 DOM 순서대로 가져오기
      const allImages = Array.from(document.querySelectorAll('img[alt]')) as HTMLImageElement[];
      const webtoonImages = allImages.filter(img =>
        img.src && (img.src.includes('/uploads/webtoons/') || img.src.includes('uploads%2Fwebtoons'))
      );

      if (webtoonImages.length === 0) return;

      // audioData를 이미지 번호순으로 정렬
      const sortedAudioData = [...audioData].sort((a, b) => {
        const numA = parseInt(a.image.match(/_(\d+)\./)?.[1] || '0');
        const numB = parseInt(b.image.match(/_(\d+)\./)?.[1] || '0');
        return numA - numB;
      });

      console.log(`[WebtoonAudio] 📊 Images: ${webtoonImages.length}, Audio data: ${sortedAudioData.length}`);

      // JSON 파일명에서 이미지 번호 추출하여 실제 이미지와 매칭
      sortedAudioData.forEach((timingData) => {
        // JSON 파일명에서 번호 추출: 가정교사_01_006.jpg → 006
        const jsonImageNum = timingData.image.match(/_(\d+)\./)?.[1];
        if (!jsonImageNum) {
          console.log(`[WebtoonAudio] ⚠️ Cannot extract image number from ${timingData.image}`);
          return;
        }

        // DOM 이미지 중에서 같은 번호를 가진 이미지 찾기
        const matchedImage = webtoonImages.find(img => {
          // img.src 예: http://localhost:8000/uploads/webtoons/adult/%EA%B0%80%EC%A0%95%EA%B5%90%EC%82%AC/episode-001/006.webp
          const imgNum = img.src.match(/\/(\d+)\.(jpg|jpeg|png|webp)/i)?.[1];
          return imgNum === jsonImageNum;
        });

        if (!matchedImage) {
          console.log(`[WebtoonAudio] ⚠️ No matching image found for ${timingData.image} (num: ${jsonImageNum})`);
          return;
        }

        console.log(`[WebtoonAudio] ✓ Matched: ${timingData.image} → Image ${jsonImageNum}`);


        // 이미지의 실제 DOM 위치
        const imageRect = matchedImage.getBoundingClientRect();
        const imageTop = scrollTop + imageRect.top;
        const imageHeight = imageRect.height;
        const imageNaturalHeight = matchedImage.naturalHeight;

        // 스케일 비율 계산 (렌더링된 높이 / 원본 높이)
        const scale = imageNaturalHeight > 0 ? imageHeight / imageNaturalHeight : 1;

        // 각 음성에 대해 체크
        for (const speech of timingData.speeches) {
          const speechKey = `${jsonImageNum}_${speech.index}`;

          // 이미 재생한 음성은 스킵
          if (playedSpeeches.current.has(speechKey)) continue;

          // position_y 사용 (이미지 내부 Y 좌표)
          // position_y는 이미지 원본 크기 기준이므로 스케일 적용 필요
          const scaledPositionY = speech.position_y * scale;
          const absoluteY = imageTop + scaledPositionY;

          // 대사 위치가 화면 하단(뷰포트 트리거)에서 100~300px 위에 올 때 재생
          // 즉, 대사가 화면에 막 들어오기 직전/직후에 재생
          const distance = absoluteY - viewportTrigger;
          const minDist = -300; // 대사가 이미 화면에 300px 들어왔을 때
          const maxDist = 200;  // 대사가 화면 밑에 200px 남았을 때

          console.log(`  🎯 Image ${jsonImageNum} Speech ${speech.index}: distance=${distance.toFixed(0)}px (range: ${minDist}~${maxDist})`);

          if (distance > minDist && distance < maxDist) {
            console.log(`[WebtoonAudio] 🎵 Playing: Image ${jsonImageNum}, Speech ${speech.index}`);
            console.log(`  💬 Text: "${speech.text}"`);
            console.log(`  📍 position_y: ${speech.position_y}px (${speech.position_percent}% of image)`);
            console.log(`  📐 Scaled Y: ${scaledPositionY.toFixed(0)}px (scale: ${scale.toFixed(2)})`);
            console.log(`  🎯 Absolute Y: ${absoluteY.toFixed(0)}px, Trigger: ${viewportTrigger.toFixed(0)}px`);
            console.log(`  📏 Distance: ${distance.toFixed(0)}px (✅ IN RANGE: ${minDist}~${maxDist}px)`);
            console.log(`  🖼️  Image: natural=${imageNaturalHeight}px, rendered=${imageHeight.toFixed(0)}px`);

            playedSpeeches.current.add(speechKey);
            playSpeech(speech, jsonImageNum);

            // 시각적 마커 표시 (이미지 위에)
            const imageRect = matchedImage.getBoundingClientRect();
            setMarkerPosition({
              top: scrollTop + imageRect.top + scaledPositionY,
              left: imageRect.left,
              width: imageRect.width
            });

            // 5초 후 마커 제거
            setTimeout(() => setMarkerPosition(null), 5000);

            return; // 한 번에 하나씩만 재생
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 초기 실행
    return () => window.removeEventListener('scroll', handleScroll);
  }, [audioData, enabled, isMuted, userInteracted]);

  const playSpeech = useCallback((speech: Speech, imageNum: string = '') => {
    // 기존 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // 새 오디오 재생
    const audioUrl = `${audioBasePath}/${speech.audio_file}`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    setCurrentSpeech(speech);
    setCurrentImageNum(imageNum);
    setIsPlaying(true);

    // 히스토리에 추가 (최근 10개만 유지)
    setSpeechHistory(prev => {
      const newHistory = [{speech, imageNum}, ...prev];
      return newHistory.slice(0, 10);
    });

    audio.play()
      .then(() => {
        console.log('[WebtoonAudio] ▶️ Playing:', speech.text);
      })
      .catch(err => {
        console.error('[WebtoonAudio] Play failed:', err);
        setIsPlaying(false);
      });

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentSpeech(null);
      setCurrentImageNum('');
    };

    audio.onerror = () => {
      console.error('[WebtoonAudio] Audio error:', audioUrl);
      setIsPlaying(false);
      setCurrentSpeech(null);
      setCurrentImageNum('');
    };
  }, [audioBasePath]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentSpeech(null);
  };

  const handleEnableAudio = () => {
    setUserInteracted(true);
    setIsMuted(false);
  };

  // 재생 초기화 (페이지 이동 시)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      playedSpeeches.current.clear();
    };
  }, []);

  // 이미지 번호 오버레이 추가
  useEffect(() => {
    if (!enabled || audioData.length === 0 || !showGuides) return;

    const webtoonImages = Array.from(document.querySelectorAll('img[alt]')) as HTMLImageElement[];
    const filteredImages = webtoonImages.filter(img =>
      img.src && (img.src.includes('/uploads/webtoons/') || img.src.includes('uploads%2Fwebtoons'))
    );

    // 각 이미지에 번호 오버레이 추가
    filteredImages.forEach((img, index) => {
      const imageNum = String(index + 1).padStart(3, '0');

      // 이미 오버레이가 있으면 스킵
      if (img.parentElement?.querySelector('.image-number-overlay')) return;

      const overlay = document.createElement('div');
      overlay.className = 'image-number-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(16, 185, 129, 0.9);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        font-family: monospace;
        z-index: 10;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      overlay.textContent = `Image ${imageNum}`;

      // 부모가 relative가 아니면 relative로 설정
      if (img.parentElement && window.getComputedStyle(img.parentElement).position === 'static') {
        img.parentElement.style.position = 'relative';
      }

      img.parentElement?.appendChild(overlay);
    });

    return () => {
      // cleanup
      document.querySelectorAll('.image-number-overlay').forEach(el => el.remove());
    };
  }, [enabled, audioData, showGuides]);

  if (!enabled || audioData.length === 0) return null;

  return (
    <>
      {/* 사용자 상호작용 필요 안내 */}
      {!userInteracted && (
        <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4">
          <button
            onClick={handleEnableAudio}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full shadow-lg transition-all flex items-center gap-2 animate-pulse"
          >
            <Play className="w-5 h-5" />
            <span className="font-medium">음성 재생 시작</span>
          </button>
        </div>
      )}

      {/* 음소거 토글 버튼 (우측 하단 고정) */}
      {userInteracted && (
        <>
          <button
            onClick={toggleMute}
            className="fixed bottom-24 right-6 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-colors"
            title={isMuted ? '음성 켜기' : '음성 끄기'}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          {/* 가이드 토글 버튼 */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`fixed bottom-24 right-20 z-50 ${showGuides ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-800 hover:bg-gray-700'} text-white p-3 rounded-full shadow-lg transition-colors`}
            title={showGuides ? '가이드 숨기기' : '가이드 보이기'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </button>
        </>
      )}

      {/* 재생 중인 대사 표시 */}
      {isPlaying && currentSpeech && (
        <div className="fixed bottom-40 left-0 right-0 z-40 flex justify-center px-4">
          <div className="bg-black bg-opacity-90 text-white px-5 py-3 rounded-lg max-w-md shadow-xl border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-mono">Image {currentImageNum}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-400">{currentSpeech.speaker}</span>
              </div>
              <button
                onClick={() => playSpeech(currentSpeech, currentImageNum)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                title="다시 듣기"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
            <p className="text-sm leading-relaxed">{currentSpeech.text}</p>
          </div>
        </div>
      )}

      {/* 히스토리 버튼 */}
      {userInteracted && speechHistory.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="fixed bottom-24 left-6 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="재생 기록"
        >
          <MessageCircle className="w-6 h-6" />
          {speechHistory.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {speechHistory.length}
            </span>
          )}
        </button>
      )}

      {/* 히스토리 패널 */}
      {showHistory && speechHistory.length > 0 && (
        <div className="fixed bottom-40 left-6 z-40 w-80 max-h-96 overflow-y-auto bg-gray-900 bg-opacity-95 rounded-lg shadow-xl border border-gray-700">
          <div className="sticky top-0 bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium">재생 기록</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="p-2">
            {speechHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => playSpeech(item.speech, item.imageNum)}
                className="w-full text-left p-3 mb-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-mono">Image {item.imageNum}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">{item.speech.speaker}</span>
                  </div>
                  <Play className="w-3 h-3 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">{item.speech.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 뷰포트 가이드 라인 (화면 하단 기준선) */}
      {showGuides && userInteracted && (
        <div className="fixed left-0 right-0 z-20 pointer-events-none" style={{ bottom: '0' }}>
          {/* 화면 하단 기준선 */}
          <div className="relative w-full">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
            <div className="absolute left-1/2 -translate-x-1/2 -top-6 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
              📍 뷰포트 하단 (음성 재생 기준선)
            </div>
          </div>
        </div>
      )}

      {/* 시각적 위치 마커 */}
      {markerPosition && (
        <div
          className="fixed z-30 pointer-events-none"
          style={{
            top: markerPosition.top,
            left: markerPosition.left,
            width: markerPosition.width,
            height: '4px'
          }}
        >
          {/* 가로선 */}
          <div className="w-full h-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-lg shadow-emerald-500/50" />

          {/* 좌측 삼각형 마커 */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-emerald-400 animate-pulse"
            style={{ marginLeft: '-8px' }}
          />

          {/* 우측 삼각형 마커 */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-emerald-400 animate-pulse"
            style={{ marginRight: '-8px' }}
          />

          {/* 텍스트 라벨 */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
            🎵 음성 재생 위치 (Image {currentImageNum})
          </div>
        </div>
      )}
    </>
  );
}
