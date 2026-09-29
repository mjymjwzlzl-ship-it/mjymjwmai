'use client';

import { useLanguageStore, Language } from '@/store/language';
import ko from '@/locales/ko.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

// 번역 데이터 (ko/en/zh 지원)
const translations: Record<Language, any> = {
  ko,
  en,
  zh,
};

// 간단한 번역 함수 (탑툰/네이버 방식)
export function useTranslation() {
  const { language } = useLanguageStore();
  
  const t = (key: string, params?: Record<string, any>) => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    // 선택된 언어에서 번역 찾기
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        break;
      }
    }
    
    // 번역이 없으면 한국어로 폴백
    if (value === undefined) {
      value = translations.ko;
      for (const k of keys) {
        value = value?.[k];
      }
    }
    
    // 파라미터 치환
    if (params && typeof value === 'string') {
      Object.keys(params).forEach((param) => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }
    
    return value || key;
  };
  
  return { t, language };
}

// 언어별 폰트 설정 (ko/en/zh 지원)
export function getLanguageFont(language: Language) {
  switch (language) {
    case 'ko':
      return 'font-sans'; // Pretendard
    case 'en':
      return 'font-sans'; // Inter
    case 'zh':
      return 'font-sans'; // Noto Sans SC
    default:
      return 'font-sans';
  }
}

// 언어별 텍스트 방향
export function getTextDirection(language: Language) {
  // 아랍어 등 RTL 언어 지원시 사용
  return 'ltr';
}

// 날짜 포맷팅 (ko/en/zh 지원)
export function formatDate(date: Date | string, language: Language) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = {
    ko: 'ko-KR',
    en: 'en-US',
    zh: 'zh-CN',
  }[language];

  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 숫자 포맷팅 (ko/en/zh 지원)
export function formatNumber(num: number, language: Language) {
  const locale = {
    ko: 'ko-KR',
    en: 'en-US',
    zh: 'zh-CN',
  }[language];

  return new Intl.NumberFormat(locale).format(num);
}

// 통화 포맷팅 (ko/en/zh 지원)
export function formatCurrency(amount: number, language: Language) {
  const config = {
    ko: { locale: 'ko-KR', currency: 'KRW' },
    en: { locale: 'en-US', currency: 'USD' },
    zh: { locale: 'zh-CN', currency: 'CNY' },
  }[language];

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
  }).format(amount);
}

// 언어별 결제 및 통화 설정
export type PaymentMethod = 'stripe' | 'paypal' | 'inicis';

interface LanguagePaymentConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  currency: {
    code: 'KRW' | 'USD' | 'CNY';
    symbol: string;
  };
  payment: {
    methods: PaymentMethod[];
    defaultMethod: PaymentMethod;
  };
}

// 언어별 결제 및 통화 설정 (ko/en/zh 지원)
export const LANGUAGE_CONFIGS: Record<Language, LanguagePaymentConfig> = {
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    currency: {
      code: 'KRW',
      symbol: '₩',
    },
    payment: {
      methods: ['inicis', 'stripe'],
      defaultMethod: 'inicis',
    },
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    currency: {
      code: 'USD',
      symbol: '$',
    },
    payment: {
      methods: ['stripe', 'paypal'],
      defaultMethod: 'stripe',
    },
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '简体中文',
    flag: '🇨🇳',
    currency: {
      code: 'CNY',
      symbol: '¥',
    },
    payment: {
      methods: ['stripe', 'paypal'],
      defaultMethod: 'stripe',
    },
  },
};

// 현재 언어의 설정 가져오기
export function getLanguageConfig(language: Language) {
  return LANGUAGE_CONFIGS[language];
}

// 통화 기호만 가져오기
export function getCurrencySymbol(language: Language) {
  return LANGUAGE_CONFIGS[language].currency.symbol;
}