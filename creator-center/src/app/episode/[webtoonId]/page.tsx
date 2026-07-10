'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { Upload, Save, ArrowLeft, Image } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';

export default function EpisodeUploadPage() {
  const router = useRouter();
  const params = useParams();
  const webtoonId = params.webtoonId as string;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    episodeNumber: 1,
  });
  const [episodeFiles, setEpisodeFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isDragging, setIsDragging] = useState(false);
  const [isThumbnailDragging, setIsThumbnailDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // 페이지 로드 시 다음 에피소드 번호 자동 설정
  useEffect(() => {
    const fetchNextEpisodeNumber = async () => {
      try {
        const webtoon = await webtoonAPI.getWebtoon(webtoonId);
        const existingNumbers = webtoon.data.episodes?.map((ep: any) => ep.episodeNumber) || [];
        
        // 0화가 없으면 0을 제안, 있으면 1부터 시작
        let nextNumber = existingNumbers.includes(0) ? 1 : 0;
        while (existingNumbers.includes(nextNumber)) {
          nextNumber++;
        }
        setFormData(prev => ({ ...prev, episodeNumber: nextNumber }));
      } catch (error) {
      }
    };
    
    fetchNextEpisodeNumber();
  }, [webtoonId]);

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
    // 파일 크기 검증 (20MB = 20 * 1024 * 1024 bytes)
    const maxSize = 20 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name}은(는) 20MB를 초과합니다. 파일 크기를 줄여주세요.`);
        return false;
      }
      return true;
    });
    
    // 정렬된 파일 설정
    const sortedFiles = sortFiles(validFiles, sortOrder);
    setEpisodeFiles(sortedFiles);
  };

  // 정렬 순서 변경
  const handleSortChange = (newOrder: 'asc' | 'desc') => {
    setSortOrder(newOrder);
    const sortedFiles = sortFiles(episodeFiles, newOrder);
    setEpisodeFiles(sortedFiles);
  };

  // 파일 위치 이동
  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...episodeFiles];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setEpisodeFiles(newFiles);
  };

  // 드래그 앤 드롭 핸들러 - 에피소드 이미지
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      handleEpisodeUpload(imageFiles);
    } else {
      alert('이미지 파일만 업로드 가능합니다.');
    }
  };

  // 드래그 앤 드롭 핸들러 - 썸네일
  const handleThumbnailDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThumbnailDragging(true);
  };

  const handleThumbnailDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThumbnailDragging(false);
  };

  const handleThumbnailDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThumbnailDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const maxSize = 20 * 1024 * 1024;
      if (imageFile.size > maxSize) {
        alert('썸네일 파일은 20MB 이하여야 합니다.');
        return;
      }
      setThumbnailFile(imageFile);
    } else {
      alert('이미지 파일만 업로드 가능합니다.');
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('썸네일 파일은 20MB 이하여야 합니다.');
        return;
      }
      setThumbnailFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 더 유연한 파일 검증 (썸네일 또는 이미지 중 하나는 있어야 함)
    if (episodeFiles.length === 0 && !thumbnailFile) {
      alert('썸네일 또는 에피소드 이미지 중 하나는 업로드해주세요.');
      return;
    }

    setLoading(true);

    try {
      const episodeData = new FormData();
      episodeData.append('title', formData.title);
      episodeData.append('episodeNumber', formData.episodeNumber.toString());
      
      // 썸네일 추가
      if (thumbnailFile) {
        episodeData.append('thumbnail', thumbnailFile);
      }
      
      // 에피소드 이미지들 추가
      episodeFiles.forEach((file, index) => {
        episodeData.append('images', file);
      });

      await webtoonAPI.uploadEpisode(webtoonId, episodeData);

      alert('에피소드가 성공적으로 업로드되었습니다!');
      router.push('/manage');
    } catch (error: any) {
      
      // 409 에러 (중복 에피소드 번호) 처리
      if (error.response?.status === 409) {
        const errorData = error.response.data;
        const suggestedNumber = errorData.suggestedEpisodeNumber;
        const existingNumbers = errorData.existingEpisodes || [];
        
        const shouldUseSuggested = confirm(
          `에피소드 번호 ${formData.episodeNumber}는 이미 존재합니다.\n` +
          `기존 에피소드: ${existingNumbers.join(', ')}\n\n` +
          `에피소드 번호를 ${suggestedNumber}로 변경하시겠습니까?`
        );
        
        if (shouldUseSuggested) {
          setFormData(prev => ({ ...prev, episodeNumber: suggestedNumber }));
        }
      } else if (error.response?.status === 400) {
        // 400 에러 (잘못된 요청) 처리
        const errorMessage = error.response?.data?.message || '잘못된 요청입니다.';
        alert(`❌ ${errorMessage}`);
      } else if (error.response?.status === 500) {
        // 500 에러 (서버 오류) 처리
        const errorMessage = error.response?.data?.message || '서버 오류가 발생했습니다.';
        alert(`🚨 서버 오류: ${errorMessage}\n\n개발자 도구 콘솔에서 자세한 정보를 확인하세요.`);
      } else {
        // 기타 에러들
        const errorMessage = error.response?.data?.message || error.message || '업로드 중 오류가 발생했습니다.';
        alert(`⚠️ ${errorMessage}\n다시 시도해주세요.`);
      }
    } finally {
      setLoading(false);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">새 에피소드 업로드</h1>
              <p className="text-gray-600">웹툰에 새로운 에피소드를 추가하세요</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                에피소드 정보
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    에피소드 썸네일 *
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    에피소드 목록에 표시될 이 에피소드의 대표 이미지입니다.
                  </p>
                  
                  {/* 썸네일 드래그 앤 드롭 영역 */}
                  {!thumbnailFile ? (
                    <div
                      onDragEnter={handleThumbnailDragEnter}
                      onDragLeave={handleThumbnailDragLeave}
                      onDragOver={handleThumbnailDragOver}
                      onDrop={handleThumbnailDrop}
                      onClick={() => thumbnailInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                        isThumbnailDragging 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      <div className="flex flex-col items-center">
                        <div className={`mb-2 ${isThumbnailDragging ? 'animate-bounce' : ''}`}>
                          <Image className={`w-8 h-8 ${isThumbnailDragging ? 'text-purple-600' : 'text-gray-400'}`} />
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {isThumbnailDragging ? '썸네일을 놓아주세요!' : '썸네일 드래그 또는 클릭'}
                        </p>
                      </div>
                      
                      {isThumbnailDragging && (
                        <div className="absolute inset-0 bg-purple-500 bg-opacity-10 rounded-lg pointer-events-none" />
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-32 h-40 bg-gray-200 rounded overflow-hidden">
                        <img
                          src={URL.createObjectURL(thumbnailFile)}
                          alt="썸네일 미리보기"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setThumbnailFile(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow-lg"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-500 mt-2">
                    권장 크기: 300x400px, 최대 20MB
                  </p>
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  에피소드 이미지 업로드 *
                </label>
                
                {/* 드래그 앤 드롭 영역 */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => handleEpisodeUpload(Array.from(e.target.files || []))}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center">
                    <div className={`mb-4 ${isDragging ? 'animate-bounce' : ''}`}>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        isDragging ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <Image className={`w-8 h-8 ${isDragging ? 'text-purple-600' : 'text-gray-400'}`} />
                      </div>
                    </div>
                    
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {isDragging ? '이미지를 놓아주세요!' : '이미지를 드래그하여 업로드'}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      또는 클릭하여 파일 선택
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      파일 선택
                    </button>
                  </div>
                  
                  {isDragging && (
                    <div className="absolute inset-0 bg-purple-500 bg-opacity-10 rounded-lg pointer-events-none" />
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  권장 크기: 가로 690px, 파일당 최대 20MB (최대 50장까지 업로드 가능)
                </p>
                
                {episodeFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-700">
                        선택된 파일: {episodeFiles.length}개
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
                          오름차순 (A→Z)
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
                          내림차순 (Z→A)
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                      {episodeFiles.map((file, index) => (
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
                            {index < episodeFiles.length - 1 && (
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
                                const newFiles = episodeFiles.filter((_, i) => i !== index);
                                setEpisodeFiles(newFiles);
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
                    
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">
                        💡 팁: 파일명에 숫자를 넣으면 자동으로 순서대로 정렬됩니다 (예: 01.jpg, 02.jpg, 03.jpg)
                      </p>
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
                {loading ? '업로드 중...' : '에피소드 업로드'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}