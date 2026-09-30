'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, TrendingUp, Eye, Heart, Users, BookOpen, LogOut, Plus, Edit, Trash2, Shield, Coins, CreditCard, ChevronUp, ChevronDown, X } from 'lucide-react';
import { categoryAPI, comicsAPI, usersAPI } from '@/lib/api-axios';
import AdminHeader from '@/components/AdminHeader';

interface Webtoon {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  ageRating?: number | string;
  rating?: string;
  episodeCount?: number;
  episodeCoinPrice?: number;
  purchaseCount?: number;
  paidStartEpisode?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [webtoons, setWebtoons] = useState<Webtoon[]>([]);
  const [adultWebtoons, setAdultWebtoons] = useState<Webtoon[]>([]);
  const [englishWebtoons, setEnglishWebtoons] = useState<Webtoon[]>([]);
  const [englishAdultWebtoons, setEnglishAdultWebtoons] = useState<Webtoon[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<'general' | 'adult' | 'english' | 'englishAdult' | 'statistics' | 'users'>('general');
  const [selectedCategory, setSelectedCategory] = useState<'banner' | 'realtime' | 'daily' | 'week' | 'complete' | 'latest' | 'new' | 'finished'>('realtime'); // [배너] 탭은 없앰: 홈 대배너는 [배너 관리]가 기준
  const [selectedDay, setSelectedDay] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>('monday');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 사용자 관리
  const [userTab, setUserTab] = useState<'users' | 'authors'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // 통계 정렬용 상태 추가
  const [statsSortConfig, setStatsSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // 일반 웹툰 카테고리
  const [bannerWebtoons, setBannerWebtoons] = useState<string[]>([]);
  const [realtimeWebtoons, setRealtimeWebtoons] = useState<string[]>([]);
  const [dailyWebtoons, setDailyWebtoons] = useState<string[]>([]);
  const [weekWebtoons, setWeekWebtoons] = useState<{[key: string]: string[]}>({ 
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] 
  });
  const [completeWebtoons, setCompleteWebtoons] = useState<string[]>([]);
  const [latestWebtoons, setLatestWebtoons] = useState<string[]>([]);
  const [newWebtoons, setNewWebtoons] = useState<string[]>([]);
  const [finishedWebtoons, setFinishedWebtoons] = useState<string[]>([]);
  
  // 성인 웹툰 카테고리
  const [adultBannerWebtoons, setAdultBannerWebtoons] = useState<string[]>([]);
  const [adultRealtimeWebtoons, setAdultRealtimeWebtoons] = useState<string[]>([]);
  const [adultDailyWebtoons, setAdultDailyWebtoons] = useState<string[]>([]);
  const [adultWeekWebtoons, setAdultWeekWebtoons] = useState<{[key: string]: string[]}>({ 
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] 
  });
  const [adultCompleteWebtoons, setAdultCompleteWebtoons] = useState<string[]>([]);
  const [adultLatestWebtoons, setAdultLatestWebtoons] = useState<string[]>([]);
  const [adultNewWebtoons, setAdultNewWebtoons] = useState<string[]>([]);
  const [adultFinishedWebtoons, setAdultFinishedWebtoons] = useState<string[]>([]);

  // 영어 웹툰 카테고리
  const [englishBannerWebtoons, setEnglishBannerWebtoons] = useState<string[]>([]);
  const [englishRealtimeWebtoons, setEnglishRealtimeWebtoons] = useState<string[]>([]);
  const [englishDailyWebtoons, setEnglishDailyWebtoons] = useState<string[]>([]);
  const [englishWeekWebtoons, setEnglishWeekWebtoons] = useState<{[key: string]: string[]}>({
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  });
  const [englishCompleteWebtoons, setEnglishCompleteWebtoons] = useState<string[]>([]);
  const [englishLatestWebtoons, setEnglishLatestWebtoons] = useState<string[]>([]);
  const [englishNewWebtoons, setEnglishNewWebtoons] = useState<string[]>([]);
  const [englishFinishedWebtoons, setEnglishFinishedWebtoons] = useState<string[]>([]);

  // 영어 성인 웹툰 카테고리
  const [englishAdultBannerWebtoons, setEnglishAdultBannerWebtoons] = useState<string[]>([]);
  const [englishAdultRealtimeWebtoons, setEnglishAdultRealtimeWebtoons] = useState<string[]>([]);
  const [englishAdultDailyWebtoons, setEnglishAdultDailyWebtoons] = useState<string[]>([]);
  const [englishAdultWeekWebtoons, setEnglishAdultWeekWebtoons] = useState<{[key: string]: string[]}>({
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
  });
  const [englishAdultCompleteWebtoons, setEnglishAdultCompleteWebtoons] = useState<string[]>([]);
  const [englishAdultLatestWebtoons, setEnglishAdultLatestWebtoons] = useState<string[]>([]);
  const [englishAdultNewWebtoons, setEnglishAdultNewWebtoons] = useState<string[]>([]);
  const [englishAdultFinishedWebtoons, setEnglishAdultFinishedWebtoons] = useState<string[]>([]);

