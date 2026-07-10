'use client';

import { useState } from 'react';
import { Blocks, Brain, Gamepad2, Grid3X3, Joystick, Star, Trophy, Users } from 'lucide-react';
import Link from 'next/link';

const games = [
  { id: 'tetris', title: '테트리스', description: '블록을 맞춰 라인을 지우는 퍼즐 게임', icon: Blocks, category: 'puzzle', players: 1234, rating: 4.5, path: '/games/tetris' },
  { id: 'snake', title: '스네이크', description: '길어지는 몸을 피하며 점수를 올리는 게임', icon: Joystick, category: 'arcade', players: 856, rating: 4.2, path: '/games/snake' },
  { id: '2048', title: '2048', description: '숫자를 합쳐 2048을 만드는 퍼즐 게임', icon: Grid3X3, category: 'puzzle', players: 2156, rating: 4.7, path: '/games/2048' },
  { id: 'memory', title: '메모리 게임', description: '카드를 뒤집어 같은 그림을 맞추는 게임', icon: Brain, category: 'memory', players: 543, rating: 4.0, path: '/games/memory' },
  { id: 'pong', title: '퐁', description: '간단하게 즐기는 클래식 탁구 게임', icon: Gamepad2, category: 'arcade', players: 723, rating: 4.3, path: '/games/pong' },
  { id: 'breakout', title: '벽돌깨기', description: '공을 튕겨 벽돌을 모두 부수는 게임', icon: Blocks, category: 'arcade', players: 945, rating: 4.4, path: '/games/breakout' },
];

const categories = [
  { id: 'all', label: '전체' },
  { id: 'puzzle', label: '퍼즐' },
  { id: 'arcade', label: '아케이드' },
  { id: 'memory', label: '메모리' },
];

export default function GamesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const filteredGames = selectedCategory === 'all' ? games : games.filter((game) => game.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="hidden">
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">게임</h1>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 transition-colors ${
                selectedCategory === category.id
                  ? 'bg-[#00dc64] text-gray-950'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredGames.map((game) => {
            const Icon = game.icon;
            return (
              <Link
                key={game.id}
                href={game.path}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <div className="flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-900">
                  <Icon className="h-14 w-14 text-[#00b855]" />
                </div>
                <div className="p-3">
                  <h3 className="mb-1 text-sm font-semibold">{game.title}</h3>
                  <p className="mb-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{game.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {game.players > 1000 ? `${(game.players / 1000).toFixed(1)}k` : game.players}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {game.rating}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">게임 랭킹</h2>
            <Link
              href="/games/leaderboard"
              className="text-sm text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
            >
              전체 보기 +
            </Link>
          </div>
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            게임을 플레이하면 랭킹에 도전할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
