'use client';

import { useState } from 'react';
import { Gamepad2, Trophy, Clock, Star, Users } from 'lucide-react';
import Link from 'next/link';

export default function AdultGamesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const games = [
    {
      id: 'tetris',
      title: '테트리스',
      description: '클래식 블록 퍼즐 게임',
      thumbnail: '🟦',
      category: 'puzzle',
      players: 1234,
      rating: 4.5,
      path: '/games/tetris'
    },
    {
      id: 'snake',
      title: '뱀 게임',
      description: '뱀을 키우며 점수를 올리세요',
      thumbnail: '🐍',
      category: 'arcade',
      players: 856,
      rating: 4.2,
      path: '/games/snake'
    },
    {
      id: '2048',
      title: '2048',
      description: '숫자를 합쳐 2048을 만드세요',
      thumbnail: '🔢',
      category: 'puzzle',
      players: 2156,
      rating: 4.7,
      path: '/games/2048'
    },
    {
      id: 'memory',
      title: '메모리 게임',
      description: '카드 짝 맞추기',
      thumbnail: '🃏',
      category: 'memory',
      players: 543,
      rating: 4.0,
      path: '/games/memory'
    },
    {
      id: 'pong',
      title: '퐁 (Pong)',
      description: '클래식 탁구 게임',
      thumbnail: '🏓',
      category: 'arcade',
      players: 723,
      rating: 4.3,
      path: '/games/pong'
    },
    {
      id: 'breakout',
      title: '벽돌깨기',
      description: '벽돌을 모두 부수세요',
      thumbnail: '🧱',
      category: 'arcade',
      players: 945,
      rating: 4.4,
      path: '/games/breakout'
    },
    {
      id: 'pacman',
      title: '팩맨',
      description: '유령을 피해 점을 먹어요',
      thumbnail: '👻',
      category: 'arcade',
      players: 1567,
      rating: 4.6,
      path: '/games/pacman'
    },
    {
      id: 'flappy',
      title: '플래피 버드',
      description: '장애물을 피해 날아가세요',
      thumbnail: '🐦',
      category: 'arcade',
      players: 2341,
      rating: 4.1,
      path: '/games/flappy'
    },
    {
      id: 'sudoku',
      title: '스도쿠',
      description: '숫자 퍼즐 게임',
      thumbnail: '🔢',
      category: 'puzzle',
      players: 876,
      rating: 4.8,
      path: '/games/sudoku'
    },
  ];

  const categories = [
    { id: 'all', label: '전체', icon: Gamepad2 },
    { id: 'puzzle', label: '퍼즐', icon: Star },
    { id: 'arcade', label: '아케이드', icon: Clock },
    { id: 'memory', label: '메모리', icon: Trophy }
  ];

  const filteredGames = selectedCategory === 'all'
    ? games
    : games.filter(game => game.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
            <Gamepad2 className="w-10 h-10 text-[#3E7A5A]" />
            게임 센터
          </h1>
          <p className="text-gray-400">잠깐의 휴식, 재미있는 게임과 함께!</p>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-[#3E7A5A] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            );
          })}
        </div>

        {/* 게임 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map(game => (
            <div
              key={game.id}
              className="bg-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:border-[#3E7A5A] transition-all duration-300 hover:scale-105 border border-gray-700"
            >
              {/* 게임 썸네일 */}
              <div className="h-48 bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-6xl">
                {game.thumbnail}
              </div>

              {/* 게임 정보 */}
              <div className="p-4">
                <h3 className="text-xl font-bold mb-2">{game.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{game.description}</p>

                {/* 통계 */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{game.players.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{game.rating}</span>
                  </div>
                </div>

                {/* 플레이 버튼 */}
                <Link
                  href={game.path}
                  className="block w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors"
                >
                  플레이하기
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* 리더보드 프리뷰 */}
        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              게임 랭킹
            </h2>
            <Link
              href="/games/leaderboard"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              전체 순위 보기 →
            </Link>
          </div>
          <p className="text-center text-gray-400 py-8">
            게임을 플레이하여 랭킹에 올라보세요!
          </p>
        </div>
      </div>
    </div>
  );
}
