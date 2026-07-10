'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { Upload, Image as ImageIcon, FileText, Save, ArrowLeft } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { getApiUrl } from '@/lib/config';

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  images: string[] | string;
  thumbnail?: string;
  createdAt: string;
}

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    tags: '',
    rating: 'all',
    status: 'ongoing',
    locale: 'ko', // 언어: ko (한국어), en (영어)
    authorName: '',
    authorIntro: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [currentThumbnail, setCurrentThumbnail] = useState<string>('');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodeImages, setEpisodeImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [episodeThumbnailFile, setEpisodeThumbnailFile] = useState<File | null>(null);
  const [currentEpisodeThumbnail, setCurrentEpisodeThumbnail] = useState<string>('');
  const [editingEpisodeTitle, setEditingEpisodeTitle] = useState<string>('');
  const [editingEpisodeNumber, setEditingEpisodeNumber] = useState<number>(1);

  const handleDeleteEpisode = async (episodeId: string) => {
    if (confirm('정말로 이 에피소드를 삭제하시겠습니까?\n삭제된 에피소드는 복구할 수 없습니다.')) {
      try {
        setLoading(true);
        await webtoonAPI.deleteEpisode(episodeId);
        alert('에피소드가 성공적으로 삭제되었습니다.');
        fetchWebtoonData();
        setSelectedEpisode(null);
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || '에피소드 삭제 중 오류가 발생했습니다.';
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateEpisodeMetadata = async () => {
    if (!selectedEpisode) return;

    try {
      setLoading(true);
      await webtoonAPI.updateEpisodeMetadata(selectedEpisode.id, { 
        title: editingEpisodeTitle, 
        episodeNumber: editingEpisodeNumber 
      });

      alert('에피소드 정보가 성공적으로 업데이트되었습니다! (백엔드 연동 필요)');
      fetchWebtoonData(); // 데이터 새로고침
    } catch (error) {
      alert('에피소드 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchWebtoonData();
    }
  }, [params.id]);

  const fetchWebtoonData = async () => {
    try {
      setLoadingData(true);
      const response = await webtoonAPI.getWebtoon(params.id as string);
      const webtoon = response.data;
      
      // 백엔드 enum 값을 프론트엔드 형식으로 변환
      let ratingValue = webtoon.rating || webtoon.ageRating || webtoon.age_rating || 'all';
      if (ratingValue === 'ADULT') ratingValue = '19';
      else if (ratingValue === 'GENERAL') ratingValue = 'all';

      setFormData({
        title: webtoon.title || '',
        description: webtoon.description || '',
        genre: webtoon.genre || '',
        tags: webtoon.tags || '',
        rating: ratingValue,
        status: webtoon.status?.toLowerCase() || 'ongoing',
        locale: webtoon.locale || 'ko',
        authorName: webtoon.authorName || '',
        authorIntro: webtoon.authorIntro || '',
      });
      
      
      if (webtoon.thumbnail) {
        setCurrentThumbnail(getImageUrl(webtoon.thumbnail));
      }
      
      // 에피소드 정보 설정
      if (webtoon.episodes && webtoon.episodes.length > 0) {
        setEpisodes(webtoon.episodes);
      }
    } catch (error) {
      alert('웹툰 정보를 불러올 수 없습니다.');
      router.push('/manage');
    } finally {
      setLoadingData(false);
    }
  };

  // 에피소드 선택 시 이미지 목록 파싱
  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
    setEditingEpisodeTitle(episode.title);
    setEditingEpisodeNumber(episode.episodeNumber);
    
    // 현재 에피소드 썸네일 설정
    if (episode.thumbnail) {
      setCurrentEpisodeThumbnail(getImageUrl(episode.thumbnail));
    } else {
      setCurrentEpisodeThumbnail('');
    }
    setEpisodeThumbnailFile(null);
    
    // 이미지 데이터 파싱 (안전하게)
    let imageList: string[] = [];
    try {
      if (episode.images) {
        if (Array.isArray(episode.images)) {
          imageList = episode.images;
        } else if (typeof episode.images === 'string') {
          // JSON 형식인 경우
          if (episode.images.startsWith('[') || episode.images.startsWith('{')) {
            imageList = JSON.parse(episode.images);
          } else {
            // 콤마 구분 문자열인 경우
            imageList = episode.images.split(',').map(img => img.trim()).filter(img => img);
          }
        }
      }
    } catch (error) {
      imageList = [];
    }
    
    setEpisodeImages(imageList);
  };

  // 이미지 순서 정렬
  const sortImages = (images: string[], order: 'asc' | 'desc') => {
    return [...images].sort((a, b) => {
      // 파일명만 추출해서 비교
      const aName = a.split('/').pop() || '';
      const bName = b.split('/').pop() || '';
      const comparison = aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
      return order === 'asc' ? comparison : -comparison;
    });
  };

  // 정렬 순서 변경
  const handleSortChange = (newOrder: 'asc' | 'desc') => {
    setSortOrder(newOrder);
    const sortedImages = sortImages(episodeImages, newOrder);
    setEpisodeImages(sortedImages);
  };

  // 이미지 위치 이동
  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...episodeImages];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setEpisodeImages(newImages);
  };

  // 이미지 삭제
  const removeImage = (index: number) => {
    const newImages = episodeImages.filter((_, i) => i !== index);
    setEpisodeImages(newImages);
  };

  // 새 이미지 파일 추가
  const handleNewImageUpload = (files: File[]) => {
    // 파일 크기 검증 (20MB = 20 * 1024 * 1024 bytes)
    const maxSize = 20 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`${file.name}은(는) 20MB를 초과합니다. 파일 크기를 줄여주세요.`);
        return false;
      }
      return true;
    });
    
    // 파일명으로 자동 정렬 (오름차순)
    const sortedFiles = validFiles.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    
    setNewImageFiles(prev => [...prev, ...sortedFiles]);
  };

  // 새 이미지 파일 정렬
  const sortNewImageFiles = (files: File[], order: 'asc' | 'desc') => {
    return [...files].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      return order === 'asc' ? comparison : -comparison;
    });
  };

  // 새 이미지 파일 위치 이동
  const moveNewImageFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...newImageFiles];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setNewImageFiles(newFiles);
  };

  // 새 이미지 파일 삭제
  const removeNewImageFile = (index: number) => {
    const newFiles = newImageFiles.filter((_, i) => i !== index);
    setNewImageFiles(newFiles);
  };

  // 에피소드 썸네일 업데이트
  const updateEpisodeThumbnail = async () => {
    if (!selectedEpisode) {
      alert('에피소드를 선택해주세요.');
      return;
    }

    if (!episodeThumbnailFile) {
      alert('업로드할 썸네일을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('thumbnail', episodeThumbnailFile);


      const response = await fetch(getApiUrl(`creator/episodes/${selectedEpisode.id}/thumbnail`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`썸네일 업로드 실패: ${response.status}`);
      }

      const result = await response.json();

      alert('에피소드 썸네일이 성공적으로 업데이트되었습니다!');
      
      // 데이터 새로고침 전 잠시 대기
      await fetchWebtoonData(); // 데이터 새로고침
      
      // 업데이트된 에피소드 정보 확인
      setTimeout(() => {
        const updatedEpisode = episodes.find(ep => ep.id === selectedEpisode?.id);
        if (updatedEpisode) {
          // 업데이트 성공
        }
      }, 1000);
      
      setEpisodeThumbnailFile(null);
      
    } catch (error: any) {
      alert(`썸네일 저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 에피소드 이미지 업데이트 (기존 이미지 + 새 이미지)
  const updateEpisodeImages = async () => {
    if (!selectedEpisode) {
      alert('에피소드를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      let finalImageList = [...episodeImages]; // 현재 정렬된 기존 이미지들
      
      // 새 이미지가 있으면 먼저 업로드
      if (newImageFiles.length > 0) {
        const formData = new FormData();
        
        // 새 이미지 파일들을 FormData에 추가 (현재 순서대로)
        newImageFiles.forEach((file, index) => {
          formData.append('images', file);
        });


        const uploadResponse = await fetch(getApiUrl(`creator/episodes/${selectedEpisode.id}/add-images`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });


        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`새 이미지 업로드 실패: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        
        // 새로 업로드된 이미지 경로들을 기존 이미지 목록에 추가
        const newImagePaths = uploadResult.newImages || [];
        finalImageList = [...finalImageList, ...newImagePaths];
      }

      // 이미지가 하나도 없으면 경고
      if (finalImageList.length === 0) {
        alert('저장할 이미지가 없습니다.');
        return;
      }

      // 최종 이미지 순서 업데이트 (기존 + 새 이미지)
      const response = await fetch(getApiUrl(`creator/episodes/${selectedEpisode.id}/reorder`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          images: finalImageList
        })
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`이미지 순서 업데이트 실패: ${response.status}`);
      }

      const updateResult = await response.json();

      alert('이미지가 성공적으로 저장되었습니다!');
      fetchWebtoonData(); // 데이터 새로고침
      setSelectedEpisode(null);
      setEpisodeImages([]);
      setNewImageFiles([]);
      
    } catch (error) {
      alert(`이미지 저장 중 오류가 발생했습니다: ${(error as any)?.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleThumbnailUpload = (files: File[]) => {
    if (files.length > 0) {
      setThumbnailFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      // 웹툰 업데이트 진행

      const updateData = new FormData();
      updateData.append('title', formData.title);
      updateData.append('description', formData.description);
      updateData.append('genre', formData.genre);
      updateData.append('tags', formData.tags);
      updateData.append('rating', formData.rating);
      updateData.append('ageRating', formData.rating);
      updateData.append('age_rating', formData.rating); // snake_case 버전도 시도
      updateData.append('status', formData.status);
      updateData.append('locale', formData.locale);
      updateData.append('authorName', formData.authorName);
      updateData.append('authorIntro', formData.authorIntro);
      
      if (thumbnailFile) {
        updateData.append('thumbnail', thumbnailFile);
      }

      // FormData 내용 로그
      // FormData 확인
      Array.from(updateData.entries()).forEach(([key, value]) => {
        // Form data entry 확인
      });

      const response = await webtoonAPI.updateWebtoon(params.id as string, updateData);

      alert('웹툰이 성공적으로 수정되었습니다!');
      router.push('/manage');
    } catch (error) {
      alert('수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className=" pt-16 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">웹툰 정보를 불러오는 중...</div>
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
              onClick={() => router.push('/manage')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">웹툰 수정</h1>
              <p className="text-gray-600">웹툰 정보와 에피소드 순서를 수정할 수 있습니다</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 기본 정보 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                기본 정보
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    웹툰 제목 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="웹툰 제목을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-2">
                    장르 *
                  </label>
                  <select
                    id="genre"
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="">장르를 선택하세요</option>
                    <option value="romance">로맨스</option>
                    <option value="action">액션</option>
                    <option value="comedy">코미디</option>
                    <option value="drama">드라마</option>
                    <option value="fantasy">판타지</option>
                    <option value="thriller">스릴러</option>
                    <option value="slice-of-life">일상</option>
                    <option value="bl">BL</option>
                    <option value="gl">GL</option>
                    <option value="adult">성인</option>
                    <option value="historical">사극/시대물</option>
                    <option value="sports">스포츠</option>
                    <option value="horror">공포</option>
                    <option value="mystery">미스터리</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    작품 소개 *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="작품의 내용을 간단히 소개해주세요"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
                    연령 등급 *
                  </label>
                  <select
                    id="rating"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="all">전체관람가</option>
                    <option value="12">12세 이상</option>
                    <option value="15">15세 이상</option>
                    <option value="19">19세 이상 (성인)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    연재 상태 *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="ongoing">연재중</option>
                    <option value="completed">완결</option>
                    <option value="hiatus">휴재</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="locale" className="block text-sm font-medium text-gray-700 mb-2">
                    언어 / 플랫폼 *
                  </label>
                  <select
                    id="locale"
                    name="locale"
                    value={formData.locale}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  >
                    <option value="ko">한국어 (KO) - 일반 플랫폼</option>
                    <option value="en">English (EN) - 영어 플랫폼</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    한국어는 일반 플랫폼(/)에, 영어는 영어 플랫폼(/en)에 표시됩니다.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-2">
                    작가명 *
                  </label>
                  <input
                    type="text"
                    id="authorName"
                    name="authorName"
                    value={formData.authorName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="펜네임 또는 실명을 입력하세요"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 썸네일 업로드 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                썸네일 이미지
              </h2>
              
              {currentThumbnail && !thumbnailFile && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">현재 썸네일:</p>
                  <div className="w-32 h-40 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={currentThumbnail}
                      alt="현재 썸네일"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleThumbnailUpload(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-sm text-gray-500 mt-2">
                권장 크기: 300x400px, 최대 20MB
              </p>
            </div>

            {/* 에피소드 관리 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                에피소드 관리
              </h2>
              
              {/* 기존 에피소드 목록 */}
              {episodes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    등록된 에피소드 ({episodes.length}개)
                  </h3>
                  <div className="space-y-3">
                    {episodes.map((episode) => {
                      let imageCount = 0;
                      try {
                        if (episode.images) {
                          if (Array.isArray(episode.images)) {
                            imageCount = episode.images.length;
                          } else if (typeof episode.images === 'string') {
                            if (episode.images.startsWith('[') || episode.images.startsWith('{')) {
                              imageCount = JSON.parse(episode.images).length;
                            } else {
                              imageCount = episode.images.split(',').filter(img => img.trim()).length;
                            }
                          }
                        }
                      } catch (error) {
                        imageCount = 0;
                      }

                      return (
                        <div key={episode.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {episode.episodeNumber}화: {episode.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              이미지 {imageCount}개 • {new Date(episode.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('편집 버튼 클릭:', episode.id, episode.title);
                                handleEpisodeSelect(episode);
                              }}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer"
                            >
                              편집
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEpisode(episode.id)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 에피소드 편집 */}
              {selectedEpisode && (
                <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-medium text-gray-900 mb-6">
                    📝 {selectedEpisode.episodeNumber}화: {selectedEpisode.title} - 편집
                  </h4>

                  {/* 에피소드 메타데이터 수정 */}
                  <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h5 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      에피소드 정보
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="editingEpisodeNumber" className="block text-sm font-medium text-gray-700 mb-2">
                          에피소드 번호
                        </label>
                        <input
                          type="number"
                          id="editingEpisodeNumber"
                          name="editingEpisodeNumber"
                          value={editingEpisodeNumber}
                          onChange={(e) => setEditingEpisodeNumber(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                      <div>
                        <label htmlFor="editingEpisodeTitle" className="block text-sm font-medium text-gray-700 mb-2">
                          에피소드 제목
                        </label>
                        <input
                          type="text"
                          id="editingEpisodeTitle"
                          name="editingEpisodeTitle"
                          value={editingEpisodeTitle}
                          onChange={(e) => setEditingEpisodeTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="에피소드 제목을 입력하세요"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleUpdateEpisodeMetadata}
                        disabled={loading}
                        className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded transition-colors text-sm`}
                      >
                        {loading ? '저장 중...' : '에피소드 정보 저장'}
                      </button>
                    </div>
                  </div>
                  
                  {/* 에피소드 썸네일 관리 */}
                  <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h5 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      에피소드 썸네일
                    </h5>
                    <p className="text-sm text-gray-600 mb-4">
                      에피소드 목록에 표시될 이 에피소드만의 대표 이미지입니다. (선택사항)
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 현재 썸네일 */}
                      {currentEpisodeThumbnail && !episodeThumbnailFile && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">현재 에피소드 썸네일:</p>
                          <div className="w-32 h-40 bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={currentEpisodeThumbnail}
                              alt="현재 에피소드 썸네일"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 새 썸네일 업로드 */}
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          {currentEpisodeThumbnail ? '새 썸네일 업로드:' : '에피소드 썸네일 업로드:'}
                        </p>
                        <input
                          type="file"
                          onChange={(e) => setEpisodeThumbnailFile(e.target.files?.[0] || null)}
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-sm text-gray-500 mt-2">
                          권장 크기: 300x400px, 최대 20MB
                        </p>
                        {!currentEpisodeThumbnail && !episodeThumbnailFile && (
                          <p className="text-sm text-yellow-600 mt-2">
                            💡 썸네일이 없으면 웹툰 대표 썸네일이 사용됩니다.
                          </p>
                                                 )}
                       </div>
                     </div>
                     
                     {/* 썸네일 저장 버튼 */}
                     {episodeThumbnailFile && (
                       <div className="mt-4 flex justify-end">
                         <button
                           type="button"
                           onClick={updateEpisodeThumbnail}
                           disabled={loading}
                           className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded transition-colors text-sm`}
                         >
                           {loading ? '저장 중...' : '썸네일 저장'}
                         </button>
                       </div>
                     )}
                   </div>
                  
                  {episodeImages.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-700">
                          총 {episodeImages.length}개 이미지
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
                      
                      <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                        {episodeImages.map((imagePath, index) => {
                          const fileName = imagePath.split('/').pop() || imagePath;
                          return (
                            <div key={`${imagePath}-${index}`} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                                <span className="text-xs font-semibold text-purple-600">{index + 1}</span>
                              </div>
                              
                              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={getImageUrl(imagePath)}
                                  alt={`이미지 ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
                                  {fileName}
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(index, index - 1)}
                                    className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                    title="위로 이동"
                                  >
                                    ↑
                                  </button>
                                )}
                                {index < episodeImages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(index, index + 1)}
                                    className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                    title="아래로 이동"
                                  >
                                    ↓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center justify-center"
                                  title="삭제"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-xs text-blue-700">
                          💡 팁: 오름차순/내림차순 정렬 후 ↑↓ 버튼으로 세밀하게 조정하세요. 변경사항은 "이미지 저장" 버튼을 눌러야 적용됩니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 새 이미지 추가 섹션 */}
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h5 className="text-md font-medium text-gray-900 mb-3">
                      ➕ 새 이미지 추가
                    </h5>
                    
                    <input
                      type="file"
                      onChange={(e) => handleNewImageUpload(Array.from(e.target.files || []))}
                      accept="image/*"
                      multiple
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {newImageFiles.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-gray-700">
                            추가할 이미지: {newImageFiles.length}개
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">정렬:</span>
                            <button
                              type="button"
                              onClick={() => setNewImageFiles(sortNewImageFiles(newImageFiles, 'asc'))}
                              className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              오름차순 (A→Z)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewImageFiles(sortNewImageFiles(newImageFiles, 'desc'))}
                              className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              내림차순 (Z→A)
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                          {newImageFiles.map((file, index) => (
                            <div key={`new-${file.name}-${index}`} className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                                <span className="text-xs font-semibold text-green-600">+{index + 1}</span>
                              </div>
                              
                              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`새 이미지 ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
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
                                    onClick={() => moveNewImageFile(index, index - 1)}
                                    className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                    title="위로 이동"
                                  >
                                    ↑
                                  </button>
                                )}
                                {index < newImageFiles.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveNewImageFile(index, index + 1)}
                                    className="w-6 h-6 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                    title="아래로 이동"
                                  >
                                    ↓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeNewImageFile(index)}
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
                    
                    <div className="mt-2 p-2 bg-green-100 rounded-lg">
                      <p className="text-xs text-green-700">
                        💡 새로 추가된 이미지들은 기존 이미지 맨 뒤에 추가됩니다. 순서는 저장 후 다시 편집할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                    <button
                      type="button"
                      onClick={updateEpisodeImages}
                      disabled={loading}
                      className={`px-4 py-2 ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded transition-colors`}
                    >
                      {loading ? '저장 중...' : '이미지 저장'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEpisode(null);
                        setEpisodeImages([]);
                        setNewImageFiles([]);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {episodes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 에피소드가 없습니다. 새 에피소드를 추가해주세요.
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/manage')}
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
                {loading ? '수정 중...' : '웹툰 정보 저장'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}