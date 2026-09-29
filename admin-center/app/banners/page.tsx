'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, Search, X } from 'lucide-react';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  webtoonId?: string;
  webtoonTitle?: string;
  type: string;
  rating: number;
  isActive: boolean;
  order: number;
}

interface Webtoon {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  status: string;
}

function BannerManagePageContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const isAdultMode = type === 'adult';
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    ctaText: '',
    ctaLink: '',
    webtoonId: '',
    webtoonTitle: '',
    type: 'event',
    rating: 4.5
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Webtoon[]>([]);
  const [showWebtoonSearch, setShowWebtoonSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, [isAdultMode]);

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/proxy/banners?admin=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // 타입에 따라 필터링
        const filteredBanners = isAdultMode 
          ? (data.banners || []).filter((b: Banner) => b.type === 'adult')
          : (data.banners || []).filter((b: Banner) => b.type !== 'adult');
        setBanners(filteredBanners);
      }
    } catch (error) {
      console.error('배너 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      // 이미지 파일을 저장하여 나중에 폼 제출 시 함께 전송
      setImageFile(file);
      
      // 미리보기를 위해 Data URL로 변환
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('이미지 처리에 실패했습니다.');
      setUploading(false);
    }
  };

  const searchWebtoons = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // 성인/일반 모드에 따라 다른 API 호출
      const apiUrl = `/api/proxy/comics?adult=${isAdultMode}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const comics = data.comics || [];
        // 검색어로 필터링
        const filtered = comics.filter((comic: any) => 
          comic.title.toLowerCase().includes(query.toLowerCase()) ||
          comic.authorName.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('웹툰 검색 실패:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectWebtoon = (webtoon: Webtoon) => {
    setFormData(prev => ({
      ...prev,
      webtoonId: webtoon.id,
      webtoonTitle: webtoon.title,
      ctaLink: `/webtoons/${webtoon.id}`
    }));
    setShowWebtoonSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // 이미지 파일인지 확인
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      } else {
        alert('이미지 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      
      // 기본 데이터 추가 (imageUrl 제외)
      Object.keys(formData).forEach(key => {
        if (key !== 'imageUrl' && key !== 'webtoonTitle' && formData[key as keyof typeof formData] !== '') {
          formDataToSend.append(key, String(formData[key as keyof typeof formData]));
        }
      });
      
      // 이미지 파일 추가
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.imageUrl && !formData.imageUrl.startsWith('data:')) {
        // 기존 이미지 URL이 있고 Data URL이 아닌 경우
        formDataToSend.append('imageUrl', formData.imageUrl);
      }
      
      // 성인 모드인 경우 type을 adult로 강제 설정
      if (isAdultMode) {
        formDataToSend.set('type', 'adult');
      }
      
      const url = editingBanner
        ? `/api/proxy/banners?id=${editingBanner.id}`
        : '/api/proxy/banners';
      
      const method = editingBanner ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formDataToSend
      });
      
      if (response.ok) {
        await fetchBanners();
        setShowModal(false);
        setEditingBanner(null);
        setFormData({
          title: '',
          subtitle: '',
          description: '',
          imageUrl: '',
          ctaText: '',
          ctaLink: '',
          webtoonId: '',
          webtoonTitle: '',
          type: isAdultMode ? 'adult' : 'event',
          rating: 4.5
        });
        setImageFile(null);
        alert(editingBanner ? '배너가 수정되었습니다.' : '배너가 추가되었습니다.');
      }
    } catch (error) {
      alert('배너 저장에 실패했습니다.');
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      imageUrl: banner.imageUrl,
      ctaText: banner.ctaText,
      ctaLink: banner.ctaLink,
      webtoonId: banner.webtoonId || '',
      webtoonTitle: banner.webtoonTitle || '',
      type: banner.type,
      rating: banner.rating
    });
    setShowModal(true);
  };

  const handleDelete = async (bannerId: number) => {
    if (!confirm('정말 이 배너를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/proxy/banners?id=${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        await fetchBanners();
        alert('배너가 삭제되었습니다.');
      }
    } catch (error) {
      alert('배너 삭제에 실패했습니다.');
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const response = await fetch(`/api/proxy/banners?id=${banner.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !banner.isActive })
      });
      
      if (response.ok) {
        await fetchBanners();
      }
    } catch (error) {
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{isAdultMode ? '성인 배너 관리' : '메인 배너 관리'}</h1>
          <p className="text-gray-400">{isAdultMode ? '성인 사용자에게 표시될 배너를 관리합니다' : '메인 페이지 상단 슬라이드 배너를 관리합니다'}</p>
          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400">
              📏 <strong>썸네일 권장 크기:</strong> 1200x600px (2:1 비율) - 현재 800x400px에서 더 큰 크기로 변경을 권장합니다
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>배너 추가</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-gray-400">배너를 불러오는 중...</span>
        </div>
      ) : (
        <div className="grid gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start space-x-4">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-32 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{banner.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      banner.type === 'event' ? 'bg-red-500 text-white' :
                      banner.type === 'best' ? 'bg-yellow-500 text-black' :
                      'bg-purple-500 text-white'
                    }`}>
                      {banner.type === 'event' ? 'EVENT' : 
                       banner.type === 'best' ? 'BEST' : 'OFFICIAL'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      banner.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {banner.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                  <p className="text-purple-400 text-sm mb-1">{banner.subtitle}</p>
                  <p className="text-gray-300 text-sm mb-2">{banner.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>⭐ {banner.rating}</span>
                    {banner.webtoonTitle ? (
                      <span>📖 {banner.webtoonTitle}</span>
                    ) : (
                      <span>→ {banner.ctaLink}</span>
                    )}
                    <span>순서: {banner.order}</span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`p-2 rounded ${
                      banner.isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                    } text-white`}
                    title={banner.isActive ? '비활성화' : '활성화'}
                  >
                    {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    title="수정"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 배너 추가/편집 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                {editingBanner ? '배너 편집' : '새 배너 추가'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">제목</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">부제목</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-20 resize-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    배너 이미지 (권장: 1200x600px)
                  </label>
                  <div className="space-y-3">
                    {/* 이미지 업로드 */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
                        isDragOver 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-gray-600 hover:border-gray-500'
                      } ${uploading ? 'opacity-50' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                        id="image-upload"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`cursor-pointer flex flex-col items-center justify-center py-6 ${
                          uploading ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        <Upload className={`w-8 h-8 mb-2 transition-colors ${
                          isDragOver ? 'text-purple-400' : 'text-gray-400'
                        } ${uploading ? 'animate-spin' : ''}`} />
                        <span className={`text-sm mb-1 transition-colors ${
                          isDragOver ? 'text-purple-300' : 'text-gray-400'
                        }`}>
                          {uploading ? '업로드 중...' : 
                           isDragOver ? '이미지를 여기에 놓으세요' : 
                           '클릭하거나 이미지를 드래그하여 업로드'}
                        </span>
                        <span className="text-xs text-gray-500">
                          JPG, PNG, WebP (최대 5MB)
                        </span>
                      </label>
                    </div>
                    
                    {/* 이미지 미리보기 */}
                    {formData.imageUrl && (
                      <div className="relative">
                        <img
                          src={formData.imageUrl.startsWith('/') ? `/uploads${formData.imageUrl}` : formData.imageUrl}
                          alt="배너 미리보기"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">버튼 텍스트</label>
                    <input
                      type="text"
                      value={formData.ctaText}
                      onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">연결할 웹툰</label>
                    <div className="space-y-2">
                      {/* 선택된 웹툰 표시 */}
                      {formData.webtoonTitle ? (
                        <div className="flex items-center justify-between bg-gray-600 rounded px-3 py-2">
                          <span className="text-white text-sm">{formData.webtoonTitle}</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              webtoonId: '', 
                              webtoonTitle: '', 
                              ctaLink: '' 
                            }))}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowWebtoonSearch(true)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-left text-gray-400 hover:bg-gray-600 transition-colors"
                        >
                          웹툰 검색 및 선택...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">타입</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    >
                      {isAdultMode ? (
                        <option value="adult">성인</option>
                      ) : (
                        <>
                          <option value="event">이벤트</option>
                          <option value="best">베스트</option>
                          <option value="serialized">정식연재</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">평점</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating}
                      onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value)})}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingBanner(null);
                      setFormData({
                        title: '',
                        subtitle: '',
                        description: '',
                        imageUrl: '',
                        ctaText: '',
                        ctaLink: '',
                        webtoonId: '',
                        webtoonTitle: '',
                        type: 'event',
                        rating: 4.5
                      });
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                  >
                    {editingBanner ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 웹툰 검색 모달 */}
      {showWebtoonSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">웹툰 검색</h3>
                <button
                  onClick={() => {
                    setShowWebtoonSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

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
              <div className="max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                    <span className="ml-2 text-gray-400">검색 중...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((webtoon) => (
                      <div
                        key={webtoon.id}
                        onClick={() => selectWebtoon(webtoon)}
                        className="flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <img
                          src={webtoon.thumbnail.startsWith('/') ? webtoon.thumbnail : `/uploads/${webtoon.thumbnail}`}
                          alt={webtoon.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{webtoon.title}</h4>
                          <p className="text-sm text-gray-400">{webtoon.authorName}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{webtoon.genre}</span>
                            <span>•</span>
                            <span>조회 {webtoon.viewCount?.toLocaleString()}</span>
                            <span>•</span>
                            <span>좋아요 {webtoon.likeCount?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">웹툰을 검색해보세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BannerManagePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        <span className="ml-3 text-gray-400">로딩 중...</span>
      </div>
    }>
      <BannerManagePageContent />
    </Suspense>
  );
}