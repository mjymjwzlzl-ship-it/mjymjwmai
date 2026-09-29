/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() { return [{"source":"/:path*","headers":[{"key":"Strict-Transport-Security","value":"max-age=31536000; includeSubDomains"},{"key":"X-Content-Type-Options","value":"nosniff"},{"key":"X-Frame-Options","value":"SAMEORIGIN"},{"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"},{"key":"Permissions-Policy","value":"camera=(), microphone=(), geolocation=()"},{"key":"Cache-Control","value":"private, no-store, max-age=0"}]}]; },
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