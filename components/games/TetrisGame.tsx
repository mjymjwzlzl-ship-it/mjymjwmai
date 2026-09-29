'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, Pause, Play, RotateCw, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const COLS = 10;
const ROWS = 20;

// 블럭 모양
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

// 블럭 색상 및 그라데이션
const COLORS = {
  I: 'linear-gradient(135deg, #00f0f0, #00d4d4, #00a8a8)', // cyan
  O: 'linear-gradient(135deg, #f0f000, #d4d400, #a8a800)', // yellow
  T: 'linear-gradient(135deg, #a000f0, #8800d4, #7000a8)', // purple
  S: 'linear-gradient(135deg, #00f000, #00d400, #00a800)', // green
  Z: 'linear-gradient(135deg, #f00000, #d40000, #a80000)', // red
  J: 'linear-gradient(135deg, #0000f0, #0000d4, #0000a8)', // blue
  L: 'linear-gradient(135deg, #f0a000, #d48800, #a87000)', // orange
};

const randomShape = () => {
  const keys = Object.keys(SHAPES) as (keyof typeof SHAPES)[];
  const key = keys[(keys.length * Math.random()) | 0];
  return { 
    shape: SHAPES[key],
    color: COLORS[key],
    type: key
  };
};

// 회전 (제자리 회전)
function rotate(matrix: number[][]): number[][] {
  const N = matrix.length;
  const M = matrix[0]?.length || 0;
  const result = Array.from({ length: M }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < M; x++) {
      result[x][N - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

export default function TetrisGame() {
  const [board, setBoard] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState(randomShape());
  const [nextPiece, setNextPiece] = useState(randomShape());
  const [x, setX] = useState(3);
  const [y, setY] = useState(0);
  const [score, setScore] = useState(0);
  const [clearedLines, setClearedLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [cellSize, setCellSize] = useState(24);

  // 모바일 감지 및 화면 크기 조정
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
      
      if (mobile) {
        // 모바일에서 화면에 맞게 최적화
        // 컨트롤러 높이(170px) + 상단 바(50px) + 여유공간(30px) = 250px 제외
        const availableHeight = Math.max(height - 250, 200); // 최소 높이 보장
        const availableWidth = Math.max(width - 60, 200); // 좌우 여백 30px씩, 최소 너비 보장
        
        // 세로와 가로 중 더 제한적인 것 기준으로 계산
        const cellByHeight = Math.floor(availableHeight / ROWS);
        const cellByWidth = Math.floor(availableWidth / COLS);
        const optimalCellSize = Math.min(cellByHeight, cellByWidth, 16); // 최대 16px로 제한
        
        setCellSize(Math.max(optimalCellSize, 10)); // 최소 10px 보장
      } else {
        setCellSize(24);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 사운드 초기화
  useEffect(() => {
    // 간단한 웹 오디오 API 사운드 생성
    if (typeof window !== 'undefined') {
      // 사운드 효과를 위한 Audio Context
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

      // 사운드 함수들을 window 객체에 추가
      (window as any).tetrisSounds = {
        move: () => playSound(200, 0.05),
        rotate: () => playSound(400, 0.1),
        clear: () => playSound(800, 0.2),
        drop: () => playSound(150, 0.1),
        gameOver: () => {
          playSound(200, 0.5);
          setTimeout(() => playSound(150, 0.5), 200);
        }
      };
    }
  }, [soundEnabled]);

  const playMoveSound = () => {
    if (soundEnabled && (window as any).tetrisSounds) {
      (window as any).tetrisSounds.move();
    }
  };

  const playRotateSound = () => {
    if (soundEnabled && (window as any).tetrisSounds) {
      (window as any).tetrisSounds.rotate();
    }
  };

  const playClearSound = () => {
    if (soundEnabled && (window as any).tetrisSounds) {
      (window as any).tetrisSounds.clear();
    }
  };

  const playDropSound = () => {
    if (soundEnabled && (window as any).tetrisSounds) {
      (window as any).tetrisSounds.drop();
    }
  };

  const playGameOverSound = () => {
    if (soundEnabled && (window as any).tetrisSounds) {
      (window as any).tetrisSounds.gameOver();
    }
  };

  const checkCollision = (shape: number[][], offsetX: number, offsetY: number) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = col + offsetX;
          const newY = row + offsetY;
          
          // 벽 충돌 체크를 가장 먼저
          if (newX < 0 || newX >= COLS) {
            return true; // 좌우 벽 충돌
          }
          
          if (newY < 0 || newY >= ROWS) {
            return true; // 상하 벽 충돌
          }
          
          // 보드 충돌 체크
          if (board[newY] && board[newY][newX]) {
            return true; // 다른 블록과 충돌
          }
        }
      }
    }
    return false;
  };

  const mergePiece = useCallback(() => {
    const newBoard = board.map((row) => [...row]);
    currentPiece.shape.forEach((row, dy) => {
      row.forEach((value, dx) => {
        if (value) {
          const boardY = y + dy;
          const boardX = x + dx;
          // 경계 체크를 더 엄격하게
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = currentPiece.color;
          }
        }
      });
    });
    return newBoard;
  }, [board, currentPiece, x, y]);

  const clearLines = useCallback(
    (newBoard: any[][]) => {
      let lines = 0;
      for (let row = ROWS - 1; row >= 0; row--) {
        if (newBoard[row].every((cell: any) => cell !== null)) {
          newBoard.splice(row, 1);
          newBoard.unshift(Array(COLS).fill(null));
          lines++;
          row++;
        }
      }
      if (lines > 0) {
        playClearSound();
        const points = [0, 100, 300, 500, 800][lines] * level;
        setScore((s) => s + points);
        setClearedLines((c) => {
          const newTotal = c + lines;
          // 10줄마다 레벨업
          if (Math.floor(newTotal / 10) > Math.floor(c / 10)) {
            setLevel((lvl) => lvl + 1);
          }
          return newTotal;
        });
      }
      return newBoard;
    },
    [level]
  );

  const newPiece = useCallback(() => {
    const piece = nextPiece;
    setCurrentPiece(piece);
    setNextPiece(randomShape());
    setX(Math.floor((COLS - piece.shape[0].length) / 2));
    setY(0);
    
    // 게임 오버 체크
    if (checkCollision(piece.shape, Math.floor((COLS - piece.shape[0].length) / 2), 0)) {
      setGameOver(true);
      playGameOverSound();
    }
  }, [nextPiece]);

  const moveDown = useCallback(() => {
    if (gameOver || isPaused) return;
    
    if (!checkCollision(currentPiece.shape, x, y + 1)) {
      setY(prev => prev + 1);
      setScore(prev => prev + 1); // 소프트 드롭 점수
    } else {
      // 바닥이나 다른 블록에 닿았을 때
      playDropSound();
      const newBoard = mergePiece();
      const clearedBoard = clearLines(newBoard);
      setBoard(clearedBoard);
      newPiece();
    }
  }, [checkCollision, currentPiece, x, y, mergePiece, clearLines, newPiece, gameOver, isPaused]);

  const moveLeft = useCallback(() => {
    if (gameOver || isPaused) return;
    const newX = x - 1;
    // 추가 보호: x 좌표가 음수가 되지 않도록
    if (newX >= 0 && !checkCollision(currentPiece.shape, newX, y)) {
      setX(newX);
      playMoveSound();
    }
  }, [gameOver, isPaused, checkCollision, currentPiece.shape, x, y]);

  const moveRight = useCallback(() => {
    if (gameOver || isPaused) return;
    const newX = x + 1;
    // 추가 보호: x 좌표가 보드 너비를 초과하지 않도록
    const pieceWidth = currentPiece.shape[0].length;
    if (newX + pieceWidth <= COLS && !checkCollision(currentPiece.shape, newX, y)) {
      setX(newX);
      playMoveSound();
    }
  }, [gameOver, isPaused, checkCollision, currentPiece.shape, x, y]);

  const handleRotate = useCallback(() => {
    if (gameOver || isPaused) return;
    const rotated = rotate(currentPiece.shape);
    if (!checkCollision(rotated, x, y)) {
      setCurrentPiece({ ...currentPiece, shape: rotated });
      playRotateSound();
    }
  }, [gameOver, isPaused, currentPiece, checkCollision, x, y]);

  const hardDrop = useCallback(() => {
    if (gameOver || isPaused) return;
    
    // 현재 위치에서 아래로 떨어뜨릴 수 있는 최대 거리 찾기
    let dropY = y;
    while (dropY < ROWS && !checkCollision(currentPiece.shape, x, dropY + 1)) {
      dropY++;
    }
    
    // 보드에 병합
    const newBoard = board.map(row => [...row]);
    currentPiece.shape.forEach((row, dy) => {
      row.forEach((value, dx) => {
        if (value) {
          const boardY = dropY + dy;
          const boardX = x + dx;
          // 경계 체크
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = currentPiece.color;
          }
        }
      });
    });
    
    playDropSound();
    
    // 점수 추가 (하드드롭 보너스)
    const dropDistance = dropY - y;
    setScore(prev => prev + dropDistance * 2);
    
    // 라인 클리어 체크
    const clearedBoard = clearLines(newBoard);
    setBoard(clearedBoard);
    
    // 새 피스 생성
    newPiece();
  }, [gameOver, isPaused, y, x, checkCollision, currentPiece, board, clearLines, newPiece]);

  // 모바일 컨트롤 핸들러
  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    switch (direction) {
      case 'left':
        moveLeft();
        break;
      case 'right':
        moveRight();
        break;
      case 'down':
        moveDown();
        break;
      case 'up':
        handleRotate();
        break;
    }
  }, [moveLeft, moveRight, moveDown, handleRotate]);

  const handleMobileAction = useCallback((action: string) => {
    switch (action) {
      case 'rotate':
        handleRotate();
        break;
      case 'drop':
        hardDrop();
        break;
    }
  }, [handleRotate, hardDrop]);

  const resetGame = useCallback(() => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setCurrentPiece(randomShape());
    setNextPiece(randomShape());
    setX(3);
    setY(0);
    setScore(0);
    setClearedLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(false);
  }, []);

  // 자동 낙하
  useEffect(() => {
    const speed = Math.max(100, 1000 - (level - 1) * 100);
    const interval = setInterval(moveDown, speed);
    return () => clearInterval(interval);
  }, [moveDown, level]);

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 모든 화살표 키와 스페이스바에서 기본 동작(스크롤) 방지
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      
      if (e.key === "ArrowLeft") moveLeft();
      if (e.key === "ArrowRight") moveRight();
      if (e.key === "ArrowDown") moveDown();
      if (e.key === "ArrowUp") handleRotate();
      if (e.key === " ") hardDrop();
      if (e.key === "p" || e.key === "P" || e.key === "ㅔ") setIsPaused(prev => !prev);
      if (e.key === "r" || e.key === "R" || e.key === "ㄱ") resetGame();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRotate, moveDown, moveLeft, moveRight, hardDrop, resetGame]);

  // 모바일 전체화면 레이아웃
  if (isMobile) {
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col overflow-hidden">
        {/* 상단 바 - 뒤로가기와 점수만 */}
        <div className="flex items-center justify-between px-3 py-1 bg-gray-900" style={{ height: '50px' }}>
          <Link href="/games" className="text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 text-white">
            <span className="text-xs font-bold">{score.toLocaleString()}</span>
            <span className="text-xs">Lv.{level}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          <div
            className="relative border border-cyan-600/50 bg-black"
            style={{
              width: Math.min(COLS * cellSize, window.innerWidth - 32),
              height: Math.min(ROWS * cellSize, window.innerHeight - 250),
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            {/* 게임 보드 렌더링 */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
              }}
            >
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  let isCurrent =
                    y <= rowIndex &&
                    rowIndex < y + currentPiece.shape.length &&
                    x <= colIndex &&
                    colIndex < x + currentPiece.shape[0].length &&
                    currentPiece.shape[rowIndex - y]?.[colIndex - x];
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="border border-gray-800/50"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: isCurrent
                          ? currentPiece.color
                          : cell || 'transparent',
                        boxShadow: (isCurrent || cell) ? 'inset 0 1px 2px rgba(0,0,0,0.5)' : 'none',
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* 게임 오버 오버레이 */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-red-500 mb-4">GAME OVER</h2>
                <p className="text-lg mb-4 text-white">점수: {score}</p>
                <button
                  onClick={resetGame}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg"
                >
                  다시 시작
                </button>
              </div>
            )}

            {/* 일시정지 오버레이 */}
            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <h2 className="text-xl font-bold text-yellow-400">일시정지</h2>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 */}
        <MobileGameControls
          onMove={handleMobileMove}
          onAction={handleMobileAction}
          gameType="tetris"
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
            onClick={resetGame}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            aria-label="재시작"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        <div
          className="relative border-2 border-cyan-600 bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-lg shadow-2xl shadow-cyan-500/20"
          style={{
            width: COLS * 24 + 2,
            height: ROWS * 24 + 2,
          }}
        >
          {/* 게임 보드 렌더링 */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 24px)`,
              gridTemplateRows: `repeat(${ROWS}, 24px)`,
            }}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                let isCurrent =
                  y <= rowIndex &&
                  rowIndex < y + currentPiece.shape.length &&
                  x <= colIndex &&
                  colIndex < x + currentPiece.shape[0].length &&
                  currentPiece.shape[rowIndex - y]?.[colIndex - x];
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="border border-gray-800/50 relative overflow-hidden"
                    style={{
                      width: 24,
                      height: 24,
                      background: isCurrent
                        ? currentPiece.color
                        : cell || 'transparent',
                      boxShadow: (isCurrent || cell) ? 'inset 0 2px 4px rgba(0,0,0,0.5), 0 0 8px rgba(100,200,255,0.3)' : 'none',
                      borderRadius: '2px'
                    }}
                  >
                    {(isCurrent || cell) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 게임 오버 오버레이 */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold text-red-500 mb-4">GAME OVER</h2>
              <p className="text-xl mb-4">최종 점수: {score}</p>
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                다시 시작
              </button>
            </div>
          )}

          {/* 일시정지 오버레이 */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <h2 className="text-2xl font-bold text-yellow-400">일시정지</h2>
            </div>
          )}
        </div>
      </div>

      {/* 게임 정보 */}
      <div className="flex flex-col gap-4">
        {/* 점수 정보 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">점수</h3>
          <p className="text-2xl font-mono text-white">{score.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">레벨</h3>
          <p className="text-2xl font-mono text-white">{level}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">라인</h3>
          <p className="text-2xl font-mono text-white">{clearedLines}</p>
        </div>

        {/* 다음 블럭 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">다음 블럭</h3>
          <div className="bg-gradient-to-b from-gray-900 to-black p-2 rounded border border-gray-700">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(4, 20px)`,
                gridTemplateRows: `repeat(2, 20px)`,
              }}
            >
              {[0, 1].map(row => 
                [0, 1, 2, 3].map(col => {
                  const hasBlock = nextPiece.shape[row]?.[col];
                  return (
                    <div
                      key={`${row}-${col}`}
                      className="border border-gray-800"
                      style={{
                        width: 20,
                        height: 20,
                        background: hasBlock ? nextPiece.color : 'transparent'
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 조작법 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 text-sm shadow-lg">
          <h3 className="text-lg font-bold mb-2 text-cyan-400">조작법</h3>
          <div className="space-y-1 text-gray-300">
            <p>← → : 좌우 이동</p>
            <p>↓ : 빠른 낙하</p>
            <p>↑ : 회전</p>
            <p>Space : 하드 드롭</p>
            <p>P : 일시정지</p>
            <p>R : 재시작</p>
          </div>
        </div>
      </div>
    </div>
  );
}