'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { BookOpen, TrendingUp, MessageSquare, Calendar } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalComics: 0,
    totalViews: 0,
    totalComments: 0,
    weeklyUploads: 0,
  });
  const [recentComics, setRecentComics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 로그인 확인 - 최우선 실행
  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem('authToken');
      const token = localStorage.getItem('token');

      // 유효한 토큰이 없으면 로그인 페이지로 리다이렉트
      if (!authToken && !token) {
        console.log('🔐 인증되지 않은 접근 - 로그인 페이지로 이동');
        router.push('/login');
        return;
      }

      // demo-token은 유효하지 않은 토큰으로 간주
      if ((authToken === 'demo-token' || token === 'demo-token') && !authToken && !token) {
        console.log('🔐 데모 토큰 감지 - 로그인 페이지로 이동');
        router.push('/login');
        return;
      }

      console.log('✅ 인증 확인 완료');
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // 인증된 사용자만 대시보드 데이터 로드
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await webtoonAPI.getWebtoons();
      
      // 응답 데이터가 배열인지 확인
      const webtoonsData = Array.isArray(response.data) ? response.data : 
                          Array.isArray(response.data.comics) ? response.data.comics : [];
      
      // 통계 계산
      const totalComics = webtoonsData.length;
      const totalViews = webtoonsData.reduce((sum: number, comic: any) => sum + (comic.viewCount || 0), 0);
      const totalComments = webtoonsData.reduce((sum: number, comic: any) => sum + (comic.commentCount || 0), 0);
      
      // 이번 주 업로드 계산 (최근 7일)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyUploads = webtoonsData.filter((comic: any) => 
        new Date(comic.createdAt) >= oneWeekAgo
      ).length;

      setStats({
        totalComics,
        totalViews,
        totalComments,
        weeklyUploads,
      });

      // 최근 업로드된 웹툰 (최대 2개)
      const sortedComics = webtoonsData
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2);
      setRecentComics(sortedComics);

    } catch (error) {
      // 에러 시 기본값 유지
    } finally {
      setLoading(false);
    }
  };
  // 인증 확인 중에는 아무것도 표시하지 않음
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <Header />

      {/* 메인 콘텐츠 */}
      <main className=" pt-16 p-8">
        <div className="max-w-7xl mx-auto">
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
            <p className="text-gray-600">작가님의 웹툰 활동을 한눈에 확인하세요</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 작품 수</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.totalComics}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 조회수</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">새 댓글</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.totalComments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">이번 주 업로드</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.weeklyUploads}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 최근 업로드한 웹툰 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">최근 업로드</h2>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">로딩 중...</div>
                ) : recentComics.length > 0 ? (
                  <div className="space-y-4">
                    {recentComics.map((comic: any) => (
                      <div key={comic.id} className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                          {comic.thumbnail && (
                            <img
                              src={comic.thumbnail}
                              alt={comic.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{comic.title}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(comic.createdAt).toLocaleDateString('ko-KR')} 업로드
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    아직 업로드된 작품이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 빠른 작업 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">빠른 작업</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <button 
                    onClick={() => router.push('/upload')}
                    className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200"
                  >
                    <span className="font-medium text-purple-700">새 웹툰 업로드</span>
                  </button>
                  <button 
                    onClick={() => router.push('/manage')}
                    className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                  >
                    <span className="font-medium text-blue-700">작품 관리</span>
                  </button>
                  <button 
                    onClick={() => fetchDashboardData()}
                    className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
                  >
                    <span className="font-medium text-green-700">통계 새로고침</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
