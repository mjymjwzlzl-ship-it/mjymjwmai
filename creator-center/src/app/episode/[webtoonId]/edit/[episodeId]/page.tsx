'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { Edit, Save, ArrowLeft, Trash2 } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  images: string[];
  thumbnail?: string;
}

export default function EpisodeEditPage() {
  const router = useRouter();
  const params = useParams();
  const webtoonId = params.webtoonId as string;
  const episodeId = params.episodeId as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    episodeNumber: 1,
  });
  const [newEpisodeFiles, setNewEpisodeFiles] = useState<File[]>([]);
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 에피소드 데이터 로드
  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        setInitialLoading(true);
        const webtoon = await webtoonAPI.getWebtoon(webtoonId);
        const episodeData = webtoon.data.episodes?.find((ep: any) => ep.id === episodeId);
        
        if (!episodeData) {
          alert('에피소드를 찾을 수 없습니다.');
          router.push(`/manage?expanded=${webtoonId}`);
          return;
        }

        setEpisode(episodeData);
        setFormData({
          title: episodeData.title || '',
          episodeNumber: episodeData.episodeNumber || 1,
        });
        
        // 이미지 데이터 처리 - 문자열이면 배열로 변환
        let imageArray = [];
        if (episodeData.images) {
          if (typeof episodeData.images === 'string') {
            // 콤마로 구분된 문자열인 경우 배열로 변환
            imageArray = episodeData.images.split(',').filter((img: string) => img.trim());
          } else if (Array.isArray(episodeData.images)) {
            imageArray = episodeData.images;
          }
        }
        
        // 이미지 배열 처리 완료
        
        setExistingImages(imageArray);
        setExistingThumbnail(episodeData.thumbnail || null);
      } catch (error) {
        alert('에피소드를 불러오는데 실패했습니다.');
        router.push('/manage');
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchEpisode();
  }, [webtoonId, episodeId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 파일 정렬 함수
  const sortFiles = (files: File[], order: 'asc' | 'desc') => {
    return [...files].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      return order === 'asc' ? comparison : -comparison;
    });
  };

  const handleEpisodeUpload = (files: File[]) => {
    const maxSize = 20 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name}은(는) 20MB를 초과합니다. 파일 크기를 줄여주세요.`);
        return false;
      }
      return true;
    });
    
    const sortedFiles = sortFiles(validFiles, sortOrder);
    setNewEpisodeFiles(sortedFiles);
  };

  const handleSortChange = (newOrder: 'asc' | 'desc') => {
    setSortOrder(newOrder);
    const sortedFiles = sortFiles(newEpisodeFiles, newOrder);
    setNewEpisodeFiles(sortedFiles);
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...newEpisodeFiles];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setNewEpisodeFiles(newFiles);
  };


  // 기존 이미지 삭제 표시
  const markImageForDeletion = (imagePath: string) => {
    setImagesToDelete(prev => [...prev, imagePath]);
    setExistingImages(prev => Array.isArray(prev) ? prev.filter(img => img !== imagePath) : []);
  };

  // 기존 썸네일 삭제
  const removeExistingThumbnail = () => {
    if (existingThumbnail) {
      setImagesToDelete(prev => [...prev, existingThumbnail]);
      setExistingThumbnail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 제목과 에피소드 번호는 필수
    if (!formData.title.trim()) {
      alert('에피소드 제목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const episodeData = new FormData();
      episodeData.append('title', formData.title);
      episodeData.append('episodeNumber', formData.episodeNumber.toString());
      
      // 에피소드 데이터 준비 완료
      
      // 새 썸네일 추가
      if (newThumbnailFile) {
        episodeData.append('thumbnail', newThumbnailFile);
      }
      
      // 새 에피소드 이미지들 추가
      newEpisodeFiles.forEach((file, index) => {
        episodeData.append('images', file);
      });

      // 삭제할 이미지들 목록 추가
      if (imagesToDelete.length > 0) {
        episodeData.append('imagesToDelete', JSON.stringify(imagesToDelete));
      }

      await webtoonAPI.updateEpisode(episodeId, episodeData);

      alert('에피소드가 성공적으로 수정되었습니다!');
      router.push(`/manage?expanded=${webtoonId}`);
    } catch (error: any) {
      
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        const suggestedNumber = errorData.suggestedEpisodeNumber;
        
        const shouldUseSuggested = confirm(
          `에피소드 번호 ${formData.episodeNumber}는 이미 존재합니다.\n` +
          `에피소드 번호를 ${suggestedNumber}로 변경하시겠습니까?`
        );
        
        if (shouldUseSuggested) {
          setFormData(prev => ({ ...prev, episodeNumber: suggestedNumber }));
        }
      } else {
        const errorMessage = error.response?.data?.message || error.message || '에피소드 수정 중 오류가 발생했습니다.';
        alert(`⚠️ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className=" pt-16 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">에피소드를 불러오는 중...</p>
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">에피소드 편집</h1>
              <p className="text-gray-600">에피소드 정보와 이미지를 수정하세요</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                에피소드 정보
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="episodeNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    에피소드 번호 * <span className="text-sm text-gray-500">(0 = 프롤로그)</span>
                  </label>
                  <input
                    type="number"
                    id="episodeNumber"
                    name="episodeNumber"
                    value={formData.episodeNumber}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    에피소드 제목 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="에피소드 제목을 입력하세요"
                    required
                  />
                </div>
              </div>

              {/* 현재 썸네일 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 썸네일
                </label>
                {existingThumbnail ? (
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-24 bg-gray-200 rounded overflow-hidden">
                      <img
                        src={`${existingThumbnail}`}
                        alt="현재 썸네일"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeExistingThumbnail}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      썸네일 삭제
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">등록된 썸네일이 없습니다.</p>
                )}
              </div>

              {/* 새 썸네일 업로드 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 썸네일 업로드
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewThumbnailFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {newThumbnailFile && (
                  <div className="mt-4">
                    <div className="w-20 h-24 bg-gray-200 rounded overflow-hidden relative">
                      <img
                        src={URL.createObjectURL(newThumbnailFile)}
                        alt="새 썸네일 미리보기"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewThumbnailFile(null)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {newThumbnailFile.name} ({(newThumbnailFile.size / 1024 / 1024).toFixed(2)}MB)
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  권장 크기: 300x400px, 최대 20MB
                </p>
              </div>

              {/* 현재 이미지들 */}
              {Array.isArray(existingImages) && existingImages.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    현재 이미지들 ({existingImages.length}개)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {existingImages.map((imagePath, index) => (
                      <div key={imagePath} className="relative">
                        <div className="w-full h-24 bg-gray-200 rounded overflow-hidden">
                          <img
                            src={`${imagePath}`}
                            alt={`이미지 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => markImageForDeletion(imagePath)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate">이미지 {index + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 이미지 추가
                </label>
                <input
                  type="file"
                  onChange={(e) => handleEpisodeUpload(Array.from(e.target.files || []))}
                  accept="image/*"
                  multiple
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  기존 이미지에 추가됩니다. 권장 크기: 가로 690px, 파일당 최대 20MB
                </p>
                
                {newEpisodeFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-700">
                        추가할 파일: {newEpisodeFiles.length}개
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">정렬:</span>
                        <button
                          type="button"
                          onClick={() => handleSortChange('asc')}
                          className={`px-3 py-1 text-xs rounded ${
                            sortOrder === 'asc' 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          A→Z
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSortChange('desc')}
                          className={`px-3 py-1 text-xs rounded ${
                            sortOrder === 'desc' 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Z→A
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                      {newEpisodeFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-purple-600">{index + 1}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => moveFile(index, index - 1)}
                                className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                title="위로 이동"
                              >
                                ↑
                              </button>
                            )}
                            {index < newEpisodeFiles.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveFile(index, index + 1)}
                                className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                title="아래로 이동"
                              >
                                ↓
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = newEpisodeFiles.filter((_, i) => i !== index);
                                setNewEpisodeFiles(newFiles);
                              }}
                              className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center justify-center"
                              title="삭제"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-md transition-colors duration-200 flex items-center`}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? '수정 중...' : '에피소드 수정'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}