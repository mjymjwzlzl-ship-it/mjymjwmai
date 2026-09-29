'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home, List, MessageCircle, Heart, Share2, Settings, Eye, EyeOff, Coins, Lock, X, AlertTriangle, RotateCcw } from 'lucide-react';
import FastImage from '@/components/ui/FastImage';
import CommentSection from '@/components/ui/CommentSection';
import RatingSection from '@/components/ui/RatingSection';
import SimilarWorksRail from '@/components/ui/SimilarWorksRail';
import EpisodeEndMembershipBanner from '@/components/ui/EpisodeEndMembershipBanner';
import { useAdultStore } from '@/store/adult';
import { useAdultModeStore } from '@/store/adultMode';

// Dynamic Import로 모달 컴포넌트 로드 (초기 번들 사이즈 감소)
const AdultVerificationModal = dynamic(() => import('@/components/ui/AdultVerificationModal'), {
  ssr: false,
  loading: () => null
});
const CoinPurchaseModal = dynamic(() => import('@/components/ui/CoinPurchaseModal'), {
  ssr: false,
  loading: () => null
});
const ReportModal = dynamic(() => import('@/components/ui/ReportModal'), {
  ssr: false,
  loading: () => null
});
import { getImageUrl } from '@/lib/config';
import { api } from '@/lib/api';
import { eventBus, EVENTS } from '@/lib/events';
import { useTranslation } from '@/lib/i18n';
import { useLoginModalStore } from '@/store/loginModal';

interface Episode {
  id: number;
  title: string;
  episodeNumber: number;
  images: string[];
  createdAt: string;
  webtoonTitle?: string;
  author?: string;
  isFree?: boolean;
  coinPrice?: number;
  ownPrice?: number;
  rentPrice?: number;
  originalOwnPrice?: number;
  originalRentPrice?: number;
  promotion?: { label: string; remaining: string } | null;
  rentalDays?: number;
  rentalEnabled?: boolean;
  purchaseType?: 'OWN' | 'RENT' | null;
  expiresAt?: string | null;
  rentalExpired?: boolean;
  saleSuspended?: boolean;
  canView?: boolean;
  needsPurchase?: boolean;
  needsLogin?: boolean;
  needsSubscription?: boolean;
  requiresAdultVerification?: boolean;
  comic?: {
    title: string;
    thumbnailUrl?: string;
    rating?: string;
    genre?: string;
    ageRating?: string;
  };
}

const READ_POSITION_KEY = 'arata_read_position_v1';
type ReadPosition = { index: number; ratio: number; completed: boolean; at?: number };

function readReadPosition(episodeId: string): ReadPosition | null {
  try {
    const all = JSON.parse(localStorage.getItem(READ_POSITION_KEY) || '{}');
    const value = all?.[episodeId];
    return value && typeof value.index === 'number' ? value : null;
  } catch {
    return null;
  }
}

