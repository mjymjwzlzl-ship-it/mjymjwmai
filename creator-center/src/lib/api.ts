import axios from 'axios';

// 백엔드 API 기본 URL - 항상 프록시 사용 (nginx가 라우팅 처리)
const getApiBaseUrl = () => {
  return '/api/proxy'; // 모든 환경에서 프록시 사용
};

const API_BASE_URL = getApiBaseUrl();

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // 쿠키 사용 안함 (JWT 토큰 사용)
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    // 다양한 토큰 키를 시도 (메인 앱과 일관성 유지)
    const authToken = localStorage.getItem('authToken');
    const token = localStorage.getItem('token');
    let finalToken = authToken || token;
    
    // 토큰이 없거나 유효하지 않으면 demo-token 사용
    if (!finalToken || finalToken === 'null' || finalToken === 'undefined') {
      finalToken = 'demo-token';
      console.log('🔧 토큰이 없어 demo-token 사용');
    }
    
    console.log('🔐 API 요청 인터셉터:', {
      url: config.url,
      method: config.method?.toUpperCase(),
      authToken: authToken ? `"${authToken}"` : 'null',
      token: token ? `"${token}"` : 'null',
      finalToken: finalToken ? `"${finalToken}"` : 'null',
      tokenPreview: finalToken ? `${finalToken.substring(0, 20)}...` : 'none',
      tokenLength: finalToken ? finalToken.length : 0
    });
    
    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
      console.log('✅ Authorization 헤더 설정됨');
    } else {
      console.log('❌ 토큰이 없어서 Authorization 헤더 없음');
    }
    
    return config;
  },
  (error) => {
    console.error('🚨 API 요청 인터셉터 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('🚨 API 에러 응답:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      // 인증 실패 시 토큰 제거 및 로그인 페이지로 이동
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      console.log('🔐 인증 실패 - 토큰 제거 및 로그인 페이지로 이동');
      window.location.href = '/login';
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
  // 웹툰 목록 조회 (creator API 사용)
  getWebtoons: () => api.get('/creator/comics'),
  
  // 내 웹툰 목록 조회 (통계 페이지용)
  getMyWebtoons: () => api.get('/creator/comics'),
  
  // 특정 웹툰 조회
  getWebtoon: (id: string) => api.get(`/creator/comics/${id}`),
  
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
    api.get(`/creator/comics/${webtoonId}/episodes`),
  
  // 에피소드 삭제
  deleteEpisode: (episodeId: string) => 
    api.delete(`/creator/episodes/${episodeId}`),

  // 에피소드 메타데이터 수정
  updateEpisodeMetadata: (episodeId: string, data: { title: string; episodeNumber: number }) =>
    api.put(`/creator/episodes/${episodeId}`, data),

  // 에피소드 전체 수정 (이미지 포함)
  updateEpisode: (episodeId: string, data: FormData) => 
    api.put(`/creator/episodes/${episodeId}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
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

export default api;