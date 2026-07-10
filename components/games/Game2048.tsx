'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, RotateCw, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

const GRID_SIZE = 4;
const CELL_SIZE = 80;

type Grid = (number | null)[][];

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => initializeGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileCellSize, setMobileCellSize] = useState(80);

  // 모바일 감지 및 화면 크기 조정
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
      
      if (mobile) {
        // 모바일에서 화면에 맞게 최적화
        // 컨트롤러 높이(200px) + 상단 바(60px) + 간격 제외
        const availableHeight = height - 280;
        const availableWidth = width - 40;
        
        // 4x4 격자에 맞게 최적화 (간격 포함)
        const cellByHeight = Math.floor((availableHeight - 3 * 8) / 4); // gap 8px * 3
        const cellByWidth = Math.floor((availableWidth - 3 * 8) / 4);
        const optimalCellSize = Math.min(cellByHeight, cellByWidth, 70); // 최대 70px
        
        setMobileCellSize(Math.max(optimalCellSize, 50)); // 최소 50px
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 색상 맵
  const getTileColor = (value: number | null): string => {
    if (!value) return 'bg-gray-700';
    const colors: { [key: number]: string } = {
      2: 'bg-gray-600',
      4: 'bg-gray-500',
      8: 'bg-orange-500',
      16: 'bg-orange-600',
      32: 'bg-red-500',
      64: 'bg-red-600',
      128: 'bg-yellow-500',
      256: 'bg-yellow-600',
      512: 'bg-green-500',
      1024: 'bg-green-600',
      2048: 'bg-purple-600',
      4096: 'bg-purple-700',
      8192: 'bg-pink-600',
    };
    return colors[value] || 'bg-pink-700';
  };

  const getTextSize = (value: number | null, cellSize: number = CELL_SIZE): string => {
    if (!value) return '';
    
    // 모바일에서 셀 크기에 따라 텍스트 크기 조정
    if (cellSize < 60) {
      if (value < 100) return 'text-lg';
      if (value < 1000) return 'text-base';
      return 'text-sm';
    } else if (cellSize < 80) {
      if (value < 100) return 'text-2xl';
      if (value < 1000) return 'text-xl';
      return 'text-lg';
    } else {
      if (value < 100) return 'text-3xl';
      if (value < 1000) return 'text-2xl';
      return 'text-xl';
    }
  };

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

      (window as any).game2048Sounds = {
        move: () => playSound(300, 0.1),
        merge: () => {
          playSound(400, 0.1);
          setTimeout(() => playSound(500, 0.1), 50);
        },
        win: () => {
          playSound(400, 0.2);
          setTimeout(() => playSound(500, 0.2), 100);
          setTimeout(() => playSound(600, 0.2), 200);
        },
        gameOver: () => playSound(200, 0.5)
      };
    }
  }, [soundEnabled]);

  const playMoveSound = () => {
    if (soundEnabled && (window as any).game2048Sounds) {
      (window as any).game2048Sounds.move();
    }
  };

  const playMergeSound = () => {
    if (soundEnabled && (window as any).game2048Sounds) {
      (window as any).game2048Sounds.merge();
    }
  };

  const playWinSound = () => {
    if (soundEnabled && (window as any).game2048Sounds) {
      (window as any).game2048Sounds.win();
    }
  };

  const playGameOverSound = () => {
    if (soundEnabled && (window as any).game2048Sounds) {
      (window as any).game2048Sounds.gameOver();
    }
  };

  // 그리드 초기화
  function initializeGrid(): Grid {
    const newGrid: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    addNewTile(newGrid);
    addNewTile(newGrid);
    return newGrid;
  }

  // 새 타일 추가
  function addNewTile(grid: Grid): boolean {
    const emptyCells: [number, number][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (!grid[i][j]) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length === 0) return false;
    
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[row][col] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  // 이동 가능 체크
  function canMove(grid: Grid): boolean {
    // 빈 칸이 있으면 이동 가능
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (!grid[i][j]) return true;
      }
    }
    
    // 인접한 같은 숫자가 있으면 이동 가능
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const current = grid[i][j];
        if (current) {
          if (i < GRID_SIZE - 1 && grid[i + 1][j] === current) return true;
          if (j < GRID_SIZE - 1 && grid[i][j + 1] === current) return true;
        }
      }
    }
    
    return false;
  }

  // 줄 이동 (왼쪽으로)
  function slideRow(row: (number | null)[]): { newRow: (number | null)[], points: number, merged: boolean } {
    let filtered = row.filter(cell => cell !== null) as number[];
    let points = 0;
    let merged = false;
    
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] = filtered[i] * 2;
        filtered.splice(i + 1, 1);
        points += filtered[i];
        merged = true;
        
        // 2048 달성 체크
        if (filtered[i] === 2048 && !won) {
          setWon(true);
          playWinSound();
        }
      }
    }
    
    const newRow: (number | null)[] = [...filtered];
    while (newRow.length < GRID_SIZE) {
      newRow.push(null);
    }
    
    return { newRow, points, merged };
  }

  // 그리드 회전
  function rotateGrid(grid: Grid, times: number): Grid {
    let rotated = [...grid.map(row => [...row])];
    
    for (let t = 0; t < times; t++) {
      const temp: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          temp[j][GRID_SIZE - 1 - i] = rotated[i][j];
        }
      }
      rotated = temp;
    }
    
    return rotated;
  }

  // 이동 처리
  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver) return;
    
    let newGrid = [...grid.map(row => [...row])];
    let rotations = 0;
    let totalPoints = 0;
    let hasMerged = false;
    
    // 방향에 따라 회전
    switch (direction) {
      case 'right':
        rotations = 2;
        break;
      case 'up':
        rotations = 3;
        break;
      case 'down':
        rotations = 1;
        break;
    }
    
    // 회전
    if (rotations > 0) {
      newGrid = rotateGrid(newGrid, rotations);
    }
    
    // 각 줄을 왼쪽으로 이동
    let moved = false;
    for (let i = 0; i < GRID_SIZE; i++) {
      const originalRow = [...newGrid[i]];
      const { newRow, points, merged } = slideRow(newGrid[i]);
      newGrid[i] = newRow;
      totalPoints += points;
      if (merged) hasMerged = true;
      
      // 변화가 있었는지 체크
      if (JSON.stringify(originalRow) !== JSON.stringify(newRow)) {
        moved = true;
      }
    }
    
    // 원래 방향으로 되돌리기
    if (rotations > 0) {
      newGrid = rotateGrid(newGrid, 4 - rotations);
    }
    
    // 이동이 있었으면 새 타일 추가
    if (moved) {
      if (hasMerged) {
        playMergeSound();
      } else {
        playMoveSound();
      }
      
      addNewTile(newGrid);
      setGrid(newGrid);
      setScore(score + totalPoints);
      
      // 게임 오버 체크
      if (!canMove(newGrid)) {
        setGameOver(true);
        playGameOverSound();
        saveScore();
      }
    }
  }, [grid, score, gameOver]);

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token && score > 0) {
        const maxTile = Math.max(...grid.flat().filter(v => v !== null) as number[]);
        await api.post('/games/2048/score', {
          score,
          maxTile,
          moves: 0 // 이동 횟수는 추적하지 않음
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
    setGrid(initializeGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  // 모바일 컨트롤 핸들러
  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    move(direction);
  }, [move]);

  // 키보드 입력
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        move(direction);
      }
      
      if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [move, resetGame]);

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/2048/highscore');
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
      const response = await api.get('/games/2048/leaderboard?period=all');
      setLeaderboard(response.data || []);
    } catch (error) {
      // 에러 무시
    }
  };

  // 최고 점수 업데이트
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
    }
  }, [score, bestScore]);

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
            <span className="text-sm">Best: {Math.max(highScore, bestScore)}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="relative bg-gray-800 rounded-lg p-2"
            style={{
              width: GRID_SIZE * cellSize + 16 + (GRID_SIZE - 1) * 8,
              height: GRID_SIZE * cellSize + 16 + (GRID_SIZE - 1) * 8,
            }}
          >
            {/* 그리드 배경 */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded"
                  style={{ width: cellSize, height: cellSize }}
                />
              ))}
            </div>

            {/* 타일 렌더링 */}
            <div className="absolute inset-2 grid grid-cols-4 gap-2">
              {grid.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`flex items-center justify-center rounded font-bold text-white transition-all duration-150 ${
                      cell ? getTileColor(cell) : ''
                    } ${getTextSize(cell, cellSize)}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      transform: cell ? 'scale(1)' : 'scale(0)',
                      opacity: cell ? 1 : 0,
                    }}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>

            {/* 게임 오버 오버레이 */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-red-500 mb-4">GAME OVER</h2>
                <p className="text-lg mb-4">최종 점수: {score}</p>
                <button
                  onClick={resetGame}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg"
                >
                  다시 시작
                </button>
              </div>
            )}

            {/* 승리 오버레이 */}
            {won && !gameOver && (
              <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold text-yellow-400 mb-4">2048!</h2>
                <p className="text-lg mb-4">축하합니다!</p>
                <button
                  onClick={() => setWon(false)}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg"
                >
                  계속하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 모바일 컨트롤 */}
        <MobileGameControls
          onMove={handleMobileMove}
          gameType="2048"
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
            aria-label="새 게임"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        <div
          className="relative bg-gray-800 rounded-lg p-2"
          style={{
            width: GRID_SIZE * CELL_SIZE + 16 + (GRID_SIZE - 1) * 8,
            height: GRID_SIZE * CELL_SIZE + 16 + (GRID_SIZE - 1) * 8,
          }}
        >
          {/* 그리드 배경 */}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded"
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              />
            ))}
          </div>

          {/* 타일 렌더링 */}
          <div className="absolute inset-2 grid grid-cols-4 gap-2">
            {grid.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`flex items-center justify-center rounded font-bold text-white transition-all duration-150 ${
                    cell ? getTileColor(cell) : ''
                  } ${getTextSize(cell, CELL_SIZE)}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    transform: cell ? 'scale(1)' : 'scale(0)',
                    opacity: cell ? 1 : 0,
                  }}
                >
                  {cell}
                </div>
              ))
            )}
          </div>

          {/* 게임 오버 오버레이 */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold text-red-500 mb-4">GAME OVER</h2>
              <p className="text-xl mb-4">최종 점수: {score}</p>
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                다시 시작 (R)
              </button>
            </div>
          )}

          {/* 승리 오버레이 */}
          {won && !gameOver && (
            <div className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center">
              <h2 className="text-4xl font-bold text-yellow-400 mb-4">2048!</h2>
              <p className="text-xl mb-4">축하합니다!</p>
              <button
                onClick={() => setWon(false)}
                className="px-6 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                계속하기
              </button>
            </div>
          )}
        </div>
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
          <p className="text-xl font-mono text-yellow-400">{Math.max(highScore, bestScore).toLocaleString()}</p>
        </div>

        {/* 조작법 */}
        {!isMobile && (
          <div className="bg-gray-800 rounded-lg p-4 text-sm">
            <h3 className="text-lg font-bold mb-2">조작법</h3>
            <div className="space-y-1 text-gray-400">
              <p>↑↓←→ : 타일 이동</p>
              <p>R : 새 게임</p>
            </div>
          </div>
        )}

        {/* 게임 규칙 */}
        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">규칙</h3>
          <div className="space-y-1 text-gray-400">
            <p>• 같은 숫자끼리 합쳐집니다</p>
            <p>• 2048을 만들면 승리!</p>
            <p>• 더 이상 움직일 수 없으면 게임 오버</p>
          </div>
        </div>

        {/* 팁 */}
        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">팁</h3>
          <div className="space-y-1 text-gray-400">
            <p>💡 한쪽 구석에 큰 숫자를 모으세요</p>
            <p>🎯 가능한 한 방향으로만 움직이세요</p>
            <p>⚡ 성급하게 움직이지 마세요</p>
          </div>
        </div>

        {showLeaderboard && (
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              2048 랭킹
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