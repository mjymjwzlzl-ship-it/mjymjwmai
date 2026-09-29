'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { TrendingUp, GripVertical, Eye, Heart, Search, Plus, Trash2, Save, ArrowLeft, RefreshCw } from 'lucide-react';

interface Webtoon {
  id: string;
  title: string;
  author: string;
  genre: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  isOfficial: boolean;
  rating?: string;
}

interface PopularWebtoon extends Webtoon {
  order: number;
  category: 'official' | 'all';
}

function PopularManageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'general'; // 'general' 또는 'adult'
  
  const [officialPopular, setOfficialPopular] = useState<PopularWebtoon[]>([]);
  const [allWebtoons, setAllWebtoons] = useState<Webtoon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, [mode]);

  // 변경사항 추적
  useEffect(() => {
    setHasChanges(true);
  }, [officialPopular]);

  // API 베이스 URL 가져오기
  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';
      } else {
        return 'https://api.arata.co.kr/api';
      }
    }
    return 'http://localhost:8000/api';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = getApiBaseUrl();
      
      // 웹툰 데이터 가져오기 (일반/성인 구분)
      const ratingParam = mode === 'adult' ? '19' : 'general';
      const webtoonsResponse = await fetch(`${apiBaseUrl}/admin/comics?rating=${ratingParam}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (webtoonsResponse.ok) {
        const webtoonsData = await webtoonsResponse.json();
        if (webtoonsData.success && webtoonsData.comics) {
          const webtoons = webtoonsData.comics.map((w: any) => ({
            id: w.id.toString(),
            title: w.title,
            author: w.authorName || '작가명 없음',
            genre: w.genre,
            thumbnail: w.thumbnail ? (w.thumbnail.startsWith('http') ? w.thumbnail : `${w.thumbnail}`) : '/api/placeholder/120/160',
            viewCount: w.viewCount || 0,
            likeCount: w.likeCount || 0,
            isOfficial: w.isOfficial || false,
            rating: w.rating
          }));
          setAllWebtoons(webtoons);
          
          // 현재 설정된 인기작 가져오기 (백엔드에서)
          const categoryResponse = await fetch(`${apiBaseUrl}/admin/category-settings`, {
            headers: {
              'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : ''}`
            }
          });
          
          if (categoryResponse.ok) {
            const categoryData = await categoryResponse.json();
            const settings = mode === 'adult' ? categoryData.adultSettings : categoryData.settings;
            const popularIds = settings?.popular || [];
            
            const currentPopular = popularIds.map((id: string, index: number) => {
              const webtoon = webtoons.find((w: Webtoon) => w.id === id);
              return webtoon ? {
                ...webtoon,
                order: index,
                category: 'official' as const
              } : null;
            }).filter(Boolean);
            
            setOfficialPopular(currentPopular);
            setHasChanges(false);
          }
        }
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchWebtoons = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = allWebtoons.filter(webtoon =>
      webtoon.title.toLowerCase().includes(query.toLowerCase()) ||
      webtoon.author.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    
    setSearchResults(results);
  };

  const addToPopular = (webtoon: Webtoon) => {
    // 이미 추가된 웹툰인지 확인
    if (officialPopular.find(p => p.id === webtoon.id)) {
      alert('이미 인기작 목록에 있는 웹툰입니다.');
      return;
    }

    const newPopular: PopularWebtoon = {
      ...webtoon,
      order: officialPopular.length,
      category: 'official'
    };

    setOfficialPopular([...officialPopular, newPopular]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeFromPopular = (id: string) => {
    const updated = officialPopular.filter(p => p.id !== id)
      .map((p, index) => ({ ...p, order: index }));
    setOfficialPopular(updated);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(officialPopular);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 순서 재조정
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setOfficialPopular(reorderedItems);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const apiBaseUrl = getApiBaseUrl();
      
      // 인기작 ID 목록 준비
      const popularIds = officialPopular.map(p => p.id);
      
      // 카테고리 설정 업데이트
      const response = await fetch(`${apiBaseUrl}/admin/category-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('adminToken') || '' : ''}`
        },
        body: JSON.stringify({
          category: 'popular',
          ids: popularIds,
          isAdult: mode === 'adult'
        })
      });

      if (response.ok) {
        alert(`${mode === 'adult' ? '성인' : '일반'} 인기작 설정이 저장되었습니다.`);
        setHasChanges(false);
        
        // 프론트엔드 캐시 무효화
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('categoryUpdated'));
        }
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <span className="ml-3 text-gray-400">데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>돌아가기</span>
            </button>
            <h1 className="text-2xl font-bold text-white">
              {mode === 'adult' ? '성인' : '일반'} 인기작 관리
            </h1>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              hasChanges && !saving
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? '저장 중...' : '변경사항 저장'}</span>
          </button>
        </div>
        
        <p className="text-gray-400">
          드래그 앤 드롭으로 순서를 변경하고, 새로운 웹툰을 인기작에 추가할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 현재 인기작 목록 */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
            인기작 목록 ({officialPopular.length}개)
          </h2>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="popular">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {officialPopular.map((webtoon, index) => (
                    <Draggable key={webtoon.id} draggableId={webtoon.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center space-x-4 p-4 bg-gray-700 rounded-lg transition-all ${
                            snapshot.isDragging ? 'shadow-lg scale-105' : ''
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="text-gray-400 hover:text-white cursor-grab"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>
                          
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>

                          <img
                            src={webtoon.thumbnail}
                            alt={webtoon.title}
                            className="w-12 h-16 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/api/placeholder/120/160';
                            }}
                          />

                          <div className="flex-1">
                            <h3 className="text-white font-medium">{webtoon.title}</h3>
                            <p className="text-sm text-gray-400">{webtoon.author}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span className="flex items-center">
                                <Eye className="w-3 h-3 mr-1" />
                                {webtoon.viewCount.toLocaleString()}
                              </span>
                              <span className="flex items-center">
                                <Heart className="w-3 h-3 mr-1" />
                                {webtoon.likeCount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromPopular(webtoon.id)}
                            className="text-red-400 hover:text-red-300 p-2"
                            title="제거"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {officialPopular.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              아직 인기작이 설정되지 않았습니다.<br/>
              오른쪽에서 웹툰을 검색하여 추가해보세요.
            </div>
          )}
        </div>

        {/* 오른쪽: 웹툰 검색 및 추가 */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-green-400" />
            웹툰 검색 및 추가
          </h2>

          {/* 검색 입력 */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchWebtoons(e.target.value);
                }}
                placeholder="웹툰 제목 또는 작가명으로 검색..."
                className="w-full bg-gray-700 border border-gray-600 rounded pl-10 pr-3 py-2 text-white"
              />
            </div>
          </div>

          {/* 검색 결과 */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {searchResults.map(webtoon => (
              <div
                key={webtoon.id}
                className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <img
                  src={webtoon.thumbnail}
                  alt={webtoon.title}
                  className="w-10 h-14 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/api/placeholder/120/160';
                  }}
                />
                
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">{webtoon.title}</h4>
                  <p className="text-xs text-gray-400">{webtoon.author}</p>
                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      {webtoon.viewCount.toLocaleString()}
                    </span>
                    <span className="flex items-center">
                      <Heart className="w-3 h-3 mr-1" />
                      {webtoon.likeCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => addToPopular(webtoon)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  추가
                </button>
              </div>
            ))}

            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                검색 결과가 없습니다.
              </div>
            )}

            {!searchQuery && (
              <div className="text-center py-4 text-gray-400">
                웹툰을 검색하여 인기작에 추가하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PopularManagePage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <span className="ml-3 text-gray-400">페이지를 불러오는 중...</span>
        </div>
      </div>
    }>
      <PopularManageContent />
    </Suspense>
  );
}