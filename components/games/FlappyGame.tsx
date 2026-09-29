'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, RotateCw, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const CANVAS_WIDTH_DESKTOP = 400;
const CANVAS_HEIGHT_DESKTOP = 600;
const CANVAS_WIDTH_MOBILE = 320;
const CANVAS_HEIGHT_MOBILE = 480;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const BIRD_SIZE = 30;
const BIRD_X = 100;
const CLOUD_COUNT = 3;

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH_DESKTOP);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT_DESKTOP);
  
  const [bird, setBird] = useState<Bird>({ y: CANVAS_HEIGHT_DESKTOP / 2, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [wingAngle, setWingAngle] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 감지 및 캔버스 크기 설정
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
        const availableWidth = width - 20;
        
        const optimalWidth = Math.min(availableWidth, 340); // 최대 340px
        const optimalHeight = Math.min(availableHeight, Math.floor(optimalWidth * 1.4)); // 5:7 비율
        
        setCanvasWidth(optimalWidth);
        setCanvasHeight(optimalHeight);
      } else {
        setCanvasWidth(CANVAS_WIDTH_DESKTOP);
        setCanvasHeight(CANVAS_HEIGHT_DESKTOP);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 모바일 컨트롤 핸들러
  const handleMobileAction = useCallback((action: 'rotate' | 'drop' | 'action1' | 'action2') => {
    if (action === 'action1') {
      jump();
    }
  }, []);

  // 사운드 초기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
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

      (window as any).flappySounds = {
        jump: () => playSound(400, 0.1),
        score: () => playSound(800, 0.2),
        gameOver: () => playSound(200, 0.5, 'square')
      };
    }
  }, [soundEnabled]);

  const playJumpSound = () => {
    if (soundEnabled && (window as any).flappySounds) {
      (window as any).flappySounds.jump();
    }
  };

  const playScoreSound = () => {
    if (soundEnabled && (window as any).flappySounds) {
      (window as any).flappySounds.score();
    }
  };

  const playGameOverSound = () => {
    if (soundEnabled && (window as any).flappySounds) {
      (window as any).flappySounds.gameOver();
    }
  };

  // 구름 초기화
  const initClouds = () => {
    const newClouds: Cloud[] = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      newClouds.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * (canvasHeight / 3),
        size: Math.random() * 30 + 20,
        speed: Math.random() * 0.5 + 0.2
      });
    }
    return newClouds;
  };

  // 게임 시작
  const startGame = () => {
    setBird({ y: canvasHeight / 2, velocity: 0 });
    setPipes([]);
    setScore(0);
    setClouds(initClouds());
    setGameStarted(true);
    setGameOver(false);
  };

  // 점프
  const jump = useCallback(() => {
    if (!gameStarted) {
      startGame();
      return;
    }
    if (gameOver) return;
    
    setBird(prev => ({ ...prev, velocity: JUMP_STRENGTH }));
    playJumpSound();
  }, [gameStarted, gameOver]);

  // 게임 루프
  const gameLoop = useCallback(() => {
    if (!canvasRef.current || !gameStarted || gameOver) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 그라데이션 배경
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#98D8E8');
    gradient.addColorStop(1, '#F0E68C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 구름 업데이트 및 그리기
    setClouds(prev => prev.map(cloud => {
      const newX = cloud.x - cloud.speed;
      return {
        ...cloud,
        x: newX < -50 ? canvasWidth + 50 : newX
      };
    }));

    clouds.forEach(cloud => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.6, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.6, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 새 업데이트
    setBird(prev => {
      const newY = prev.y + prev.velocity;
      const newVelocity = prev.velocity + GRAVITY;
      
      // 날개 애니메이션
      setWingAngle(prev => prev + 0.3);
      
      // 바닥이나 천장 충돌
      if (newY <= 0 || newY >= canvasHeight - BIRD_SIZE) {
        setGameOver(true);
        playGameOverSound();
        saveScore();
      }
      
      return { y: newY, velocity: newVelocity };
    });

    // 파이프 업데이트
    setPipes(prev => {
      let newPipes = prev.map(pipe => ({
        ...pipe,
        x: pipe.x - PIPE_SPEED
      }));

      // 파이프 제거
      newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

      // 새 파이프 추가
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < canvasWidth - 200) {
        newPipes.push({
          x: canvasWidth,
          topHeight: Math.random() * (canvasHeight - PIPE_GAP - 100) + 50,
          passed: false
        });
      }

      // 점수 체크
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          setScore(s => s + 1);
          playScoreSound();
        }

        // 충돌 체크
        if (
          BIRD_X + BIRD_SIZE > pipe.x &&
          BIRD_X < pipe.x + PIPE_WIDTH &&
          (bird.y < pipe.topHeight || bird.y + BIRD_SIZE > pipe.topHeight + PIPE_GAP)
        ) {
          setGameOver(true);
          playGameOverSound();
          saveScore();
        }
      });

      return newPipes;
    });

    // 파이프 그리기 (3D 효과)
    pipes.forEach(pipe => {
      // 파이프 그라데이션
      const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGradient.addColorStop(0, '#2d5a2d');
      pipeGradient.addColorStop(0.5, '#4a9d4a');
      pipeGradient.addColorStop(1, '#2d5a2d');
      
      // 위 파이프
      ctx.fillStyle = pipeGradient;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      
      // 위 파이프 캡
      const capGradient1 = ctx.createLinearGradient(pipe.x - 5, 0, pipe.x + PIPE_WIDTH + 5, 0);
      capGradient1.addColorStop(0, '#1f3f1f');
      capGradient1.addColorStop(0.5, '#5abd5a');
      capGradient1.addColorStop(1, '#1f3f1f');
      ctx.fillStyle = capGradient1;
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, PIPE_WIDTH + 10, 30);
      
      // 아래 파이프
      ctx.fillStyle = pipeGradient;
      ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvasHeight - pipe.topHeight - PIPE_GAP);
      
      // 아래 파이프 캡
      ctx.fillStyle = capGradient1;
      ctx.fillRect(pipe.x - 5, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 10, 30);
      
      // 하이라이트
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pipe.x + 5, 0);
      ctx.lineTo(pipe.x + 5, pipe.topHeight - 30);
      ctx.moveTo(pipe.x + 5, pipe.topHeight + PIPE_GAP + 30);
      ctx.lineTo(pipe.x + 5, canvasHeight);
      ctx.stroke();
    });

    // 새 그리기 (3D 효과)
    ctx.save();
    ctx.translate(BIRD_X + BIRD_SIZE/2, bird.y + BIRD_SIZE/2);
    
    // 새 몸통 (그라데이션)
    const birdGradient = ctx.createRadialGradient(0, -5, 0, 0, 0, BIRD_SIZE/2);
    birdGradient.addColorStop(0, '#FFE033');
    birdGradient.addColorStop(0.7, '#FFD700');
    birdGradient.addColorStop(1, '#FFA500');
    ctx.fillStyle = birdGradient;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    
    // 부리
    ctx.fillStyle = '#FF6347';
    ctx.beginPath();
    ctx.moveTo(BIRD_SIZE/2 - 2, 0);
    ctx.lineTo(BIRD_SIZE/2 + 8, 0);
    ctx.lineTo(BIRD_SIZE/2 - 2, 4);
    ctx.closePath();
    ctx.fill();
    
    // 눈
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(10, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 날개 (애니메이션)
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    const wingY = Math.sin(wingAngle) * 5;
    ctx.ellipse(-8, wingY, 12, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    // 점수 표시 (그림자 효과)
    ctx.font = 'bold 48px Arial';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeText(score.toString(), canvasWidth / 2 - 20, 60);
    ctx.fillStyle = '#FFF';
    ctx.fillText(score.toString(), canvasWidth / 2 - 20, 60);

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver, bird, pipes, score, clouds, wingAngle]);

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && score > 0) {
        await api.post('/games/flappy/score', {
          score
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // 에러 무시
    }
  };

  // 게임 루프 실행
  useEffect(() => {
    if (gameStarted && !gameOver) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameStarted, gameOver]);

  // 키보드/마우스 입력
  useEffect(() => {
    const handleInput = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.key !== ' ') return;
      e.preventDefault();
      jump();
    };

    window.addEventListener('keydown', handleInput);
    canvasRef.current?.addEventListener('click', handleInput);
    
    return () => {
      window.removeEventListener('keydown', handleInput);
      canvasRef.current?.removeEventListener('click', handleInput);
    };
  }, [jump]);

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/flappy/highscore');
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
      const response = await api.get('/games/flappy/leaderboard?period=all');
      setLeaderboard(response.data || []);
    } catch (error) {
      // 에러 무시
    }
  };

  // 모바일 전체화면 레이아웃
  if (isMobile) {
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col">
        {/* 상단 바 - 뒤로가기와 점수만 */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
          <Link href="/games" className="text-white p-2">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-4 text-white">
            <span className="text-sm">Score: {score}</span>
            <span className="text-sm">Best: {highScore}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="game-canvas border-2 border-gray-700 bg-sky-300 rounded cursor-pointer"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!gameStarted) {
                  startGame();
                } else if (!gameOver) {
                  jump();
                } else {
                  startGame();
                }
              }}
              onClick={() => {
                if (!gameStarted) {
                  startGame();
                } else if (!gameOver) {
                  jump();
                } else {
                  startGame();
                }
              }}
            />
            
            {/* 게임 시작 메시지 */}
            {!gameStarted && (
              <div className="mt-2 text-center bg-gray-800 p-3 rounded-lg">
                <p className="text-lg font-bold text-yellow-400 animate-pulse">🎮 탭하여 시작!</p>
                <p className="text-xs text-gray-400 mt-1">새를 날려 파이프를 피하세요</p>
              </div>
            )}
            
            {/* 게임 오버 메시지 */}
            {gameOver && (
              <div className="mt-2 p-4 bg-gray-800 rounded-lg text-center">
                <h2 className="text-lg font-bold mb-2">게임 오버!</h2>
                <p className="text-lg mb-1">점수: {score}</p>
                <p className="text-sm text-gray-400 mb-2">최고 점수: {highScore}</p>
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm"
                >
                  다시 시작
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 */}
        <MobileGameControls
          onMove={() => {}}
          onAction={handleMobileAction}
          gameType="flappy"
        />
      </div>
    );
  }

  // 데스크탑 레이아웃 (기존 그대로)
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex flex-col items-center">
        <div className="mb-4 flex gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              loadLeaderboard();
              setShowLeaderboard(!showLeaderboard);
            }}
            className="p-2 bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={startGame}
            className="px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            {gameStarted ? '다시 시작' : '게임 시작'}
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="game-canvas border-2 border-gray-700 bg-sky-300 rounded-lg cursor-pointer"
          onClick={() => {
            if (!gameStarted) {
              startGame();
            } else if (!gameOver) {
              jump();
            } else {
              startGame();
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!gameStarted) {
              startGame();
            } else if (!gameOver) {
              jump();
            } else {
              startGame();
            }
          }}
        />

        {!gameStarted && (
          <div className="mt-4 text-center bg-gray-800 p-4 rounded-lg">
            <p className="text-xl font-bold text-yellow-400 animate-pulse">🎮 스페이스바 또는 클릭으로 시작!</p>
            <p className="text-sm text-gray-400 mt-2">새를 날려 파이프를 피하세요</p>
          </div>
        )}

        {gameOver && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2">게임 오버!</h2>
            <p className="text-xl">점수: {score}</p>
            <p className="text-sm text-gray-400">최고 점수: {highScore}</p>
          </div>
        )}

        {showLeaderboard && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              플래피버드 랭킹
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
                    <div className="font-mono text-orange-400">{entry.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">점수</h3>
          <p className="text-2xl font-mono">{score}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">최고 점수</h3>
          <p className="text-xl font-mono text-yellow-400">{highScore}</p>
        </div>

        {!isMobile && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-4 text-sm shadow-lg">
            <h3 className="text-lg font-bold mb-2 text-yellow-400">조작법</h3>
            <div className="space-y-1 text-gray-300">
              <p className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span>Space/클릭 : 점프</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <span>스페이스바로 게임 시작</span>
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">팁</h3>
          <div className="space-y-1 text-gray-400">
            <p>🐦 일정한 리듬으로 탭하세요</p>
            <p>📏 파이프 중앙을 목표로!</p>
            <p>⚡ 침착하게 플레이하세요</p>
          </div>
        </div>
      </div>
    </div>
  );
}