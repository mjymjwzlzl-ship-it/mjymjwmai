'use client';

import React, { useState, useEffect, useCallback } from "react";
import { RotateCw, Lightbulb, Check, X, Trophy, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import MobileGameControls from './MobileGameControls';
import Link from 'next/link';

type SudokuGrid = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

const GRID_SIZE = 9;
const BOX_SIZE = 3;

export default function SudokuGame() {
  const [grid, setGrid] = useState<SudokuGrid>([]);
  const [solution, setSolution] = useState<SudokuGrid>([]);
  const [initialGrid, setInitialGrid] = useState<SudokuGrid>([]);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [hints, setHints] = useState(3);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // 타이머
  useEffect(() => {
    if (gameStarted && !gameCompleted) {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameCompleted]);

  // 스도쿠 생성 함수들
  const isValid = (grid: SudokuGrid, row: number, col: number, num: number): boolean => {
    // 행 체크
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num) return false;
    }
    
    // 열 체크
    for (let x = 0; x < 9; x++) {
      if (grid[x][col] === num) return false;
    }
    
    // 박스 체크
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i + startRow][j + startCol] === num) return false;
      }
    }
    
    return true;
  };

  const solveSudoku = (grid: SudokuGrid): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === null) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (solveSudoku(grid)) return true;
              grid[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const generateSudoku = useCallback((): { puzzle: SudokuGrid, solution: SudokuGrid } => {
    // 빈 그리드 생성
    const grid: SudokuGrid = Array(9).fill(null).map(() => Array(9).fill(null));
    
    // 대각선 박스 채우기 (서로 독립적)
    for (let box = 0; box < 9; box += 3) {
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let i = box; i < box + 3; i++) {
        for (let j = box; j < box + 3; j++) {
          grid[i][j] = nums[idx++];
        }
      }
    }
    
    // 나머지 채우기
    solveSudoku(grid);
    
    // 솔루션 저장
    const solution = grid.map(row => [...row]);
    
    // 난이도에 따라 숫자 제거
    const cellsToRemove = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 40 : 50;
    const puzzle = grid.map(row => [...row]);
    
    let removed = 0;
    while (removed < cellsToRemove) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (puzzle[row][col] !== null) {
        puzzle[row][col] = null;
        removed++;
      }
    }
    
    return { puzzle, solution };
  }, [difficulty]);

  // 새 게임 시작
  const startNewGame = useCallback(() => {
    const { puzzle, solution } = generateSudoku();
    setGrid(puzzle);
    setSolution(solution);
    setInitialGrid(puzzle.map(row => [...row]));
    setSelectedCell(null);
    setErrors(new Set());
    setHints(3);
    setTimer(0);
    setGameStarted(true);
    setGameCompleted(false);
  }, [generateSudoku]);

  // 셀 클릭
  const handleCellClick = (row: number, col: number) => {
    if (initialGrid[row][col] !== null) return;
    setSelectedCell({ row, col });
  };

  // 숫자 입력
  const handleNumberInput = (num: number | null) => {
    if (!selectedCell || gameCompleted) return;
    
    const { row, col } = selectedCell;
    if (initialGrid[row][col] !== null) return;
    
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = num;
    setGrid(newGrid);
    
    // 에러 체크
    const newErrors = new Set<string>();
    if (num !== null && num !== solution[row][col]) {
      newErrors.add(`${row}-${col}`);
    }
    setErrors(newErrors);
    
    // 완료 체크
    if (checkCompletion(newGrid)) {
      setGameCompleted(true);
      saveScore();
    }
  };

  // 완료 체크
  const checkCompletion = (grid: SudokuGrid): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] !== solution[row][col]) return false;
      }
    }
    return true;
  };

  // 힌트 사용
  const useHint = () => {
    if (hints <= 0 || !selectedCell || gameCompleted) return;
    
    const { row, col } = selectedCell;
    if (initialGrid[row][col] !== null) return;
    
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = solution[row][col];
    setGrid(newGrid);
    setHints(hints - 1);
    
    // 에러 제거
    const newErrors = new Set(errors);
    newErrors.delete(`${row}-${col}`);
    setErrors(newErrors);
    
    // 완료 체크
    if (checkCompletion(newGrid)) {
      setGameCompleted(true);
      saveScore();
    }
  };

  // 점수 저장
  const saveScore = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        const score = Math.max(1000 - timer * 2 - (3 - hints) * 100, 100);
        await api.post('/games/sudoku/score', {
          score,
          time: timer,
          difficulty,
          hints: 3 - hints
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // 에러 무시
    }
  };

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || gameCompleted) return;
      
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleNumberInput(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, gameCompleted]);

  // 최고 점수 가져오기
  useEffect(() => {
    const getHighScore = async () => {
      try {
        const response = await api.get('/games/sudoku/highscore');
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
      const response = await api.get('/games/sudoku/leaderboard?period=all');
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
    const cellSize = 'w-8 h-8 text-sm';
    const buttonSize = 'w-10 h-10';
    
    return (
      <div className="game-container fixed inset-0 bg-black flex flex-col">
        {/* 상단 바 - 뒤로가기와 점수만 */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
          <Link href="/games" className="text-white p-2">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-4 text-white">
            {gameStarted && <span className="text-sm">⏱️ {formatTime(timer)}</span>}
            <span className="text-sm">💡 {hints}</span>
          </div>
        </div>

        {/* 게임 영역 */}
        <div className="flex-1 flex flex-col p-2 overflow-auto">
          {/* 난이도 선택 (게임 시작 전에만 표시) */}
          {!gameStarted && (
            <div className="flex gap-2 mb-2 justify-center">
              {(['easy', 'medium', 'hard'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    difficulty === level
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {level === 'easy' ? '쉬움' : level === 'medium' ? '보통' : '어려움'}
                </button>
              ))}
            </div>
          )}
          
          {/* 스도쿠 그리드 */}
          <div className="flex-1 flex items-center justify-center mb-2">
            <div className="grid grid-cols-9 gap-0 bg-gray-800 p-1 rounded-lg">
              {grid.map((row, rowIdx) => (
                row.map((cell, colIdx) => (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                    className={`
                      ${cellSize} font-bold flex items-center justify-center
                      border border-gray-600 transition-colors
                      ${
                        selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                          ? 'bg-indigo-600'
                          : ''
                      }
                      ${
                        initialGrid[rowIdx]?.[colIdx] !== null
                          ? 'bg-gray-700 text-gray-400'
                          : 'hover:bg-gray-600'
                      }
                      ${errors.has(`${rowIdx}-${colIdx}`) ? 'text-red-500' : ''}
                      ${
                        colIdx % 3 === 2 && colIdx !== 8 ? 'border-r-2 border-r-gray-400' : ''
                      }
                      ${
                        rowIdx % 3 === 2 && rowIdx !== 8 ? 'border-b-2 border-b-gray-400' : ''
                      }
                    `}
                  >
                    {cell}
                  </button>
                ))
              ))}
            </div>
          </div>
          
          {/* 숫자 버튼 */}
          <div className="flex flex-col items-center gap-2">
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  className={`${buttonSize} bg-gray-700 hover:bg-gray-600 rounded font-bold text-sm transition-colors`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleNumberInput(null)}
                className={`${buttonSize} bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center justify-center`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* 컨트롤 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={useHint}
                className="px-3 py-1 bg-yellow-600 rounded text-sm flex items-center gap-1"
                disabled={hints <= 0 || !selectedCell || gameCompleted}
              >
                <Lightbulb className="w-4 h-4" />
                힙트
              </button>
              
              <button
                onClick={startNewGame}
                className="px-3 py-1 bg-indigo-600 rounded text-sm flex items-center gap-1"
              >
                <RotateCw className="w-4 h-4" />
                새 게임
              </button>
            </div>
          </div>
          
          {/* 게임 완료 메시지 */}
          {gameCompleted && (
            <div className="mt-2 p-3 bg-green-800 rounded-lg text-center">
              <h2 className="text-lg font-bold mb-1 flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> 완성!
              </h2>
              <p className="text-sm">시간: {formatTime(timer)}</p>
              <p className="text-sm">사용한 힙트: {3 - hints}개</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 데스크탑 레이아웃 (기존 그대로)
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex flex-col items-center">
        <div className="mb-4 flex gap-2">
          {!gameStarted && (
            <div className="flex gap-2 mr-4">
              {(['easy', 'medium', 'hard'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    difficulty === level
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {level === 'easy' ? '쉬움' : level === 'medium' ? '보통' : '어려움'}
                </button>
              ))}
            </div>
          )}
          
          <button
            onClick={useHint}
            className="px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
            disabled={hints <= 0 || !selectedCell || gameCompleted}
          >
            <Lightbulb className="w-5 h-5" />
            힌트 ({hints})
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
            onClick={startNewGame}
            className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            새 게임
          </button>
        </div>

        {/* 타이머 */}
        {gameStarted && (
          <div className="mb-4 text-xl font-mono">
            ⏱️ {formatTime(timer)}
          </div>
        )}

        {/* 스도쿠 그리드 */}
        <div className="grid grid-cols-9 gap-0 bg-gray-800 p-2 rounded-lg">
          {grid.map((row, rowIdx) => (
            row.map((cell, colIdx) => (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                className={`
                  w-12 h-12 text-lg font-bold flex items-center justify-center
                  border border-gray-600 transition-colors
                  ${selectedCell?.row === rowIdx && selectedCell?.col === colIdx ? 'bg-indigo-600' : ''}
                  ${initialGrid[rowIdx]?.[colIdx] !== null ? 'bg-gray-700 text-gray-400' : 'hover:bg-gray-600'}
                  ${errors.has(`${rowIdx}-${colIdx}`) ? 'text-red-500' : ''}
                  ${colIdx % 3 === 2 && colIdx !== 8 ? 'border-r-2 border-r-gray-400' : ''}
                  ${rowIdx % 3 === 2 && rowIdx !== 8 ? 'border-b-2 border-b-gray-400' : ''}
                `}
              >
                {cell}
              </button>
            ))
          ))}
        </div>

        {/* 숫자 버튼 */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumberInput(num)}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-lg transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleNumberInput(null)}
            className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 mx-auto" />
          </button>
        </div>

        {/* 게임 완료 */}
        {gameCompleted && (
          <div className="mt-4 p-4 bg-green-800 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
              <Check className="w-6 h-6" /> 완성!
            </h2>
            <p className="text-lg">시간: {formatTime(timer)}</p>
            <p className="text-lg">사용한 힌트: {3 - hints}개</p>
          </div>
        )}

        {showLeaderboard && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3 text-center text-yellow-400 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              스도쿠 랭킹
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

      <div className="flex flex-col gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">최고 점수</h3>
          <p className="text-xl font-mono text-yellow-400">{highScore}</p>
        </div>

        {!isMobile && (
          <div className="bg-gray-800 rounded-lg p-4 text-sm">
            <h3 className="text-lg font-bold mb-2">조작법</h3>
            <div className="space-y-1 text-gray-400">
              <p>셀 클릭 : 선택</p>
              <p>1-9 : 숫자 입력</p>
              <p>0/백스페이스 : 지우기</p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4 text-sm">
          <h3 className="text-lg font-bold mb-2">규칙</h3>
          <div className="space-y-1 text-gray-400">
            <p>• 각 행에 1-9가 하나씩</p>
            <p>• 각 열에 1-9가 하나씩</p>
            <p>• 각 3x3 박스에 1-9가 하나씩</p>
          </div>
        </div>
      </div>
    </div>
  );
}