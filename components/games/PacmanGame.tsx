'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, RotateCw, Trophy, Heart, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

// 게임 상수
const CELL_SIZE = 20;
const MOBILE_CELL_SIZE = 16;
const BOARD_WIDTH = 19;
const BOARD_HEIGHT = 21;
const PACMAN_SPEED = 200; // ms per move
const GHOST_SPEED = 250;
const POWER_PELLET_DURATION = 8000; // 8 seconds
const GHOST_FRIGHTENED_SPEED = 400;
const ANIMATION_SPEED = 100; // ms for mouth animation

// 방향 상수
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// 미로 레이아웃 (1: 벽, 0: 빈공간, 2: 점, 3: 파워펠릿, 4: 고스트 집)
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,4,4,4,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,4,4,4,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// 고스트 설정
interface Ghost {
  x: number;
  y: number;
  color: string;
  name: string;
  mode: 'scatter' | 'chase' | 'frightened' | 'eaten';
  direction: typeof DIRECTIONS[keyof typeof DIRECTIONS];
  targetX?: number;
  targetY?: number;
  previousX: number;
  previousY: number;
}

interface Position {
  x: number;
  y: number;
}

export default function PacmanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const lastGhostMoveTimeRef = useRef<number>(0);
  const directionQueueRef = useRef<typeof DIRECTIONS[keyof typeof DIRECTIONS] | null>(null);
  
  // 상태
  const [isMobile, setIsMobile] = useState(false);
  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highScore, setHighScore] = useState(0);
  
  // 팩맨 상태
  const [pacman, setPacman] = useState<Position & { direction: typeof DIRECTIONS[keyof typeof DIRECTIONS], mouthOpen: boolean }>({
    x: 9,
    y: 15,
    direction: DIRECTIONS.RIGHT,
    mouthOpen: true
  });
  
  // 고스트 상태
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { x: 9, y: 9, color: '#FF0000', name: 'Blinky', mode: 'scatter', direction: DIRECTIONS.UP, previousX: 9, previousY: 9 },
    { x: 8, y: 9, color: '#FFB8FF', name: 'Pinky', mode: 'scatter', direction: DIRECTIONS.DOWN, previousX: 8, previousY: 9 },
    { x: 10, y: 9, color: '#00FFFF', name: 'Inky', mode: 'scatter', direction: DIRECTIONS.UP, previousX: 10, previousY: 9 },
    { x: 9, y: 10, color: '#FFB852', name: 'Clyde', mode: 'scatter', direction: DIRECTIONS.DOWN, previousX: 9, previousY: 10 }
  ]);
  
  // 게임 보드 상태 (점과 파워펠릿 추적)
  const [board, setBoard] = useState<number[][]>(() => MAZE.map(row => [...row]));
  const [totalDots, setTotalDots] = useState(0);
  const [dotsEaten, setDotsEaten] = useState(0);
  const [powerPelletActive, setPowerPelletActive] = useState(false);
  const [powerPelletTimer, setPowerPelletTimer] = useState<NodeJS.Timeout | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // 모바일 감지
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
        
        // 19:21 비율에 맞게 셀 크기 계산
        const cellByHeight = Math.floor(availableHeight / BOARD_HEIGHT);
        const cellByWidth = Math.floor(availableWidth / BOARD_WIDTH);
        const optimalCellSize = Math.min(cellByHeight, cellByWidth, 18); // 최대 18px
        
        setCellSize(Math.max(optimalCellSize, 12)); // 최소 12px
      } else {
        setCellSize(CELL_SIZE);
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
      
      const playSound = (frequencies: number[], durations: number[]) => {
        if (!soundEnabled) return;
        
        let time = 0;
        frequencies.forEach((freq, i) => {
          setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durations[i]);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + durations[i]);
          }, time);
          time += durations[i] * 1000;
        });
      };

      (window as any).pacmanSounds = {
        chomp: () => playSound([400, 300], [0.05, 0.05]),
        eatGhost: () => playSound([200, 400, 600, 800], [0.1, 0.1, 0.1, 0.2]),
        death: () => playSound([400, 350, 300, 250, 200], [0.2, 0.2, 0.2, 0.2, 0.3]),
        powerPellet: () => playSound([100, 200, 100, 200], [0.1, 0.1, 0.1, 0.1]),
        levelComplete: () => playSound([400, 500, 600, 700, 800], [0.1, 0.1, 0.1, 0.1, 0.2])
      };
    }
  }, [soundEnabled]);

  // 게임 초기화
  const initializeGame = useCallback(() => {
    const newBoard = MAZE.map(row => [...row]);
    let dots = 0;
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (newBoard[y][x] === 2 || newBoard[y][x] === 3) {
          dots++;
        }
      }
    }
    setBoard(newBoard);
    setTotalDots(dots);
    setDotsEaten(0);
    setPacman({ x: 9, y: 15, direction: DIRECTIONS.RIGHT, mouthOpen: true });
    setGhosts([
      { x: 9, y: 9, color: '#FF0000', name: 'Blinky', mode: 'scatter', direction: DIRECTIONS.UP, previousX: 9, previousY: 9 },
      { x: 8, y: 9, color: '#FFB8FF', name: 'Pinky', mode: 'scatter', direction: DIRECTIONS.DOWN, previousX: 8, previousY: 9 },
      { x: 10, y: 9, color: '#00FFFF', name: 'Inky', mode: 'scatter', direction: DIRECTIONS.UP, previousX: 10, previousY: 9 },
      { x: 9, y: 10, color: '#FFB852', name: 'Clyde', mode: 'scatter', direction: DIRECTIONS.DOWN, previousX: 9, previousY: 10 }
    ]);
  }, []);

  // 게임 시작
  const startGame = useCallback(() => {
    initializeGame();
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setPowerPelletActive(false);
    directionQueueRef.current = null;
  }, [initializeGame]);

  // 충돌 체크
  const canMove = (x: number, y: number): boolean => {
    // 터널 체크
    if (x < 0 || x >= BOARD_WIDTH) return true;
    if (y < 0 || y >= BOARD_HEIGHT) return false;
    return board[y][x] !== 1;
  };

  // 팩맨 이동
  const movePacman = useCallback((direction: typeof DIRECTIONS[keyof typeof DIRECTIONS]) => {
    if (!gameStarted || gameOver || isPaused) return;

    setPacman(prev => {
      let newX = prev.x + direction.x;
      let newY = prev.y + direction.y;
      
      // 터널 처리
      if (newX < 0) newX = BOARD_WIDTH - 1;
      if (newX >= BOARD_WIDTH) newX = 0;
      
      if (canMove(newX, newY)) {
        // 점 먹기
        setBoard(currentBoard => {
          const newBoard = [...currentBoard];
          if (newBoard[newY][newX] === 2) {
            newBoard[newY][newX] = 0;
            setDotsEaten(d => d + 1);
            setScore(s => s + 10);
            if (soundEnabled && (window as any).pacmanSounds) {
              (window as any).pacmanSounds.chomp();
            }
          } else if (newBoard[newY][newX] === 3) {
            // 파워 펠릿
            newBoard[newY][newX] = 0;
            setDotsEaten(d => d + 1);
            setScore(s => s + 50);
            activatePowerPellet();
          }
          return newBoard;
        });
        
        return { ...prev, x: newX, y: newY, direction, mouthOpen: !prev.mouthOpen };
      }
      return { ...prev, direction, mouthOpen: !prev.mouthOpen };
    });
  }, [gameStarted, gameOver, isPaused, soundEnabled, board]);

  // 파워 펠릿 활성화
  const activatePowerPellet = useCallback(() => {
    setPowerPelletActive(true);
    if (soundEnabled && (window as any).pacmanSounds) {
      (window as any).pacmanSounds.powerPellet();
    }
    
    // 고스트를 frightened 모드로
    setGhosts(prev => prev.map(ghost => ({
      ...ghost,
      mode: ghost.mode !== 'eaten' ? 'frightened' : 'eaten',
      direction: { x: -ghost.direction.x, y: -ghost.direction.y }
    })));
    
    // 타이머 설정
    if (powerPelletTimer) clearTimeout(powerPelletTimer);
    const timer = setTimeout(() => {
      setPowerPelletActive(false);
      setGhosts(prev => prev.map(ghost => ({
        ...ghost,
        mode: ghost.mode === 'frightened' ? 'scatter' : ghost.mode
      })));
    }, POWER_PELLET_DURATION);
    setPowerPelletTimer(timer);
  }, [soundEnabled, powerPelletTimer]);

  // 고스트 AI
  const moveGhosts = useCallback(() => {
    if (!gameStarted || gameOver || isPaused) return;

    setGhosts(prevGhosts => {
      return prevGhosts.map((ghost, index) => {
        const newGhost = { ...ghost, previousX: ghost.x, previousY: ghost.y };
        
        // 가능한 방향 찾기
        const possibleDirections = [];
        for (const [key, dir] of Object.entries(DIRECTIONS)) {
          const newX = ghost.x + dir.x;
          const newY = ghost.y + dir.y;
          
          // 뒤로 가는 것 방지 (frightened 모드가 아닐 때)
          if (ghost.mode !== 'frightened' && 
              dir.x === -ghost.direction.x && 
              dir.y === -ghost.direction.y) {
            continue;
          }
          
          if (canMove(newX, newY)) {
            possibleDirections.push(dir);
          }
        }
        
        // 방향 선택
        let chosenDirection = ghost.direction;
        if (possibleDirections.length > 0) {
          if (ghost.mode === 'frightened') {
            // 무작위 방향
            chosenDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
          } else if (ghost.mode === 'chase') {
            // 팩맨 추적
            let minDistance = Infinity;
            for (const dir of possibleDirections) {
              const newX = ghost.x + dir.x;
              const newY = ghost.y + dir.y;
              const distance = Math.abs(newX - pacman.x) + Math.abs(newY - pacman.y);
              if (distance < minDistance) {
                minDistance = distance;
                chosenDirection = dir;
              }
            }
          } else {
            // Scatter 모드 - 코너로 이동
            const corners = [
              { x: 1, y: 1 },
              { x: BOARD_WIDTH - 2, y: 1 },
              { x: 1, y: BOARD_HEIGHT - 2 },
              { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 }
            ];
            const target = corners[index % 4];
            
            let minDistance = Infinity;
            for (const dir of possibleDirections) {
              const newX = ghost.x + dir.x;
              const newY = ghost.y + dir.y;
              const distance = Math.abs(newX - target.x) + Math.abs(newY - target.y);
              if (distance < minDistance) {
                minDistance = distance;
                chosenDirection = dir;
              }
            }
          }
        }
        
        // 이동
        newGhost.x = ghost.x + chosenDirection.x;
        newGhost.y = ghost.y + chosenDirection.y;
        
        // 터널 처리
        if (newGhost.x < 0) newGhost.x = BOARD_WIDTH - 1;
        if (newGhost.x >= BOARD_WIDTH) newGhost.x = 0;
        
        newGhost.direction = chosenDirection;
        
        // 모드 전환 (일정 시간마다)
        if (ghost.mode === 'scatter' && Math.random() < 0.01) {
          newGhost.mode = 'chase';
        } else if (ghost.mode === 'chase' && Math.random() < 0.01) {
          newGhost.mode = 'scatter';
        }
        
        return newGhost;
      });
    });
  }, [gameStarted, gameOver, isPaused, pacman]);

  // 충돌 감지
  const checkCollisions = useCallback(() => {
    for (const ghost of ghosts) {
      if (ghost.x === pacman.x && ghost.y === pacman.y) {
        if (ghost.mode === 'frightened') {
          // 고스트 먹기
          setScore(s => s + 200);
          setGhosts(prev => prev.map(g => 
            g === ghost ? { ...g, mode: 'eaten', x: 9, y: 9 } : g
          ));
          if (soundEnabled && (window as any).pacmanSounds) {
            (window as any).pacmanSounds.eatGhost();
          }
        } else if (ghost.mode !== 'eaten') {
          // 팩맨 죽음
          setLives(l => l - 1);
          if (soundEnabled && (window as any).pacmanSounds) {
            (window as any).pacmanSounds.death();
          }
          
          if (lives <= 1) {
            setGameOver(true);
            saveScore();
          } else {
            // 리스폰
            setPacman({ x: 9, y: 15, direction: DIRECTIONS.RIGHT, mouthOpen: true });
            setGhosts([
              { x: 9, y: 9, color: '#FF0000', name: 'Blinky', mode: 'scatter', direction: DIRECTIONS.UP, previousX: 9, previousY: 9 },
              { x: 8, y: 9, color: '#FFB8FF', name: 'Pinky', mode: 'scatter', direction: DIRECTIONS.DOWN, previousX: 8, previousY: 9 },
              { x: 10, y: 9, color: '#00FFFF', name: 'Inky', mode: 'scatter', direction: DIRECTIONS.UP, previousX: 10, previousY: 9 },
              { x: 9, y: 10, color: '#FFB852', name: 'Clyde', mode: 'scatter', direction: DIRECTIONS.DOWN, previousX: 9, previousY: 10 }
            ]);
          }
        }
      }
    }
  }, [ghosts, pacman, lives, soundEnabled]);

  // 레벨 완료 체크
  useEffect(() => {
    if (dotsEaten === totalDots && totalDots > 0) {
      if (soundEnabled && (window as any).pacmanSounds) {
        (window as any).pacmanSounds.levelComplete();
      }
      setLevel(l => l + 1);
      initializeGame();
    }
  }, [dotsEaten, totalDots, soundEnabled, initializeGame]);

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && score > 0) {
        await api.post('/games/pacman/score', {
          score,
          level,
          dotsEaten
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // 에러 무시
    }
  };

  // 렌더링
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 배경
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 미로 그리기
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y][x];
        const pixelX = x * cellSize;
        const pixelY = y * cellSize;
        
        if (cell === 1) {
          // 벽
          ctx.fillStyle = '#0033FF';
          ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
          
          // 벽 테두리 효과
          ctx.strokeStyle = '#0066FF';
          ctx.lineWidth = 1;
          ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
        } else if (cell === 2) {
          // 점
          ctx.fillStyle = '#FFFF00';
          ctx.beginPath();
          ctx.arc(pixelX + cellSize/2, pixelY + cellSize/2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          // 파워 펠릿 (깜빡임 효과)
          const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
          ctx.beginPath();
          ctx.arc(pixelX + cellSize/2, pixelY + cellSize/2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 4) {
          // 고스트 집
          ctx.fillStyle = '#FF00FF';
          ctx.fillRect(pixelX + cellSize/4, pixelY + cellSize/4, cellSize/2, cellSize/2);
        }
      }
    }
    
    // 고스트 그리기
    ghosts.forEach(ghost => {
      const pixelX = ghost.x * cellSize + cellSize/2;
      const pixelY = ghost.y * cellSize + cellSize/2;
      
      ctx.save();
      
      if (ghost.mode === 'frightened') {
        // 깜빡임 효과
        const timeLeft = powerPelletActive ? 1 : 0;
        ctx.fillStyle = timeLeft < 0.3 && Math.floor(Date.now() / 100) % 2 ? '#FFFFFF' : '#0000FF';
      } else if (ghost.mode === 'eaten') {
        ctx.fillStyle = '#CCCCCC';
      } else {
        ctx.fillStyle = ghost.color;
      }
      
      // 고스트 몸체
      ctx.beginPath();
      ctx.arc(pixelX, pixelY - cellSize/4, cellSize/2 - 1, Math.PI, 0);
      ctx.lineTo(pixelX + cellSize/2 - 1, pixelY + cellSize/4);
      
      // 물결 모양 하단
      for (let i = 0; i < 3; i++) {
        const waveX = pixelX + cellSize/2 - 1 - (i+1) * cellSize/3;
        const waveY = pixelY + cellSize/4 + Math.sin(Date.now() / 200 + i) * 2;
        ctx.lineTo(waveX, waveY);
      }
      
      ctx.closePath();
      ctx.fill();
      
      // 눈
      if (ghost.mode !== 'eaten') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pixelX - cellSize/5, pixelY - cellSize/4, 3, 0, Math.PI * 2);
        ctx.arc(pixelX + cellSize/5, pixelY - cellSize/4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pixelX - cellSize/5, pixelY - cellSize/4, 1.5, 0, Math.PI * 2);
        ctx.arc(pixelX + cellSize/5, pixelY - cellSize/4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
    
    // 팩맨 그리기
    const pacmanX = pacman.x * cellSize + cellSize/2;
    const pacmanY = pacman.y * cellSize + cellSize/2;
    
    ctx.save();
    ctx.translate(pacmanX, pacmanY);
    
    // 방향에 따른 회전
    let rotation = 0;
    if (pacman.direction === DIRECTIONS.RIGHT) rotation = 0;
    else if (pacman.direction === DIRECTIONS.DOWN) rotation = Math.PI / 2;
    else if (pacman.direction === DIRECTIONS.LEFT) rotation = Math.PI;
    else if (pacman.direction === DIRECTIONS.UP) rotation = -Math.PI / 2;
    
    ctx.rotate(rotation);
    
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    
    if (pacman.mouthOpen) {
      // 입 벌린 팩맨
      ctx.arc(0, 0, cellSize/2 - 1, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.lineTo(0, 0);
    } else {
      // 입 닫은 팩맨
      ctx.arc(0, 0, cellSize/2 - 1, 0, 2 * Math.PI);
    }
    
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    // UI 오버레이
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${cellSize * 2}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
      
      ctx.font = `${cellSize}px Arial`;
      ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + cellSize * 2);
    } else if (isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#FFFF00';
      ctx.font = `bold ${cellSize * 2}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
  }, [board, ghosts, pacman, cellSize, gameOver, isPaused, score, powerPelletActive]);

  // 게임 루프
  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;
    
    const gameLoop = (timestamp: number) => {
      // 팩맨 이동
      if (timestamp - lastMoveTimeRef.current > PACMAN_SPEED) {
        if (directionQueueRef.current) {
          movePacman(directionQueueRef.current);
        }
        lastMoveTimeRef.current = timestamp;
      }
      
      // 고스트 이동
      const ghostSpeed = powerPelletActive ? GHOST_FRIGHTENED_SPEED : GHOST_SPEED;
      if (timestamp - lastGhostMoveTimeRef.current > ghostSpeed) {
        moveGhosts();
        lastGhostMoveTimeRef.current = timestamp;
      }
      
      // 충돌 체크
      checkCollisions();
      
      // 렌더링
      render();
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, movePacman, moveGhosts, checkCollisions, render]);

  // 키보드 입력
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case 'ArrowUp':
          directionQueueRef.current = DIRECTIONS.UP;
          break;
        case 'ArrowDown':
          directionQueueRef.current = DIRECTIONS.DOWN;
          break;
        case 'ArrowLeft':
          directionQueueRef.current = DIRECTIONS.LEFT;
          break;
        case 'ArrowRight':
          directionQueueRef.current = DIRECTIONS.RIGHT;
          break;
        case 'p':
        case 'P':
          setIsPaused(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver]);

  // 모바일 컨트롤
  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!gameStarted || gameOver || isPaused) return;
    
    switch (direction) {
      case 'up':
        directionQueueRef.current = DIRECTIONS.UP;
        break;
      case 'down':
        directionQueueRef.current = DIRECTIONS.DOWN;
        break;
      case 'left':
        directionQueueRef.current = DIRECTIONS.LEFT;
        break;
      case 'right':
        directionQueueRef.current = DIRECTIONS.RIGHT;
        break;
    }
  }, [gameStarted, gameOver, isPaused]);

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
            <span className="text-sm">{score}</span>
            <span className="text-sm">{Array(lives).fill('❤️').join('')}</span>
            <span className="text-sm">L{level}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            {/* 게임 캔버스 */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={BOARD_WIDTH * cellSize}
                height={BOARD_HEIGHT * cellSize}
                className="game-canvas border-2 border-blue-500 rounded"
              />
              
              {/* 파워 펄릿 인디케이터 */}
              {powerPelletActive && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded animate-pulse">
                  POWER!
                </div>
              )}
            </div>
            
            {/* 게임 시작 버튼 */}
            {!gameStarted && (
              <button
                onClick={startGame}
                className="mt-2 px-6 py-2 bg-yellow-500 text-black font-bold rounded"
              >
                START GAME
              </button>
            )}
            
            {/* 게임 오버 메시지 */}
            {gameOver && (
              <div className="mt-2 p-4 bg-gray-800 rounded-lg text-center">
                <h2 className="text-lg font-bold mb-2 text-yellow-400">GAME OVER</h2>
                <p className="text-sm mb-1">최종 점수: {score}</p>
                <p className="text-sm mb-2 text-gray-400">도달 레벨: {level}</p>
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-yellow-500 text-black rounded text-sm"
                >
                  RESTART
                </button>
              </div>
            )}
            
            {/* 일시정지 메시지 */}
            {isPaused && !gameOver && gameStarted && (
              <div className="mt-2 text-yellow-400 animate-pulse">PAUSED</div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 */}
        <MobileGameControls
          onMove={handleMobileMove}
          gameType="pacman"
        />
      </div>
    );
  }

  // 데스크탑 레이아웃 (기존 그대로)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      {/* 게임 헤더 */}
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">PAC-MAN</h1>
        <div className="flex items-center justify-center gap-6 text-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">SCORE:</span>
            <span className="font-mono">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">LIVES:</span>
            <span>{Array(lives).fill('❤️').join('')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">LEVEL:</span>
            <span>{level}</span>
          </div>
        </div>
      </div>

      {/* 게임 컨트롤 */}
      <div className="mb-4 flex gap-2">
        {!gameStarted ? (
          <button
            onClick={startGame}
            className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 transition-colors"
          >
            START GAME
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={startGame}
              className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* 게임 캔버스 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={BOARD_WIDTH * cellSize}
          height={BOARD_HEIGHT * cellSize}
          className="game-canvas border-2 border-blue-500 rounded shadow-lg shadow-blue-500/50"
        />
        
        {/* 파워 펠릿 인디케이터 */}
        {powerPelletActive && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-blue-500 text-white rounded animate-pulse">
            POWER MODE!
          </div>
        )}
      </div>

      {/* 조작법 - 모바일에서는 숨김 */}
      {!isMobile && (
        <div className="mt-4 text-center text-sm text-gray-400">
          <p>Use ARROW KEYS to move • P to pause</p>
        </div>
      )}

    </div>
  );
}