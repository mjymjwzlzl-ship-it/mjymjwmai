'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { BarChart3, Eye, Coins, TrendingUp, Calendar, BookOpen, Users } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';
import { getImageUrl } from '@/lib/config';

interface ComicStats {
  id: string;
  title: string;
  thumbnail?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  episodeCount: number;
  totalCoins: number;
  lastUpdated: string;
  weeklyViews: number;
  monthlyViews: number;
}

interface OverallStats {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalComics: number;
  totalEpisodes: number;
  totalCoins: number;
  thisWeekViews: number;
  thisMonthViews: number;
}

export default function StatisticsPage() {
  const router = useRouter();
  const [comicStats, setComicStats] = useState<ComicStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalComics: 0,
    totalEpisodes: 0,
    totalCoins: 0,
    thisWeekViews: 0,
    thisMonthViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // 대시보드와 동일한 API를 호출합니다.
      const response = await webtoonAPI.getMyWebtoons();
      
      // 응답 데이터 구조 확인
      const comics = Array.isArray(response.data) ? response.data : 
                    Array.isArray(response.data.comics) ? response.data.comics : 
                    [];
      

      // API 응답으로부터 프론트엔드에서 직접 통계를 계산합니다.
      const comicStatsData = comics.map((comic: any) => ({
        id: comic.id,
        title: comic.title,
        thumbnail: comic.thumbnail ? getImageUrl(comic.thumbnail) : null,
        viewCount: comic._count?.views || comic.viewCount || 0,
        likeCount: comic._count?.likes || 0,
        commentCount: comic._count?.comments || 0,
        episodeCount: comic.episodes?.length || 0,
        totalCoins: Math.floor((comic._count?.views || comic.viewCount || 0) * 0.02),
        lastUpdated: comic.updatedAt,
        // 주간/월간 조회수는 현재 백엔드 응답에 없으므로 임시 처리합니다.
        weeklyViews: 0,
        monthlyViews: 0,
      }));

      setComicStats(comicStatsData);

      const overall = comicStatsData.reduce((acc: any, comic: any) => {
        acc.totalViews += comic.viewCount;
        acc.totalLikes += comic.likeCount;
        acc.totalComments += comic.commentCount;
        acc.totalEpisodes += comic.episodeCount;
        acc.totalCoins += comic.totalCoins;
        return acc;
      }, {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalComics: comics.length, // 전체 작품 수는 배열 길이로 계산
        totalEpisodes: 0,
        totalCoins: 0,
        thisWeekViews: 0, // 임시 처리
        thisMonthViews: 0, // 임시 처리
      });

      setOverallStats(overall);

    } catch (error: any) {
      // 에러 로그 (개발용)
      // 통계 데이터 로딩 실패
      
      // 인증 에러인지 확인
      if (error.response?.status === 401) {
      }
      
      // 에러 시 빈 배열로 설정
      setComicStats([]);
      setOverallStats({
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalComics: 0,
        totalEpisodes: 0,
        totalCoins: 0,
        thisWeekViews: 0,
        thisMonthViews: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className=" pt-16 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">통계를 불러오는 중...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className=" pt-16 p-8">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">통계</h1>
            <p className="text-gray-600">작품별 조회수, 수익 및 독자 반응 통계를 확인하세요</p>
          </div>

          {/* 기간 선택 및 디버그 */}
          <div className="mb-6">
            <div className="flex space-x-4 items-center">
              {[
                { key: 'week', label: '이번 주' },
                { key: 'month', label: '이번 달' },
                { key: 'all', label: '전체' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === period.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {period.label}
                </button>
              ))}
              
              {/* 디버그 버튼 */}
              <button
                onClick={() => {
                  fetchStatistics();
                }}
                className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
              >
                🔧 디버그
              </button>
            </div>
          </div>

          {/* 전체 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {selectedPeriod === 'week' ? '이번 주 조회수' : 
                     selectedPeriod === 'month' ? '이번 달 조회수' : '총 조회수'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(
                      selectedPeriod === 'week' ? overallStats.thisWeekViews :
                      selectedPeriod === 'month' ? overallStats.thisMonthViews :
                      overallStats.totalViews
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Coins className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 수익 (코인)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(overallStats.totalCoins)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">등록 작품</p>
                  <p className="text-2xl font-bold text-gray-900">{overallStats.totalComics}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 좋아요</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(overallStats.totalLikes)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 작품별 상세 통계 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                작품별 통계
              </h2>
            </div>
            
            {comicStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작품
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        조회수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        좋아요
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        댓글
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        에피소드
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        코인 수익
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        최근 업데이트
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comicStats.map((comic) => (
                      <tr key={comic.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-10">
                              {comic.thumbnail ? (
                                <img
                                  className="h-12 w-10 object-cover rounded"
                                  src={comic.thumbnail}
                                  alt={comic.title}
                                />
                              ) : (
                                <div className="h-12 w-10 bg-gray-300 rounded flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{comic.title}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatNumber(comic.viewCount)}</div>
                          {selectedPeriod === 'week' && (
                            <div className="text-xs text-gray-500">주간: {formatNumber(comic.weeklyViews)}</div>
                          )}
                          {selectedPeriod === 'month' && (
                            <div className="text-xs text-gray-500">월간: {formatNumber(comic.monthlyViews)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(comic.likeCount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(comic.commentCount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {comic.episodeCount}화
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {formatNumber(comic.totalCoins)} 코인
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(comic.lastUpdated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 작품이 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">
                  작품을 등록하면 통계를 확인할 수 있습니다.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/upload')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    새 작품 등록
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}