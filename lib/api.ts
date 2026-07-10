import axios from 'axios';
import { getApiUrl } from './api-config';
import { useLanguageStore } from '@/store/language';

// 백엔드 API 기본 URL
const API_BASE_URL = getApiUrl();

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // 쿠키 사용 안함 (JWT 토큰 사용)
});

// 요청 인터셉터 - 토큰 및 언어 추가
api.interceptors.request.use(
  (config) => {
    // 다양한 토큰 키를 시도 (메인 앱과 일관성 유지)
    if (typeof window === 'undefined') {
      return config; // SSR에서는 토큰 체크 안 함
    }
    const authToken = localStorage.getItem('authToken');
    const token = localStorage.getItem('token');
    let finalToken = authToken || token;

    // 유효한 토큰이 있을 때만 Authorization 헤더 추가
    // 'null', 'undefined' 문자열이나 빈 값은 무시
    if (finalToken && finalToken !== 'null' && finalToken !== 'undefined') {
      config.headers.Authorization = `Bearer ${finalToken}`;
    }
    // 토큰이 없으면 Authorization 헤더를 보내지 않음 (비로그인 상태)
    
    // 언어 파라미터를 API에 전송하지 않음 (탑툰/네이버 방식)
    // 모든 텍스트는 프론트엔드에서만 번역 처리
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401/403 에러 시 토큰이 유효하지 않은 경우에만 제거
    // 자동 리다이렉트는 하지 않음 (개별 페이지에서 처리)
    if (typeof window !== 'undefined' && (error.response?.status === 401 || error.response?.status === 403)) {
      // 토큰이 있었는데 401/403이 발생한 경우에만 토큰 제거
      const hadToken = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (hadToken) {
        // 인증 실패 시 토큰 제거
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        console.log('🔒 토큰이 유효하지 않아 제거되었습니다.');
      }

      // 자동 로그인 리다이렉트 제거 - 각 페이지에서 필요시 처리
    }
    return Promise.reject(error);
  }
);

// API 엔드포인트
export const authAPI = {
  login: (data: { email: string; password: string }) => 
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; username: string }) => 
    api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

export const webtoonAPI = {
  // 웹툰 목록 조회 (frontend API 사용)
  getWebtoons: () => api.get('/frontend/comics'),
  
  // 내 웹툰 목록 조회 (통계 페이지용)
  getMyWebtoons: () => api.get('/frontend/comics'),
  
  // 특정 웹툰 조회
  getWebtoon: (id: string) => api.get(`/frontend/comics/${id}`),
  
  // 웹툰 생성 (creator API 사용)
  createWebtoon: (data: FormData) => 
    api.post('/creator/comics', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  // 웹툰 수정
  updateWebtoon: (id: string, data: FormData) => 
    api.put(`/creator/comics/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  // 웹툰 삭제
  deleteWebtoon: (id: string) => api.delete(`/creator/comics/${id}`),
  
  // 에피소드 업로드
  uploadEpisode: (webtoonId: string, data: FormData) => 
    api.post(`/creator/comics/${webtoonId}/episodes`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  // 에피소드 목록 조회
  getEpisodes: (webtoonId: string) => 
    api.get(`/frontend/comics/${webtoonId}/episodes`),
  
  // 에피소드 삭제
  deleteEpisode: (episodeId: string) => 
    api.delete(`/creator/episodes/${episodeId}`),

  // 에피소드 메타데이터 수정
  updateEpisodeMetadata: (episodeId: string, data: { title: string; episodeNumber: number }) =>
    api.put(`/creator/episodes/${episodeId}`, data),

  // 모든 카테고리 목록 조회
    getCategories: (isAdult: boolean = false) => api.get(`/frontend/categories/list?adult=${isAdult}`),
};



// 디버깅용 함수들
export const debugAPI = {
  checkToken: () => {
    const authToken = localStorage.getItem('authToken');
    const token = localStorage.getItem('token');
    console.log('🔍 LocalStorage 토큰 확인:', {
      authToken: authToken ? `"${authToken}"` : 'null',
      token: token ? `"${token}"` : 'null'
    });
    return { authToken, token };
  },
  
  setDemoToken: () => {
    localStorage.setItem('token', 'demo-token');
    console.log('✅ demo-token 설정 완료');
  },
  
  clearTokens: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🗑️ 모든 토큰 제거 완료');
  }
};

// 전역에서 접근 가능하도록 설정
if (typeof window !== 'undefined') {
  (window as any).debugAPI = debugAPI;
}

// API endpoints
export const endpoints = {
  comics: '/frontend/comics',  // 메인 사이트는 frontend API 사용
  categories: '/frontend/categories/list',
  home: '/frontend/home',
  login: '/auth/login',
  signup: '/auth/signup',
  register: '/auth/signup',
  logout: '/auth/logout',
  history: '/users/history'  // 내가 보던 웹툰
};

export { api };
export default api;