/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 출력 설정 - prerender-manifest.json 생성 보장
  output: 'standalone',
  generateBuildId: async () => {
    // 고정된 빌드 ID 사용으로 일관성 보장
    return 'arata-build-2024'
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'api.arata.co.kr',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'arata.co.kr',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'admin.arata.co.kr',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'creator.arata.co.kr',
        pathname: '/uploads/**',
      }
    ],
    // 이미지 최적화 설정
    unoptimized: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    formats: ['image/webp'], // WebP 포맷 우선 사용
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'arata-nextauth-secret-key-2024',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:4000',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
  
  // 성능 최적화 설정
  compress: true, // gzip 압축 활성화
  poweredByHeader: false, // X-Powered-By 헤더 제거
  
  // 실험적 기능
  experimental: {
    scrollRestoration: true, // 스크롤 복원
  },
  
  // 번들 분석 (필요시 활성화)
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.alias = {
  //       ...config.resolve.alias,
  //       'react-is$': 'react-is/cjs/react-is.production.min.js',
  //     };
  //   }
  //   return config;
  // },
  
  async rewrites() {
    // 프로덕션 빌드에서는 항상 localhost:8000을 사용
    // 환경 변수가 비어있거나 설정되지 않은 경우 기본값 사용
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL !== '' 
      ? process.env.NEXT_PUBLIC_BACKEND_URL 
      : 'http://localhost:8000'
    
    console.log('🔧 Rewrites 설정:', {
      backend,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      rewrites: [
        { source: '/api/:path*', destination: `${backend}/api/:path*` },
        { source: '/auth/:path*', destination: `${backend}/api/auth/:path*` },
        { source: '/frontend/:path*', destination: `${backend}/api/frontend/:path*` },
        { source: '/creator/:path*', destination: `${backend}/api/creator/:path*` },
        { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
      ]
    })
    
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${backend}/api/auth/:path*`,
      },
      {
        source: '/frontend/:path*',
        destination: `${backend}/api/frontend/:path*`,
      },
      {
        source: '/creator/:path*',
        destination: `${backend}/api/creator/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ]
  },
  
  async headers() {
    return [
      {
        // APK 파일 다운로드 헤더
        source: '/downloads/:path*.apk',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Content-Disposition', value: 'attachment' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // 모든 경로에 CSP 헤더 적용
        source: '/:path*',
        headers: [
          ...(process.env.NODE_ENV === 'development'
            ? [
                { key: 'Clear-Site-Data', value: '"cache"' },
                { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
              ]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http://localhost:* https://via.placeholder.com https://api.arata.co.kr https://arata.co.kr",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' http://localhost:* https://api.arata.co.kr https://arata.co.kr wss: ws:",
              "media-src 'self'",
              "object-src 'none'",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ],
      },
      {
        // 정적 파일 캐싱 (1년)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development'
              ? 'no-store, no-cache, must-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // 이미지 캐싱 (1주일)
        source: '/_next/image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // 폰트 캐싱 (1년)
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
