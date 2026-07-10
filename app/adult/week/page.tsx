'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WebtoonCard from '@/components/ui/WebtoonCard';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';
import { Shield } from 'lucide-react';
import { useAdultStore } from '@/store/adult';

export default function AdultWeekPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [selectedDay, setSelectedDay] = useState('전체');
  const [hoveredCardId, setHoveredCardId] = useState<number | string | null>(null);
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

  const { data: comicsData, isLoading } = useQuery({
    queryKey: ['adult-week-comics'],
    queryFn: async () => {
      const response = await api.get('/comics/adult', {
        params: {
          sort: 'latest',
          limit: 1000
        }
      });
      return response.data;
    },
  });

  // voice.mp4 URL 추가
  const comics = (comicsData?.comics || []).map((comic: any) => {
    // 가정교사는 1화_음성 폴더에 voice.mp4가 있음
    if (comic.title === '가정교사') {
      const voicePath = `/uploads/webtoons/adult/${comic.title}/1화_음성/voice.mp4`;
      const voiceUrl = getImageUrl(voicePath);
      return { ...comic, voiceVideoUrl: voiceUrl };
    }
    // 개자식은 루트에 voice.mp4가 있음
    if (comic.title === '개자식') {
      const voicePath = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      const voiceUrl = getImageUrl(voicePath);
      return { ...comic, voiceVideoUrl: voiceUrl };
    }
    // 거유 왁싱샵 실장님들은 루트에 voice.mp4가 있음
    if (comic.title === '거유 왁싱샵 실장님들') {
      const voicePath = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      const voiceUrl = getImageUrl(voicePath);
      return { ...comic, voiceVideoUrl: voiceUrl };
    }
    // 신도시 미시들의 비밀 동아리는 신도시 미시 (NEW) 폴더에 voice.mp4가 있음
    if (comic.title === '신도시 미시들의 비밀 동아리') {
      const voicePath = `/uploads/webtoons/adult/신도시 미시 (NEW)/voice.mp4`;
      const voiceUrl = getImageUrl(voicePath);
      return { ...comic, voiceVideoUrl: voiceUrl };
    }
    // 엘리베이터에 갇힌 두 남녀는 루트에 voice.mp4가 있음
    if (comic.title === '엘리베이터에 갇힌 두 남녀') {
      const voicePath = `/uploads/webtoons/adult/${comic.title}/voice.mp4`;
      const voiceUrl = getImageUrl(voicePath);
      return { ...comic, voiceVideoUrl: voiceUrl };
    }
    return comic;
  });

  // 성인 웹툰만 필터링
  const filterAdultContent = (comics: any[]) => {
    return comics.filter((item: any) =>
      item.rating === 'ADULT' ||
      item.rating === '19' ||
      item.ageRating === 19 ||
      item.ageRating === '19'
    );
  };

  const weekDays = ['전체', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  
  // 요일별 웹툰 필터링
  const getWebtoonsByDay = (day: string) => {
    const adultComics = filterAdultContent(comics);

    // "전체" 선택시 모든 성인 웹툰 반환
    if (day === '전체') {
      return adultComics;
    }

    // 특정 요일 선택시 해당 요일의 웹툰만 반환
    return adultComics.filter((comic: any) => comic.publishDay === day);
  };

  const currentDayWebtoons = getWebtoonsByDay(selectedDay).sort((a: any, b: any) =>
    a.title.localeCompare(b.title, 'ko')
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
          <span className="text-red-600">🔞</span> 요일별 성인 웹툰
        </h1>
        
        {/* 요일 선택 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {weekDays.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedDay === day
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        
        {/* 웹툰 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-visible">
          {(selectedDay === '전체' ? currentDayWebtoons : currentDayWebtoons.slice(0, 18)).map((comic: any) => (
            <WebtoonCard
              key={comic.id}
              id={comic.id}
              title={comic.title}
              author={comic.authorName || comic.author?.nickname || '작가'}
              genre={comic.genre || '성인'}
              thumbnailUrl={comic.thumbnail}
              viewCount={comic.viewCount || 0}
              commentCount={comic._count?.comments || 0}
              rating={comic.averageRating || 0}
              totalEpisodes={comic._count?.episodes || comic.totalEpisodes || 0}
              updatedAt={comic.updatedAt}
              isOfficial={comic.isOfficial}
              ageRating={19}
              freeEpisodes={comic.freeEpisodes || 0}
              coinPrice={comic.episodeCoinPrice || 3}
              paidStartEpisode={comic.paidStartEpisode}
              voiceVideoUrl={comic.voiceVideoUrl}
              hoveredCardId={hoveredCardId}
              onHoverChange={setHoveredCardId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}