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
    return [
      {
        source: '/api/proxy/:path*',
        destination: (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000') + '/uploads/:path*',
      },
    ]
  },
}

module.exports = nextConfig