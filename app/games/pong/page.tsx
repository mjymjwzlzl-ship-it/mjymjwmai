'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Clock, TrendingUp, Users } from 'lucide-react';
import PongGame from '@/components/games/PongGame';
import { api } from '@/lib/api';

interface RankingEntry {
  id: string;
  username: string;
  score: number;
  difficulty: string;
  winner: boolean;
  rally: number;
  createdAt: string;
}

export default function PongPage() {
  const [showRanking, setShowRanking] = useState(false);
  const [weeklyRanking, setWeeklyRanking] = useState<RankingEntry[]>([]);
  const [allTimeRanking, setAllTimeRanking] = useState<RankingEntry[]>([]);
  const [myBestScore, setMyBestScore] = useState<RankingEntry | null>(null);
  const [rankingTab, setRankingTab] = useState<'weekly' | 'alltime'>('weekly');
  const [loading, setLoading] = useState(false);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const [weeklyRes, allTimeRes] = await Promise.all([
        api.get('/games/pong/ranking/weekly'),
        api.get('/games/pong/ranking/alltime')
      ]);
      
      setWeeklyRanking(weeklyRes.data.rankings || []);
      setAllTimeRanking(allTimeRes.data.rankings || []);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        const myScoreRes = await api.get('/games/pong/my-best', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMyBestScore(myScoreRes.data.bestScore);
      }
    } catch (error) {
      console.error('랭킹 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
    const interval = setInterval(fetchRankings, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentRanking = rankingTab === 'weekly' ? weeklyRanking : allTimeRanking;

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            게임 센터로 돌아가기
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              🎾 퐁 Pong
            </h1>
            <button
              onClick={() => setShowRanking(!showRanking)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3E7A5A] rounded-lg hover:bg-[#2d5a42] transition-colors"
            >
              <Trophy className="w-5 h-5" />
              {showRanking ? '게임으로' : '랭킹 보기'}
            </button>
          </div>
        </div>

        {!showRanking ? (
          <div className="flex justify-center">
            <PongGame />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {myBestScore && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  내 최고 기록
                </h2>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm opacity-80">점수</p>
                    <p className="text-3xl font-bold">{myBestScore.score}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">난이도</p>
                    <p className="text-2xl font-bold">
                      {myBestScore.difficulty === 'easy' ? '쉽기' : 
                       myBestScore.difficulty === 'normal' ? '보통' : '어려움'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">결과</p>
                    <p className="text-2xl font-bold">
                      {myBestScore.winner ? '승리' : '패배'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">최고 랠리</p>
                    <p className="text-2xl font-bold">{myBestScore.rally}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setRankingTab('weekly')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  rankingTab === 'weekly'
                    ? 'bg-[#3E7A5A] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                주간 랭킹
              </button>
              <button
                onClick={() => setRankingTab('alltime')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  rankingTab === 'alltime'
                    ? 'bg-[#3E7A5A] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Trophy className="w-4 h-4" />
                역대 랭킹
              </button>
            </div>

            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  {rankingTab === 'weekly' ? '이번 주 TOP 50' : '역대 TOP 100'}
                </h2>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3E7A5A] mx-auto"></div>
                  </div>
                ) : currentRanking.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4">순위</th>
                          <th className="text-left py-3 px-4">플레이어</th>
                          <th className="text-right py-3 px-4">점수</th>
                          <th className="text-center py-3 px-4">난이도</th>
                          <th className="text-center py-3 px-4">결과</th>
                          <th className="text-right py-3 px-4">랠리</th>
                          <th className="text-right py-3 px-4">날짜</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRanking.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                              index < 3 ? 'bg-gray-700/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <span className={`font-bold ${
                                index === 0 ? 'text-yellow-500 text-xl' :
                                index === 1 ? 'text-gray-400 text-lg' :
                                index === 2 ? 'text-orange-600 text-lg' :
                                ''
                              }`}>
                                {index === 0 ? '🥇' :
                                 index === 1 ? '🥈' :
                                 index === 2 ? '🥉' :
                                 `#${index + 1}`}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {entry.username}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-lg">
                              {entry.score}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-sm ${
                                entry.difficulty === 'hard' ? 'bg-red-600/30 text-red-400' :
                                entry.difficulty === 'normal' ? 'bg-blue-600/30 text-blue-400' :
                                'bg-green-600/30 text-green-400'
                              }`}>
                                {entry.difficulty === 'easy' ? '쉽기' :
                                 entry.difficulty === 'normal' ? '보통' : '어려움'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {entry.winner ? '✅' : '❌'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {entry.rally}
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-gray-400">
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    아직 랭킹 데이터가 없습니다. 첫 번째 플레이어가 되어보세요!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}