function writeReadPosition(episodeId: string, position: ReadPosition) {
  try {
    const all = JSON.parse(localStorage.getItem(READ_POSITION_KEY) || '{}') || {};
    all[episodeId] = { ...position, ratio: Math.round(position.ratio * 1000) / 1000, at: Date.now() };
    // 오래된 기록부터 지워 300회차까지만 보관
    const entries = Object.entries(all) as [string, ReadPosition][];
    const trimmed = entries.length > 300
      ? Object.fromEntries(entries.sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 300))
      : all;
    localStorage.setItem(READ_POSITION_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function EpisodePage() {
  const params = useParams();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const setAdult = useAdultStore((s) => s.setAdult);
  const setLoginModalOpen = useLoginModalStore((s) => s.setOpen);

  // 로그인 팝업으로 로그인하면 열람 권한을 다시 확인한다
  useEffect(() => {
    const handleUserLogin = () => window.location.reload();
    window.addEventListener('userLogin', handleUserLogin);
    return () => window.removeEventListener('userLogin', handleUserLogin);
  }, []);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'fit' | 'full'>('fit');
  const [isFirstEpisode, setIsFirstEpisode] = useState(false);
  const [isLastEpisode, setIsLastEpisode] = useState(false);
  const [nextEpisodeId, setNextEpisodeId] = useState<number | null>(null);
  const [prevEpisodeId, setPrevEpisodeId] = useState<number | null>(null);
  const [showAdultVerification, setShowAdultVerification] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [showCoinPurchase, setShowCoinPurchase] = useState(false);
  // 구매창 대상: null 이면 지금 회차, 값이 있으면 [다음 화]로 가려던 회차
  const [purchaseTarget, setPurchaseTarget] = useState<null | { id: string; episodeNumber: number; title: string; ownPrice: number; rentPrice?: number; rentalDays?: number; rentalEnabled?: boolean; originalOwnPrice?: number; originalRentPrice?: number; promotionLabel?: string }>(null);
  const [nextChecking, setNextChecking] = useState(false);
  // 회차를 못 불러온 이유 (성인인증 필요 등) — 일반 오류 화면 대신 안내
  const [accessError, setAccessError] = useState<string | null>(null);
  const setAdultModeEnabled = useAdultModeStore((state) => state.setEnabled);
  const adultRetryRef = useRef(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // fetchEpisodeData 함수를 useEffect 전에 정의
  const fetchEpisodeData = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // 먼저 모든 에피소드 목록을 가져와서 이전/다음 에피소드 ID를 찾기
      try {
        const episodesResponse = await api.get(`/frontend/comics/${params.id}/episodes`);
        if (episodesResponse.data && episodesResponse.data.episodes) {
          const allEpisodes = episodesResponse.data.episodes.sort((a: any, b: any) => 
            a.episodeNumber - b.episodeNumber
          );
          
          const currentIndex = allEpisodes.findIndex((ep: any) => 
            ep.id === params.episodeId || ep.id === parseInt(params.episodeId as string)
          );
          
          if (currentIndex !== -1) {
            // 이전화가 있는지 확인
            if (currentIndex > 0) {
              setPrevEpisodeId(allEpisodes[currentIndex - 1].id);
              setIsFirstEpisode(false);
            } else {
              setIsFirstEpisode(true);
            }
            
            // 다음화가 있는지 확인
            if (currentIndex < allEpisodes.length - 1) {
              setNextEpisodeId(allEpisodes[currentIndex + 1].id);
              setIsLastEpisode(false);
            } else {
              setIsLastEpisode(true);
            }
          }
        }
      } catch (error) {
        console.error('에피소드 목록을 불러오는데 실패했습니다', error);
      }
      
      const response = await api.get(`/episodes/${params.episodeId}`, {
        headers: token ? { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        } : {}
      });
      
      if (response.data) {
        const episodeData = response.data.episode;
        
        // 이미지 파싱
        let parsedImages: string[] = [];
        if (episodeData.images && episodeData.canView) {
          if (Array.isArray(episodeData.images)) {
            parsedImages = [...episodeData.images];
          } else {
            try {
              if (typeof episodeData.images === 'string') {
                parsedImages = JSON.parse(episodeData.images);
              }
            } catch (e) {
              if (typeof episodeData.images === 'string') {
                parsedImages = episodeData.images.split(',').map((img: string) => img.trim());
              }
            }
          }
          
          // 이미지 프리로드 - 첫 이미지 최우선, 나머지 순차 로드
          if (parsedImages.length > 0) {
            // 첫 번째 이미지만 최우선 즉시 로드 (빠른 초기 표시)
            const firstImg = new Image();
            firstImg.src = getImageUrl(parsedImages[0]);
            // @ts-ignore
            firstImg.fetchPriority = 'high';
            firstImg.decoding = 'sync'; // 동기식으로 즉시 디코딩

            // 2-15번째는 즉시 병렬 로드 (첫 페이지)
            if (parsedImages.length > 1) {
              parsedImages.slice(1, 15).forEach((url: string, idx: number) => {
                const img = new Image();
                img.src = getImageUrl(url);
                // @ts-ignore
                img.fetchPriority = 'auto';
                img.decoding = 'async';
              });
            }

            // 16번째부터는 백그라운드에서 계속 프리로드
            if (parsedImages.length > 15) {
              setTimeout(() => {
                parsedImages.slice(15).forEach((url: string) => {
                  const img = new Image();
                  img.src = getImageUrl(url);
                  // @ts-ignore
                  img.fetchPriority = 'low';
                  img.decoding = 'async';
                });
              }, 200);
            }
          }
        }
        
        // 데이터 설정
        const nextEpisode: Episode = {
          id: episodeData.id,
          title: episodeData.title,
          episodeNumber: episodeData.episodeNumber,
          images: parsedImages,
          createdAt: episodeData.createdAt,
          webtoonTitle: episodeData.comic?.title || '',
          author: episodeData.comic?.author?.nickname || '작가',
          isFree: episodeData.isFree,
          coinPrice: episodeData.coinPrice,
          ownPrice: episodeData.ownPrice,
          rentPrice: episodeData.rentPrice,
          originalOwnPrice: episodeData.originalOwnPrice,
          originalRentPrice: episodeData.originalRentPrice,
          promotion: episodeData.promotion,
          rentalDays: episodeData.rentalDays,
          rentalEnabled: episodeData.rentalEnabled,
          purchaseType: episodeData.purchaseType,
          expiresAt: episodeData.expiresAt,
          rentalExpired: episodeData.rentalExpired,
          saleSuspended: episodeData.saleSuspended,
          canView: episodeData.canView,
          needsPurchase: episodeData.needsPurchase,
          needsLogin: episodeData.needsLogin,
          needsSubscription: episodeData.needsSubscription,
          requiresAdultVerification: episodeData.requiresAdultVerification,
          comic: episodeData.comic
        };

        setEpisode(nextEpisode);

        // 성인 웹툰이면 자동으로 19금 토글 ON
        const isAdultEpisode = episodeData.comic?.ageRating ? (episodeData.comic.ageRating === '19' || String(episodeData.comic.ageRating) === '19') : false;
        if (isAdultEpisode) {
          setAdult('on');
        }
        
        // 성인인증이 필요한 경우
        if (episodeData.requiresAdultVerification) {
          setShowAdultVerification(true);
          return;
        }

        // 로그인/구독이 필요한 경우는 화면 내 안내 패널로 처리 (needsLogin / needsSubscription)

        // 에피소드를 볼 수 있는 경우 시청 기록 업데이트
        if (episodeData.canView) {
          updateViewHistory(nextEpisode);
          // 백엔드에서 이미 조회수와 읽음 상태를 처리함 (episodes/:id GET 요청 시)
        }
      }
      
      // 좋아요/싫어요 상태 확인
      if (token) {
        try {
          const reactionResponse = await api.get(`/episodes/${params.episodeId}/reaction`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsLiked(reactionResponse.data.isLiked || false);
          setIsDisliked(reactionResponse.data.isDisliked || false);
          setLikeCount(reactionResponse.data.likeCount || 0);
          setDislikeCount(reactionResponse.data.dislikeCount || 0);
        } catch (error) {
          console.error('반응 상태 확인 실패:', error);
        }
      }
    } catch (error: any) {
      console.error('에피소드 데이터를 불러오는데 실패했습니다', error);
      const code = error?.response?.data?.code;
      if (code === 'ADULT_MODE_REQUIRED' && !adultRetryRef.current) {
        // 성인 작품 회차인데 19 모드가 꺼져 있으면 켜고 한 번 다시 불러온다
        adultRetryRef.current = true;
        setAdultModeEnabled(true);
        setAdult('on');
        setTimeout(() => { void fetchEpisodeData(); }, 0);
        return;
      }
      setAccessError(code || 'LOAD_FAILED');
      if (code === 'ADULT_VERIFICATION_REQUIRED') setShowAdultVerification(true);
    } finally {
      setLoading(false);
    }
  }, [params.id, params.episodeId, router]);

  // 유료 회차에 들어오면 구매창을 먼저 띄운다
  useEffect(() => {
    if (episode?.needsPurchase && !episode.canView && !episode.saleSuspended) {
      setPurchaseTarget(null);
      setShowCoinPurchase(true);
    }
  }, [episode?.id, episode?.needsPurchase, episode?.canView]);

  // [다음 화]: 구매가 필요한 회차면 이동하기 전에 이 화면에서 구매창을 연다
  const goNextEpisode = async () => {
    if (!nextEpisodeId || nextChecking) return;
    const nextHref = `/webtoons/${params.id}/episode/${nextEpisodeId}`;
    const token = localStorage.getItem('authToken');
    if (!token) { router.push(nextHref); return; }
    setNextChecking(true);
    try {
      const { data } = await api.get(`/episodes/${nextEpisodeId}`, { headers: { Authorization: `Bearer ${token}` } });
      const next = data?.episode;
      if (next && next.needsPurchase && !next.canView && !next.saleSuspended) {
        setPurchaseTarget({
          id: String(next.id), episodeNumber: next.episodeNumber, title: next.title,
          ownPrice: next.ownPrice || next.coinPrice || 3, rentPrice: next.rentPrice, rentalDays: next.rentalDays, rentalEnabled: next.rentalEnabled,
          originalOwnPrice: next.originalOwnPrice, originalRentPrice: next.originalRentPrice, promotionLabel: next.promotion ? `${next.promotion.label} · ${next.promotion.remaining}` : undefined,
        });
        setShowCoinPurchase(true);
        return;
      }
      router.push(nextHref);
    } catch {
      router.push(nextHref); // 다음 화 화면이 사유(성인인증 등)를 안내한다
    } finally {
      setNextChecking(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    // 사용자 정보를 서버에서 가져오기
    const fetchUserData = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          const response = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data) {
            setUser(response.data);
            setCoinBalance(response.data.coinBalance || 0);
            setUserDataLoaded(true);
            
            // localStorage도 업데이트
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error('사용자 정보를 불러오는데 실패했습니다', error);
          // 실패 시 localStorage 사용
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setCoinBalance(parsedUser.coinBalance || 0);
            setUserDataLoaded(true);
          }
        }
      } else {
        setUserDataLoaded(true); // 로그인하지 않은 경우에도 로드 완료 표시
      }
    };

    fetchUserData();

    if (params.id && params.episodeId) {
      fetchEpisodeData();
    }
  }, [params.id, params.episodeId, fetchEpisodeData]);

  // 회차별 읽던 위치: 이미지 번호 + 그 이미지 안에서의 비율로 저장 (이미지가 늦게 떠도 같은 자리로 돌아간다)
  // 끝까지 본 회차(완독)는 다시 들어오면 회차 하단(평점·댓글·다음 화)부터 보여 준다.
  const [restoreTarget, setRestoreTarget] = useState<null | { index: number; ratio: number; completed: boolean }>(null);
  const [restoreNotice, setRestoreNotice] = useState<null | 'resumed' | 'completed'>(null);
  const restoringRef = useRef(false);
  const toCommentsRef = useRef(false);
  const completedRef = useRef(false);
  const endSectionRef = useRef<HTMLDivElement>(null);
  const episodeKey = String(params.episodeId || '');
  // 이미지가 다 뜨기 전에는 하단 영역이 위에 붙어 있어 완독으로 잘못 잡히므로, 다 뜬 뒤에만 완독 판정
  const allImagesLoadedRef = useRef(false);
  allImagesLoadedRef.current = Boolean(episode?.images?.length) && loadedImages.size >= (episode?.images?.length || 0);

  // 회차가 준비되면 저장된 위치를 확인한다
  useEffect(() => {
    if (!episode?.canView || !episode.images?.length || !episodeKey) return;
    const saved = readReadPosition(episodeKey);
    completedRef.current = Boolean(saved?.completed);
    // 댓글 내역에서 들어오면(?to=comments) 회차 하단 댓글 영역으로
    if (new URLSearchParams(window.location.search).get('to') === 'comments') {
      restoringRef.current = true;
      toCommentsRef.current = true;
      setRestoreTarget({ index: episode.images.length - 1, ratio: 1, completed: true });
      return;
    }
    if (!saved) return;
    if (saved.completed) {
      restoringRef.current = true;
      setRestoreTarget({ index: episode.images.length - 1, ratio: 1, completed: true });
    } else if (saved.index > 0 || saved.ratio > 0.02) {
      restoringRef.current = true;
      setRestoreTarget({ index: Math.min(saved.index, episode.images.length - 1), ratio: saved.ratio, completed: false });
    }
  }, [episode?.canView, episode?.images?.length, episodeKey]);

  // 목표 이미지까지 다 뜨면(또는 8초가 지나면) 그 자리로 이동
  useEffect(() => {
    if (!restoreTarget || !restoringRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const jump = () => {
      if (!restoringRef.current) return;
      restoringRef.current = false;
      if (restoreTarget.completed && endSectionRef.current) {
        const commentsEl = toCommentsRef.current ? container.querySelector<HTMLElement>('[data-comments-anchor]') : null;
        const commentsTop = commentsEl ? container.scrollTop + commentsEl.getBoundingClientRect().top - container.getBoundingClientRect().top : null;
        container.scrollTo({ top: Math.max(0, (commentsTop ?? endSectionRef.current.offsetTop) - 16) });
        setRestoreNotice(toCommentsRef.current ? null : 'completed');
      } else {
        const el = container.querySelector<HTMLElement>(`[data-img-index="${restoreTarget.index}"]`);
        if (el) container.scrollTo({ top: el.offsetTop + el.offsetHeight * restoreTarget.ratio });
        setRestoreNotice('resumed');
      }
      setRestoreTarget(null);
    };
    let ready = true;
    for (let i = 0; i <= restoreTarget.index; i += 1) if (!loadedImages.has(i)) { ready = false; break; }
    if (ready) {
      requestAnimationFrame(jump);
      return;
    }
    const timer = setTimeout(jump, 8000);
    return () => clearTimeout(timer);
  }, [restoreTarget, loadedImages]);

  useEffect(() => {
    if (!restoreNotice) return;
    const timer = setTimeout(() => setRestoreNotice(null), 7000);
    return () => clearTimeout(timer);
  }, [restoreNotice]);

  useEffect(() => {
    setLoadedImages(new Set());
  }, [episodeKey]);

  const readFromStart = () => {
    restoringRef.current = false;
    setRestoreTarget(null);
    setRestoreNotice(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 스크롤 진행률 추적 + 읽던 위치 저장 (스크롤 영역은 로딩이 끝난 뒤에 생기므로 episode 기준으로 붙인다)
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !episode?.canView || !episodeKey) return;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const savePosition = () => {
      if (restoringRef.current) return;
      const top = scrollElement.scrollTop;
      const images = scrollElement.querySelectorAll<HTMLElement>('[data-img-index]');
      let index = 0;
      let ratio = 0;
      for (const el of Array.from(images)) {
        if (el.offsetTop + el.offsetHeight > top) {
          index = Number(el.dataset.imgIndex) || 0;
          ratio = el.offsetHeight > 0 ? Math.max(0, Math.min(1, (top - el.offsetTop) / el.offsetHeight)) : 0;
          break;
        }
      }
      const end = endSectionRef.current;
      if (end && allImagesLoadedRef.current && top + scrollElement.clientHeight >= end.offsetTop + 40) completedRef.current = true;
      writeReadPosition(episodeKey, { index, ratio, completed: completedRef.current });
    };

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const progress = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0;
      setScrollProgress(Math.min(progress, 100));
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(savePosition, 400);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', savePosition);
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      scrollElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', savePosition);
    };
  }, [episode?.canView, episodeKey, loading]);

  // 자동 컨트롤 숨기기
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  const updateViewHistory = (currentEpisode = episode) => {
    if (!params.id || !currentEpisode) return;
    
    try {
      // 조회 기록 업데이트
      const viewHistory = JSON.parse(localStorage.getItem('viewedWebtoons') || '[]');
      const existingIndex = viewHistory.findIndex((item: any) => item.webtoonId.toString() === params.id?.toString());
      
      const viewRecord = {
        webtoonId: params.id,
        webtoonTitle: currentEpisode.webtoonTitle || t('webtoon.defaultTitle'),
        lastEpisode: currentEpisode.episodeNumber || 1,
        lastEpisodeTitle: currentEpisode.title || '',
        viewedAt: new Date().toISOString(),
        thumbnailUrl: currentEpisode.comic?.thumbnailUrl || ''
      };

      if (existingIndex >= 0) {
        viewHistory[existingIndex] = viewRecord;
      } else {
        viewHistory.unshift(viewRecord);
      }
      
      // 읽음 상태 업데이트
      if (currentEpisode.episodeNumber) {
        const progressKey = `webtoon_progress_${params.id}`;
        const progress = localStorage.getItem(progressKey);
        let progressData = { lastReadEpisode: 0, readEpisodes: [] as number[] };
        
        if (progress) {
          progressData = JSON.parse(progress);
        }
        
        if (!progressData.readEpisodes.includes(currentEpisode.episodeNumber)) {
          progressData.readEpisodes.push(currentEpisode.episodeNumber);
          progressData.lastReadEpisode = Math.max(progressData.lastReadEpisode, currentEpisode.episodeNumber);
          localStorage.setItem(progressKey, JSON.stringify(progressData));
        }
      }

      localStorage.setItem('viewedWebtoons', JSON.stringify(viewHistory.slice(0, 50)));
      window.dispatchEvent(new Event('viewedWebtoonsUpdated'));
    } catch (error) {
      console.error(t('webtoon.viewHistorySaveFailed'), error);
    }
  };

  const handlePurchaseConfirm = async (mode: 'RENT' | 'OWN' = 'OWN') => {
    const target = purchaseTarget;
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert(t('webtoon.loginRequiredGeneral'));
      router.push('/login');
      return;
    }

    try {
      // 코인 구매 API 호출
      const response = await api.post(
        `/episodes/${target ? target.id : params.episodeId}/purchase`,
        { mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        console.log('[Episode] 구매 API 응답:', response.data);
        // 사용자 정보 업데이트
        const newCoinBalance = response.data.coinBalance !== undefined ? response.data.coinBalance : response.data.newCoinBalance;
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.coinBalance = newCoinBalance;
        localStorage.setItem('user', JSON.stringify(userData));
        setCoinBalance(newCoinBalance);
        
        // 헤더의 코인 잔액 업데이트 이벤트 발생
        console.log('[Episode] 코인 업데이트 이벤트 발생:', { coinBalance: newCoinBalance });
        eventBus.emit(EVENTS.COIN_BALANCE_UPDATED, { coinBalance: newCoinBalance });
        
        // 모달 닫기
        setShowCoinPurchase(false);
        // [다음 화]에서 산 경우: 그 회차로 이동
        if (target) {
          setPurchaseTarget(null);
          router.push(`/webtoons/${params.id}/episode/${target.id}`);
          return;
        }
        
        // 구매한 에피소드 이미지 바로 설정
        if (response.data.episode && response.data.episode.images) {
          setEpisode(prev => prev ? {
            ...prev,
            images: response.data.episode.images,
            canView: true,
            needsPurchase: false,
            purchaseDate: response.data.episode.purchaseDate,
            purchaseType: response.data.episode.purchaseType,
            expiresAt: response.data.episode.expiresAt,
          } : null);
          
          // 구매 성공 메시지 표시 (대여면 기간 안내)
          alert(response.data.message || t('webtoon.episodePurchaseComplete'));
          
          // 에피소드 구매 이벤트 발생
          eventBus.emit(EVENTS.EPISODE_PURCHASED, { 
            episodeId: params.episodeId,
            episodeNumber: episode?.episodeNumber || 0,
            webtoonId: params.id
          });
        } else {
          // 데이터가 없으면 전체 다시 로드
          await fetchEpisodeData();
        }
      }
    } catch (error: any) {
      console.error(t('webtoon.purchaseFailed'), error);
      const data = error.response?.data || {};
      if (data.code === 'INSUFFICIENT_COINS') {
        // 다른 기기에서 코인을 써서 잔액이 바뀐 경우 등: 최신 잔액으로 맞추고 충전 안내
        if (typeof data.current === 'number') setCoinBalance(data.current);
        const go = window.confirm(`코인이 ${data.needed ?? ''}개 부족합니다.\n(필요 ${data.required ?? '-'}코인 · 보유 ${data.current ?? '-'}코인)\n\n코인 충전 페이지로 이동할까요?`);
        if (go) router.push('/coin');
        return;
      }
      if (!error.response) {
        alert('네트워크 연결이 불안정해 결제를 완료하지 못했습니다. 코인은 차감되지 않았어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      alert(`${data.message || '결제를 완료하지 못했습니다.'}\n코인은 차감되지 않았어요. 문제가 계속되면 고객센터로 문의해 주세요.`);
    }
  };


  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleAdultVerificationSuccess = () => {
    setShowAdultVerification(false);
    
    // 사용자 정보 업데이트
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    userData.adultVerified = true;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // 에피소드 데이터 새로고침
    fetchEpisodeData();
  };

  // 좋아요 토글
  const handleLikeToggle = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert(t('webtoon.loginRequiredGeneral'));
      router.push('/login');
      return;
    }
    
    try {
      const response = await api.post(`/episodes/${params.episodeId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setIsLiked(response.data.isLiked);
        setIsDisliked(response.data.isDisliked || false);
        setLikeCount(response.data.likeCount || likeCount);
        setDislikeCount(response.data.dislikeCount || dislikeCount);
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    }
  };


  // 공유하기
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${episode?.webtoonTitle} - ${episode?.title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: t('webtoon.checkOutWebtoon', { title: shareText }),
          url: shareUrl
        });
      } catch (error) {
        console.log(t('webtoon.shareCanceled'));
      }
    } else {
      // 클립보드에 복사
      navigator.clipboard.writeText(shareUrl);
      alert(t('webtoon.linkCopied'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">에피소드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!episode && accessError === 'ADULT_VERIFICATION_REQUIRED') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-[#1b1b1b]">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <Lock className="h-6 w-6 text-red-500" />
          </span>
          <h2 className="text-lg font-black text-gray-950 dark:text-white">성인 인증이 필요한 회차예요</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">PASS 본인인증으로 성인 인증을 완료하면 바로 볼 수 있어요.</p>
          <button onClick={() => setShowAdultVerification(true)} className="mt-5 h-12 w-full rounded-xl bg-[#00dc64] font-black text-black transition hover:bg-[#00c85a]">성인 인증하기</button>
          <button onClick={() => router.push(`/webtoons/${params.id}`)} className="mt-2 h-11 w-full rounded-xl bg-gray-100 text-sm font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">작품 홈으로</button>
        </div>
        <AdultVerificationModal
          isOpen={showAdultVerification}
          onClose={() => setShowAdultVerification(false)}
          onSuccess={() => { setShowAdultVerification(false); setAccessError(null); setLoading(true); void fetchEpisodeData(); }}
          mode="simple"
        />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">에피소드를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 text-gray-950 dark:bg-black dark:text-white">
      {/* 상단 네비게이션 - 안드로이드 WebView 호환성 개선 */}
      <div className={`fixed top-0 left-0 right-0 border-b border-gray-200 bg-white/95 backdrop-blur-sm z-[60] transition-all duration-300 dark:border-gray-800 dark:bg-black/90 ${
        showControls ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        WebkitTransform: showControls ? 'translateY(0)' : 'translateY(-100%)', // WebView 호환성
        transform: showControls ? 'translateY(0)' : 'translateY(-100%)'
      }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              // 성인 콘텐츠 판별
              const isAdultContent =
                episode?.comic?.rating === 'ADULT' ||
                episode?.comic?.rating === '19' ||
                episode?.comic?.ageRating === '19' ||
                episode?.comic?.ageRating === 'ADULT' ||
                (episode?.comic?.ageRating && parseInt(episode.comic.ageRating) >= 19) ||
                episode?.comic?.genre === 'adult';

              // 웹툰 상세 페이지로 이동 (홈이 아닌 상세 페이지)
              router.push(`/webtoons/${params.id}`);
            }}
            className="text-gray-800 hover:text-[#00d86a] transition-colors dark:text-white dark:hover:text-purple-400"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center text-gray-950 dark:text-white">
            <h1 className="text-sm font-medium">{episode?.webtoonTitle || t('webtoon.defaultTitle')}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {episode.episodeNumber === 0 ? t('webtoon.prologue') : t('webtoon.episodeNumber', { number: episode.episodeNumber })} - {episode.title}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode(viewMode === 'fit' ? 'full' : 'fit')}
              className="text-gray-800 hover:text-[#00d86a] transition-colors dark:text-white dark:hover:text-purple-400"
            >
              {viewMode === 'fit' ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => router.push(`/webtoons/${params.id}`)}
              className="text-gray-800 hover:text-[#00d86a] transition-colors dark:text-white dark:hover:text-purple-400"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* 진행률 바 */}
        <div className="h-1 bg-gray-200 dark:bg-gray-800">
          <div 
            className="h-full bg-[#00d86a] transition-all duration-300 dark:bg-purple-600"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      {/* 이어보기 안내: 복원 중 / 복원 후 [처음부터 보기] */}
      {(restoreTarget || restoreNotice) && (
        <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4" role="status">
          <div className="flex items-center gap-3 rounded-full bg-black/85 px-4 py-2.5 text-sm font-bold text-white shadow-lg">
            <span>
              {restoreTarget
                ? (restoreTarget.completed ? '완독한 회차예요. 하단으로 이동 중…' : '마지막으로 본 위치로 이동 중…')
                : restoreNotice === 'completed' ? '완독한 회차예요' : '마지막으로 본 위치부터 이어서 봅니다'}
            </span>
            <button type="button" onClick={readFromStart} className="rounded-full bg-[#00dc64] px-3 py-1 text-xs font-black text-black">
              처음부터 보기
            </button>
          </div>
        </div>
      )}

      {/* 메인 스크롤 영역 - 안드로이드 WebView 호환성 개선 */}
      <div
        ref={scrollRef}
        className="h-screen overflow-y-auto scrollbar-hide bg-gray-100 dark:bg-black"
        onClick={toggleControls}
        style={{
          paddingTop: showControls ? '80px' : '0px',
          paddingBottom: showControls ? '80px' : '0px',
          transition: 'padding 0.3s ease',
          WebkitOverflowScrolling: 'touch', // iOS 스크롤 개선
        }}
      >
        {/* 웹툰 이미지들 또는 유료 콘텐츠 안내 */}
        <div className="flex flex-col items-center">
          {episode.canView && episode.images && episode.images.length > 0 ? (
            // 구매했거나 무료 에피소드인 경우 이미지 표시
            episode.images.map((imageUrl, index) => (
              <FastImage
                key={`${episodeKey}-${index}`}
                eager={restoreTarget ? index <= restoreTarget.index : false}
                src={imageUrl}
                alt={`${episode.title} - ${index + 1}`}
                index={index}
                viewMode={viewMode}
                previousLoaded={index === 0 || loadedImages.has(index - 1)} // 이전 이미지가 로드되었는지 확인
                onLoad={() => {
                  setLoadedImages(prev => {
                    const newSet = new Set(prev);
                    newSet.add(index);
                    return newSet;
                  });
                }}
              />
            ))
          ) : episode.needsLogin || episode.needsSubscription ? (
            // 2화부터는 로그인 + 정액제 구독 필요
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-[#1b1b1b]">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00dc64]/15">
                  <Lock className="h-6 w-6 text-[#00a84c] dark:text-[#00dc64]" />
                </span>
                <h2 className="text-lg font-black text-gray-950 dark:text-white">
                  {episode.needsLogin ? '로그인이 필요해요' : '구독 회원 전용 회차예요'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {episode.needsLogin
                    ? '2화부터는 로그인 후 감상할 수 있어요.'
                    : '월정액 구독으로 모든 회차를 기다림 없이 감상하세요.'}
                </p>
                {episode.needsLogin ? (
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="mt-5 h-12 w-full rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a]"
                  >
                    로그인하고 이어보기
                  </button>
                ) : (
                  <Link
                    href="/subscribe"
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a]"
                  >
                    첫 달 990원으로 시작하기
                  </Link>
                )}
                <button
                  onClick={() => router.push(`/webtoons/${params.id}`)}
                  className="mt-2 h-11 w-full rounded-xl bg-gray-100 text-sm font-bold text-gray-600 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
                >
                  작품 홈으로 돌아가기
                </button>
              </div>
            </div>
          ) : episode.needsPurchase ? (
            // 유료 회차: 대여/소장 안내 (구매창은 자동으로 열리고, 닫아도 이 화면에 머문다)
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-[#1b1b1b]">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400/15">
                  <Coins className="h-6 w-6 text-yellow-500" />
                </span>
                <h2 className="text-lg font-black text-gray-950 dark:text-white">{episode.saleSuspended ? '판매가 중지된 작품이에요' : '유료 회차예요'}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {episode.rentalEnabled && typeof episode.rentPrice === 'number'
                    ? `대여 ${episode.rentPrice === 0 ? '무료' : `${episode.rentPrice}코인`}(${episode.rentalDays || 3}일) · 소장 ${episode.ownPrice || episode.coinPrice}코인`
                    : `소장 ${episode.ownPrice || episode.coinPrice}코인`}
                  {episode.promotion ? ` · ${episode.promotion.label}(${episode.promotion.remaining})` : ''}
                  {episode.rentalExpired ? ' · 대여 기간이 끝났어요' : ''}
                </p>
                {episode.saleSuspended ? (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    새로 대여·소장할 수 없어요. 이미 소장했거나 대여 기간이 남은 회차는 계속 볼 수 있어요.
                  </p>
                ) : (
                  <button
                    onClick={() => { setPurchaseTarget(null); setShowCoinPurchase(true); }}
                    className="mt-5 h-12 w-full rounded-xl bg-[#00dc64] font-black text-black shadow-lg shadow-green-500/15 transition hover:bg-[#00c85a]"
                  >
                    대여 / 소장하기
                  </button>
                )}
                {prevEpisodeId && (
                  <button
                    onClick={() => router.push(`/webtoons/${params.id}/episode/${prevEpisodeId}`)}
                    className="mt-2 h-11 w-full rounded-xl bg-gray-100 text-sm font-bold text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
                  >
                    이전 화로 돌아가기
                  </button>
                )}
                <button
                  onClick={() => router.push(`/webtoons/${params.id}`)}
                  className="mt-2 h-11 w-full rounded-xl text-sm font-bold text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                >
                  작품 홈으로
                </button>
              </div>
            </div>
          ) : (
            // 기타 오류
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400">에피소드를 불러올 수 없습니다.</p>
              </div>
            </div>
          )}
          
          {/* 웹툰 이미지가 끝난 후 댓글 섹션 (네이버 웹툰 스타일) */}
          {episode?.canView && episode?.images && episode.images.length > 0 && (
            <div ref={endSectionRef} className="w-full bg-gray-50 mt-8 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800">
              <EpisodeEndMembershipBanner />
              {/* 다음화/이전화 네비게이션 */}
              <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => {
                      if (prevEpisodeId) {
                        router.push(`/webtoons/${params.id}/episode/${prevEpisodeId}`);
                      }
                    }}
                    disabled={isFirstEpisode}
                    className={`flex-1 mr-2 px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      isFirstEpisode 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' 
                        : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white dark:border-gray-700'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    이전화
                  </button>
                  <button
                    onClick={() => {
                      void goNextEpisode();
                    }}
                    disabled={isLastEpisode}
                    className={`flex-1 ml-2 px-4 py-3 rounded-lg transition-colors flex items-center justify-center ${
                      isLastEpisode 
                        ? 'bg-purple-100 text-purple-300 cursor-not-allowed dark:bg-purple-800 dark:text-gray-400' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    다음화
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={readFromStart}
                  className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  처음부터 보기
                </button>

                {/* 작품 정보 */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 mb-2 dark:text-white">{episode.webtoonTitle}</h3>
                    <p className="text-gray-500 text-sm dark:text-gray-400">
                      {episode.episodeNumber === 0 ? t('webtoon.prologue') : t('webtoon.episodeNumber', { number: episode.episodeNumber })} - {episode.title}
                    </p>
                    {!episode.isFree && episode.purchaseType === 'RENT' && episode.expiresAt && (
                      <p className="mt-1 text-xs font-bold text-[#00a84c] dark:text-[#00dc64]">
                        대여 중 · {new Date(episode.expiresAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}까지
                        <button type="button" onClick={() => setShowCoinPurchase(true)} className="ml-2 underline">소장하기</button>
                      </p>
                    )}
                    {!episode.isFree && episode.purchaseType === 'OWN' && (
                      <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">소장한 회차</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleShare}
                      title="공유하기"
                      aria-label="공유하기"
                      className="p-2 rounded-full text-gray-500 hover:text-purple-500 bg-gray-100 transition-colors dark:text-gray-400 dark:hover:text-purple-400 dark:bg-gray-700"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setShowReportModal(true)}
                      className="p-2 rounded-full text-gray-500 hover:text-red-500 bg-gray-100 transition-colors dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700"
                      title="신고하기"
                    >
                      <AlertTriangle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 작품 평점 및 댓글 */}
              <div className="max-w-2xl mx-auto px-4 pb-20">
                {/* 회차 평점: 회차마다 따로 저장. 작품 상세의 평점은 모든 회차 평점의 평균 */}
                <div className="mb-4">
                  <RatingSection episodeId={params.episodeId} title="이 회차 어떠셨나요?" />
                </div>
                {/* 추천 작품: 작품 상세의 '비슷한 인기 작품'과 같은 기준. 최종화면 같은 장르 인기작도 함께 */}
                <div className="mb-4">
                  <SimilarWorksRail comicId={String(params.id)} isFinale={isLastEpisode} />
                </div>
                <div data-comments-anchor>
                  <CommentSection
                    episodeId={params.episodeId}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 네비게이션 - 안드로이드 WebView 호환성 개선 */}
      <div className={`fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm z-40 transition-all duration-300 dark:border-gray-800 dark:bg-black/90 ${
        showControls ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        WebkitTransform: showControls ? 'translateY(0)' : 'translateY(100%)', // WebView 호환성
        transform: showControls ? 'translateY(0)' : 'translateY(100%)'
      }}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              if (prevEpisodeId) {
                router.push(`/webtoons/${params.id}/episode/${prevEpisodeId}`);
              }
            }}
            disabled={isFirstEpisode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isFirstEpisode 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>이전화</span>
          </button>


          <button
            onClick={() => {
              void goNextEpisode();
            }}
            disabled={isLastEpisode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isLastEpisode 
                ? 'bg-purple-100 text-purple-300 cursor-not-allowed dark:bg-purple-800 dark:text-gray-400' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <span>다음화</span>
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      </div>

      {/* 성인인증 모달 */}
      <AdultVerificationModal
        isOpen={showAdultVerification}
        onClose={() => {
          setShowAdultVerification(false);
          // 성인 콘텐츠면 성인 홈으로, 아니면 일반 홈으로
          const isAdultContent = episode?.comic?.genre === 'adult' || 
                                (episode?.comic?.ageRating && (episode.comic.ageRating === '19' || parseInt(episode.comic.ageRating) >= 19));
          router.push(isAdultContent ? '/adult' : '/');
        }}
        onSuccess={handleAdultVerificationSuccess}
        mode="simple"
      />

      {/* 코인 구매 모달 */}
      <CoinPurchaseModal
        isOpen={showCoinPurchase}
        onClose={() => {
          // 닫으면 지금 화면에 그대로 머문다 (다음 화 구매를 취소하면 보던 회차 그대로)
          setShowCoinPurchase(false);
          setPurchaseTarget(null);
        }}
        onConfirm={handlePurchaseConfirm}
        episodeTitle={purchaseTarget ? purchaseTarget.title : (episode?.title || '')}
        episodeNumber={purchaseTarget ? purchaseTarget.episodeNumber : (episode?.episodeNumber || 1)}
        coinPrice={purchaseTarget ? purchaseTarget.ownPrice : (episode?.ownPrice || episode?.coinPrice || 3)}
        rentPrice={purchaseTarget ? purchaseTarget.rentPrice : episode?.rentPrice}
        rentalDays={purchaseTarget ? purchaseTarget.rentalDays : episode?.rentalDays}
        rentalEnabled={purchaseTarget ? purchaseTarget.rentalEnabled : episode?.rentalEnabled}
        originalOwnPrice={purchaseTarget ? purchaseTarget.originalOwnPrice : episode?.originalOwnPrice}
        originalRentPrice={purchaseTarget ? purchaseTarget.originalRentPrice : episode?.originalRentPrice}
        promotionLabel={purchaseTarget ? purchaseTarget.promotionLabel : (episode?.promotion ? `${episode.promotion.label} · ${episode.promotion.remaining}` : undefined)}
        currentlyRented={!purchaseTarget && episode?.purchaseType === 'RENT' && !!episode?.canView}
        userCoinBalance={coinBalance}
        webtoonTitle={episode?.webtoonTitle || ''}
      />

      {/* 신고 모달 */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="EPISODE"
        targetId={params.episodeId as string}
        targetName={`${episode?.webtoonTitle} - ${episode?.title}`}
      />

    </div>
  );
}
