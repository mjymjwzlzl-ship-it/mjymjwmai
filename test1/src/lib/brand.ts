export const BRAND = {
  name: 'ARATA',
  tagline: '매일 업데이트되는 웹툰',
  colors: {
    primary: '#6C5CE7',
    primaryDark: '#5846D6',
    accent: '#00D1B2',
    danger: '#FF3B30',
    text: '#111827',
    muted: '#6B7280',
    bg: '#FFFFFF',
    bgDark: '#0B0B0F',
  },
} as const;

export type Brand = typeof BRAND;


