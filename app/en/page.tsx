'use client';

import { useQuery } from '@tanstack/react-query';
import HeroCarousel from '@/components/ui/HeroCarousel';
import RankingSection from '@/components/ui/RankingSection';
import WebtoonCard from '@/components/ui/WebtoonCard';
import AppPromoBanner from '@/components/ui/AppPromoBanner';
import { api } from '@/lib/api';

export default function EnglishHomePage() {
  // Fetch home data from admin-configured categories
  // TODO: Add locale=en filter when backend is ready
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['en-home-data'],
    queryFn: async () => {
      const response = await api.get('/frontend/home', {
        params: { locale: 'en' }
      });
      return response.data;
    },
  });

  // Fallback: all webtoons
  const { data: comicsData } = useQuery({
    queryKey: ['en-comics'],
    queryFn: async () => {
      const response = await api.get('/comics', {
        params: { locale: 'en' }
      });
      return response.data;
    },
    enabled: !homeData,
  });

  // Use home data if available, otherwise fallback
  const banners = homeData?.data?.banners || [];
  const categories = homeData?.data?.categories || {
    realtime: [],
    daily: [],
    week: [],
    complete: [],
    latest: [],
    new: [],
    completed: []
  };
  const comics = categories.allComics || homeData?.data?.allComics || comicsData?.comics || [];

  // Get image URL (handled by Next.js rewrites/proxy)
  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return path.startsWith('/') ? path : `/${path}`;
  };

  // Filter adult content (18+ age gating)
  const filterAdultContent = (comics: any[]) => {
    return comics.filter((item: any) =>
      item.genre !== 'adult' &&
      (!item.ageRating || item.ageRating === 'all' || parseInt(item.ageRating) < 18)
    );
  };

  // Category-based webtoons (filter adult content)
  const latestComics = filterAdultContent(categories.latest?.length > 0 ? categories.latest : comics);
  const newComics = filterAdultContent(categories.new?.length > 0 ? categories.new : comics.filter((item: any) => item.status === 'ONGOING'));
  const completedComics = filterAdultContent(categories.completed?.length > 0 ? categories.completed : comics.filter((item: any) => item.status === 'COMPLETED'));

  // HeroCarousel data transformation
  const heroItems = banners.length > 0
    ? banners.map((banner: any) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        tags: [banner.webtoon?.genre].filter(Boolean),
        image: getImageUrl(banner.imageUrl),
        link: banner.link || `/en/webtoons/${banner.webtoon?.id}`,
        description: banner.description,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Carousel */}
      <div className="bg-gradient-to-b from-black via-neutral-900 to-black">
        <HeroCarousel items={heroItems} />
      </div>

      {/* Ranking Section */}
      <div className="bg-gradient-to-b from-black via-gray-900 to-black py-12">
        <RankingSection
          dailyComics={categories.daily}
          weekComics={categories.week}
          completeComics={categories.complete}
          realtimeComics={categories.realtime}
        />
      </div>

      {/* Latest Updates Section */}
      <section className="container mx-auto px-4 py-12 bg-black">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-3 text-white">
            Today's Updates
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"></div>
        </div>
        {latestComics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {latestComics.slice(0, 12).map((comic: any) => (
              <WebtoonCard
                key={comic.id}
                id={comic.id}
                title={comic.title}
                author={comic.authorName || comic.author?.nickname || 'Author'}
                genre={comic.genre || 'Webtoon'}
                thumbnailUrl={comic.thumbnail}
                viewCount={comic.viewCount || 0}
                commentCount={comic._count?.comments || 0}
                rating={comic.averageRating || parseFloat(comic.rating) || 0}
                totalEpisodes={comic._count?.episodes || comic.totalEpisodes || 0}
                updatedAt={comic.updatedAt}
                isOfficial={comic.isOfficial}
                ageRating={comic.ageRating}
                freeEpisodes={comic.freeEpisodes || 0}
                coinPrice={comic.episodeCoinPrice || 0}
                paidStartEpisode={comic.paidStartEpisode}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700">
            <div className="text-orange-500 text-5xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-white mb-2">No English Webtoons Yet</h3>
            <p className="text-gray-400">Check back soon for exciting new content!</p>
          </div>
        )}
      </section>

      {/* New Releases Section */}
      <section className="container mx-auto px-4 py-12 bg-gradient-to-b from-neutral-900 to-black">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-3 text-white">
            New Releases
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full"></div>
        </div>
        {newComics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {newComics.slice(0, 12).map((comic: any) => (
              <WebtoonCard
                key={comic.id}
                id={comic.id}
                title={comic.title}
                author={comic.authorName || comic.author?.nickname || 'Author'}
                genre={comic.genre || 'Webtoon'}
                thumbnailUrl={comic.thumbnail}
                viewCount={comic.viewCount || 0}
                commentCount={comic._count?.comments || 0}
                rating={comic.averageRating || parseFloat(comic.rating) || 0}
                totalEpisodes={comic._count?.episodes || comic.totalEpisodes || 0}
                updatedAt={comic.updatedAt}
                isOfficial={comic.isOfficial}
                ageRating={comic.ageRating}
                freeEpisodes={comic.freeEpisodes || 0}
                coinPrice={comic.episodeCoinPrice || 0}
                paidStartEpisode={comic.paidStartEpisode}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700">
            <div className="text-blue-500 text-5xl mb-4">🆕</div>
            <h3 className="text-xl font-bold text-white mb-2">No New Releases</h3>
            <p className="text-gray-400">New series coming soon!</p>
          </div>
        )}
      </section>

      {/* Completed Series Section */}
      <section className="container mx-auto px-4 py-12 bg-black">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-3 text-white">
            Completed Series
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-green-600 to-green-400 rounded-full"></div>
        </div>
        {completedComics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {completedComics.slice(0, 12).map((comic: any) => (
              <WebtoonCard
                key={comic.id}
                id={comic.id}
                title={comic.title}
                author={comic.authorName || comic.author?.nickname || 'Author'}
                genre={comic.genre || 'Webtoon'}
                thumbnailUrl={comic.thumbnail}
                viewCount={comic.viewCount || 0}
                commentCount={comic._count?.comments || 0}
                rating={comic.averageRating || parseFloat(comic.rating) || 0}
                totalEpisodes={comic._count?.episodes || comic.totalEpisodes || 0}
                updatedAt={comic.updatedAt}
                isOfficial={comic.isOfficial}
                ageRating={comic.ageRating}
                freeEpisodes={comic.freeEpisodes || 0}
                coinPrice={comic.episodeCoinPrice || 0}
                paidStartEpisode={comic.paidStartEpisode}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700">
            <div className="text-green-500 text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">No Completed Series</h3>
            <p className="text-gray-400">Binge-worthy complete series coming soon!</p>
          </div>
        )}
      </section>

      {/* App Promo Banner */}
      <div className="bg-gradient-to-r from-orange-900 via-orange-800 to-orange-700 py-12">
        <AppPromoBanner />
      </div>

      {/* Footer Spacer */}
      <div className="h-24 bg-black"></div>
    </div>
  );
}
