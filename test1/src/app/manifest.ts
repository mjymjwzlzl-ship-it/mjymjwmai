import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ARATA',
    short_name: 'ARATA',
    description: '매일 업데이트되는 웹툰 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6C5CE7',
    icons: [
      { src: '/icons/arata-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/arata-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}


