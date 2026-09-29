import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/auth/callback', '/mypage/'],
    },
    sitemap: 'https://arata.co.kr/sitemap.xml',
    host: 'https://arata.co.kr',
  };
}
