'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, RotateCw, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;

interface Position {
  x: number;
  y: number;
}

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileCellSize, setMobileCellSize] = useState(20);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef(direction);

  // 모바일 감지 및 화면 크기 조정
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
      
      if (mobile) {
        // 모바일에서 화면에 맞게 최적화
        // 컨트롤러 높이(200px) + 상단 바(60px) 제외
        const availableHeight = height - 260;
        const availableWidth = width - 20; // 좌우 여백
        
        // 격자 크기에 맞게 최적화
        const cellByHeight = Math.floor(availableHeight / GRID_SIZE);
        const cellByWidth = Math.floor(availableWidth / GRID_SIZE);
        const optimalCellSize = Math.min(cellByHeight, cellByWidth, 18); // 최대 18px
        
        setMobileCellSize(optimalCellSize);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 사운드 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playSound = (frequency: number, duration: number, type: OscillatorType = 'square') => {
        if (!soundEnabled) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
      };

      (window as any).snakeSounds = {
        eat: () => {
          playSound(400, 0.1);
          setTimeout(() => playSound(600, 0.1), 50);
        },
        gameOver: () => {
          playSound(200, 0.3);
          setTimeout(() => playSound(150, 0.3), 150);
        },
        turn: () => playSound(300, 0.05)
      };
    }
  }, [soundEnabled]);

  const playEatSound = () => {
    if (soundEnabled && (window as any).snakeSounds) {
      (window as any).snakeSounds.eat();
    }
  };

  const playGameOverSound = () => {
    if (soundEnabled && (window as any).snakeSounds) {
      (window as any).snakeSounds.gameOver();
    }
  };

  const playTurnSound = () => {
    if (soundEnabled && (window as any).snakeSounds) {
      (window as any).snakeSounds.turn();
    }
  };

  // 랜덤 음식 위치 생성
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // 충돌 체크
  const checkCollision = (head: Position, snakeBody: Position[]): boolean => {
    // 벽 충돌
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    // 자기 몸 충돌
    for (let i = 1; i < snakeBody.length; i++) {
      if (head.x === snakeBody[i].x && head.y === snakeBody[i].y) {
        return true;
      }
    }
    return false;
  };

  // 게임 루프
  const gameLoop = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake(currentSnake => {
      const newSnake = [...currentSnake];
      const head = { ...newSnake[0] };
      
      // 방향에 따라 머리 이동
      head.x += directionRef.current.x;
      head.y += directionRef.current.y;

      // 충돌 체크
      if (checkCollision(head, currentSnake)) {
        setGameOver(true);
        playGameOverSound();
        saveScore();
        return currentSnake;
      }

      newSnake.unshift(head);

      // 음식 먹기 체크
      if (head.x === food.x && head.y === food.y) {
        playEatSound();
        setScore(prev => {
          const newScore = prev + 10;
          // 50점마다 속도 증가
          if (newScore % 50 === 0) {
            setSpeed(s => Math.max(50, s - SPEED_INCREMENT));
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, gameOver, isPaused, generateFood]);

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && score > 0) {
        await api.post('/games/snake/score', {
          score,
          level: Math.floor(score / 50) + 1,
          length: snake.length
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // 에러 무시
    }
  };

  // 게임 리셋
  const resetGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 15 });
    setDirection({ x: 1, y: 0 });
    directionRef.current = { x: 1, y: 0 };
    setGameOver(false);
    setIsPaused(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
  }, []);

  // 방향 변경
  const changeDirection = useCallback((newDirection: Position) => {
    // 반대 방향으로 못 가게 체크
    if (
      (newDirection.x === -directionRef.current.x && newDirection.y === directionRef.current.y) ||
      (newDirection.y === -directionRef.current.y && newDirection.x === directionRef.current.x)
    ) {
      return;
    }
    setDirection(newDirection);
    directionRef.current = newDirection;
    playTurnSound();
  }, []);

  // 모바일 컨트롤 핸들러
  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver || isPaused) return;
    
    switch (direction) {
      case 'up':
        changeDirection({ x: 0, y: -1 });
        break;
      case 'down':
        changeDirection({ x: 0, y: 1 });
        break;
      case 'left':
        changeDirection({ x: -1, y: 0 });
        break;
      case 'right':
        changeDirection({ x: 1, y: 0 });
        break;
    }
  }, [gameOver, isPaused, changeDirection]);

  // 키보드 입력
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 화살표 키에서 기본 동작(스크롤) 방지
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      
      // R키는 언제든지 작동 (한글 ㄱ 포함)
      if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        resetGame();
        return;
      }
      
      // P키는 게임 오버가 아닐 때만 작동 (한글 ㅔ 포함)
      if (e.key === 'p' || e.key === 'P' || e.key === 'ㅔ') {
        if (!gameOver) {
          setIsPaused(prev => !prev);
        }
        return;
      }

      // 게임 오버이거나 일시정지 상태면 방향키 무시
      if (gameOver || isPaused) return;

      switch (e.key) {
        case 'ArrowUp':
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          changeDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver, isPaused, changeDirection, resetGame]);

  // 게임 루프 실행
  useEffect(() => {
    gameLoopRef.current = setInterval(gameLoop, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameLoop, speed]);

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/snake/highscore');
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
      const response = await api.get('/games/snake/leaderboard?period=all');
      setLeaderboard(response.data || []);
    } catch (error) {
      // 에러 무시
    }
  };

  // 모바일 전체화면 레이아웃
  if (isMobile) {
    const cellSize = mobileCellSize;
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col">
        {/* 상단 바 - 뒤로가기와 점수만 */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
          <Link href="/games" className="text-white p-2">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-4 text-white">
            <span className="text-sm">Score: {score}</span>
            <span className="text-sm">Length: {snake.length}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="relative border-2 border-green-600 bg-gradient-to-br from-gray-900 via-green-950/20 to-gray-900"
            style={{
              width: GRID_SIZE * cellSize + 2,
              height: GRID_SIZE * cellSize + 2,
            }}
          >
            {/* 격자 배경 */}
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
                <div
                  key={index}
                  className="border border-gray-800/30"
                  style={{ 
                    width: cellSize, 
                    height: cellSize,
                    background: 'radial-gradient(circle at center, transparent, rgba(0, 255, 0, 0.02))'
                  }}
                />
              ))}
            </div>

            {/* 뱀 렌더링 */}
            {snake.map((segment, index) => (
              <div
                key={index}
                className={`absolute ${index === 0 ? 'z-20' : 'z-10'}`}
                style={{
                  left: segment.x * cellSize,
                  top: segment.y * cellSize,
                  width: cellSize - 1,
                  height: cellSize - 1,
                  background: index === 0 
                    ? 'radial-gradient(circle at 30% 30%, #6ee7b7, #4ade80, #22c55e)'
                    : `linear-gradient(135deg, #34d399, #22c55e, #16a34a)`,
                  boxShadow: index === 0 
                    ? '0 0 8px rgba(74, 222, 128, 0.8), inset 0 0 5px rgba(255, 255, 255, 0.3)' 
                    : 'inset 0 1px 1px rgba(0, 0, 0, 0.3), 0 0 3px rgba(34, 197, 94, 0.3)',
                  borderRadius: index === 0 ? '3px' : '2px',
                  border: '1px solid rgba(0, 0, 0, 0.2)'
                }}
              >
                {index === 0 && cellSize > 12 && (
                  // 뱀 눈 (머리) - 셀 크기가 충분할 때만
                  <div className="relative w-full h-full">
                    <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full" />
                    <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full" />
                  </div>
                )}
              </div>
            ))}

            {/* 음식 렌더링 */}
            <div
              className="absolute z-30"
              style={{
                left: food.x * cellSize,
                top: food.y * cellSize,
                width: cellSize - 1,
                height: cellSize - 1,
              }}
            >
              <div 
                className="w-full h-full rounded-full animate-pulse"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #ef4444, #dc2626)',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8), inset 0 -1px 2px rgba(0, 0, 0, 0.3)'
                }}
              />
            </div>

            {/* 게임 오버 오버레이 */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
                <h2 className="text-2xl font-bold text-red-500 mb-4">GAME OVER</h2>
                <p className="text-lg mb-2">점수: {score}</p>
                <p className="text-md mb-4 text-gray-400">길이: {snake.length}</p>
                <button
                  onClick={resetGame}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg"
                >
                  다시 시작
                </button>
              </div>
            )}

            {/* 일시정지 오버레이 */}
            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
                <h2 className="text-xl font-bold text-yellow-400">일시정지</h2>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 */}
        <MobileGameControls
          onMove={handleMobileMove}
          gameType="snake"
        />
      </div>
    );
  }

  // 데스크탑 레이아웃 (기존 그대로)
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* 게임 보드 */}
      <div className="flex flex-col items-center">
        <div className="mb-4 flex gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            aria-label="사운드 토글"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            aria-label="일시정지"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              loadLeaderboard();
              setShowLeaderboard(!showLeaderboard);
            }}
            className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={resetGame}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            aria-label="재시작"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        <div
          className="relative border-2 border-green-600 bg-gradient-to-br from-gray-900 via-green-950/20 to-gray-900 rounded-lg shadow-2xl shadow-green-500/20"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          {/* 격자 배경 */}
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
              <div
                key={index}
                className="border border-gray-800/30"
                style={{ 
                  width: CELL_SIZE, 
                  height: CELL_SIZE,
                  background: 'radial-gradient(circle at center, transparent, rgba(0, 255, 0, 0.02))'
                }}
              />
            ))}
          </div>

          {/* 뱀 렌더링 */}
          {snake.map((segment, index) => (
            <div
              key={index}
              className={`absolute ${index === 0 ? 'z-20' : 'z-10'}`}
              style={{
                left: segment.x * CELL_SIZE,
                top: segment.y * CELL_SIZE,
                width: CELL_SIZE - 1,
                height: CELL_SIZE - 1,
                background: index === 0 
                  ? 'radial-gradient(circle at 30% 30%, #6ee7b7, #4ade80, #22c55e)'
                  : `linear-gradient(135deg, #34d399, #22c55e, #16a34a)`,
                boxShadow: index === 0 
                  ? '0 0 15px rgba(74, 222, 128, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)' 
                  : 'inset 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 5px rgba(34, 197, 94, 0.3)',
                borderRadius: index === 0 ? '6px' : '3px',
                border: '1px solid rgba(0, 0, 0, 0.2)'
              }}
            >
              {index === 0 && (
                // 뱀 눈 (머리)
                <div className="relative w-full h-full">
                  <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full" />
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>
          ))}

          {/* 음식 렌더링 */}
          <div
            className="absolute z-30"
            style={{
              left: food.x * CELL_SIZE,
              top: food.y * CELL_SIZE,
              width: CELL_SIZE - 1,
              height: CELL_SIZE - 1,
            }}
          >
            <div 
              className="w-full h-full rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #ff6b6b, #ef4444, #dc2626)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>

          {/* 게임 오버 오버레이 */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
              <h2 className="text-3xl font-bold text-red-500 mb-4">GAME OVER</h2>
              <p className="text-xl mb-2">점수: {score}</p>
              <p className="text-lg mb-4 text-gray-400">길이: {snake.length}</p>
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                다시 시작 (R)
              </button>
            </div>
          )}

          {/* 일시정지 오버레이 */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
              <h2 className="text-2xl font-bold text-yellow-400">일시정지</h2>
            </div>
          )}
        </div>
      </div>

      {/* 게임 정보 */}
      <div className="flex flex-col gap-4">
        {/* 점수 정보 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-green-400">점수</h3>
          <p className="text-2xl font-mono text-white">{score}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-green-400">최고 점수</h3>
          <p className="text-xl font-mono text-yellow-400">{highScore}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-green-400">길이</h3>
          <p className="text-2xl font-mono text-white">{snake.length}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-green-400">레벨</h3>
          <p className="text-2xl font-mono text-white">{Math.floor(score / 50) + 1}</p>
        </div>

        {/* 조작법 - 모바일에서는 숨김 */}
        {!isMobile && (
          <>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-sm shadow-lg">
              <h3 className="text-lg font-bold mb-2 text-green-400">조작법</h3>
              <div className="space-y-1 text-gray-300">
                <p>↑↓←→ : 방향 전환</p>
                <p>P : 일시정지</p>
                <p>R : 재시작</p>
              </div>
            </div>

            {/* 게임 팁 */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-sm shadow-lg">
              <h3 className="text-lg font-bold mb-2 text-green-400">팁</h3>
              <div className="space-y-1 text-gray-300">
                <p>🍎 빨간 음식을 먹으면 +10점</p>
                <p>📈 50점마다 속도 증가</p>
                <p>🐍 벽이나 자기 몸에 부딪히면 게임 오버</p>
              </div>
            </div>
          </>
        )}

        {showLeaderboard && (
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              다시 게임 랭킹
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