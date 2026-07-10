// API 헬퍼 함수들
const getApiBaseUrl = () => {
  // 브라우저 환경에서 현재 호스트 확인
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // HTTPS 환경 (Cloudflare Tunnel 사용)
    if (window.location.protocol === 'https:' && hostname.includes('arata.co.kr')) {
      // admin.arata.co.kr에서는 프록시 사용
      return '/api/proxy';
    }
    
    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
    }
  }
  
  // 서버 사이드 렌더링 또는 기본값
  return process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
};

const API_BASE_URL = getApiBaseUrl();

export const getAuthHeader = () => {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 기본 토큰 사용
    return 'Bearer admin-authenticated';
  }
  
  const token = localStorage.getItem('adminToken') || 'admin-authenticated';
  return `Bearer ${token}`;
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('API 호출:', url);
  
  const defaultHeaders = {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };
  
  console.log('요청 헤더:', defaultHeaders);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // fetch 옵션 추가
      mode: 'cors',
    });
    
    console.log('응답 상태:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Fetch 에러 상세:', error);
    
    if (error instanceof Error) {
      console.error('에러 타입:', error.constructor.name);
      console.error('에러 메시지:', error.message);
      
      if (error instanceof TypeError) {
        if (error.message === 'Load failed' || error.message.includes('Failed to fetch')) {
          throw new Error('네트워크 연결 실패: 백엔드 서버에 접근할 수 없습니다. CORS 또는 네트워크 문제일 수 있습니다.');
        }
      }
    }
    throw error;
  }
};

// 카테고리 API
export const categoryAPI = {
  getCategories: () => apiCall('/admin/categories'),
  saveCategories: (data: any) => apiCall('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAdultCategories: () => apiCall('/admin/categories/adult'),
  saveAdultCategories: (data: any) => apiCall('/admin/categories/adult', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// 웹툰 API
export const comicsAPI = {
  getComics: () => apiCall('/admin/comics'),
  getAdultComics: () => apiCall('/admin/comics/adult'),
};