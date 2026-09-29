import type { MetadataRoute } from 'next';

const publicRoutes = [
  '',
  '/daily',
  '/books',
  '/new',
  '/chat',
  '/subscribe',
  '/community',
  '/support',
  '/terms/service',
  '/terms/privacy',
  '/terms/youth',
  '/terms/refund',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicRoutes.map((route) => ({
    url: `https://arata.co.kr${route}`,
    lastModified,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));
}
