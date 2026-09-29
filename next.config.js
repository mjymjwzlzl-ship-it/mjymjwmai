/** @type {import('next').NextConfig} */

// 번들 분석기 설정
let withBundleAnalyzer = (config) => config

try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })
} catch (error) {
  // Firebase Hosting's Next.js adapter bundles this config in a trimmed install.
  // The analyzer is optional and only needed when ANALYZE=true locally.
  if (process.env.ANALYZE === 'true') {
    throw error
  }
}

const nextConfig = {
  reactStrictMode: true,

  // 빌드 출력 폴더 (NEXT_DIST_DIR로 재정의 가능 - 여러 서버가 같은 .next를 공유하며 깨지는 것 방지)
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Windows에서 dev 웹팩 파일 캐시가 EPERM(파일 잠금)으로 손상되어 500/404를 내는 문제 방지.
  // dev 전용이며 프로덕션 빌드에는 영향 없음 (리빌드가 약간 느려지는 대신 안정적).
  webpack: (config, { dev }) => {
    if (dev && process.platform === 'win32') {
      config.cache = { type: 'memory' }
    }
    return config
  },

  // 이미지 최적화 (현재 미사용 - 기본 img 태그 사용)
  images: {
    unoptimized: true, // img 태그 사용으로 최적화 비활성화
  },

  // 압축 설정
  compress: true,

  // 프로덕션 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // 프로덕션에서 console.log 제거
  },
  
  // 리다이렉트 설정
  async redirects() {
    return [
      {
        source: '/webtoons/:id/episodes',
        destination: '/webtoons/:id',
        permanent: true,
      },
      {
        source: '/en/webtoons/:id/episodes',
        destination: '/en/webtoons/:id',
        permanent: true,
      },
    ]
  },

  // API 프록시 설정 (로컬 개발 환경용)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/uploads/:path*`,
      },
    ]
  },
  
  // 헤더 설정
  async headers() {
    return [
      {"source":"/:path*","headers":[{"key":"Strict-Transport-Security","value":"max-age=31536000; includeSubDomains"},{"key":"X-Content-Type-Options","value":"nosniff"},{"key":"X-Frame-Options","value":"SAMEORIGIN"},{"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"},{"key":"Permissions-Policy","value":"camera=(), microphone=(), geolocation=()"}]},
      {
        // HTML 페이지는 캐시 금지 (Cloudflare가 오래된 HTML 서빙 방지)
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          }
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0'
          }
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
