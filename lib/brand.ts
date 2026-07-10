export const BRAND = {
  name: 'ARATA COMICS',
  tagline: '무제한 웹툰 플랫폼',
  colors: {
    primary: '#00dc64', // Vibrant Green
    primaryDark: '#00c257',
    accent: '#00dc64',
    danger: '#FF3B30',
    text: '#e0e0e0',
    muted: '#a0a0a0',
    bg: '#FFFFFF',
    bgDark: '#121212', // Main background
  },
} as const;

export type Brand = typeof BRAND;


