'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Edit, Trash2, Eye, Heart, MessageCircle, BookOpen, Search, Filter, Shield } from 'lucide-react';

interface Novel {
  id: string;
  title: string;
  author: string;
  authorId: string;
  genre: string;
  thumbnail: string;
  description: string;
  status: 'ongoing' | 'completed';
  chapterCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  isAdult: boolean;
  isFeatured: boolean;
  isBlocked: boolean;
}

export default function AdminNovelsPage() {
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'adult' | 'general' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'chapters'>('latest');

  useEffect(() => {
    const checkAuth = () => {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        router.push('/login');
      }
    };
    checkAuth();
    fetchNovels();
  }, [router]);

  const fetchNovels = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:8000/api/admin/novels', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNovels(data.novels || []);
      }
    } catch (error) {
      console.error('소설 목록 로드 실패:', error);
      // 임시 데이터
      setNovels([
        {
          id: '1',
          title: '판타지 대작',
          author: '작가1',
          authorId: 'author1',
          genre: '판타지',
          thumbnail: '/placeholder.jpg',
          description: '관리자 페이지 테스트 소설',
          status: 'ongoing',
          chapterCount: 150,
          viewCount: 45200,
          likeCount: 3420,
          commentCount: 890,
          createdAt: '2024-12-01',
          updatedAt: '2025-01-15',
          isAdult: false,
          isFeatured: true,
          isBlocked: false
        },
        {
          id: '2',
          title: '성인 로맨스',
          author: '작가2',
          authorId: 'author2',
          genre: '로맨스',
          thumbnail: '/placeholder.jpg',
          description: '19금 성인 소설',
          status: 'completed',
          chapterCount: 200,
          viewCount: 62300,
          likeCount: 5210,
          commentCount: 1520,
          createdAt: '2024-11-01',
          updatedAt: '2025-01-10',
          isAdult: true,
          isFeatured: false,
          isBlocked: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = async (novelId: string, featured: boolean) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`http://localhost:8000/api/admin/novels/${novelId}/feature`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ featured })
      });
      
      setNovels(novels.map(novel => 
        novel.id === novelId ? { ...novel, isFeatured: featured } : novel
      ));
      alert(featured ? '추천 소설로 설정되었습니다.' : '추천이 해제되었습니다.');
    } catch (error) {
      console.error('추천 설정 실패:', error);
    }
  };

  const handleBlockToggle = async (novelId: string, blocked: boolean) => {
    if (!confirm(blocked ? '이 소설을 차단하시겠습니까?' : '차단을 해제하시겠습니까?')) {
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`http://localhost:8000/api/admin/novels/${novelId}/block`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blocked })
      });
      
      setNovels(novels.map(novel => 
        novel.id === novelId ? { ...novel, isBlocked: blocked } : novel
      ));
      alert(blocked ? '소설이 차단되었습니다.' : '차단이 해제되었습니다.');
    } catch (error) {
      console.error('차단 설정 실패:', error);
    }
  };

  const handleDelete = async (novelId: string) => {
    if (!confirm('정말로 이 소설을 삭제하시겠습니까? 모든 챕터와 댓글이 함께 삭제됩니다.')) {
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:8000/api/admin/novels/${novelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.ok) {
        setNovels(novels.filter(novel => novel.id !== novelId));
        alert('소설이 삭제되었습니다.');
      }
    } catch (error) {
      console.error('소설 삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const filteredNovels = novels
    .filter(novel => {
      if (filterType === 'adult') return novel.isAdult;
      if (filterType === 'general') return !novel.isAdult;
      if (filterType === 'blocked') return novel.isBlocked;
      return true;
    })
    .filter(novel => 
      novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      novel.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'popular') return b.viewCount - a.viewCount;
      if (sortBy === 'chapters') return b.chapterCount - a.chapterCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">소설 관리</h1>
            </div>
            <div className="text-sm text-gray-600">
              전체 {novels.length}개 소설
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">전체 소설</div>
              <div className="text-2xl font-bold">{novels.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">연재중</div>
              <div className="text-2xl font-bold">
                {novels.filter(n => n.status === 'ongoing').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">완결</div>
              <div className="text-2xl font-bold">
                {novels.filter(n => n.status === 'completed').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">성인</div>
              <div className="text-2xl font-bold text-red-600">
                {novels.filter(n => n.isAdult).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">차단</div>
              <div className="text-2xl font-bold text-gray-500">
                {novels.filter(n => n.isBlocked).length}
              </div>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="소설 제목 또는 작가명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="general">일반</option>
              <option value="adult">성인</option>
              <option value="blocked">차단됨</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
              <option value="chapters">챕터순</option>
            </select>
          </div>
        </div>

        {/* 소설 목록 */}
        <div className="grid gap-4">
          {filteredNovels.map(novel => (
            <div 
              key={novel.id} 
              className={`bg-white rounded-lg shadow p-6 ${
                novel.isBlocked ? 'opacity-60' : ''
              }`}
            >
              <div className="flex gap-6">
                {/* 썸네일 */}
                <div className="w-32 h-44 bg-gray-200 rounded-lg flex-shrink-0 relative">
                  <img
                    src={novel.thumbnail}
                    alt={novel.title}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x176/4A5568/FFFFFF?text=Novel';
                    }}
                  />
                  {novel.isBlocked && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{novel.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>작가: {novel.author}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {novel.genre}
                        </span>
                        {novel.isAdult && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">
                            19+
                          </span>
                        )}
                        {novel.isFeatured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                            추천
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded ${
                          novel.status === 'ongoing' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {novel.status === 'ongoing' ? '연재중' : '완결'}
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeatureToggle(novel.id, !novel.isFeatured)}
                        className={`p-2 rounded transition-colors ${
                          novel.isFeatured 
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={novel.isFeatured ? '추천 해제' : '추천 설정'}
                      >
                        ⭐
                      </button>
                      <button
                        onClick={() => router.push(`/novels/${novel.id}/chapters`)}
                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        title="챕터 관리"
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleBlockToggle(novel.id, !novel.isBlocked)}
                        className={`p-2 rounded transition-colors ${
                          novel.isBlocked 
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                        }`}
                        title={novel.isBlocked ? '차단 해제' : '차단'}
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(novel.id)}
                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">{novel.description}</p>

                  {/* 통계 */}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Book className="w-4 h-4" />
                      {novel.chapterCount}화
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatNumber(novel.viewCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {formatNumber(novel.likeCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {formatNumber(novel.commentCount)}
                    </span>
                    <span className="ml-auto text-gray-400">
                      최근 업데이트: {new Date(novel.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNovels.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <Book className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}