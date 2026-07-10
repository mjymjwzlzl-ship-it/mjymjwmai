'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Plus, Edit, Trash2, Eye, Heart, MessageCircle, TrendingUp, BookOpen } from 'lucide-react';

interface Novel {
  id: string;
  title: string;
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
}

export default function CreatorNovelsPage() {
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewNovelModal, setShowNewNovelModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'ongoing' | 'completed'>('all');

  // 새 소설 폼 상태
  const [newNovel, setNewNovel] = useState({
    title: '',
    genre: 'fantasy',
    description: '',
    isAdult: false,
    thumbnail: ''
  });

  useEffect(() => {
    fetchNovels();
  }, []);

  const fetchNovels = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/creator/novels', {
        headers: {
          'Authorization': `Bearer ${token}`
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
          title: '나의 첫 웹소설',
          genre: '판타지',
          thumbnail: '/placeholder.jpg',
          description: '작가의 첫 번째 판타지 소설',
          status: 'ongoing',
          chapterCount: 25,
          viewCount: 5420,
          likeCount: 342,
          commentCount: 89,
          createdAt: '2024-12-01',
          updatedAt: '2025-01-15',
          isAdult: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNovel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newNovel)
      });

      if (response.ok) {
        alert('소설이 생성되었습니다!');
        setShowNewNovelModal(false);
        fetchNovels();
        setNewNovel({
          title: '',
          genre: 'fantasy',
          description: '',
          isAdult: false,
          thumbnail: ''
        });
      }
    } catch (error) {
      console.error('소설 생성 실패:', error);
      alert('소설 생성에 실패했습니다.');
    }
  };

  const handleDeleteNovel = async (novelId: string) => {
    if (!confirm('정말로 이 소설을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/novels/${novelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('소설이 삭제되었습니다.');
        fetchNovels();
      }
    } catch (error) {
      console.error('소설 삭제 실패:', error);
      alert('소설 삭제에 실패했습니다.');
    }
  };

  const filteredNovels = novels.filter(novel => {
    if (selectedTab === 'ongoing') return novel.status === 'ongoing';
    if (selectedTab === 'completed') return novel.status === 'completed';
    return true;
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Book className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">내 소설 관리</h1>
            </div>
            <button
              onClick={() => setShowNewNovelModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              새 소설 작성
            </button>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">전체 소설</div>
              <div className="text-2xl font-bold">{novels.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">총 조회수</div>
              <div className="text-2xl font-bold">
                {formatNumber(novels.reduce((sum, n) => sum + n.viewCount, 0))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">총 좋아요</div>
              <div className="text-2xl font-bold">
                {formatNumber(novels.reduce((sum, n) => sum + n.likeCount, 0))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-1">총 챕터</div>
              <div className="text-2xl font-bold">
                {novels.reduce((sum, n) => sum + n.chapterCount, 0)}
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 border-b border-gray-200">
            {['all', 'ongoing', 'completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab as any)}
                className={`px-4 py-2 font-medium transition-colors ${
                  selectedTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'all' ? '전체' : tab === 'ongoing' ? '연재중' : '완결'}
              </button>
            ))}
          </div>
        </div>

        {/* 소설 목록 */}
        <div className="grid gap-4">
          {filteredNovels.map(novel => (
            <div key={novel.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-6">
                {/* 썸네일 */}
                <div className="w-32 h-44 bg-gray-200 rounded-lg flex-shrink-0">
                  <img
                    src={novel.thumbnail}
                    alt={novel.title}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x176/4A5568/FFFFFF?text=Novel';
                    }}
                  />
                </div>

                {/* 정보 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{novel.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {novel.genre}
                        </span>
                        {novel.isAdult && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">
                            19+
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
                        onClick={() => router.push(`/novels/${novel.id}/chapters`)}
                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        title="챕터 관리"
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => router.push(`/novels/${novel.id}/edit`)}
                        className="p-2 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        title="수정"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNovel(novel.id)}
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
            <p className="text-gray-500 mb-4">아직 작성한 소설이 없습니다.</p>
            <button
              onClick={() => setShowNewNovelModal(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              첫 소설을 작성해보세요!
            </button>
          </div>
        )}
      </div>

      {/* 새 소설 작성 모달 */}
      {showNewNovelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">새 소설 작성</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={newNovel.title}
                  onChange={(e) => setNewNovel({...newNovel, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="소설 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  장르
                </label>
                <select
                  value={newNovel.genre}
                  onChange={(e) => setNewNovel({...newNovel, genre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fantasy">판타지</option>
                  <option value="romance">로맨스</option>
                  <option value="martial">무협</option>
                  <option value="modern">현대</option>
                  <option value="bl">BL</option>
                  <option value="gl">GL</option>
                  <option value="thriller">스릴러</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={newNovel.description}
                  onChange={(e) => setNewNovel({...newNovel, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="소설 소개를 입력하세요"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newNovel.isAdult}
                    onChange={(e) => setNewNovel({...newNovel, isAdult: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    성인 소설 (19세 이상)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewNovelModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateNovel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                소설 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}