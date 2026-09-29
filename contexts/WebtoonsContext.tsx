'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WebtoonData {
  id: string;
  title: string;
  author: string;
  genre: string;
  thumbnailUrl: string;
  viewCount: number;
  commentCount: number;
  rating: number;
  totalEpisodes: number;
  updatedAt: string;
  isOfficial?: boolean;
  ageRating?: number;
}

interface WebtoonsContextType {
  allWebtoons: WebtoonData[];
  loading: boolean;
  error: string | null;
  refreshWebtoons: () => Promise<void>;
}

const WebtoonsContext = createContext<WebtoonsContextType | undefined>(undefined);

export const useWebtoons = () => {
  const context = useContext(WebtoonsContext);
  if (context === undefined) {
    throw new Error('useWebtoons must be used within a WebtoonsProvider');
  }
  return context;
};

interface WebtoonsProviderProps {
  children: ReactNode;
}

export const WebtoonsProvider: React.FC<WebtoonsProviderProps> = ({ children }) => {
  const [allWebtoons, setAllWebtoons] = useState<WebtoonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebtoons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/frontend/comics?limit=100', {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const webtoonsData = (data.comics || []).map((webtoon: any) => ({
          id: webtoon.id,
          title: webtoon.title,
          author: webtoon.author || webtoon.authorName || '작가명 없음',
          genre: webtoon.genre || '장르 없음',
          thumbnailUrl: webtoon.thumbnailUrl || 
            (webtoon.thumbnail?.startsWith('/') 
              ? webtoon.thumbnail 
              : (webtoon.thumbnail || "https://via.placeholder.com/300x400/6B7280/ffffff?text=No+Image")),
          viewCount: webtoon.viewCount || 0,
          commentCount: webtoon.commentCount || 0,
          rating: webtoon.rating || 4.0,
          totalEpisodes: webtoon.totalEpisodes || webtoon.episodes?.length || 0,
          updatedAt: webtoon.updatedAt || new Date().toISOString(),
          isOfficial: webtoon.isOfficial || false,
          ageRating: webtoon.ageRating || 0
        }));
        
        setAllWebtoons(webtoonsData);
        console.log(`전역 웹툰 데이터 로드 완료: ${webtoonsData.length}개`);
      } else {
        throw new Error(`API 응답 오류: ${response.status}`);
      }
    } catch (err) {
      console.error('웹툰 데이터 로드 실패:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setAllWebtoons([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshWebtoons = async () => {
    await fetchWebtoons();
  };

  useEffect(() => {
    fetchWebtoons();
  }, []);

  const value: WebtoonsContextType = {
    allWebtoons,
    loading,
    error,
    refreshWebtoons
  };

  return (
    <WebtoonsContext.Provider value={value}>
      {children}
    </WebtoonsContext.Provider>
  );
};