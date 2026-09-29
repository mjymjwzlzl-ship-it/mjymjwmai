// 환경 변수 설정
export const config = {
  // API 기본 URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  
  // 백엔드 기본 URL (이미지 등 정적 파일용)
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  
  // NextAuth URL
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:4001',
};

// 이미지 URL 생성 헬퍼 함수
export const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  
  // 이미 전체 URL인 경우 그대로 반환
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // 상대 경로인 경우 백엔드 URL과 결합
  return `${config.backendUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// API URL 생성 헬퍼 함수
export const getApiUrl = (endpoint: string) => {
  return `${config.apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};