  const [lastSaveTime, setLastSaveTime] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        router.push('/login');
        return;
      }
      loadData();
    }
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 일반 웹툰 로드  
      try {
        const generalResponse: any = await comicsAPI.getComics();
        console.log('일반 웹툰 응답 구조:', generalResponse);
        if (generalResponse && generalResponse.success) {
          // 백엔드에서 이미 일반웹툰만 필터링해서 보내므로 추가 필터링 불필요
          const comics = generalResponse.comics || [];
          console.log('일반 웹툰 설정:', comics);
          setWebtoons(comics);
        }
      } catch (error) {
        console.error('일반 웹툰 로드 실패:', error);
        setWebtoons([]);
      }
      
      // 성인 웹툰 로드
      try {
        const adultResponse: any = await comicsAPI.getAdultComics();
        console.log('성인 웹툰 응답 구조:', adultResponse);
        if (adultResponse && adultResponse.success) {
          const adultComics = adultResponse.comics || [];
          console.log('성인 웹툰 설정:', adultComics);
          setAdultWebtoons(adultComics);
        }
      } catch (error) {
        console.error('성인 웹툰 로드 실패:', error);
        setAdultWebtoons([]);
      }

      // 영어 웹툰 로드
      try {
        const englishResponse: any = await comicsAPI.getEnglishComics();
        console.log('영어 웹툰 응답 구조:', englishResponse);
        if (englishResponse && englishResponse.success) {
          const englishComics = englishResponse.comics || [];
          console.log('영어 웹툰 설정:', englishComics);
          setEnglishWebtoons(englishComics);
        }
      } catch (error) {
        console.error('영어 웹툰 로드 실패:', error);
        setEnglishWebtoons([]);
      }

      // 영어 성인 웹툰 로드
      try {
        const englishAdultResponse: any = await comicsAPI.getEnglishAdultComics();
        console.log('영어 성인 웹툰 응답 구조:', englishAdultResponse);
        if (englishAdultResponse && englishAdultResponse.success) {
          const englishAdultComics = englishAdultResponse.comics || [];
          console.log('영어 성인 웹툰 설정:', englishAdultComics);
          setEnglishAdultWebtoons(englishAdultComics);
        }
      } catch (error) {
        console.error('영어 성인 웹툰 로드 실패:', error);
        setEnglishAdultWebtoons([]);
      }

      // 카테고리 데이터 로드
      await loadCategorySettings();
      
      // 사용자 관리 데이터 로드
      await loadUserData();
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorySettings = async () => {
    try {
      // 일반 카테고리 로드
      try {
        const generalCategoriesRes: any = await categoryAPI.getCategories();
        console.log('일반 카테고리 응답:', generalCategoriesRes);
        if (generalCategoriesRes && generalCategoriesRes.success) {
          const data = generalCategoriesRes.data || {};
          setBannerWebtoons(data.banner || []);
          setRealtimeWebtoons(data.realtime || []);
          setDailyWebtoons(data.daily || []);
          // week 데이터가 배열이면 기존 방식, 객체면 새 방식
          if (Array.isArray(data.week)) {
            // 기존 데이터를 월요일로 마이그레이션
            setWeekWebtoons({ 
              monday: data.week, tuesday: [], wednesday: [], thursday: [], 
              friday: [], saturday: [], sunday: [] 
            });
          } else {
            setWeekWebtoons(data.week || { 
              monday: [], tuesday: [], wednesday: [], thursday: [], 
              friday: [], saturday: [], sunday: [] 
            });
          }
          setCompleteWebtoons(data.complete || []);
          setLatestWebtoons(data.latest || []);
          setNewWebtoons(data.new || []);
          setFinishedWebtoons(data.finished || []);
        }
      } catch (error) {
        console.error('일반 카테고리 로드 실패:', error);
      }

      // 성인 카테고리 로드
      try {
        const adultCategoriesRes: any = await categoryAPI.getAdultCategories();
        console.log('성인 카테고리 응답:', adultCategoriesRes);
        if (adultCategoriesRes && adultCategoriesRes.success) {
          const data = adultCategoriesRes.data || {};
          setAdultBannerWebtoons(data.banner || []);
          setAdultRealtimeWebtoons(data.realtime || []);
          setAdultDailyWebtoons(data.daily || []);
          // week 데이터가 배열이면 기존 방식, 객체면 새 방식
          if (Array.isArray(data.week)) {
            // 기존 데이터를 월요일로 마이그레이션
            setAdultWeekWebtoons({ 
              monday: data.week, tuesday: [], wednesday: [], thursday: [], 
              friday: [], saturday: [], sunday: [] 
            });
          } else {
            setAdultWeekWebtoons(data.week || { 
              monday: [], tuesday: [], wednesday: [], thursday: [], 
              friday: [], saturday: [], sunday: [] 
            });
          }
          setAdultCompleteWebtoons(data.complete || []);
          setAdultLatestWebtoons(data.latest || []);
          setAdultNewWebtoons(data.new || []);
          setAdultFinishedWebtoons(data.finished || []);
        }
      } catch (error) {
        console.error('성인 카테고리 로드 실패:', error);
      }

    } catch (error) {
      console.error('카테고리 설정 로드 실패:', error);
    }
  };

  const loadUserData = async () => {
    try {
      // 사용자 목록 로드
      try {
        const usersResponse: any = await usersAPI.getUsers();
        console.log('사용자 응답:', usersResponse);
        if (usersResponse && usersResponse.success) {
          setUsers(usersResponse.data || []);
        }
      } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
        setUsers([]);
      }

      // 작가 목록 로드
      try {
        const authorsResponse: any = await usersAPI.getAuthors();
        console.log('작가 응답:', authorsResponse);
        if (authorsResponse && authorsResponse.success) {
          setAuthors(authorsResponse.data || []);
        }
      } catch (error) {
        console.error('작가 목록 로드 실패:', error);
        setAuthors([]);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/login');
  };

  // 정렬 함수
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 정렬된 사용자 목록
  const getSortedUsers = () => {
    if (!sortConfig) return users;
    
    return [...users].sort((a, b) => {
      const aValue = getValueForSorting(a, sortConfig.key);
      const bValue = getValueForSorting(b, sortConfig.key);
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getValueForSorting = (user: any, key: string) => {
    switch (key) {
      case 'username': return user.username?.toLowerCase() || '';
      case 'provider': return user.provider || '';
      case 'status': return user.status || '';
      case 'adultVerified': return user.adultVerified ? 1 : 0;
      case 'coinBalance': return user.coinBalance || 0;
      case 'createdAt': return new Date(user.createdAt).getTime();
      default: return '';
    }
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronUp className="w-4 h-4 text-gray-300" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-gray-700" />
      : <ChevronDown className="w-4 h-4 text-gray-700" />;
  };
  
  // 통계 정렬 함수
  const handleStatsSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (statsSortConfig && statsSortConfig.key === key && statsSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setStatsSortConfig({ key, direction });
  };
  
  // 통계 정렬 아이콘
  const renderStatsSortIcon = (columnKey: string) => {
    if (!statsSortConfig || statsSortConfig.key !== columnKey) {
      return <ChevronUp className="w-4 h-4 text-gray-300" />;
    }
    return statsSortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-gray-700" />
      : <ChevronDown className="w-4 h-4 text-gray-700" />;
  };
  
  // 통계용 전체 웹툰 목록 정렬
  const getSortedWebtoons = () => {
    const allWebtoonsList = [...webtoons, ...adultWebtoons];
    
    if (!statsSortConfig) return allWebtoonsList;
    
    return allWebtoonsList.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch(statsSortConfig.key) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'authorName':
          aValue = a.authorName?.toLowerCase() || '';
          bValue = b.authorName?.toLowerCase() || '';
          break;
        case 'viewCount':
          aValue = a.viewCount || 0;
          bValue = b.viewCount || 0;
          break;
        case 'likeCount':
          aValue = a.likeCount || 0;
          bValue = b.likeCount || 0;
          break;
        case 'episodeCount':
          aValue = a.episodeCount || 0;
          bValue = b.episodeCount || 0;
          break;
        case 'coinRevenue':
          aValue = (a.episodeCount || 0) * (a.episodeCoinPrice || 3) * (a.purchaseCount || 0);
          bValue = (b.episodeCount || 0) * (b.episodeCoinPrice || 3) * (b.purchaseCount || 0);
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt || a.createdAt).getTime();
          bValue = new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return statsSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return statsSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getCategoryTitle = () => {
    switch(selectedCategory) {
      case 'banner': return '배너 관리';
      case 'realtime': return '실시간 랭킹';
      case 'daily': return '매일';
      case 'week': {
        const dayLabels = {
          monday: '월요일',
          tuesday: '화요일',
          wednesday: '수요일',
          thursday: '목요일',
          friday: '금요일',
          saturday: '토요일',
          sunday: '일요일'
        };
        return dayLabels[selectedDay] || '요일';
      }
      case 'complete': return '완결';
      case 'latest': return '최신 업데이트';
      case 'new': return '신작';
      case 'finished': return '완결작품';
      default: return '';
    }
  };

  const getCurrentCategoryWebtoons = () => {
    let categoryIds: string[] = [];
    let targetWebtoons = mainTab === 'adult' ? adultWebtoons : mainTab === 'english' ? englishWebtoons : mainTab === 'englishAdult' ? englishAdultWebtoons : webtoons;

    if (mainTab === 'adult') {
      // 성인 웹툰 카테고리
      if (selectedCategory === 'banner') categoryIds = adultBannerWebtoons;
      else if (selectedCategory === 'realtime') categoryIds = adultRealtimeWebtoons;
      else if (selectedCategory === 'daily') categoryIds = adultDailyWebtoons;
      else if (selectedCategory === 'week') categoryIds = adultWeekWebtoons[selectedDay] || [];
      else if (selectedCategory === 'complete') categoryIds = adultCompleteWebtoons;
      else if (selectedCategory === 'latest') categoryIds = adultLatestWebtoons;
      else if (selectedCategory === 'new') categoryIds = adultNewWebtoons;
      else if (selectedCategory === 'finished') categoryIds = adultFinishedWebtoons;
    } else if (mainTab === 'english') {
      // 영어 웹툰 카테고리
      if (selectedCategory === 'banner') categoryIds = englishBannerWebtoons;
      else if (selectedCategory === 'realtime') categoryIds = englishRealtimeWebtoons;
      else if (selectedCategory === 'daily') categoryIds = englishDailyWebtoons;
      else if (selectedCategory === 'week') categoryIds = englishWeekWebtoons[selectedDay] || [];
      else if (selectedCategory === 'complete') categoryIds = englishCompleteWebtoons;
      else if (selectedCategory === 'latest') categoryIds = englishLatestWebtoons;
      else if (selectedCategory === 'new') categoryIds = englishNewWebtoons;
      else if (selectedCategory === 'finished') categoryIds = englishFinishedWebtoons;
    } else if (mainTab === 'englishAdult') {
      // 영어 성인 웹툰 카테고리
      if (selectedCategory === 'banner') categoryIds = englishAdultBannerWebtoons;
      else if (selectedCategory === 'realtime') categoryIds = englishAdultRealtimeWebtoons;
      else if (selectedCategory === 'daily') categoryIds = englishAdultDailyWebtoons;
      else if (selectedCategory === 'week') categoryIds = englishAdultWeekWebtoons[selectedDay] || [];
      else if (selectedCategory === 'complete') categoryIds = englishAdultCompleteWebtoons;
      else if (selectedCategory === 'latest') categoryIds = englishAdultLatestWebtoons;
      else if (selectedCategory === 'new') categoryIds = englishAdultNewWebtoons;
      else if (selectedCategory === 'finished') categoryIds = englishAdultFinishedWebtoons;
    } else {
      // 일반 웹툰 카테고리
      if (selectedCategory === 'banner') categoryIds = bannerWebtoons;
      else if (selectedCategory === 'realtime') categoryIds = realtimeWebtoons;
      else if (selectedCategory === 'daily') categoryIds = dailyWebtoons;
      else if (selectedCategory === 'week') categoryIds = weekWebtoons[selectedDay] || [];
      else if (selectedCategory === 'complete') categoryIds = completeWebtoons;
      else if (selectedCategory === 'latest') categoryIds = latestWebtoons;
      else if (selectedCategory === 'new') categoryIds = newWebtoons;
      else if (selectedCategory === 'finished') categoryIds = finishedWebtoons;
    }

    // 중복을 허용하기 위해 순서대로 매핑
    return categoryIds.map(id => targetWebtoons.find(webtoon => webtoon.id === id)).filter(Boolean);
  };

  const getAvailableWebtoons = () => {
    // 성인/일반/영어/영어성인 탭에 따라 해당하는 웹툰들만 반환
    const availableWebtoons = mainTab === 'adult' ? adultWebtoons : mainTab === 'english' ? englishWebtoons : mainTab === 'englishAdult' ? englishAdultWebtoons : webtoons;
    console.log(`getAvailableWebtoons - mainTab: ${mainTab}, count: ${availableWebtoons.length}`, availableWebtoons);
    return availableWebtoons;
  };

  const addToCategory = (webtoonId: string) => {
    if (mainTab === 'adult') {
      // 성인 웹툰 카테고리 추가 (중복 방지)
      if (selectedCategory === 'banner') {
        setAdultBannerWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'realtime') {
        setAdultRealtimeWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'daily') {
        setAdultDailyWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'week') {
        setAdultWeekWebtoons(prev => prev[selectedDay].includes(webtoonId) ? prev : {...prev, [selectedDay]: [...prev[selectedDay], webtoonId]});
      } else if (selectedCategory === 'complete') {
        setAdultCompleteWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'latest') {
        setAdultLatestWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'new') {
        setAdultNewWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'finished') {
        setAdultFinishedWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      }
    } else if (mainTab === 'english') {
      // 영어 웹툰 카테고리 추가 (중복 방지)
      if (selectedCategory === 'banner') {
        setEnglishBannerWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'realtime') {
        setEnglishRealtimeWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'daily') {
        setEnglishDailyWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'week') {
        setEnglishWeekWebtoons(prev => prev[selectedDay].includes(webtoonId) ? prev : {...prev, [selectedDay]: [...prev[selectedDay], webtoonId]});
      } else if (selectedCategory === 'complete') {
        setEnglishCompleteWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'latest') {
        setEnglishLatestWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'new') {
        setEnglishNewWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'finished') {
        setEnglishFinishedWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      }
    } else if (mainTab === 'englishAdult') {
      // 영어 성인 웹툰 카테고리 추가 (중복 방지)
      if (selectedCategory === 'banner') {
        setEnglishAdultBannerWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'realtime') {
        setEnglishAdultRealtimeWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'daily') {
        setEnglishAdultDailyWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'week') {
        setEnglishAdultWeekWebtoons(prev => prev[selectedDay].includes(webtoonId) ? prev : {...prev, [selectedDay]: [...prev[selectedDay], webtoonId]});
      } else if (selectedCategory === 'complete') {
        setEnglishAdultCompleteWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'latest') {
        setEnglishAdultLatestWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'new') {
        setEnglishAdultNewWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'finished') {
        setEnglishAdultFinishedWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      }
    } else {
      // 일반 웹툰 카테고리 추가 (중복 방지)
      if (selectedCategory === 'banner') {
        setBannerWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'realtime') {
        setRealtimeWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'daily') {
        setDailyWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'week') {
        setWeekWebtoons(prev => prev[selectedDay].includes(webtoonId) ? prev : {...prev, [selectedDay]: [...prev[selectedDay], webtoonId]});
      } else if (selectedCategory === 'complete') {
        setCompleteWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'latest') {
        setLatestWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'new') {
        setNewWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      } else if (selectedCategory === 'finished') {
        setFinishedWebtoons(prev => prev.includes(webtoonId) ? prev : [...prev, webtoonId]);
      }
    }
  };

  const removeFromCategory = (webtoonId: string, index: number) => {
    if (mainTab === 'adult') {
      // 성인 웹툰 카테고리에서 제거
      if (selectedCategory === 'banner') {
        setAdultBannerWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'realtime') {
        setAdultRealtimeWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'daily') {
        setAdultDailyWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'week') {
        setAdultWeekWebtoons(prev => ({...prev, [selectedDay]: prev[selectedDay].filter((_, i) => i !== index)}));
      } else if (selectedCategory === 'complete') {
        setAdultCompleteWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'latest') {
        setAdultLatestWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'new') {
        setAdultNewWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'finished') {
        setAdultFinishedWebtoons(prev => prev.filter((_, i) => i !== index));
      }
    } else if (mainTab === 'english') {
      // 영어 웹툰 카테고리에서 제거
      if (selectedCategory === 'banner') {
        setEnglishBannerWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'realtime') {
        setEnglishRealtimeWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'daily') {
        setEnglishDailyWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'week') {
        setEnglishWeekWebtoons(prev => ({...prev, [selectedDay]: prev[selectedDay].filter((_, i) => i !== index)}));
      } else if (selectedCategory === 'complete') {
        setEnglishCompleteWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'latest') {
        setEnglishLatestWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'new') {
        setEnglishNewWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'finished') {
        setEnglishFinishedWebtoons(prev => prev.filter((_, i) => i !== index));
      }
    } else if (mainTab === 'englishAdult') {
      // 영어 성인 웹툰 카테고리에서 제거
      if (selectedCategory === 'banner') {
        setEnglishAdultBannerWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'realtime') {
        setEnglishAdultRealtimeWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'daily') {
        setEnglishAdultDailyWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'week') {
        setEnglishAdultWeekWebtoons(prev => ({...prev, [selectedDay]: prev[selectedDay].filter((_, i) => i !== index)}));
      } else if (selectedCategory === 'complete') {
        setEnglishAdultCompleteWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'latest') {
        setEnglishAdultLatestWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'new') {
        setEnglishAdultNewWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'finished') {
        setEnglishAdultFinishedWebtoons(prev => prev.filter((_, i) => i !== index));
      }
    } else {
      // 일반 웹툰 카테고리에서 제거
      if (selectedCategory === 'banner') {
        setBannerWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'realtime') {
        setRealtimeWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'daily') {
        setDailyWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'week') {
        setWeekWebtoons(prev => ({...prev, [selectedDay]: prev[selectedDay].filter((_, i) => i !== index)}));
      } else if (selectedCategory === 'complete') {
        setCompleteWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'latest') {
        setLatestWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'new') {
        setNewWebtoons(prev => prev.filter((_, i) => i !== index));
      } else if (selectedCategory === 'finished') {
        setFinishedWebtoons(prev => prev.filter((_, i) => i !== index));
      }
    }
  };

  const saveCategories = async () => {
    try {
      if (mainTab === 'adult') {
        // 성인 카테고리 저장
        const data = {
          banner: adultBannerWebtoons,
          realtime: adultRealtimeWebtoons,
          daily: adultDailyWebtoons,
          week: adultWeekWebtoons,
          complete: adultCompleteWebtoons,
          latest: adultLatestWebtoons,
          new: adultNewWebtoons,
          finished: adultFinishedWebtoons
        };
        await categoryAPI.saveAdultCategories(data);
      } else if (mainTab === 'english') {
        // 영어 카테고리 저장
        const data = {
          banner: englishBannerWebtoons,
          realtime: englishRealtimeWebtoons,
          daily: englishDailyWebtoons,
          week: englishWeekWebtoons,
          complete: englishCompleteWebtoons,
          latest: englishLatestWebtoons,
          new: englishNewWebtoons,
          finished: englishFinishedWebtoons
        };
        await categoryAPI.saveEnglishCategories(data);
      } else if (mainTab === 'englishAdult') {
        // 영어 성인 카테고리 저장
        const data = {
          banner: englishAdultBannerWebtoons,
          realtime: englishAdultRealtimeWebtoons,
          daily: englishAdultDailyWebtoons,
          week: englishAdultWeekWebtoons,
          complete: englishAdultCompleteWebtoons,
          latest: englishAdultLatestWebtoons,
          new: englishAdultNewWebtoons,
          finished: englishAdultFinishedWebtoons
        };
        await categoryAPI.saveEnglishAdultCategories(data);
      } else {
        // 일반 카테고리 저장
        const data = {
          banner: bannerWebtoons,
          realtime: realtimeWebtoons,
          daily: dailyWebtoons,
          week: weekWebtoons,
          complete: completeWebtoons,
          latest: latestWebtoons,
          new: newWebtoons,
          finished: finishedWebtoons
        };
        await categoryAPI.saveCategories(data);
      }

      alert(`${mainTab === 'adult' ? '성인' : mainTab === 'english' ? '영어 일반' : mainTab === 'englishAdult' ? '영어 성인' : '일반'} 웹툰 카테고리 설정이 저장되었습니다.`);
    } catch (error) {
      console.error('카테고리 저장 실패:', error);
      alert('카테고리 저장 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-700">로딩 중...</span>
      </div>
    );
  }

  return (
    <div key={refreshKey} className="min-h-screen bg-gray-50">
      {/* 관리자 헤더 */}
      <AdminHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 메인 탭 (일반/성인/영어/통계) */}
        <div className="mb-6">
          <div className="flex space-x-2 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setMainTab('general')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'general'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              일반 웹툰
            </button>
            <button
              onClick={() => setMainTab('adult')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'adult'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              성인 웹툰 (19+)
            </button>
            <button
              onClick={() => setMainTab('english')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'english'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              영어 일반 (EN)
            </button>
            <button
              onClick={() => setMainTab('englishAdult')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'englishAdult'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              영어 성인 (EN 19+)
            </button>
            <button
              onClick={() => setMainTab('statistics')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'statistics'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              통계
            </button>
            <button
              onClick={() => setMainTab('users')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mainTab === 'users'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              사용자 관리
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-gray-500">
            {mainTab === 'general'
              ? '전체 이용가 및 15세 이상 웹툰의 카테고리를 관리합니다.'
              : mainTab === 'adult'
                ? '만 19세 이상 성인 인증이 필요한 웹툰의 카테고리를 관리합니다.'
                : mainTab === 'english'
                  ? '영어 플랫폼(/en)에서 제공되는 일반 영어 웹툰의 카테고리를 관리합니다.'
                  : mainTab === 'englishAdult'
                    ? '영어 플랫폼(/en)에서 제공되는 만 19세 이상 성인 인증이 필요한 영어 웹툰의 카테고리를 관리합니다.'
                    : mainTab === 'statistics'
                      ? '일반 및 성인 웹툰의 조회수, 좋아요, 댓글 등 통합 통계를 확인할 수 있습니다.'
                      : '프론트엔드 사용자와 작가센터에 가입한 작가들의 정보를 관리합니다.'
            }
          </p>
        </div>

        {/* 통계 탭 내용 */}
        {mainTab === 'statistics' && (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">전체 웹툰</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {webtoons.length + adultWebtoons.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">일반 웹툰</p>
                    <p className="text-2xl font-bold text-gray-900">{webtoons.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-red-100">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">성인 웹툰</p>
                    <p className="text-2xl font-bold text-gray-900">{adultWebtoons.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">총 조회수</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(webtoons.reduce((sum, w) => sum + (w.viewCount || 0), 0) +
                        adultWebtoons.reduce((sum, w) => sum + (w.viewCount || 0), 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            
            {/* 웹툰별 상세 통계 테이블 */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">웹툰별 상세 통계</h3>
                <p className="text-sm text-gray-600 mt-1">모든 웹툰의 상세 통계를 확인하고 정렬할 수 있습니다.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                          onClick={() => handleStatsSort('title')}
                        >
                          <span>작품명</span>
                          {renderStatsSortIcon('title')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                          onClick={() => handleStatsSort('authorName')}
                        >
                          <span>작가명</span>
                          {renderStatsSortIcon('authorName')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wider">장르</span>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('viewCount')}
                        >
                          <span>조회수</span>
                          {renderStatsSortIcon('viewCount')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('likeCount')}
                        >
                          <span>좋아요</span>
                          {renderStatsSortIcon('likeCount')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('episodeCount')}
                        >
                          <span>에피소드</span>
                          {renderStatsSortIcon('episodeCount')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('coinRevenue')}
                        >
                          <span>예상 코인수익</span>
                          {renderStatsSortIcon('coinRevenue')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('status')}
                        >
                          <span>상태</span>
                          {renderStatsSortIcon('status')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('createdAt')}
                        >
                          <span>시작일</span>
                          {renderStatsSortIcon('createdAt')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-center">
                        <button
                          className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900 mx-auto"
                          onClick={() => handleStatsSort('updatedAt')}
                        >
                          <span>최근 업데이트</span>
                          {renderStatsSortIcon('updatedAt')}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedWebtoons().map((webtoon, index) => {
                      const estimatedRevenue = (webtoon.episodeCount || 0) * (webtoon.episodeCoinPrice || 3) * (webtoon.purchaseCount || 0);
                      const isAdult = webtoon.genre === 'adult' || webtoon.rating === 'ADULT' || webtoon.rating === '19';
                      
                      return (
                        <tr key={webtoon.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {webtoon.thumbnail && (
                                  <img 
                                    className="h-10 w-10 rounded object-cover" 
                                    src={webtoon.thumbnail} 
                                    alt={webtoon.title}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{webtoon.title}</div>
                                {isAdult && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    19+
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {webtoon.authorName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isAdult ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {webtoon.genre}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                            <div className="flex items-center justify-center space-x-1">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span>{(webtoon.viewCount || 0).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                            <div className="flex items-center justify-center space-x-1">
                              <Heart className="w-4 h-4 text-red-400" />
                              <span>{(webtoon.likeCount || 0).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                            {webtoon.episodeCount || 0}화
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Coins className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium text-gray-900">
                                {estimatedRevenue.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              webtoon.status === 'ONGOING' 
                                ? 'bg-blue-100 text-blue-800' 
                                : webtoon.status === 'COMPLETED'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {webtoon.status === 'ONGOING' ? '연재중' : 
                               webtoon.status === 'COMPLETED' ? '완결' : '휴재'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                            {new Date(webtoon.createdAt).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                            {new Date(webtoon.updatedAt || webtoon.createdAt).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {getSortedWebtoons().length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">등록된 웹툰이 없습니다.</p>
                  </div>
                )}
              </div>
              
              {/* 통계 요약 */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">총 웹툰:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {getSortedWebtoons().length}개
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">총 조회수:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {getSortedWebtoons().reduce((sum, w) => sum + (w.viewCount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">총 좋아요:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {getSortedWebtoons().reduce((sum, w) => sum + (w.likeCount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">예상 총 코인수익:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {getSortedWebtoons().reduce((sum, w) => 
                        sum + ((w.episodeCount || 0) * (w.episodeCoinPrice || 3) * (w.purchaseCount || 0)), 0
                      ).toLocaleString()} 코인
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 일반/성인/영어/영어성인 웹툰 관리 탭 내용 */}
        {(mainTab === 'general' || mainTab === 'adult' || mainTab === 'english' || mainTab === 'englishAdult') && (
          <>
            {/* 관리 메뉴 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* 결제 관리 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${
                    mainTab === 'adult' ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    <CreditCard className={`w-6 h-6 ${
                      mainTab === 'adult' ? 'text-red-600' : 'text-orange-600'
                    }`} />
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">
                    {mainTab === 'adult' ? '성인 결제 관리' : '결제 관리'}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {mainTab === 'adult'
                    ? '성인 웹툰의 유료 에피소드 설정, 코인 가격, 결제 내역을 관리합니다.'
                    : '웹툰별 유료 에피소드 설정, 코인 가격, 결제 내역을 관리합니다.'
                  }
                </p>
                <button
                  onClick={() => {
                    console.log('결제 관리 버튼 클릭됨');
                    router.push(`/payment?mode=${mainTab === 'adult' ? 'adult' : 'general'}`);
                  }}
                  className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors text-sm ${
                    mainTab === 'adult' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                  type="button"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  결제 관리하기
                </button>
              </div>

              {/* 배너 관리 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${
                    mainTab === 'adult' ? 'bg-red-100' : 'bg-purple-100'
                  }`}>
                    <Edit className={`w-6 h-6 ${
                      mainTab === 'adult' ? 'text-red-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">
                    {mainTab === 'adult' ? '성인 배너 관리' : '메인 배너 관리'}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {mainTab === 'adult'
                    ? '성인 홈 상단 배너는 성인 실시간 인기작으로 자동 구성됩니다. 홈 대배너는 [배너 관리]에서 관리합니다.'
                    : '사용자 화면 메인 홈 > 대배너를 관리합니다. [배너 관리]에 등록된 배너만 대배너에 노출됩니다.'
                  }
                </p>
                <button
                  onClick={() => router.push('/banners')}
                  className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors text-sm ${
                    mainTab === 'adult' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  배너 관리하기
                </button>
              </div>

              {/* 인기작 관리 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="ml-3 text-lg font-semibold text-gray-900">
                    {mainTab === 'adult' ? '성인 인기작 관리' : '인기작 관리'}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {mainTab === 'adult'
                    ? '성인 웹툰 정식 탭에 표시될 인기작 순서를 관리합니다.'
                    : '정식 탭에 표시될 인기작 순서를 관리합니다.'
                  }
                </p>
                <a
                  href={`/popular?mode=${mainTab}`}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  인기작 관리하기
                </a>
              </div>

            </div>

            {/* 카테고리 관리 섹션 (기존 결제 관리 자리) */}
            <div id="category-section" className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {mainTab === 'adult' ? '성인 웹툰 카테고리 관리' : mainTab === 'english' ? '영어 일반 웹툰 카테고리 관리' : mainTab === 'englishAdult' ? '영어 성인 웹툰 카테고리 관리' : '일반 웹툰 카테고리 관리'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {mainTab === 'adult'
                    ? '성인 웹툰을 카테고리별로 분류하여 사용자에게 제공합니다.'
                    : mainTab === 'english'
                      ? '영어 일반 웹툰을 카테고리별로 분류하여 영어 플랫폼 사용자에게 제공합니다.'
                      : mainTab === 'englishAdult'
                        ? '영어 성인 웹툰을 카테고리별로 분류하여 영어 플랫폼 사용자에게 제공합니다.'
                        : '일반 웹툰을 카테고리별로 분류하여 사용자에게 제공합니다.'
                  }
                </p>
              </div>

              {/* 카테고리 탭 */}
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedCategory('realtime')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === 'realtime'
                        ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    실시간 랭킹 ({mainTab === 'adult' ? adultRealtimeWebtoons.length : mainTab === 'english' ? englishRealtimeWebtoons.length : mainTab === 'englishAdult' ? englishAdultRealtimeWebtoons.length : realtimeWebtoons.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('daily')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === 'daily'
                        ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    매일 ({mainTab === 'adult' ? adultDailyWebtoons.length : mainTab === 'english' ? englishDailyWebtoons.length : mainTab === 'englishAdult' ? englishAdultDailyWebtoons.length : dailyWebtoons.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('week')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === 'week'
                        ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    요일 ({mainTab === 'adult' ? Object.values(adultWeekWebtoons).flat().length : mainTab === 'english' ? Object.values(englishWeekWebtoons).flat().length : mainTab === 'englishAdult' ? Object.values(englishAdultWeekWebtoons).flat().length : Object.values(weekWebtoons).flat().length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('complete')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === 'complete'
                        ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    완결 ({mainTab === 'adult' ? adultCompleteWebtoons.length : mainTab === 'english' ? englishCompleteWebtoons.length : mainTab === 'englishAdult' ? englishAdultCompleteWebtoons.length : completeWebtoons.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('latest')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === 'latest'
                        ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    최신 업데이트 ({mainTab === 'adult' ? adultLatestWebtoons.length : mainTab === 'english' ? englishLatestWebtoons.length : mainTab === 'englishAdult' ? englishAdultLatestWebtoons.length : latestWebtoons.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('new')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedCategory === 'new'
                        ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    신작 ({mainTab === 'adult' ? adultNewWebtoons.length : mainTab === 'english' ? englishNewWebtoons.length : mainTab === 'englishAdult' ? englishAdultNewWebtoons.length : newWebtoons.length})
                  </button>
                </div>

                {/* 요일 선택 탭 - 요일 카테고리 선택 시에만 표시 */}
                {selectedCategory === 'week' && (
                  <div className="mt-4 flex gap-2">
                    {[
                      { key: 'monday' as const, label: '월' },
                      { key: 'tuesday' as const, label: '화' },
                      { key: 'wednesday' as const, label: '수' },
                      { key: 'thursday' as const, label: '목' },
                      { key: 'friday' as const, label: '금' },
                      { key: 'saturday' as const, label: '토' },
                      { key: 'sunday' as const, label: '일' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          selectedDay === key
                            ? (mainTab === 'adult' ? 'bg-red-600 text-white' : mainTab === 'english' ? 'bg-orange-600 text-white' : mainTab === 'englishAdult' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}요일 ({mainTab === 'adult' ? adultWeekWebtoons[key].length : mainTab === 'english' ? englishWeekWebtoons[key].length : mainTab === 'englishAdult' ? englishAdultWeekWebtoons[key].length : weekWebtoons[key].length})
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 현재 카테고리의 웹툰들 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {getCategoryTitle()} ({getCurrentCategoryWebtoons().length}개)
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getCurrentCategoryWebtoons().map((webtoon, index) => webtoon && (
                        <div key={`${webtoon.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden">
                              {webtoon.thumbnail && (
                                <img
                                  src={webtoon.thumbnail}
                                  alt={webtoon.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-gray-900">{webtoon.title}</p>
                                {webtoon.ageRating && (() => {
                                  const rating = typeof webtoon.ageRating === 'string' ? parseInt(webtoon.ageRating) : webtoon.ageRating;
                                  if (rating >= 19) {
                                    return (
                                      <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">
                                        19+
                                      </span>
                                    );
                                  } else if (rating >= 18) {
                                    return (
                                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                                        18+
                                      </span>
                                    );
                                  } else if (rating >= 15) {
                                    return (
                                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded font-bold">
                                        15+
                                      </span>
                                    );
                                  } else if (rating >= 12) {
                                    return (
                                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded font-bold">
                                        12+
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <p className="text-sm text-gray-500">{webtoon.authorName}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCategory(webtoon.id, index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {getCurrentCategoryWebtoons().length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          {getCategoryTitle()}에 등록된 웹툰이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 모든 웹툰들 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                      <span>모든 {mainTab === 'adult' ? '성인 ' : ''}웹툰 ({getAvailableWebtoons().length}개)</span>
                      {loading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      )}
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getAvailableWebtoons().map((webtoon) => (
                        <div 
                          key={webtoon.id} 
                          onClick={() => addToCategory(webtoon.id)}
                          className="relative cursor-pointer hover:bg-gray-50 transition-all duration-200 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300"
                        >
                          <div className="flex items-center p-3">
                            <div className="w-16 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                              {webtoon.thumbnail && (
                                <img
                                  src={webtoon.thumbnail}
                                  alt={webtoon.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{webtoon.title}</p>
                              <p className="text-sm text-gray-500">{webtoon.authorName}</p>
                              <p className="text-xs text-gray-400">조회수: {webtoon.viewCount || 0}</p>
                            </div>
                            <Plus className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
                      {getAvailableWebtoons().length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          등록된 {mainTab === 'adult' ? '성인 ' : ''}웹툰이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 저장 버튼 */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={saveCategories}
                    className={`px-6 py-2 text-white rounded-lg transition-colors ${
                      mainTab === 'adult'
                        ? 'bg-red-600 hover:bg-red-700'
                        : mainTab === 'english'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : mainTab === 'englishAdult'
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    카테고리 설정 저장
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 사용자 관리 탭 내용 */}
        {mainTab === 'users' && (
          <>
            {/* 사용자/작가 서브 탭 */}
            <div className="mb-8">
              <div className="flex space-x-2 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setUserTab('users')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    userTab === 'users'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  사용자 ({users.length})
                </button>
                <button
                  onClick={() => setUserTab('authors')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    userTab === 'authors'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  작가 ({authors.length})
                </button>
              </div>
            </div>

            {/* 사용자 목록 */}
            {userTab === 'users' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">프론트엔드 사용자 목록</h2>
                  <p className="text-sm text-gray-500 mt-1">프론트엔드에 가입한 일반 사용자들의 정보입니다.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('username')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>사용자 정보</span>
                            {renderSortIcon('username')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('provider')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>가입 방식</span>
                            {renderSortIcon('provider')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>상태</span>
                            {renderSortIcon('status')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('adultVerified')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>성인인증</span>
                            {renderSortIcon('adultVerified')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('coinBalance')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>보유코인</span>
                            {renderSortIcon('coinBalance')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          활동 통계
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>가입일</span>
                            {renderSortIcon('createdAt')}
                          </div>
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSortedUsers().map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-purple-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.provider === 'google' 
                                ? 'bg-red-100 text-red-800'
                                : user.provider === 'kakao'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.provider === 'google' ? '구글' : user.provider === 'kakao' ? '카카오' : '이메일'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'SUSPENDED'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status === 'ACTIVE' ? '활성' : user.status === 'SUSPENDED' ? '정지' : '차단'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.adultVerified
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.adultVerified ? (
                                <>
                                  <Shield className="w-3 h-3 mr-1" />
                                  인증완료
                                </>
                              ) : (
                                '미인증'
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <Coins className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {(user.coinBalance || 0).toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>좋아요: {user._count?.likes || 0}</div>
                              <div>댓글: {user._count?.comments || 0}</div>
                              <div>조회: {user._count?.views || 0}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => window.location.href = `/users/${user.id}/coins`}
                                className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-2 py-1 rounded-md transition-colors"
                                title="코인 관리"
                              >
                                <Coins className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => window.location.href = `/users/${user.id}/payments`}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                                title="결제 내역"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                            등록된 사용자가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 작가 목록 */}
            {userTab === 'authors' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">작가센터 작가 목록</h2>
                  <p className="text-sm text-gray-500 mt-1">작가센터에 가입하여 웹툰을 등록한 작가들의 정보입니다.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작가 정보
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          가입 방식
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          작품 통계
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          가입일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {authors.map((author) => (
                        <tr key={author.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                  <Edit className="h-5 w-5 text-green-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{author.username}</div>
                                <div className="text-sm text-gray-500">{author.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              author.provider === 'google' 
                                ? 'bg-red-100 text-red-800'
                                : author.provider === 'kakao'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {author.provider === 'google' ? '구글' : author.provider === 'kakao' ? '카카오' : '이메일'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              author.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : author.status === 'SUSPENDED'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {author.status === 'ACTIVE' ? '활성' : author.status === 'SUSPENDED' ? '정지' : '차단'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>작품: {author._count?.comics || 0}</div>
                              <div>받은 좋아요: {author._count?.likes || 0}</div>
                              <div>댓글: {author._count?.comments || 0}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(author.createdAt).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      ))}
                      {authors.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                            등록된 작가가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

