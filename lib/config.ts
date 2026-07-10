export const config = {
  breakpoints: { sm: 360, md: 768, lg: 1024 },
  image: {
    domains: [],
    remotePatterns: [],
  },
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
  cdnUrl: process.env.NEXT_PUBLIC_CDN_URL || "https://cdn.arata.co.kr",
};

export const getImageUrl = (imagePath: string, options?: { width?: number, noResize?: boolean }) => {
  if (!imagePath) return "";

  // 이미 CDN URL인 경우
  if (imagePath.startsWith("https://cdn.arata.co.kr")) {
    return imagePath;
  }

  // 외부 URL인 경우 그대로 반환
  if (imagePath.startsWith("http")) return imagePath;

  // 로컬 이미지 경로인 경우 (public 폴더)
  if (imagePath.startsWith('/images/') || imagePath.startsWith('/icons/')) {
    return imagePath;
  }

  // 로컬 개발 환경 체크 (클라이언트 사이드에서만)
  const isLocalhost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isLocalhost) {
    if (imagePath.startsWith('/uploads/')) {
      return imagePath;
    }
    if (imagePath.startsWith('uploads/')) {
      return `/${imagePath}`;
    }
    return imagePath.startsWith('/') ? imagePath : `/uploads/${imagePath}`;
  }

  // 프로덕션: CDN 경로 정규화
  let cdnPath = imagePath;
  if (!imagePath.startsWith('/uploads/')) {
    cdnPath = imagePath.startsWith('uploads/') ? `/${imagePath}` : `/uploads/${imagePath}`;
  }

  // 한글 경로 URL 인코딩 (각 세그먼트별로)
  const encodedPath = cdnPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

  // Cloudflare Image Resizing 적용
  if (options?.noResize) {
    return `${config.cdnUrl}${encodedPath}`;
  }

  const width = options?.width || 400;
  return `${config.cdnUrl}/cdn-cgi/image/format=auto,quality=75,width=${width}${encodedPath}`;
};