/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api/proxy',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    NEXT_PUBLIC_IMAGE_BASE_URL: process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'http://localhost:8000',
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('🔧 Rewrites 설정:', {
      backend,
      rewrites: [
        { source: '/api/proxy/:path*', destination: `${backend}/api/:path*` },
        { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
      ]
    });
    return [
      { source: '/api/proxy/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backend}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;