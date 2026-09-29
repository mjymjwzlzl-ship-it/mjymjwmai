'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NetflixHero from '@/components/ui/NetflixHero';
import WebtoonGridSection from '@/components/ui/WebtoonGridSection';
import AppDownloadBanner from '@/components/ui/AppDownloadBanner';
import ContinueWatchingSection from '@/components/ui/ContinueWatchingSection';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/config';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import { useAdultStore } from '@/store/adult';

export default function AdultPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const setAdult = useAdultStore((s) => s.setAdult);

  // 성인 인증 확인 - 로그인한 경우에만 검증
  useEffect(() => {
    // 성인 페이지 진입 시 자동으로 19금 토글 ON
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
  }, [router, setAdult]);

  // 성인 웹툰 데이터 가져오기 - 로그인 여부와 관계없이 데이터 가져오기
  const { data: comicsData, isLoading } = useQuery({
    queryKey: ['adult-comics'],
    queryFn: async () => {
      const response = await api.get('/comics/adult', {
        params: {
          limit: 1000  // 모든 데이터 가져오기
        }
      });
      return response.data;
    },
  });

  const comics = comicsData?.comics || [];

  // 조회수 기준으로 정렬하여 실시간 TOP 10 만들기
  const realtimeAdultComics = [...comics]
    .sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 8);

  // 최신 업데이트 (updatedAt 기준)
  const latestAdultComics = [...comics]
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  // 신작 (연재중인 작품 중 최신순)
  const newAdultComics = comics
    .filter((item: any) => item.status === 'ONGOING')
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // 완결 작품
  const completedAdultComics = comics
    .filter((item: any) => item.status === 'COMPLETED')
    .slice(0, 8);

  // 배너용 데이터 (조회수 TOP 3)
  const adultBanners = realtimeAdultComics.slice(0, 3).map((comic: any) => ({
    id: comic.id,
    title: comic.title,
    subtitle: `${typeof comic.author === 'object' ? (comic.author?.username || comic.author?.name || '') : (comic.author || '')} 작가`,
    description: comic.description,
    imageUrl: comic.thumbnail || comic.thumbnailUrl,
    webtoonId: comic.id, // webtoonId 속성 추가 (NetflixHero가 이 속성을 우선 확인)
    link: `/webtoons/${comic.id}`,
    webtoon: {
      id: comic.id,
      title: comic.title,
      thumbnail: comic.thumbnail || comic.thumbnailUrl,
      genre: comic.genre,
      authorName: comic.author,
      rating: '19'
    }
  }));

  // 비인증 사용자에게는 블러 처리된 미리보기를 보여줌

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E7A5A]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] min-h-screen relative">
      {/* 비인증 사용자용 오버레이 */}
      {!isVerified && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-900 rounded-lg max-w-md mx-4">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold text-white mb-2">성인 인증이 필요합니다</h2>
            <p className="text-gray-400 mb-6">성인 콘텐츠를 보시려면 로그인 후 연령 인증을 완료해주세요.</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                로그인하기
              </button>
              <button
                onClick={() => router.push('/home')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                일반 페이지로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={!isVerified ? 'filter blur-md pointer-events-none' : ''}>
        <div className="max-w-7xl mx-auto">
          <NetflixHero banners={adultBanners} />
          <div className="px-3 sm:px-6 md:px-8 lg:px-12 pb-24 md:pb-16">
            <AppDownloadBanner />
            {realtimeAdultComics.length > 0 && (
              <WebtoonGridSection title="🔞 실시간 TOP 10" data={realtimeAdultComics.slice(0, 8)}  />
            )}
            {latestAdultComics.length > 0 && (
              <WebtoonGridSection title="🔞 오늘 업데이트" data={latestAdultComics.slice(0, 8)} />
            )}
            {newAdultComics.length > 0 && (
              <WebtoonGridSection title="🔞 따끈 따끈 신작" data={newAdultComics.slice(0, 8)} />
            )}

            {/* 성인 장르별 섹션 */}
            {(() => {
              const blComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('bl');
              }).slice(0, 8);
              return blComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 BL"
                  data={blComics}
                                    viewAllLink="/adult/bl"
                />
              );
            })()}

            {(() => {
              const romanceComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('romance') || genre.includes('로맨스');
              }).slice(0, 8);
              return romanceComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 로맨스"
                  data={romanceComics}
                                    viewAllLink="/adult/romance"
                />
              );
            })()}

            {(() => {
              const fantasyComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('fantasy') || genre.includes('판타지');
              }).slice(0, 8);
              return fantasyComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 판타지"
                  data={fantasyComics}
                                    viewAllLink="/adult/fantasy"
                />
              );
            })()}

            {(() => {
              const dramaComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('drama') || genre.includes('드라마');
              }).slice(0, 8);
              return dramaComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 드라마"
                  data={dramaComics}
                                    viewAllLink="/adult/drama"
                />
              );
            })()}

            {(() => {
              const actionComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('action') || genre.includes('액션');
              }).slice(0, 8);
              return actionComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 액션"
                  data={actionComics}
                                    viewAllLink="/adult/action"
                />
              );
            })()}

            {(() => {
              const thrillerComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('thriller') || genre.includes('스릴러');
              }).slice(0, 8);
              return thrillerComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 스릴러"
                  data={thrillerComics}
                                    viewAllLink="/adult/thriller"
                />
              );
            })()}

            {(() => {
              const comedyComics = comics.filter((comic: any) => {
                const genre = comic.genre?.toLowerCase() || '';
                return genre.includes('comedy') || genre.includes('코미디');
              }).slice(0, 8);
              return comedyComics.length > 0 && (
                <WebtoonGridSection
                  title="🔞 코미디"
                  data={comedyComics}
                                    viewAllLink="/adult/comedy"
                />
              );
            })()}

            {completedAdultComics.length > 0 && (
              <WebtoonGridSection title="🔞 완결작품" data={completedAdultComics.slice(0, 8)} />
            )}

            {/* 내가 보던 웹툰 섹션 - 성인 */}
            <ContinueWatchingSection isAdult={true} />

            {/* 앱 다운로드 배너 이미지 */}
            <div className="mt-8">
              <Link href="/download">
                <img
                  src="/bottom-banner.jpg"
                  alt="앱 다운로드"
                  className="w-full h-auto rounded-lg cursor-pointer"
                  loading="lazy"
                />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
