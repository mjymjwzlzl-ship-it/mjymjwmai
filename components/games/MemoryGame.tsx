'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, RotateCw, Trophy, Timer, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const CARD_EMOJIS = [
  '🍎', '🍌', '🍒', '🍇', '🍉', '🍓', '🍊', '🍑',
  '🥥', '🍅', '🥕', '🌽', '🥦', '🌶️', '🥔', '🌰'
];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameDifficulty {
  name: string;
  pairs: number;
  gridCols: number;
  timeBonus: number;
}

const DIFFICULTIES: GameDifficulty[] = [
  { name: '쉽기', pairs: 6, gridCols: 3, timeBonus: 100 },
  { name: '보통', pairs: 8, gridCols: 4, timeBonus: 150 },
  { name: '어려움', pairs: 12, gridCols: 4, timeBonus: 200 },
  { name: '지옥', pairs: 16, gridCols: 4, timeBonus: 300 }
];

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<GameDifficulty>(DIFFICULTIES[1]);
  const [timer, setTimer] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 모바일 감지 및 화면 크기 조정
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 사운드 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playSound = (frequencies: number[], durations: number[], type: OscillatorType = 'sine') => {
        if (!soundEnabled) return;
        
        frequencies.forEach((freq, i) => {
          setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = type;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durations[i]);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + durations[i]);
          }, i * 100);
        });
      };

      (window as any).memorySounds = {
        flip: () => playSound([600], [0.1], 'sine'),
        match: () => playSound([400, 500, 600], [0.1, 0.1, 0.2], 'sine'),
        noMatch: () => playSound([300, 250], [0.1, 0.1], 'square'),
        gameWin: () => playSound([400, 500, 600, 800], [0.1, 0.1, 0.1, 0.3], 'sine'),
        buttonClick: () => playSound([500], [0.05], 'square')
      };
    }
  }, [soundEnabled]);

  const playFlipSound = () => {
    if (soundEnabled && (window as any).memorySounds) {
      (window as any).memorySounds.flip();
    }
  };

  const playMatchSound = () => {
    if (soundEnabled && (window as any).memorySounds) {
      (window as any).memorySounds.match();
    }
  };

  const playNoMatchSound = () => {
    if (soundEnabled && (window as any).memorySounds) {
      (window as any).memorySounds.noMatch();
    }
  };

  const playGameWinSound = () => {
    if (soundEnabled && (window as any).memorySounds) {
      (window as any).memorySounds.gameWin();
    }
  };

  const playButtonSound = () => {
    if (soundEnabled && (window as any).memorySounds) {
      (window as any).memorySounds.buttonClick();
    }
  };

  // 카드 생성
  const initializeCards = useCallback(() => {
    const selectedEmojis = CARD_EMOJIS.slice(0, difficulty.pairs);
    const cardPairs = [...selectedEmojis, ...selectedEmojis];
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    
    const newCards: Card[] = shuffled.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false
    }));
    
    setCards(newCards);
  }, [difficulty]);

  // 게임 시작
  const startGame = () => {
    playButtonSound();
    initializeCards();
    setSelectedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setScore(0);
    setTimer(0);
    setGameStarted(true);
    setGameOver(false);
    setIsProcessing(false);
    saveScoreRef.current = false; // 점수 저장 플래그 리셋
  };

  // 타이머
  useEffect(() => {
    if (gameStarted && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameOver]);

  // 카드 클릭 처리
  const handleCardClick = (cardId: number) => {
    if (isProcessing || !gameStarted || gameOver) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    playFlipSound();
    
    // 카드 뒤집기
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    
    const newSelected = [...selectedCards, cardId];
    setSelectedCards(newSelected);
    
    // 두 개 선택됨
    if (newSelected.length === 2) {
      setIsProcessing(true);
      setMoves(prev => prev + 1);
      
      const [first, second] = newSelected;
      const firstCard = cards.find(c => c.id === first)!;
      const secondCard = cards.find(c => c.id === second)!;
      
      if (firstCard.emoji === secondCard.emoji) {
        // 매치 성공
        setTimeout(() => {
          playMatchSound();
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isMatched: true }
              : c
          ));
          setMatchedPairs(prev => prev + 1);
          
          // 점수 계산 (시간 보너스 포함) - 한 번만 실행되도록 보장
          if (!firstCard.isMatched && !secondCard.isMatched) {
            const timeBonus = Math.max(0, Math.min(difficulty.timeBonus - timer, 200)); // 최대 보너스 제한
            const moveBonus = Math.max(0, Math.min(100 - moves * 2, 100)); // 최대 보너스 제한
            const pointsEarned = 100 + timeBonus + moveBonus;
            setScore(prev => prev + pointsEarned);
          }
          
          setSelectedCards([]);
          setIsProcessing(false);
        }, 500);
      } else {
        // 매치 실패
        setTimeout(() => {
          playNoMatchSound();
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isFlipped: false }
              : c
          ));
          setSelectedCards([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  };

  // 게임 종료 체크
  useEffect(() => {
    if (matchedPairs === difficulty.pairs && gameStarted && !gameOver) {
      setGameOver(true);
      playGameWinSound();
      
      // 최종 점수 계산 (한 번만 실행)
      setScore(prevScore => {
        const finalScore = prevScore + Math.max(0, 500 - timer * 2);
        saveScore(finalScore);
        return finalScore;
      });
    }
  }, [matchedPairs, difficulty.pairs, gameStarted, gameOver, timer]);

  // 점수 저장
  const saveScoreRef = useRef(false); // 중복 저장 방지
  const saveScore = async (finalScore: number) => {
    if (saveScoreRef.current) return; // 이미 저장했으면 무시
    saveScoreRef.current = true;
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && finalScore > 0) {
        await api.post('/games/memory/score', {
          score: finalScore,
          difficulty: difficulty.name,
          moves,
          time: timer,
          pairs: difficulty.pairs
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // 에러 무시
    }
  };

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/memory/highscore');
        setHighScore(response.data.highScore || 0);
      } catch (error) {
        // 에러 무시
      }
    };
    getHighScore();
  }, []);

  // 리더보드 가져오기
  const loadLeaderboard = async () => {
    try {
      const response = await api.get('/games/memory/leaderboard?period=all');
      setLeaderboard(response.data || []);
    } catch (error) {
      // 에러 무시
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 모바일 전체화면 레이아웃
  if (isMobile) {
    const cardSize = difficulty.gridCols <= 3 ? 'w-20 h-20 text-3xl' : 'w-16 h-16 text-2xl';
    
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col">
        {/* 상단 바 - 뒤로가기와 점수만 */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
          <Link href="/games" className="text-white p-2">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-4 text-white">
            <span className="text-sm">{score.toLocaleString()}</span>
            {gameStarted && (
              <>
                <span className="text-sm">{formatTime(timer)}</span>
                <span className="text-sm">{matchedPairs}/{difficulty.pairs}</span>
              </>
            )}
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center max-w-full">
            {/* 난이도 선택 (게임 시작 전에만 표시) */}
            {!gameStarted && (
              <div className="flex gap-2 mb-4 flex-wrap justify-center">
                {DIFFICULTIES.map(diff => (
                  <button
                    key={diff.name}
                    onClick={() => {
                      playButtonSound();
                      setDifficulty(diff);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      difficulty.name === diff.name
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {diff.name}
                  </button>
                ))}
              </div>
            )}
            
            {/* 카드 그리드 */}
            <div
              className="grid gap-2 p-3 bg-gray-800 rounded-xl max-w-full overflow-auto"
              style={{
                gridTemplateColumns: `repeat(${difficulty.gridCols}, 1fr)`,
              }}
            >
              {cards.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  disabled={card.isFlipped || card.isMatched || isProcessing}
                  className={`
                    ${cardSize} rounded-lg font-bold
                    transition-all duration-300 transform
                    ${
                      card.isFlipped || card.isMatched
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500 rotate-0'
                        : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
                    }
                    ${card.isMatched ? 'opacity-60 scale-95' : ''}
                    ${!card.isFlipped && !card.isMatched ? 'hover:scale-105' : ''}
                  `}
                >
                  <span
                    className={`${
                      card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'
                    } transition-opacity duration-300`}
                  >
                    {card.emoji}
                  </span>
                </button>
              ))}
            </div>
            
            {/* 게임 시작 버튼 */}
            {!gameStarted && (
              <button
                onClick={startGame}
                className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg"
              >
                게임 시작
              </button>
            )}
            
            {/* 게임 오버 메시지 */}
            {gameOver && (
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-center">
                <h2 className="text-lg font-bold mb-2">축하합니다! 🎉</h2>
                <p className="text-sm mb-1">최종 점수: {score.toLocaleString()}</p>
                <p className="text-sm opacity-90">
                  {moves}번 이동, {formatTime(timer)} 소요
                </p>
                <button
                  onClick={startGame}
                  className="mt-2 px-4 py-2 bg-white text-emerald-600 rounded-lg text-sm"
                >
                  다시 시작
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 - 메모리 게임은 터치만 사용 */}
        <MobileGameControls
          onMove={() => {}}
          gameType="memory"
        />
      </div>
    );
  }

  // 데스크탑 레이아웃 (기존 그대로)
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* 게임 보드 */}
      <div className="flex flex-col items-center">
        <div className="mb-4 flex gap-2">
          {/* 난이도 선택 */}
          {!gameStarted && (
            <div className="flex gap-2 mr-4">
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.name}
                  onClick={() => {
                    playButtonSound();
                    setDifficulty(diff);
                  }}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    difficulty.name === diff.name
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {diff.name}
                </button>
              ))}
            </div>
          )}
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            aria-label="사운드 토글"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              loadLeaderboard();
              setShowLeaderboard(!showLeaderboard);
            }}
            className="p-2 bg-emerald-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={startGame}
            className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            {gameStarted ? '다시 시작' : '게임 시작'}
          </button>
        </div>

        {/* 게임 상태 표시 */}
        {gameStarted && (
          <div className="mb-4 flex gap-4 text-lg">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              <span>{formatTime(timer)}</span>
            </div>
            <div>이동: {moves}</div>
            <div>매칭: {matchedPairs}/{difficulty.pairs}</div>
          </div>
        )}

        <div
          className="grid gap-2 p-4 bg-gray-800 rounded-xl"
          style={{
            gridTemplateColumns: `repeat(${difficulty.gridCols}, 1fr)`,
            minWidth: '320px'
          }}
        >
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isFlipped || card.isMatched || isProcessing}
              className={`
                w-20 h-20 rounded-lg font-bold text-3xl
                transition-all duration-300 transform
                ${card.isFlipped || card.isMatched
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 rotate-0'
                  : 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rotate-y-180'
                }
                ${card.isMatched ? 'opacity-60 scale-95' : ''}
                ${!card.isFlipped && !card.isMatched ? 'hover:scale-105' : ''}
              `}
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d'
              }}
            >
              <span className={`
                ${card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'}
                transition-opacity duration-300
              `}>
                {card.emoji}
              </span>
            </button>
          ))}
        </div>

        {/* 게임 오버 */}
        {gameOver && (
          <div className="mt-6 p-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-center">
            <h2 className="text-3xl font-bold mb-2">축하합니다! 🎉</h2>
            <p className="text-xl mb-1">최종 점수: {score.toLocaleString()}</p>
            <p className="text-lg opacity-90">
              {moves}번 이동, {formatTime(timer)} 소요
            </p>
          </div>
        )}
      </div>

      {/* 게임 정보 */}
      <div className="flex flex-col gap-4">
        {/* 점수 정보 */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">점수</h3>
          <p className="text-2xl font-mono">{score.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">최고 점수</h3>
          <p className="text-xl font-mono text-yellow-400">{highScore.toLocaleString()}</p>
        </div>

        {/* 조작법 */}
        {!isMobile && (
          <div className="bg-gray-800 rounded-lg p-4 text-sm">
            <h3 className="text-lg font-bold mb-2">게임 방법</h3>
            <div className="space-y-1 text-gray-400">
              <p>🎯 같은 그림 카드 2장을 찾아서 매칭</p>
              <p>⏱️ 빠를수록 높은 점수</p>
              <p>🏆 적은 이동으로 클리어하면 보너스</p>
            </div>
          </div>
        )}

        {/* 점수 계산 */}
        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">점수 시스템</h3>
          <div className="space-y-1 text-gray-400">
            <p>✅ 매칭 성공: +100점</p>
            <p>⏱️ 시간 보너스: 최대 +{difficulty.timeBonus}점</p>
            <p>🎯 이동 보너스: 최대 +100점</p>
            <p>🏁 클리어 보너스: 최대 +500점</p>
          </div>
        </div>

        {/* 난이도 설명 */}
        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">난이도</h3>
          <div className="space-y-1 text-gray-400">
            <p>🐣 쉽기: 6쌍 (3x4)</p>
            <p>🌱 보통: 8쌍 (4x4)</p>
            <p>🔥 어려움: 12쌍 (4x6)</p>
            <p>💀 지옥: 16쌍 (4x8)</p>
          </div>
        </div>

        {showLeaderboard && (
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              메모리 게임 랭킹
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-500">랭킹 데이터가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                        #{entry.rank}
                      </span>
                      <span className="text-sm">{entry.username}</span>
                    </div>
                    <div className="font-mono text-purple-400">{entry.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}