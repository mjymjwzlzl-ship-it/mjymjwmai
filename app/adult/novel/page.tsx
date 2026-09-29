'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Clock, User, Eye, Heart, MessageCircle, TrendingUp, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAdultStore } from '@/store/adult';

interface Novel {
  id: string;
  title: string;
  author: string;
  genre: string;
  thumbnail: string;
  description: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  chapterCount: number;
  status: 'ongoing' | 'completed';
  updatedAt: string;
  createdAt: string;
}

export default function AdultNovelPage() {
  const router = useRouter();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isVerified, setIsVerified] = useState(false);
  const setAdult = useAdultStore((s) => s.setAdult);

  // 성인 인증 확인 - 로그인한 경우에만 검증
  useEffect(() => {
    setAdult('on');
    const checkAdultVerification = async () => {
      const token = localStorage.getItem('authToken');

      // 로그인하지 않은 경우, 인증되지 않은 상태로 콘텐츠 보여주기
      if (!token) {
        setIsVerified(false);
        return;
      }

      try {
        const response = await api.get('/users/me');
        if (response.data.adultVerified) {
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        console.error('사용자 정보 확인 실패:', error);
        setIsVerified(false);
      }
    };

    checkAdultVerification();
  }, [router]);

  useEffect(() => {
    if (isVerified) {
      fetchNovels();
    }
  }, [selectedCategory, isVerified]);

  const fetchNovels = async () => {
    try {
      const response = await api.get('/novels', {
        params: { category: selectedCategory, type: 'adult' }
      });
      setNovels(response.data.novels || []);
    } catch (error) {
      console.error('성인 소설 목록 로드 실패:', error);
      // 임시 데이터 (성인 콘텐츠)
      setNovels([
        {
          id: '1',
          title: '금단의 사랑',
          author: '김성인',
          genre: '성인 로맨스',
          thumbnail: '/placeholder.jpg',
          description: '금기를 넘나드는 위험한 사랑 이야기',
          viewCount: 25420,
          likeCount: 3341,
          commentCount: 756,
          chapterCount: 89,
          status: 'ongoing',
          updatedAt: '2025-01-15',
          createdAt: '2024-11-20'
        },
        {
          id: '2',
          title: '욕망의 밤',
          author: '이성인',
          genre: '성인 스릴러',
          thumbnail: '/placeholder.jpg',
          description: '어둠 속에서 피어나는 치명적 매력',
          viewCount: 18900,
          likeCount: 2821,
          commentCount: 523,
          chapterCount: 156,
          status: 'completed',
          updatedAt: '2025-01-10',
          createdAt: '2024-06-15'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'romance', label: '성인 로맨스' },
    { value: 'thriller', label: '성인 스릴러' },
    { value: 'fantasy', label: '성인 판타지' },
    { value: 'drama', label: '성인 드라마' },
    { value: 'bl', label: 'BL' },
    { value: 'gl', label: 'GL' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold text-white mb-2">성인 인증이 필요합니다</h2>
          <p className="text-gray-400">성인 콘텐츠를 보시려면 연령 인증을 완료해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 성인 콘텐츠 공지 배너 */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 py-2">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white font-medium text-sm">
            🔞 만 19세 이상만 이용 가능한 성인 콘텐츠입니다
          </p>
        </div>
      </div>

      {/* 헤더 배너 */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 text-white">
            <Book className="w-8 h-8" />
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">성인 웹소설</h1>
                  <span className="bg-red-800 text-white text-sm px-3 py-1 rounded-full font-bold">
                    19+
                  </span>
                </div>
                <p className="text-red-100 mt-1">성인 전용 웹소설을 즐겨보세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 소설 목록 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {novels.map(novel => (
            <div
              key={novel.id}
              className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-red-500"
              onClick={() => router.push(`/adult/novel/${novel.id}`)}
            >
              <div className="flex">
                {/* 썸네일 */}
                <div className="w-32 h-44 bg-gray-300 dark:bg-gray-700 flex-shrink-0 relative">
                  <img
                    src={novel.thumbnail}
                    alt={novel.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128x176/DC2626/FFFFFF?text=19%2B';
                    }}
                  />
                  {/* 19+ 배지 */}
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    19+
                  </div>
                </div>

                {/* 정보 */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">
                        {novel.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <User className="w-3 h-3" />
                        {novel.author}
                      </p>
                    </div>
                    {novel.status === 'completed' && (
                      <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded">
                        완결
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {novel.description}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Book className="w-3 h-3" />
                      {novel.chapterCount}화
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(novel.viewCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(novel.likeCount)}
                    </span>
                  </div>

                  <div className="mt-2">
                    <span className="inline-block bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs px-2 py-1 rounded">
                      {novel.genre}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {novels.length === 0 && (
          <div className="text-center py-12">
            <Book className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">아직 등록된 성인 소설이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}