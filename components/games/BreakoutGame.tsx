'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, RotateCw, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const CANVAS_WIDTH_DESKTOP = 600;
const CANVAS_HEIGHT_DESKTOP = 400;
const CANVAS_WIDTH_MOBILE = 320;
const CANVAS_HEIGHT_MOBILE = 400;
const PADDLE_WIDTH = 80; // 모바일에서 더 작게
const PADDLE_HEIGHT = 8; // 모바일에서 더 얇게
const PADDLE_SPEED = 25; // 모바일에서 더 빠르게
const BALL_SIZE = 8;
const INITIAL_BALL_SPEED = 5;
const MAX_BALL_SPEED = 15;
const SPEED_INCREMENT = 0.2;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 20;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Brick {
  x: number;
  y: number;
  color: string;
  points: number;
  hits: number;
  destroyed: boolean;
}

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH_DESKTOP);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT_DESKTOP);
  
  const [paddleX, setPaddleX] = useState(CANVAS_WIDTH_DESKTOP / 2 - PADDLE_WIDTH / 2);
  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH_DESKTOP / 2,
    y: CANVAS_HEIGHT_DESKTOP - 30,
    vx: INITIAL_BALL_SPEED,
    vy: -INITIAL_BALL_SPEED
  });
  const [ballSpeed, setBallSpeed] = useState(INITIAL_BALL_SPEED);
  const [bricksDestroyed, setBricksDestroyed] = useState(0);
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [level, setLevel] = useState(1);
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
        
        const optimalWidth = Math.min(availableWidth, 360); // 최대 360px
        const optimalHeight = Math.min(availableHeight, Math.floor(optimalWidth * 0.75)); // 4:3 비율
        
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
  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const speed = PADDLE_SPEED;
    if (direction === 'left') {
      setPaddleX(prev => Math.max(0, prev - speed));
    } else if (direction === 'right') {
      setPaddleX(prev => Math.min(canvasWidth - PADDLE_WIDTH, prev + speed));
    }
    // up/down은 무시 (breakout 게임에서는 좌우 이동만 필요)
  }, []);

  const handleMobileAction = useCallback((action: 'rotate' | 'drop' | 'action1' | 'action2') => {
    if (action === 'action1' && !gameStarted) {
      startGame();
    } else if (action === 'action1') {
      setIsPaused(!isPaused);
    } else if (action === 'action2') {
      startGame();
    }
  }, [gameStarted, isPaused]);

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

      (window as any).breakoutSounds = {
        paddle: () => playSound(300, 0.1),
        brick: () => playSound(500, 0.1),
        wall: () => playSound(400, 0.1),
        gameOver: () => playSound(200, 0.5),
        levelUp: () => {
          playSound(400, 0.1);
          setTimeout(() => playSound(500, 0.1), 100);
          setTimeout(() => playSound(600, 0.2), 200);
        }
      };
    }
  }, [soundEnabled]);

  const playPaddleSound = () => {
    if (soundEnabled && (window as any).breakoutSounds) {
      (window as any).breakoutSounds.paddle();
    }
  };

  const playBrickSound = () => {
    if (soundEnabled && (window as any).breakoutSounds) {
      (window as any).breakoutSounds.brick();
    }
  };

  const playWallSound = () => {
    if (soundEnabled && (window as any).breakoutSounds) {
      (window as any).breakoutSounds.wall();
    }
  };

  const playGameOverSound = () => {
    if (soundEnabled && (window as any).breakoutSounds) {
      (window as any).breakoutSounds.gameOver();
    }
  };

  const playLevelUpSound = () => {
    if (soundEnabled && (window as any).breakoutSounds) {
      (window as any).breakoutSounds.levelUp();
    }
  };

  // 벽돌 초기화
  const initBricks = useCallback(() => {
    const newBricks: Brick[] = [];
    const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#a8e6cf'];
    
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        newBricks.push({
          x: col * (BRICK_WIDTH + 5) + 5,
          y: row * (BRICK_HEIGHT + 5) + 40,
          color: colors[row],
          points: (BRICK_ROWS - row) * 10,
          hits: row < 2 ? 2 : 1,
          destroyed: false
        });
      }
    }
    return newBricks;
  }, []);

  // 게임 시작
  const startGame = () => {
    setBricks(initBricks());
    setBall({
      x: canvasWidth / 2,
      y: canvasHeight - 30,
      vx: INITIAL_BALL_SPEED,
      vy: -INITIAL_BALL_SPEED
    });
    setPaddleX(canvasWidth / 2 - PADDLE_WIDTH / 2);
    setScore(0);
    setLives(3);
    setLevel(1);
    setBallSpeed(INITIAL_BALL_SPEED);
    setBricksDestroyed(0);
    setGameStarted(true);
    setGameOver(false);
    setIsPaused(false);
  };

  // 게임 루프
  const gameLoop = useCallback(() => {
    if (!canvasRef.current || !gameStarted || gameOver || isPaused) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 그라데이션 배경
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, '#0a0a2e');
    bgGradient.addColorStop(0.5, '#161b3d');
    bgGradient.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 그리드 패턴 (배경 효과)
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvasWidth; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvasHeight);
      ctx.stroke();
    }
    for (let i = 0; i < canvasHeight; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvasWidth, i);
      ctx.stroke();
    }

    // 벽돌 그리기 (3D 효과)
    bricks.forEach(brick => {
      if (!brick.destroyed) {
        // 그림자 효과
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // 벽돌 그라데이션
        const brickGradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + BRICK_WIDTH, brick.y + BRICK_HEIGHT);
        const baseColor = brick.color;
        brickGradient.addColorStop(0, baseColor);
        brickGradient.addColorStop(0.5, brick.hits > 1 ? baseColor : lightenColor(baseColor, 20));
        brickGradient.addColorStop(1, darkenColor(baseColor, 20));
        
        ctx.fillStyle = brickGradient;
        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        
        // 하이라이트 (3D 효과)
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const highlightGradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + BRICK_HEIGHT/3);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = highlightGradient;
        ctx.fillRect(brick.x + 2, brick.y + 2, BRICK_WIDTH - 4, BRICK_HEIGHT/3);
        
        // 테두리
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        
        // 손상된 벽돌 표시
        if (brick.hits > 1) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
          
          // 균열 효과
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(brick.x + BRICK_WIDTH/3, brick.y);
          ctx.lineTo(brick.x + BRICK_WIDTH/3, brick.y + BRICK_HEIGHT);
          ctx.moveTo(brick.x + BRICK_WIDTH*2/3, brick.y);
          ctx.lineTo(brick.x + BRICK_WIDTH*2/3, brick.y + BRICK_HEIGHT);
          ctx.stroke();
        }
      }
    });
    
    // 색상 헬퍼 함수
    function lightenColor(color: string, percent: number): string {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.min(255, (num >> 16) + amt);
      const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
      const B = Math.min(255, (num & 0x0000FF) + amt);
      return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }
    
    function darkenColor(color: string, percent: number): string {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max(0, (num >> 16) - amt);
      const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
      const B = Math.max(0, (num & 0x0000FF) - amt);
      return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    // 패들 그리기 (3D 효과)
    // 패들 그림자
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    
    // 패들 그라데이션
    const paddleGradient = ctx.createLinearGradient(paddleX, canvasHeight - 20, paddleX + PADDLE_WIDTH, canvasHeight - 10);
    paddleGradient.addColorStop(0, '#6eddd5');
    paddleGradient.addColorStop(0.5, '#4ecdc4');
    paddleGradient.addColorStop(1, '#3ba39c');
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(paddleX, canvasHeight - 20, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // 패들 하이라이트
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(paddleX + 2, canvasHeight - 18, PADDLE_WIDTH - 4, 2);
    
    // 패들 테두리
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(paddleX, canvasHeight - 20, PADDLE_WIDTH, PADDLE_HEIGHT);

    // 볼 업데이트 및 그리기
    setBall(prev => {
      let newX = prev.x + prev.vx;
      let newY = prev.y + prev.vy;
      let newVx = prev.vx;
      let newVy = prev.vy;

      // 벽 충돌
      if (newX <= BALL_SIZE || newX >= canvasWidth - BALL_SIZE) {
        newVx = -newVx;
        playWallSound();
      }
      if (newY <= BALL_SIZE) {
        newVy = -newVy;
        playWallSound();
      }

      // 패들 충돌
      if (
        newY >= canvasHeight - 30 &&
        newY <= canvasHeight - 20 &&
        newX >= paddleX &&
        newX <= paddleX + PADDLE_WIDTH
      ) {
        const currentSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
        const relativeX = (newX - paddleX) / PADDLE_WIDTH;
        const angle = (relativeX - 0.5) * Math.PI / 3; // -60 to 60 degrees
        newVx = currentSpeed * Math.sin(angle);
        newVy = -Math.abs(currentSpeed * Math.cos(angle));
        playPaddleSound();
      }

      // 바닥 충돌 (생명 잃기)
      if (newY >= canvasHeight) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
            playGameOverSound();
            saveScore();
          }
          return newLives;
        });
        
        // 볼 리셋
        newX = canvasWidth / 2;
        newY = canvasHeight - 30;
        const resetSpeed = Math.min(INITIAL_BALL_SPEED + level - 1, MAX_BALL_SPEED);
        newVx = resetSpeed;
        newVy = -resetSpeed;
        setBallSpeed(resetSpeed);
      }

      // 벽돌 충돌
      setBricks(prevBricks => {
        return prevBricks.map(brick => {
          if (brick.destroyed) return brick;
          
          if (
            newX >= brick.x &&
            newX <= brick.x + BRICK_WIDTH &&
            newY >= brick.y &&
            newY <= brick.y + BRICK_HEIGHT
          ) {
            newVy = -newVy;
            brick.hits--;
            
            if (brick.hits <= 0) {
              setScore(s => s + brick.points);
              setBricksDestroyed(prev => {
                const newCount = prev + 1;
                // 속도 증가: 5개 벽돌마다
                if (newCount % 5 === 0) {
                  setBallSpeed(currentSpeed => {
                    const newSpeed = Math.min(currentSpeed + SPEED_INCREMENT, MAX_BALL_SPEED);
                    const speedRatio = newSpeed / currentSpeed;
                    newVx *= speedRatio;
                    newVy *= speedRatio;
                    return newSpeed;
                  });
                }
                return newCount;
              });
              playBrickSound();
              return { ...brick, destroyed: true };
            }
            
            playBrickSound();
            return { ...brick };
          }
          return brick;
        });
      });

      return { x: newX, y: newY, vx: newVx, vy: newVy };
    });

    // 볼 그리기 (3D 효과 및 광채)
    // 볼 트레일 효과
    const trailLength = Math.min(5, Math.floor(ballSpeed / 3));
    for (let i = 0; i < trailLength; i++) {
      const alpha = (1 - i / trailLength) * 0.2;
      const trailX = ball.x - ball.vx * i * 2;
      const trailY = ball.y - ball.vy * i * 2;
      
      ctx.fillStyle = `rgba(255, 217, 61, ${alpha})`;
      ctx.beginPath();
      ctx.arc(trailX, trailY, BALL_SIZE * (1 - i * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 볼 귴로우 효과
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 20;
    const glowGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_SIZE * 2);
    glowGradient.addColorStop(0, 'rgba(255, 217, 61, 0.8)');
    glowGradient.addColorStop(0.5, 'rgba(255, 217, 61, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 217, 61, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 볼 몸체
    ctx.shadowBlur = 0;
    const ballGradient = ctx.createRadialGradient(ball.x - BALL_SIZE/3, ball.y - BALL_SIZE/3, 0, ball.x, ball.y, BALL_SIZE);
    ballGradient.addColorStop(0, '#ffec8b');
    ballGradient.addColorStop(0.5, '#ffd93d');
    ballGradient.addColorStop(1, '#ffb347');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // 볼 반사광
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(ball.x - BALL_SIZE/3, ball.y - BALL_SIZE/3, BALL_SIZE/3, 0, Math.PI * 2);
    ctx.fill();

    // UI 그리기 (깔끔한 텍스트)
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = 'bold 20px Arial';
    
    // 점수
    ctx.fillStyle = '#ffd93d';
    ctx.fillText(`점수: ${score}`, 10, 25);
    
    // 생명
    ctx.fillStyle = '#ff6464';
    ctx.fillText(`생명: ${lives}`, canvasWidth - 80, 25);
    
    // 레벨
    ctx.fillStyle = '#64c8ff';
    ctx.fillText(`레벨: ${level}`, canvasWidth / 2 - 30, 25);

    // 레벨 클리어 체크
    if (bricks.every(brick => brick.destroyed)) {
      setLevel(prev => {
        const newLevel = prev + 1;
        // 레벨업시 초기 속도도 증가
        const newSpeed = Math.min(INITIAL_BALL_SPEED + newLevel - 1, MAX_BALL_SPEED);
        setBallSpeed(newSpeed);
        setBall(prevBall => ({
          ...prevBall,
          vx: prevBall.vx > 0 ? newSpeed : -newSpeed,
          vy: prevBall.vy > 0 ? newSpeed : -newSpeed
        }));
        return newLevel;
      });
      setBricks(initBricks());
      setBricksDestroyed(0);
      playLevelUpSound();
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver, isPaused, ball, bricks, paddleX, score, lives, level, ballSpeed, initBricks]);

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && score > 0) {
        await api.post('/games/breakout/score', {
          score,
          level
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
    if (gameStarted && !gameOver && !isPaused) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameStarted, gameOver, isPaused]);

  // 마우스 컨트롤
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !gameStarted || gameOver) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setPaddleX(Math.min(Math.max(x - PADDLE_WIDTH / 2, 0), canvasWidth - PADDLE_WIDTH));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gameStarted, gameOver]);

  // 키보드 입력
  useEffect(() => {
    const keys: { [key: string]: boolean } = {};
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true;
      
      if (e.key === 'p' || e.key === 'P' || e.key === 'ㅔ') {
        if (gameStarted && !gameOver) {
          setIsPaused(prev => !prev);
        }
      }
      if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        startGame();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };
    
    // 키보드로 패들 이동
    const moveInterval = setInterval(() => {
      if (!gameStarted || gameOver || isPaused) return;
      
      setPaddleX(prev => {
        let newX = prev;
        if (keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['ㅁ']) {
          newX = Math.max(0, prev - PADDLE_SPEED);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D'] || keys['ㅇ']) {
          newX = Math.min(canvasWidth - PADDLE_WIDTH, prev + PADDLE_SPEED);
        }
        return newX;
      });
    }, 16); // 60 FPS

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(moveInterval);
    };
  }, [gameStarted, gameOver, isPaused]);

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/breakout/highscore');
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
      const response = await api.get('/games/breakout/leaderboard?period=all');
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
            <span className="text-sm">Level: {level}</span>
            <span className="text-sm">{'❤️'.repeat(lives)}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="game-canvas border-2 border-gray-700 bg-gray-900 rounded"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const rect = e.currentTarget.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                // 터치 위치로 패들 이동
                setPaddleX(Math.max(0, Math.min(canvasWidth - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)));
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseMove={(e) => {
                if (!isMobile) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setPaddleX(Math.max(0, Math.min(canvasWidth - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)));
              }}
            />
            
            {/* 게임 시작 버튼 */}
            {!gameStarted && (
              <button
                onClick={startGame}
                className="mt-2 px-6 py-2 bg-cyan-600 text-white rounded-lg"
              >
                게임 시작
              </button>
            )}
            
            {/* 게임 오버 메시지 */}
            {gameOver && (
              <div className="mt-2 p-4 bg-gray-800 rounded-lg text-center">
                <h2 className="text-lg font-bold mb-2">게임 오버!</h2>
                <p className="text-sm mb-1">최종 점수: {score}</p>
                <p className="text-sm mb-2 text-gray-400">도달 레벨: {level}</p>
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm"
                >
                  다시 시작
                </button>
              </div>
            )}
            
            {/* 일시정지 메시지 */}
            {isPaused && !gameOver && gameStarted && (
              <div className="mt-2 text-yellow-400 animate-pulse">일시정지</div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 */}
        <MobileGameControls
          onMove={handleMobileMove}
          onAction={handleMobileAction}
          gameType="breakout"
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
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={!gameStarted || gameOver}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              loadLeaderboard();
              setShowLeaderboard(!showLeaderboard);
            }}
            className="p-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button
            onClick={startGame}
            className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            {gameStarted ? '다시 시작' : '게임 시작'}
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="game-canvas border-2 border-gray-700 bg-gray-900 rounded-lg cursor-none"
        />

        {gameOver && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2">게임 오버!</h2>
            <p className="text-xl">최종 점수: {score}</p>
            <p className="text-lg">도달 레벨: {level}</p>
          </div>
        )}

        {isPaused && !gameOver && (
          <div className="mt-4 text-yellow-400">일시정지</div>
        )}

        {showLeaderboard && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              벽돌깨기 랭킹
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
                    <div className="text-right">
                      <div className="font-mono text-cyan-400">{entry.score.toLocaleString()}</div>
                      {entry.level && <div className="text-xs text-gray-400">Lv.{entry.level}</div>}
                    </div>
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
          <h3 className="text-lg font-bold mb-2">속도</h3>
          <p className="text-xl font-mono text-cyan-400">{ballSpeed.toFixed(1)}</p>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all"
              style={{ width: `${((ballSpeed - INITIAL_BALL_SPEED) / (MAX_BALL_SPEED - INITIAL_BALL_SPEED)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">최고 점수</h3>
          <p className="text-xl font-mono text-yellow-400">{highScore}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">생명</h3>
          <p className="text-xl">{'❤️'.repeat(lives)}</p>
        </div>

        {!isMobile && (
          <div className="bg-gray-800 rounded-lg p-4 text-sm">
            <h3 className="text-lg font-bold mb-2">조작법</h3>
            <div className="space-y-1 text-gray-400">
              <p>마우스 / ←→ / A,D : 패들 이동</p>
              <p>P : 일시정지</p>
              <p>R : 재시작</p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">점수 & 난이도</h3>
          <div className="space-y-1 text-gray-400">
            <p>🔴 빨간 벽돌: 50점 (2회 타격)</p>
            <p>🟡 노란 벽돌: 40점 (2회 타격)</p>
            <p>🟢 초록 벽돌: 30점</p>
            <p>🔵 파란 벽돌: 20점</p>
            <p>⚪ 민트 벽돌: 10점</p>
            <p className="mt-2 text-yellow-400">⚡ 5개 파괴마다 속도 증가!</p>
          </div>
        </div>
      </div>
    </div>
  );
}