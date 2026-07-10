'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, Clock, Users, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  level?: number;
  time?: number;
  createdAt: string;
}

interface GameLeaderboard {
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}

const games = [
  { id: 'tetris', name: '테트리스', icon: '🟦', color: 'from-emerald-600 to-teal-600' },
  { id: 'snake', name: '뱀 게임', icon: '🐍', color: 'from-emerald-600 to-teal-600' },
  { id: '2048', name: '2048', icon: '🔢', color: 'from-emerald-600 to-teal-600' },
  { id: 'memory', name: '메모리', icon: '🃏', color: 'from-emerald-600 to-teal-600' },
  { id: 'pong', name: '퐁', icon: '🏓', color: 'from-emerald-600 to-teal-600' },
  { id: 'flappy', name: '플래피 버드', icon: '🐦', color: 'from-emerald-600 to-teal-600' },
  { id: 'breakout', name: '벽돌깨기', icon: '🧱', color: 'from-emerald-600 to-teal-600' },
  { id: 'pacman', name: '팩맨', icon: '👻', color: 'from-emerald-600 to-teal-600' },
  { id: 'sudoku', name: '스도쿠', icon: '🔢', color: 'from-emerald-600 to-teal-600' }
];

export default function LeaderboardPage() {
  const [selectedGame, setSelectedGame] = useState('tetris');
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'allTime'>('weekly');
  const [leaderboards, setLeaderboards] = useState<Record<string, GameLeaderboard>>({});
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  // 랭킹 데이터 가져오기
  const fetchLeaderboard = async (gameId: string, period: 'weekly' | 'allTime') => {
    try {
      const endpoint = period === 'weekly' 
        ? `/games/${gameId}/leaderboard?period=weekly`
        : `/games/${gameId}/leaderboard?period=all`;
      
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`${gameId} 랭킹 로드 실패:`, error);
      return [];
    }
  };

  // 모든 게임 랭킹 로드
  useEffect(() => {
    const loadAllLeaderboards = async () => {
      setLoading(true);
      const newLeaderboards: Record<string, GameLeaderboard> = {};
      
      for (const game of games) {
        const [weekly, allTime] = await Promise.all([
          fetchLeaderboard(game.id, 'weekly'),
          fetchLeaderboard(game.id, 'allTime')
        ]);
        
        newLeaderboards[game.id] = { weekly, allTime };
      }
      
      setLeaderboards(newLeaderboards);
      setLoading(false);
    };

    loadAllLeaderboards();
  }, []);

  // 사용자 순위 찾기
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) return;

    const findUserRank = async () => {
      try {
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const username = response.data.username;
        
        const currentLeaderboard = leaderboards[selectedGame]?.[selectedPeriod] || [];
        const rank = currentLeaderboard.findIndex(entry => entry.username === username);
        setUserRank(rank >= 0 ? rank + 1 : null);
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      }
    };

    if (leaderboards[selectedGame]) {
      findUserRank();
    }
  }, [selectedGame, selectedPeriod, leaderboards]);

  const currentGame = games.find(g => g.id === selectedGame);
  const currentLeaderboard = leaderboards[selectedGame]?.[selectedPeriod] || [];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="text-gray-500 font-mono">#{rank}</span>;
    }
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-12 h-12 text-yellow-500" />
            게임 랭킹
          </h1>
          <p className="text-gray-400 text-lg">최고의 플레이어들과 경쟁하세요!</p>
        </div>

        {/* 게임 선택 탭 */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`px-4 py-3 rounded-lg transition-all transform hover:scale-105 ${
                  selectedGame === game.id
                    ? `bg-gradient-to-r ${game.color} text-white shadow-lg`
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <span className="text-2xl mr-2">{game.icon}</span>
                <span className="font-medium">{game.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 기간 선택 */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setSelectedPeriod('weekly')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedPeriod === 'weekly'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Clock className="inline w-4 h-4 mr-2" />
            주간 랭킹
          </button>
          <button
            onClick={() => setSelectedPeriod('allTime')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedPeriod === 'allTime'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <TrendingUp className="inline w-4 h-4 mr-2" />
            역대 랭킹
          </button>
        </div>

        {/* 사용자 순위 표시 */}
        {userRank && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-800/50 to-teal-800/50 rounded-lg text-center">
            <p className="text-lg">
              내 순위: <span className="text-2xl font-bold text-yellow-400">{userRank}위</span>
            </p>
          </div>
        )}

        {/* 랭킹 테이블 */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3E7A5A] mx-auto mb-4"></div>
              <p>랭킹 로딩중...</p>
            </div>
          ) : currentLeaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">아직 기록이 없습니다</p>
              <p className="mt-2">첫 번째 플레이어가 되어보세요!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left">순위</th>
                    <th className="px-6 py-4 text-left">플레이어</th>
                    <th className="px-6 py-4 text-right">점수</th>
                    {currentLeaderboard[0]?.level !== undefined && (
                      <th className="px-6 py-4 text-center">레벨</th>
                    )}
                    <th className="px-6 py-4 text-right">날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeaderboard.map((entry, index) => (
                    <tr
                      key={index}
                      className={`border-t border-gray-700 hover:bg-gray-700/30 transition-colors ${
                        entry.rank <= 3 ? 'bg-gradient-to-r from-transparent' : ''
                      } ${
                        entry.rank === 1 ? 'via-yellow-900/20' :
                        entry.rank === 2 ? 'via-gray-700/20' :
                        entry.rank === 3 ? 'via-orange-900/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(entry.rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center font-bold">
                            {entry.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{entry.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xl font-mono font-bold text-[#3E7A5A]">
                          {formatScore(entry.score)}
                        </span>
                      </td>
                      {entry.level !== undefined && (
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-[#3E7A5A]/50 rounded-full text-sm">
                            Lv.{entry.level}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right text-gray-400">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 통계 카드 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm rounded-lg p-6 text-center">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">최고 점수</h3>
            <p className="text-3xl font-mono font-bold text-yellow-400">
              {currentLeaderboard[0]?.score ? formatScore(currentLeaderboard[0].score) : '-'}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-lg p-6 text-center">
            <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">참여자 수</h3>
            <p className="text-3xl font-mono font-bold text-blue-400">
              {currentLeaderboard.length}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-lg p-6 text-center">
            <Star className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">평균 점수</h3>
            <p className="text-3xl font-mono font-bold text-green-400">
              {currentLeaderboard.length > 0 
                ? formatScore(Math.floor(
                    currentLeaderboard.reduce((sum, e) => sum + e.score, 0) / currentLeaderboard.length
                  ))
                : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}