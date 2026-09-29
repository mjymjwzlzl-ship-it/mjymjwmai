'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WebtoonCard from '@/components/ui/WebtoonCard';
import { api } from '@/lib/api';
import { Shield } from 'lucide-react';
import { useAdultStore } from '@/store/adult';

export default function AdultCompletePage() {
  const router = useRouter();
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

  const { data: homeData, isLoading } = useQuery({
    queryKey: ['adult-home-data'],
    queryFn: async () => {
      const response = await api.get('/frontend/adult-home');
      return response.data;
    },
  });

  const categories = homeData?.data?.categories || {};
  const comics = homeData?.data?.allComics || [];
  
  // 성인 웹툰만 필터링
  const filterAdultContent = (comics: any[]) => {
    return comics.filter((item: any) =>
      item.rating === 'ADULT' || item.rating === '19' || item.genre === 'adult' ||
      (item.ageRating && (item.ageRating === '19' || parseInt(item.ageRating) >= 19))
    );
  };

  // 완결 웹툰 필터링
  const completedAdultComics = filterAdultContent(
    categories.completed?.length > 0 
      ? categories.completed 
      : comics.filter((item: any) => item.status === 'COMPLETED')
  );

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 성인 웹툰 전용 공지 배너 */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 py-2">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white font-medium text-sm">
            🔞 만 19세 이상만 이용 가능한 성인 콘텐츠입니다
          </p>
        </div>
      </div>
      
      <div className="mx-auto max-w-screen-xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          <span className="text-red-600">🔞</span> 완결 성인 웹툰
        </h1>
        
        {/* 웹툰 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {completedAdultComics.map((comic: any) => (
            <WebtoonCard
              key={comic.id}
              id={comic.id}
              title={comic.title}
              author={comic.authorName || comic.author?.nickname || '작가'}
              genre={comic.genre || '성인'}
              thumbnailUrl={comic.thumbnail}
              viewCount={comic.viewCount || 0}
              commentCount={comic._count?.comments || 0}
              rating={parseFloat(comic.rating) || 0}
              totalEpisodes={comic._count?.episodes || comic.totalEpisodes || 0}
              updatedAt={comic.updatedAt}
              isOfficial={comic.isOfficial}
              ageRating={19}
              freeEpisodes={comic.freeEpisodes || 0}
              coinPrice={comic.episodeCoinPrice || 0}
            />
          ))}
        </div>
        
        {completedAdultComics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">완결된 성인 웹툰이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}