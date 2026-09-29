'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Upload, Image as ImageIcon, FileText, Save } from 'lucide-react';
import { webtoonAPI } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    tags: '',
    episodeTitle: '',
    episodeNumber: 0,
    rating: 'all', // 전체관람가, 12+, 15+, 18+
    status: 'ongoing', // 연재중, 완결, 휴재
    locale: 'ko', // 언어: ko (한국어), en (영어)
    authorName: '',
    authorIntro: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null); // 대표 썸네일
  const [episodeThumbnailFile, setEpisodeThumbnailFile] = useState<File | null>(null); // 에피소드 썸네일
  const [episodeFiles, setEpisodeFiles] = useState<File[]>([]); // 에피소드 내용 이미지

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

  const handleEpisodeThumbnailUpload = (files: File[]) => {
    if (files.length > 0) {
      setEpisodeThumbnailFile(files[0]);
    }
  };

  const handleEpisodeUpload = (files: File[]) => {
    // 파일명으로 자동 정렬 (오름차순)
    const sortedFiles = files.sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    setEpisodeFiles(sortedFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!thumbnailFile) {
      alert('웹툰 대표 썸네일을 업로드해주세요.');
      return;
    }

    if (!episodeThumbnailFile) {
      alert('에피소드 썸네일을 업로드해주세요.');
      return;
    }

    if (episodeFiles.length === 0) {
      alert('에피소드 내용 이미지를 업로드해주세요.');
      return;
    }

    setLoading(true);

    try {
      // FormData 생성
      const uploadData = new FormData();
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('genre', formData.genre);
      uploadData.append('tags', formData.tags);
      uploadData.append('rating', formData.rating);
      uploadData.append('ageRating', formData.rating);
      uploadData.append('age_rating', formData.rating); // snake_case 버전도 시도
      uploadData.append('status', formData.status);
      uploadData.append('locale', formData.locale);
      uploadData.append('authorName', formData.authorName);
      uploadData.append('authorIntro', formData.authorIntro);
      uploadData.append('thumbnail', thumbnailFile);
      
      
      // 웹툰 생성
      const webtoonResponse = await webtoonAPI.createWebtoon(uploadData);
      const webtoonId = webtoonResponse.data.id;

      // 에피소드 업로드
      const episodeData = new FormData();
      episodeData.append('title', formData.episodeTitle);
      episodeData.append('episodeNumber', formData.episodeNumber.toString());
      episodeData.append('thumbnail', episodeThumbnailFile); // 에피소드 썸네일 추가
      
      // 에피소드 이미지들 추가
      episodeFiles.forEach((file, index) => {
        episodeData.append('images', file);
      });

      await webtoonAPI.uploadEpisode(webtoonId, episodeData);

      alert('웹툰이 성공적으로 업로드되었습니다!');
      router.push('/manage');
    } catch (error) {
      alert('업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 메인 콘텐츠 */}
      <main className=" pt-16 p-8">
        <div className="max-w-4xl mx-auto">
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">웹툰 업로드</h1>
            <p className="text-gray-600">새로운 웹툰을 업로드하고 독자들과 만나보세요</p>
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
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    태그
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="태그를 쉼표로 구분해서 입력하세요 (예: 학원, 청춘, 성장)"
                  />
                </div>
              </div>
            </div>

            {/* 작가 정보 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                작가 정보
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
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

                <div className="md:col-span-2">
                  <label htmlFor="authorIntro" className="block text-sm font-medium text-gray-700 mb-2">
                    작가 소개
                  </label>
                  <textarea
                    id="authorIntro"
                    name="authorIntro"
                    value={formData.authorIntro}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="작가님에 대한 간단한 소개를 입력하세요"
                  />
                </div>
              </div>
            </div>

            {/* 웹툰 대표 썸네일 업로드 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                웹툰 대표 썸네일
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                프론트엔드 메인 페이지에 표시될 웹툰의 대표 이미지입니다.
              </p>
              
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleThumbnailUpload(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {thumbnailFile && (
                <div className="mt-2">
                  <div className="w-20 h-24 bg-gray-200 rounded overflow-hidden relative">
                    <img
                      src={URL.createObjectURL(thumbnailFile)}
                      alt="썸네일 미리보기"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setThumbnailFile(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                권장 크기: 300x400px, 최대 20MB
              </p>
            </div>

            {/* 에피소드 썸네일 업로드 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                에피소드 썸네일
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                에피소드 목록에 표시될 이 에피소드의 대표 이미지입니다.
              </p>
              
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleEpisodeThumbnailUpload(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {episodeThumbnailFile && (
                <div className="mt-2">
                  <div className="w-20 h-24 bg-gray-200 rounded overflow-hidden relative">
                    <img
                      src={URL.createObjectURL(episodeThumbnailFile)}
                      alt="에피소드 썸네일 미리보기"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEpisodeThumbnailFile(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                권장 크기: 300x400px, 최대 20MB
              </p>
            </div>

            {/* 에피소드 정보 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                에피소드 내용 업로드
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
                  <label htmlFor="episodeTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    에피소드 제목 *
                  </label>
                  <input
                    type="text"
                    id="episodeTitle"
                    name="episodeTitle"
                    value={formData.episodeTitle}
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
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleEpisodeUpload(Array.from(e.target.files || []))}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {episodeFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-700">선택된 파일: {episodeFiles.length}개</p>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded p-2">
                      {episodeFiles.map((file, index) => (
                        <div key={index} className="text-xs text-gray-600 p-1">
                          {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  여러 이미지를 선택할 수 있습니다. 오름차순/내림차순 정렬과 ↑↓ 버튼으로 순서를 조정하세요. (이미지당 최대 20MB)
                </p>
                <div className="mt-2 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 팁: 파일명에 숫자를 포함하면 자동으로 올바른 순서로 정렬됩니다. (예: 01.jpg, 02.jpg, 03.jpg)
                  </p>
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                임시저장
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 ${loading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-md transition-colors duration-200 flex items-center`}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}