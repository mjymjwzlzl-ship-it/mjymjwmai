/**
 * Next.js Image Custom Loader
 * 백엔드 이미지를 최적화된 방식으로 로드
 */

export default function customImageLoader({
  src,
  width,
  quality
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // 이미 절대 경로(http/https)면 그대로 사용
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // placeholder 이미지는 그대로 사용
  if (src.includes('placeholder') || src.startsWith('data:')) {
    return src;
  }

  // /uploads/ 경로는 백엔드로 프록시
  if (src.startsWith('/uploads/')) {
    const backendUrl = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000');

    // 백엔드가 이미지 최적화를 지원하지 않으므로 원본 URL 반환
    // Next.js가 자체적으로 최적화 수행
    return `${backendUrl}${src}`;
  }

  // 기타 경로는 그대로 반환
  return src;
}
