'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, RotateCw, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const CANVAS_WIDTH_DESKTOP = 800;
const CANVAS_HEIGHT_DESKTOP = 400;
const CANVAS_WIDTH_MOBILE = 320;
const CANVAS_HEIGHT_MOBILE = 400;
const PADDLE_HEIGHT = 60; // 모바일에서 더 작게
const PADDLE_WIDTH = 10; // 모바일에서 더 얇게
const BALL_SIZE = 20;
const PADDLE_SPEED = 20; // 모바일에서 더 빠르게
const INITIAL_BALL_SPEED = 4;
const MAX_BALL_SPEED = 12;
const SPEED_INCREMENT = 0.3;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

interface Paddle {
  y: number;
  score: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH_DESKTOP);
  const [canvasHeight, setCanvasHeight] = useState(CANVAS_HEIGHT_DESKTOP);
  
  const [playerPaddle, setPlayerPaddle] = useState<Paddle>({ y: CANVAS_HEIGHT_DESKTOP / 2 - PADDLE_HEIGHT / 2, score: 0 });
  const [aiPaddle, setAiPaddle] = useState<Paddle>({ y: CANVAS_HEIGHT_DESKTOP / 2 - PADDLE_HEIGHT / 2, score: 0 });
  const [ball, setBall] = useState<Ball>({
    x: CANVAS_WIDTH_DESKTOP / 2,
    y: CANVAS_HEIGHT_DESKTOP / 2,
    vx: INITIAL_BALL_SPEED,
    vy: 0,
    speed: INITIAL_BALL_SPEED
  });
  
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [rally, setRally] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
    if (direction === 'up') {
      setPlayerPaddle(prev => ({ ...prev, y: Math.max(0, prev.y - PADDLE_SPEED) }));
    } else if (direction === 'down') {
      setPlayerPaddle(prev => ({ ...prev, y: Math.min(canvasHeight - PADDLE_HEIGHT, prev.y + PADDLE_SPEED) }));
    }
    // left/right는 무시 (pong 게임에서는 상하 이동만 필요)
  }, [canvasHeight]);

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

      (window as any).pongSounds = {
        paddle: () => playSound(400, 0.1),
        wall: () => playSound(300, 0.1),
        score: () => playSound(200, 0.3),
        gameOver: () => playSound(150, 0.5)
      };
    }
  }, [soundEnabled]);

  const playPaddleSound = () => {
    if (soundEnabled && (window as any).pongSounds) {
      (window as any).pongSounds.paddle();
    }
  };

  const playWallSound = () => {
    if (soundEnabled && (window as any).pongSounds) {
      (window as any).pongSounds.wall();
    }
  };

  const playScoreSound = () => {
    if (soundEnabled && (window as any).pongSounds) {
      (window as any).pongSounds.score();
    }
  };

  const playGameOverSound = () => {
    if (soundEnabled && (window as any).pongSounds) {
      (window as any).pongSounds.gameOver();
    }
  };

  // 게임 시작
  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setIsPaused(false);
    setWinner(null);
    setRally(0);
    setParticles([]);
    setPlayerPaddle({ y: canvasHeight / 2 - PADDLE_HEIGHT / 2, score: 0 });
    setAiPaddle({ y: canvasHeight / 2 - PADDLE_HEIGHT / 2, score: 0 });
    resetBall();
  };

  // 볼 리셋
  const resetBall = () => {
    const direction = Math.random() > 0.5 ? 1 : -1;
    setBall({
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: INITIAL_BALL_SPEED * direction,
      vy: (Math.random() - 0.5) * 5,
      speed: INITIAL_BALL_SPEED
    });
    setRally(0);
  };

  // 파티클 생성
  const createParticles = (x: number, y: number, direction: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        x,
        y,
        vx: (Math.random() * 4 + 2) * direction,
        vy: (Math.random() - 0.5) * 6,
        life: 1,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // AI 패들 업데이트
  const updateAI = useCallback((ballY: number, paddleY: number) => {
    let speed = difficulty === 'easy' ? 3 : difficulty === 'normal' ? 5 : 7;
    const center = paddleY + PADDLE_HEIGHT / 2;
    
    if (center < ballY - 10) {
      return Math.min(paddleY + speed, canvasHeight - PADDLE_HEIGHT);
    } else if (center > ballY + 10) {
      return Math.max(paddleY - speed, 0);
    }
    return paddleY;
  }, [difficulty]);

  // 게임 루프
  const gameLoop = useCallback(() => {
    if (!canvasRef.current || gameOver || isPaused || !gameStarted) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 애니메이션 시간 업데이트
    setAnimationTime(prev => prev + 0.016);

    // 그라데이션 배경
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, '#0a0a2e');
    bgGradient.addColorStop(0.5, '#161b3d');
    bgGradient.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 그리드 패턴 (배경 효과)
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.05)';
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

    // 파티클 업데이트 및 그리기
    setParticles(prev => prev
      .map(p => ({ 
        ...p, 
        x: p.x + p.vx, 
        y: p.y + p.vy, 
        vy: p.vy + 0.2, // 중력 효과
        life: p.life - 0.02 
      }))
      .filter(p => p.life > 0)
    );
    
    particles.forEach(particle => {
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, 4
      );
      gradient.addColorStop(0, `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${particle.color}00`);
      ctx.fillStyle = gradient;
      ctx.fillRect(particle.x - 4, particle.y - 4, 8, 8);
    });

    // 중앙선 (네온 효과)
    ctx.setLineDash([15, 25]);
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 0);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.stroke();
    
    // 중앙선 글로우
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.1)';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.setLineDash([]);

    // 플레이어 패들 업데이트
    setPlayerPaddle(prev => {
      let newY = prev.y;
      if (keysRef.current.has('ArrowUp') || keysRef.current.has('w') || keysRef.current.has('ㅈ')) {
        newY = Math.max(0, prev.y - PADDLE_SPEED);
      }
      if (keysRef.current.has('ArrowDown') || keysRef.current.has('s') || keysRef.current.has('ㄴ')) {
        newY = Math.min(canvasHeight - PADDLE_HEIGHT, prev.y + PADDLE_SPEED);
      }
      return { ...prev, y: newY };
    });

    // AI 패들 업데이트
    setAiPaddle(prev => ({
      ...prev,
      y: updateAI(ball.y, prev.y)
    }));

    // 볼 업데이트
    setBall(prev => {
      let newX = prev.x + prev.vx;
      let newY = prev.y + prev.vy;
      let newVx = prev.vx;
      let newVy = prev.vy;
      let newSpeed = prev.speed;

      // 위아래 벽 충돌
      if (newY <= BALL_SIZE/2 || newY >= canvasHeight - BALL_SIZE/2) {
        newVy = -newVy;
        playWallSound();
        createParticles(newX, newY <= BALL_SIZE/2 ? 0 : canvasHeight, 0, '#ffffff');
      }

      // 플레이어 패들 충돌
      if (newX <= PADDLE_WIDTH + BALL_SIZE/2 + 10 && 
          newX >= PADDLE_WIDTH &&
          newY >= playerPaddle.y && 
          newY <= playerPaddle.y + PADDLE_HEIGHT &&
          prev.vx < 0) {
        const relativeIntersectY = (playerPaddle.y + PADDLE_HEIGHT / 2) - newY;
        const normalizedRelativeIntersectionY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;
        
        newSpeed = Math.min(newSpeed + SPEED_INCREMENT, MAX_BALL_SPEED);
        newVx = newSpeed * Math.cos(bounceAngle);
        newVy = newSpeed * -Math.sin(bounceAngle);
        newX = PADDLE_WIDTH + BALL_SIZE/2 + 10;
        
        setRally(r => r + 1);
        playPaddleSound();
        createParticles(PADDLE_WIDTH + 10, newY, 1, '#00ccff');
      }

      // AI 패들 충돌
      if (newX >= canvasWidth - PADDLE_WIDTH - BALL_SIZE/2 - 10 && 
          newX <= canvasWidth - PADDLE_WIDTH &&
          newY >= aiPaddle.y && 
          newY <= aiPaddle.y + PADDLE_HEIGHT &&
          prev.vx > 0) {
        const relativeIntersectY = (aiPaddle.y + PADDLE_HEIGHT / 2) - newY;
        const normalizedRelativeIntersectionY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;
        
        newSpeed = Math.min(newSpeed + SPEED_INCREMENT, MAX_BALL_SPEED);
        newVx = -newSpeed * Math.cos(bounceAngle);
        newVy = newSpeed * -Math.sin(bounceAngle);
        newX = canvasWidth - PADDLE_WIDTH - BALL_SIZE/2 - 10;
        
        setRally(r => r + 1);
        playPaddleSound();
        createParticles(canvasWidth - PADDLE_WIDTH - 10, newY, -1, '#ff6b6b');
      }

      // 골 체크
      if (newX < 0) {
        setAiPaddle(prev => ({ ...prev, score: prev.score + 1 }));
        playScoreSound();
        createParticles(0, newY, 1, '#ff0000');
        if (aiPaddle.score + 1 >= 11) {
          setGameOver(true);
          setWinner('ai');
          playGameOverSound();
          saveScore();
        } else {
          resetBall();
        }
      }
      
      if (newX > canvasWidth) {
        setPlayerPaddle(prev => ({ ...prev, score: prev.score + 1 }));
        playScoreSound();
        createParticles(canvasWidth, newY, -1, '#00ff00');
        if (playerPaddle.score + 1 >= 11) {
          setGameOver(true);
          setWinner('player');
          playGameOverSound();
          saveScore();
        } else {
          resetBall();
        }
      }

      return { x: newX, y: newY, vx: newVx, vy: newVy, speed: newSpeed };
    });

    // 패들 그리기 (3D 효과)
    // 플레이어 패들
    const playerGradient = ctx.createLinearGradient(10, playerPaddle.y, 10 + PADDLE_WIDTH, playerPaddle.y + PADDLE_HEIGHT);
    playerGradient.addColorStop(0, '#00ffff');
    playerGradient.addColorStop(0.5, '#0099ff');
    playerGradient.addColorStop(1, '#0066cc');
    ctx.fillStyle = playerGradient;
    ctx.fillRect(10, playerPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // 패들 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(12, playerPaddle.y + 2, PADDLE_WIDTH - 4, 3);
    
    // 패들 글로우
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(0, 204, 255, 0.3)';
    ctx.fillRect(10 - 5, playerPaddle.y - 5, PADDLE_WIDTH + 10, PADDLE_HEIGHT + 10);
    ctx.shadowBlur = 0;
    
    // AI 패들
    const aiGradient = ctx.createLinearGradient(canvasWidth - PADDLE_WIDTH - 10, aiPaddle.y, canvasWidth - 10, aiPaddle.y + PADDLE_HEIGHT);
    aiGradient.addColorStop(0, '#ff9999');
    aiGradient.addColorStop(0.5, '#ff6b6b');
    aiGradient.addColorStop(1, '#cc3333');
    ctx.fillStyle = aiGradient;
    ctx.fillRect(canvasWidth - PADDLE_WIDTH - 10, aiPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // AI 패들 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(canvasWidth - PADDLE_WIDTH - 8, aiPaddle.y + 2, PADDLE_WIDTH - 4, 3);
    
    // AI 패듡 글로우
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
    ctx.fillRect(canvasWidth - PADDLE_WIDTH - 15, aiPaddle.y - 5, PADDLE_WIDTH + 10, PADDLE_HEIGHT + 10);
    ctx.shadowBlur = 0;

    // 볼 그리기 (3D 효과 및 광채)
    // 볼 트레일
    const trailLength = Math.min(5, Math.floor(ball.speed / 2));
    for (let i = 0; i < trailLength; i++) {
      const alpha = (1 - i / trailLength) * 0.3;
      const trailX = ball.x - ball.vx * i * 2;
      const trailY = ball.y - ball.vy * i * 2;
      
      ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
      ctx.beginPath();
      ctx.arc(trailX, trailY, BALL_SIZE/2 * (1 - i * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 볼 광채
    const glowSize = BALL_SIZE + 10 + Math.sin(animationTime * 10) * 3;
    const glowGradient = ctx.createRadialGradient(
      ball.x, ball.y, 0,
      ball.x, ball.y, glowSize
    );
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    glowGradient.addColorStop(0.3, 'rgba(255, 255, 100, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 볼 몸체
    const ballGradient = ctx.createRadialGradient(
      ball.x - BALL_SIZE/4, ball.y - BALL_SIZE/4, 0,
      ball.x, ball.y, BALL_SIZE/2
    );
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(0.5, '#ffff99');
    ballGradient.addColorStop(1, '#ffaa00');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    
    // 볼 반사광
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(ball.x - BALL_SIZE/4, ball.y - BALL_SIZE/4, BALL_SIZE/6, 0, Math.PI * 2);
    ctx.fill();

    // 점수 표시 (네온 효과)
    ctx.font = 'bold 72px Arial';
    
    // 플레이어 점수
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3;
    ctx.strokeText(playerPaddle.score.toString(), canvasWidth / 4 - 30, 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(playerPaddle.score.toString(), canvasWidth / 4 - 30, 80);
    
    // AI 점수
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.strokeText(aiPaddle.score.toString(), canvasWidth * 3 / 4 - 30, 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(aiPaddle.score.toString(), canvasWidth * 3 / 4 - 30, 80);

    // 랠리 표시 (애니메이션)
    if (rally > 3) {
      const rallyPulse = Math.sin(animationTime * 5) * 0.5 + 0.5;
      ctx.font = `bold ${24 + rallyPulse * 4}px Arial`;
      ctx.fillStyle = `rgba(255, 255, 0, ${0.7 + rallyPulse * 0.3})`;
      ctx.textAlign = 'center';
      ctx.fillText(`🔥 Rally: ${rally} 🔥`, canvasWidth / 2, 120);
      ctx.textAlign = 'left';
    }
    
    // 속도 게이지
    const speedRatio = (ball.speed - INITIAL_BALL_SPEED) / (MAX_BALL_SPEED - INITIAL_BALL_SPEED);
    const gaugeWidth = 200;
    const gaugeX = canvasWidth / 2 - gaugeWidth / 2;
    const gaugeY = canvasHeight - 30;
    
    // 게이지 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(gaugeX - 2, gaugeY - 2, gaugeWidth + 4, 14);
    
    // 게이지 채우기
    const gaugeGradient = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeWidth, 0);
    gaugeGradient.addColorStop(0, '#00ff00');
    gaugeGradient.addColorStop(0.5, '#ffff00');
    gaugeGradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = gaugeGradient;
    ctx.fillRect(gaugeX, gaugeY, gaugeWidth * speedRatio, 10);
    
    // 게이지 테두리
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX - 2, gaugeY - 2, gaugeWidth + 4, 14);
    
    // 속도 텍스트
    ctx.font = '12px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Speed: ${ball.speed.toFixed(1)}`, gaugeX, gaugeY - 7);

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver, isPaused, ball, playerPaddle, aiPaddle, particles, animationTime, updateAI]);

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && playerPaddle.score > 0) {
        await api.post('/games/pong/score', {
          score: playerPaddle.score,
          difficulty,
          winner: winner === 'player',
          rally
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

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'w', 's', 'ㅈ', 'ㄴ'].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
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
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver]);

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/pong/highscore');
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
      const response = await api.get('/games/pong/leaderboard?period=all');
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
            <span className="text-sm">{playerPaddle.score} - {aiPaddle.score}</span>
            <span className="text-sm">{difficulty === 'easy' ? '쉬움' : difficulty === 'normal' ? '보통' : '어려움'}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            {/* 난이도 선택 (게임 시작 전에만 표시) */}
            {!gameStarted && (
              <div className="flex gap-2 mb-2">
                {(['easy', 'normal', 'hard'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      difficulty === level
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {level === 'easy' ? '쉬움' : level === 'normal' ? '보통' : '어려움'}
                  </button>
                ))}
              </div>
            )}
            
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="game-canvas border-2 border-cyan-600 bg-gray-900 rounded"
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const rect = e.currentTarget.getBoundingClientRect();
                const y = touch.clientY - rect.top;
                // 터치 위치로 패들 이동
                setPlayerPaddle(prev => ({ 
                  ...prev, 
                  y: Math.max(0, Math.min(canvasHeight - PADDLE_HEIGHT, y - PADDLE_HEIGHT / 2))
                }));
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseMove={(e) => {
                if (!isMobile) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                setPlayerPaddle(prev => ({ 
                  ...prev, 
                  y: Math.max(0, Math.min(canvasHeight - PADDLE_HEIGHT, y - PADDLE_HEIGHT / 2))
                }));
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
                <h2 className="text-lg font-bold mb-2">
                  {winner === 'player' ? (
                    <span className="text-green-400">승리! 🎉</span>
                  ) : (
                    <span className="text-red-400">패배 😔</span>
                  )}
                </h2>
                <p className="text-sm text-gray-400 mb-2">최고 랴리: {rally}</p>
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
          gameType="pong"
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
            className="p-2 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
            disabled={!gameStarted || gameOver}
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
            onClick={startGame}
            className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <RotateCw className="w-5 h-5" />
            {gameStarted ? '다시 시작' : '게임 시작'}
          </button>
        </div>

        {/* 난이도 선택 */}
        <div className="mb-4 flex gap-2">
          {(['easy', 'normal', 'hard'] as const).map(level => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-4 py-2 rounded-lg transition-all ${
                difficulty === level
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {level === 'easy' ? '쉬움' : level === 'normal' ? '보통' : '어려움'}
            </button>
          ))}
        </div>

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="game-canvas border-2 border-cyan-600 bg-gray-900 rounded-lg shadow-2xl"
        />

        {gameOver && (
          <div className="mt-4 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg text-center shadow-xl">
            <h2 className="text-3xl font-bold mb-2">
              {winner === 'player' ? (
                <span className="text-green-400">승리! 🎉</span>
              ) : (
                <span className="text-red-400">패배 😔</span>
              )}
            </h2>
            <p className="text-xl text-gray-300">
              {playerPaddle.score} - {aiPaddle.score}
            </p>
            <p className="text-lg text-gray-400 mt-2">최고 랠리: {rally}</p>
          </div>
        )}

        {isPaused && !gameOver && (
          <div className="mt-4 text-yellow-400 text-xl animate-pulse">일시정지</div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">점수</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">플레이어</p>
              <p className="text-2xl font-mono text-white">{playerPaddle.score}</p>
            </div>
            <div className="text-gray-500">VS</div>
            <div>
              <p className="text-sm text-gray-400">AI</p>
              <p className="text-2xl font-mono text-white">{aiPaddle.score}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">최고 점수</h3>
          <p className="text-xl font-mono text-orange-400">{highScore}</p>
        </div>

        {!isMobile && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-sm shadow-lg">
            <h3 className="text-lg font-bold mb-2 text-cyan-400">조작법</h3>
            <div className="space-y-1 text-gray-300">
              <p>↑↓ / WS : 패들 이동</p>
              <p>P : 일시정지</p>
              <p>R : 재시작</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-sm shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">팁</h3>
          <div className="space-y-1 text-gray-300">
            <p>🏆 매 랠리마다 속도 증가</p>
            <p>🎯 첫 타격 각도가 중요!</p>
            <p>⚡ 7점 먼저 획득시 승리</p>
            <p className="text-yellow-400 mt-2">🔥 속도가 빨라질수록 어려워져요!</p>
          </div>
        </div>

        {showLeaderboard && (
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              큡 게임 랭킹
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