import axios from 'axios';

// API 베이스 URL - 환경에 따라 자동 결정
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api'; // 로컬환경에서는 직접 연결
    } else {
      return 'https://api.arata.co.kr/api'; // 운영환경에서는 HTTPS API 호출
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    // 토큰 추가
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      config.headers['Authorization'] = 'Bearer admin-authenticated';
    }
    
    console.log('API 요청:', config.url);
    console.log('요청 헤더:', config.headers);
    return config;
  },
  (error) => {
    console.error('요청 인터셉터 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    console.log('API 응답:', response.status);
    return response.data;
  },
  (error) => {
    console.error('API 에러 상세:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('요청 시간 초과: 백엔드 서버가 응답하지 않습니다.');
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('네트워크 오류: 백엔드 서버에 연결할 수 없습니다.');
    }
    
    if (error.response) {
      // 서버가 응답을 반환한 경우
      console.error('응답 에러:', error.response.status, error.response.data);
      throw new Error(`API 오류 (${error.response.status}): ${error.response.data.message || '알 수 없는 오류'}`);
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못한 경우
      console.error('응답 없음:', error.request);
      throw new Error('백엔드 서버가 응답하지 않습니다. 서버 상태를 확인해주세요.');
    } else {
      // 요청 설정 중 오류 발생
      console.error('요청 설정 오류:', error.message);
      throw new Error(`요청 오류: ${error.message}`);
    }
  }
);

// 카테고리 API
export const categoryAPI = {
  getCategories: () => apiClient.get('/admin/categories'),
  saveCategories: (data: any) => apiClient.post('/admin/categories', data),
  getAdultCategories: () => apiClient.get('/admin/categories/adult'),
  saveAdultCategories: (data: any) => apiClient.post('/admin/categories/adult', data),
  getEnglishCategories: () => apiClient.get('/admin/categories/english'),
  saveEnglishCategories: (data: any) => apiClient.post('/admin/categories/english', data),
  getEnglishAdultCategories: () => apiClient.get('/admin/categories/english-adult'),
  saveEnglishAdultCategories: (data: any) => apiClient.post('/admin/categories/english-adult', data),
};

// 웹툰 API
export const comicsAPI = {
  getComics: () => apiClient.get('/admin/comics?rating=general&limit=1000'),
  getAdultComics: () => apiClient.get('/admin/comics?rating=19&limit=1000'),
  getEnglishComics: () => apiClient.get('/admin/comics?locale=en&rating=general&limit=1000'),
  getEnglishAdultComics: () => apiClient.get('/admin/comics?locale=en&rating=19&limit=1000'),
};

// 사용자 관리 API
export const usersAPI = {
  getUsers: () => apiClient.get('/admin/users'),
  getAuthors: () => apiClient.get('/admin/authors'),
};

// 신고 관리 API
export const reportsAPI = {
  getReports: (params?: any) => apiClient.get('/admin/reports', { params }),
  getReportStats: () => apiClient.get('/admin/reports/stats'),
  processReport: (id: string, data: any) => apiClient.put(`/admin/reports/${id}/process`, data),
};