'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Clock, TrendingUp, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
// 게임판은 무작위로 시작해 서버/브라우저 첫 화면이 달라진다(React #418) → 브라우저에서만 그린다
const TetrisGame = dynamic(() => import('@/components/games/TetrisGame'), { ssr: false });
import { api } from '@/lib/api';

interface RankingEntry {
  id: string;
  username: string;
  score: number;
  level: number;
  lines: number;
  createdAt: string;
  rank?: number;
}

export default function TetrisPage() {
  const [showRanking, setShowRanking] = useState(false);
  const [weeklyRanking, setWeeklyRanking] = useState<RankingEntry[]>([]);
  const [allTimeRanking, setAllTimeRanking] = useState<RankingEntry[]>([]);
  const [myBestScore, setMyBestScore] = useState<RankingEntry | null>(null);
  const [rankingTab, setRankingTab] = useState<'weekly' | 'alltime'>('weekly');
  const [platformTab, setPlatformTab] = useState<'all' | 'web' | 'mobile'>('all');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 모바일 감지 및 게임 모드 설정
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // 게임 페이지 진입 시 body에 클래스 추가
    document.body.classList.add('game-active');
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      // 페이지 떠날 때 클래스 제거
      document.body.classList.remove('game-active');
    };
  }, []);

  // 랭킹 데이터 가져오기
  const fetchRankings = async (platform = 'all') => {
    setLoading(true);
    try {
      const [weeklyRes, allTimeRes] = await Promise.all([
        api.get(`/games/tetris/ranking/weekly?platform=${platform}`),
        api.get(`/games/tetris/ranking/alltime?platform=${platform}`)
      ]);
      
      setWeeklyRanking(weeklyRes.data.rankings || []);
      setAllTimeRanking(allTimeRes.data.rankings || []);

      // 내 최고 점수 가져오기
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (token) {
        const myScoreRes = await api.get('/games/tetris/my-best', {
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
    fetchRankings(platformTab);
    // 30초마다 랭킹 업데이트
    const interval = setInterval(() => fetchRankings(platformTab), 30000);
    return () => clearInterval(interval);
  }, [platformTab]);

  const currentRanking = rankingTab === 'weekly' ? weeklyRanking : allTimeRanking;

  // 모바일에서는 게임 컴포넌트만 표시
  if (isMobile && !showRanking) {
    return <TetrisGame />;
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            게임 센터로 돌아가기
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">테트리스</h1>
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
            <TetrisGame />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* 내 최고 기록 */}
            {myBestScore && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  내 최고 기록
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm opacity-80">점수</p>
                    <p className="text-3xl font-bold">{myBestScore.score.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">레벨</p>
                    <p className="text-3xl font-bold">{myBestScore.level}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">라인</p>
                    <p className="text-3xl font-bold">{myBestScore.lines}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 랭킹 탭 */}
            <div className="flex flex-col gap-4 mb-6">
              {/* 기간 탭 */}
              <div className="flex gap-2">
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

              {/* 플랫폼 탭 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPlatformTab('all')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                    platformTab === 'all'
                      ? 'bg-[#3E7A5A] text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setPlatformTab('web')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                    platformTab === 'web'
                      ? 'bg-[#3E7A5A] text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  🔥 웹 유저
                </button>
                <button
                  onClick={() => setPlatformTab('mobile')}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                    platformTab === 'mobile'
                      ? 'bg-[#3E7A5A] text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  📱 모바일 유저
                </button>
              </div>
            </div>

            {/* 랭킹 테이블 */}
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
                          <th className="text-right py-3 px-4">레벨</th>
                          <th className="text-right py-3 px-4">라인</th>
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
                              {entry.score.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {entry.level}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {entry.lines}
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

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2 text-[#3E7A5A]">오늘의 플레이</h3>
                <p className="text-3xl font-bold">1,234</p>
                <p className="text-sm text-gray-400 mt-1">게임</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2 text-[#3E7A5A]">평균 점수</h3>
                <p className="text-3xl font-bold">15,420</p>
                <p className="text-sm text-gray-400 mt-1">점</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2 text-[#3E7A5A]">최고 레벨</h3>
                <p className="text-3xl font-bold">23</p>
                <p className="text-sm text-gray-400 mt-1">레벨</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}