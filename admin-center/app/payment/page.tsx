'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, RefreshCw, Coins, BookOpen, Eye, Calendar } from 'lucide-react';
import { comicsAPI } from '@/lib/api-axios';

interface Comic {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  status: string;
  createdAt: string;
  ageRating?: number | string;
  totalEpisodes: number;
  paidStartEpisode: number;
  episodeCoinPrice: number;
  rentalCoinPrice?: number | null;
  rentalDays?: number;
}

// 저장·조회는 로그인한 관리자 토큰으로 (예전 하드코딩 토큰은 서버가 거부해 저장이 안 됐다)
const adminAuthHeader = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  return token ? `Bearer ${token}` : '';
};

function PaymentManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'general'; // 'general' 또는 'adult'
  
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredComics, setFilteredComics] = useState<Comic[]>([]);

  useEffect(() => {
    fetchComics();
  }, [mode]);

  useEffect(() => {
    // 검색 필터링
    if (searchTerm.trim()) {
      const filtered = comics.filter(comic =>
        comic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comic.authorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredComics(filtered);
    } else {
      setFilteredComics(comics);
    }
  }, [searchTerm, comics]);

  // API 베이스 URL 가져오기 (환경별 자동 감지)
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

  const fetchComics = async () => {
    try {
      setLoading(true);
      
      // 백엔드 API 호출 (관리자 인증 토큰 포함)
      const apiBaseUrl = getApiBaseUrl();
      const ratingParam = mode === 'adult' ? '19' : 'general';
      const response = await fetch(`${apiBaseUrl}/admin/comics?rating=${ratingParam}&limit=100`, {
        headers: {
          'Authorization': adminAuthHeader(),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('백엔드 응답 데이터:', data);
        
        if (data.success && data.comics) {
          // 백엔드에서 이미 에피소드 수를 포함해서 보내줌
          const comicsWithEpisodes = data.comics.map((comic: any) => ({
            ...comic,
            totalEpisodes: comic.episodeCount || 0,
            paidStartEpisode: comic.paidStartEpisode || 1,
            episodeCoinPrice: comic.episodeCoinPrice || 3
          }));
          
          setComics(comicsWithEpisodes);
        } else {
          console.error('API 응답 형식 오류:', data);
          setComics([]);
        }
      } else {
        console.error('웹툰 목록 조회 실패:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('오류 상세:', errorText);
        setComics([]);
      }
    } catch (error) {
      console.error('웹툰 목록 조회 오류:', error);
      setComics([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSettingsUpdate = async (comicId: string, paidStartEpisode: number, episodeCoinPrice: number, rentalCoinPrice: number | null, rentalDays: number) => {
    try {
      setSaving(comicId);
      
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin/comics/${comicId}/payment-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminAuthHeader()
        },
        body: JSON.stringify({
          paidStartEpisode,
          episodeCoinPrice,
          rentalCoinPrice,
          rentalDays
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('결제 설정 저장 성공:', data);
        
        // 로컬 상태 업데이트
        setComics(prevComics =>
          prevComics.map(comic =>
            comic.id === comicId
              ? { ...comic, paidStartEpisode, episodeCoinPrice, rentalCoinPrice, rentalDays }
              : comic
          )
        );
        
        // 프론트엔드 캐시 무효화를 위한 이벤트 발생
        if (typeof window !== 'undefined') {
          // localStorage에 캐시 무효화 신호 저장
          localStorage.setItem('cache_invalidate_' + comicId, Date.now().toString());
          
          // PostMessage로 다른 탭에도 알림
          window.postMessage({ 
            type: 'paymentSettingsUpdated', 
            comicId, 
            paidStartEpisode, 
            episodeCoinPrice 
          }, '*');
        }
        
        alert('결제 설정이 저장되었습니다.\n변경사항이 즉시 반영됩니다.');
      } else {
        const errorData = await response.json();
        console.error('결제 설정 저장 실패:', response.status, errorData);
        alert(`결제 설정 저장에 실패했습니다: ${errorData.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('결제 설정 저장 오류:', error);
      alert('결제 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">웹툰 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>돌아가기</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                {mode === 'adult' ? '성인웹툰' : '일반웹툰'} 결제 관리
              </h1>
            </div>
            
            <button
              onClick={fetchComics}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>새로고침</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 바 */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="웹툰 제목 또는 작가명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 웹툰 수</p>
                <p className="text-2xl font-bold text-gray-900">{filteredComics.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Coins className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">전편 무료 웹툰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredComics.filter(comic => comic.paidStartEpisode === 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Eye className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 조회수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredComics.reduce((sum, comic) => sum + (comic.viewCount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 웹툰 목록 테이블 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    웹툰 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 에피소드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    유료 시작화
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    에피소드당 코인 (소장)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    대여 (가격 · 기간)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    저장
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredComics.map((comic) => (
                  <ComicRow
                    key={comic.id}
                    comic={comic}
                    onSave={handlePaymentSettingsUpdate}
                    isSaving={saving === comic.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredComics.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 웹툰이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ComicRowProps {
  comic: Comic;
  onSave: (comicId: string, paidStartEpisode: number, episodeCoinPrice: number, rentalCoinPrice: number | null, rentalDays: number) => void;
  isSaving: boolean;
}

function ComicRow({ comic, onSave, isSaving }: ComicRowProps) {
  const [paidStartEpisode, setPaidStartEpisode] = useState(comic.paidStartEpisode);
  const [episodeCoinPrice, setEpisodeCoinPrice] = useState(comic.episodeCoinPrice);
  // 대여가: 빈 값 = 자동(소장가-1), 0 = 대여 없음
  const [rentalCoinPrice, setRentalCoinPrice] = useState<string>(comic.rentalCoinPrice === null || comic.rentalCoinPrice === undefined ? '' : String(comic.rentalCoinPrice));
  const [rentalDays, setRentalDays] = useState<number>(comic.rentalDays || 3);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const originalRental = comic.rentalCoinPrice === null || comic.rentalCoinPrice === undefined ? '' : String(comic.rentalCoinPrice);
    const changed = paidStartEpisode !== comic.paidStartEpisode ||
                   episodeCoinPrice !== comic.episodeCoinPrice ||
                   rentalCoinPrice !== originalRental ||
                   rentalDays !== (comic.rentalDays || 3);
    setHasChanges(changed);
  }, [paidStartEpisode, episodeCoinPrice, rentalCoinPrice, rentalDays, comic.paidStartEpisode, comic.episodeCoinPrice, comic.rentalCoinPrice, comic.rentalDays]);

  const handleSave = () => {
    onSave(comic.id, paidStartEpisode, episodeCoinPrice, rentalCoinPrice === '' ? null : parseInt(rentalCoinPrice), rentalDays);
    setHasChanges(false);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <img
            src={comic.thumbnail || '/api/placeholder/60/80'}
            alt={comic.title}
            className="h-16 w-12 object-cover rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/api/placeholder/60/80';
            }}
          />
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
              {comic.title}
            </div>
            <div className="text-sm text-gray-500">{comic.authorName}</div>
            <div className="text-xs text-gray-400">{comic.genre}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-900">
          {comic.totalEpisodes}화
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min="0"
            max={comic.totalEpisodes}
            value={paidStartEpisode}
            onChange={(e) => setPaidStartEpisode(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-xs text-gray-500">화부터</span>
          <button
            type="button"
            onClick={() => setPaidStartEpisode(0)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              paidStartEpisode === 0
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-green-100'
            }`}
          >
            전편 무료
          </button>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {paidStartEpisode === 0 ? (
            <span className="text-sm text-green-600 font-medium">무료</span>
          ) : (
            <>
              <input
                type="number"
                min="0"
                max="100"
                value={episodeCoinPrice}
                onChange={(e) => setEpisodeCoinPrice(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Coins className="w-4 h-4 text-yellow-500 ml-1" />
            </>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {paidStartEpisode === 0 ? (
          <span className="text-sm text-gray-400">-</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max={Math.max(0, episodeCoinPrice - 1)}
              value={rentalCoinPrice}
              placeholder={`자동 ${Math.max(1, episodeCoinPrice - 1)}`}
              onChange={(e) => setRentalCoinPrice(e.target.value)}
              title="비우면 소장가-1 자동, 0이면 대여 없음"
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Coins className="w-4 h-4 text-yellow-500" />
            <input
              type="number"
              min="1"
              max="30"
              value={rentalDays}
              onChange={(e) => setRentalDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-14 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500">일</span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {comic.viewCount?.toLocaleString() || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(comic.createdAt).toLocaleDateString('ko-KR')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
            hasChanges
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? '저장중' : '저장'}</span>
        </button>
      </td>
    </tr>
  );
}

export default function PaymentManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">결제 관리 페이지를 불러오는 중...</p>
        </div>
      </div>
    }>
      <PaymentManagementContent />
    </Suspense>
  );
}