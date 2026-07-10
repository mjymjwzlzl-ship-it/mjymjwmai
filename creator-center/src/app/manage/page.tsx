'use client'

import React, { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Edit, Trash2, Eye, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';

// 임시 데이터
const sampleWebtoons = [
  {
    id: 1,
    title: '청춘 로맨스',
    genre: '로맨스',
    status: '연재중',
    episodes: 15,
    views: 12450,
    likes: 1240,
    lastUpdate: '2024-01-15',
    thumbnail: '/placeholder-thumbnail.jpg'
  },
  {
    id: 2,
    title: '판타지 어드벤처',
    genre: '판타지',
    status: '연재중',
    episodes: 8,
    views: 8900,
    likes: 890,
    lastUpdate: '2024-01-12',
    thumbnail: '/placeholder-thumbnail.jpg'
  },
  {
    id: 3,
    title: '일상 코미디',
    genre: '코미디',
    status: '완결',
    episodes: 25,
    views: 25600,
    likes: 2100,
    lastUpdate: '2023-12-20',
    thumbnail: '/placeholder-thumbnail.jpg'
  }
];

interface Webtoon {
  id: number;
  title: string;
  genre: string;
  status: string;
  episodes: number;
  views: number;
  likes: number;
  lastUpdate: string;
  thumbnail: string;
}

export default function ManagePage() {
  const router = useRouter();
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebtoon, setSelectedWebtoon] = useState<number | null>(null);
  const [expandedWebtoon, setExpandedWebtoon] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<{[key: string]: any[]}>({});

  useEffect(() => {
    fetchWebtoons();
    
    // URL 파라미터에서 확장할 웹툰 ID 확인
    const urlParams = new URLSearchParams(window.location.search);
    const expandedId = urlParams.get('expanded');
    if (expandedId) {
      setExpandedWebtoon(expandedId);
      // URL 파라미터 제거 (선택사항)
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchWebtoons = async () => {
    try {
      setLoading(true);
      const response = await webtoonAPI.getWebtoons();
      // 응답 데이터가 배열인지 확인
      const webtoonsData = Array.isArray(response.data) ? response.data :
                          Array.isArray(response.data.comics) ? response.data.comics : [];

      // 오름차순으로 정렬 (오래된 것부터)
      const sortedData = webtoonsData.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // 오름차순 정렬
      });

      setWebtoons(sortedData);
    } catch (error) {
      // 에러 시 빈 배열로 설정
      setWebtoons([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '연재중':
        return 'bg-green-100 text-green-800';
      case '완결':
        return 'bg-blue-100 text-blue-800';
      case '휴재':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 웹툰 에피소드 토글
  const toggleWebtoonEpisodes = async (webtoonId: string) => {
    if (expandedWebtoon === webtoonId) {
      setExpandedWebtoon(null);
    } else {
      setExpandedWebtoon(webtoonId);
      // 에피소드를 아직 불러오지 않았다면 불러오기
      if (!episodes[webtoonId]) {
        try {
          const webtoonData = await webtoonAPI.getWebtoon(webtoonId);
          setEpisodes(prev => ({
            ...prev,
            [webtoonId]: webtoonData.data.episodes || []
          }));
        } catch (error) {
          alert('에피소드 목록을 불러오는데 실패했습니다.');
        }
      }
    }
  };

  // 에피소드 삭제
  const handleDeleteEpisode = async (episodeId: string, webtoonId: string) => {
    if (confirm('정말로 이 에피소드를 삭제하시겠습니까?\n삭제된 에피소드는 복구할 수 없습니다.')) {
      try {
        await webtoonAPI.deleteEpisode(episodeId);
        
        // 로컬 상태에서 삭제된 에피소드 제거
        setEpisodes(prev => ({
          ...prev,
          [webtoonId]: prev[webtoonId].filter(ep => ep.id !== episodeId)
        }));
        
        // 웹툰 목록도 업데이트 (에피소드 수 감소)
        fetchWebtoons();
        
        alert('에피소드가 삭제되었습니다.');
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || '에피소드 삭제 중 오류가 발생했습니다.';
        alert(errorMessage);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('정말로 이 작품을 삭제하시겠습니까?')) {
      try {
        await webtoonAPI.deleteWebtoon(id.toString());
        setWebtoons(webtoons.filter(webtoon => webtoon.id !== id));
        alert('작품이 삭제되었습니다.');
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 메인 콘텐츠 */}
      <main className=" pt-16 p-8">
        <div className="max-w-7xl mx-auto">
          {/* 페이지 헤더 */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">작품 관리</h1>
              <p className="text-gray-600">등록된 웹툰을 관리하고 수정할 수 있습니다</p>
            </div>
            <button 
              onClick={() => router.push('/upload')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 작품 등록
            </button>
          </div>

          {/* 통계 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{Array.isArray(webtoons) ? webtoons.length : 0}</div>
              <div className="text-sm text-gray-600">총 작품 수</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {Array.isArray(webtoons) ? webtoons.filter(w => w.status === '연재중' || w.status === 'ONGOING').length : 0}
              </div>
              <div className="text-sm text-gray-600">연재중</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {Array.isArray(webtoons) ? webtoons.reduce((sum: number, w: any) => sum + (Array.isArray(w.episodes) ? w.episodes.length : (w.episodeCount || 0)), 0) : 0}
              </div>
              <div className="text-sm text-gray-600">총 에피소드</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {Array.isArray(webtoons) ? webtoons.reduce((sum: number, w: any) => sum + (w.views || w.viewCount || 0), 0).toLocaleString() : '0'}
              </div>
              <div className="text-sm text-gray-600">총 조회수</div>
            </div>
          </div>

          {/* 작품 목록 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">내 작품</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작품
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      장르
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      에피소드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      조회수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      좋아요
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      최근 업데이트
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(webtoons) && webtoons.map((webtoon) => (
                    <React.Fragment key={webtoon.id}>
                      <tr key={webtoon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                              {webtoon.thumbnail || (webtoon as any).thumbnailUrl ? (
                                <img
                                  src={
                                    webtoon.thumbnail?.startsWith('/') 
                                      ? `${webtoon.thumbnail}` 
                                      : (webtoon.thumbnail || (webtoon as any).thumbnailUrl)
                                  }
                                  alt={webtoon.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                  NO IMG
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {webtoon.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {webtoon.genre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(webtoon.status)}`}>
                            {webtoon.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Array.isArray(webtoon.episodes) ? webtoon.episodes.length : ((webtoon as any).episodeCount || 0)}화
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {((webtoon as any).views || (webtoon as any).viewCount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {((webtoon as any).likes || (webtoon as any).likeCount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(webtoon as any).lastUpdate || (webtoon as any).updatedAt?.split('T')[0] || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => router.push(`/episode/${webtoon.id}`)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="에피소드 추가"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => router.push(`/edit/${webtoon.id}`)}
                              className="text-green-600 hover:text-green-900 p-1 rounded" 
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(webtoon.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleWebtoonEpisodes(webtoon.id.toString())}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded"
                              title="에피소드 보기/숨기기"
                            >
                              {expandedWebtoon === webtoon.id.toString() ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedWebtoon === webtoon.id.toString() && episodes[webtoon.id.toString()] && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="bg-gray-100 p-4 border-t border-gray-200">
                              <h3 className="text-md font-semibold text-gray-800 mb-3">
                                {webtoon.title} 에피소드 목록
                              </h3>
                              {episodes[webtoon.id.toString()].length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                  {episodes[webtoon.id.toString()]
                                    .sort((a, b) => a.episodeNumber - b.episodeNumber)
                                    .map((episode: any) => (
                                      <div key={episode.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex-1 min-w-0">
                                          <span className="text-sm font-medium text-gray-700 line-clamp-2 block">
                                            {episode.episodeNumber === 0 ? '프롤로그' : `${episode.episodeNumber}화`}. {episode.title || '제목 없음'}
                                          </span>
                                          <div className="flex items-center mt-1 text-xs text-gray-500">
                                            <span>이미지 {Array.isArray(episode.images) ? episode.images.length : 0}개</span>
                                            <span className="mx-2">•</span>
                                            <span>{new Date(episode.createdAt || episode.updatedAt).toLocaleDateString('ko-KR')}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-1 ml-2">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              console.log('편집 버튼 클릭:', `/episode/${webtoon.id}/edit/${episode.id}`);
                                              router.push(`/episode/${webtoon.id}/edit/${episode.id}`);
                                            }}
                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors cursor-pointer"
                                            title="에피소드 수정"
                                          >
                                            편집
                                          </button>
                                          <button
                                            onClick={() => handleDeleteEpisode(episode.id, webtoon.id.toString())}
                                            className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                                            title="에피소드 삭제"
                                          >
                                            삭제
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600">등록된 에피소드가 없습니다.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {(!Array.isArray(webtoons) || webtoons.length === 0) && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">아직 등록된 작품이 없습니다.</div>
                <button 
                  onClick={() => router.push('/upload')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  첫 작품 등록하기
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}