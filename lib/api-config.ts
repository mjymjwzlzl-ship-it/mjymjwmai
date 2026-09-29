// API 설정을 위한 헬퍼 함수
export const getBackendUrl = () => {
  // 브라우저 환경에서 현재 호스트 확인
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // arata.co.kr 도메인에서는 현재 도메인을 백엔드로 사용 (프록시 통해)
    if (hostname.includes('arata.co.kr')) {
      return window.location.origin; // https://arata.co.kr 또는 https://creator.arata.co.kr
    }
    
    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    }
  }
  
  // 서버 사이드 렌더링
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};

export const getApiUrl = () => {
  // 모든 환경에서 일관되게 /api 사용
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    console.log('🔧 API URL 생성:', {
      hostname,
      isArataApp: (window as any).isArataApp,
      NODE_ENV: process.env.NODE_ENV
    });
    
    // WebView 앱에서 접속한 경우 절대 경로 사용
    if ((window as any).isArataApp) {
      console.log('📱 WebView 앱 감지 - https://arata.co.kr/api 사용');
      return 'https://arata.co.kr/api';
    }

    if (configuredApiUrl && configuredApiUrl !== '/api') {
      return configuredApiUrl;
    }
    
    // 로컬 개발 환경에서는 백엔드 직접 호출
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🏠 로컬 환경 - /api 프록시 사용');
      return '/api'; // Next.js rewrites가 처리
    }
    
    // 프로덕션 도메인에서는 api.arata.co.kr 직접 사용 (Cloudflare 프록시 우회)
    if (hostname === 'arata.co.kr' || hostname === 'www.arata.co.kr') {
      console.log('🌐 프로덕션 도메인 - api.arata.co.kr 직접 사용');
      return 'https://api.arata.co.kr/api';
    }

    if (hostname.endsWith('.web.app') || hostname.endsWith('.firebaseapp.com')) {
      return 'https://api.arata.co.kr/api';
    }
    
    console.log('❓ 알 수 없는 호스트 - /api 기본값 사용');
    return '/api'; // 기본값으로 /api 사용
  }
  
  // 서버 사이드 렌더링 - 직접 백엔드 호출
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  console.log('🔗 SSR 백엔드 URL:', `${backendUrl}/api`);
  return `${backendUrl}/api`;
};
