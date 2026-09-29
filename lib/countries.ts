export type CountryCode = 'KR' | 'US';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  language: string;
  currency: {
    code: string;
    symbol: string;
    exchangeRate: number; // KRW 기준
  };
  ageVerification: {
    required: boolean;
    method: 'phone' | 'id_card' | 'credit_card' | 'external_service' | 'none';
    minAge: number;
    service?: string; // 외부 서비스명
  };
  payment: {
    methods: PaymentMethod[];
    defaultMethod: string;
    taxRate: number;
  };
  legal: {
    termsRequired: boolean;
    privacyRequired: boolean;
    cookieConsent: boolean;
    gdprCompliant: boolean;
  };
  content: {
    allowAdultContent: boolean;
    contentRating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | 'CUSTOM';
    localizedContent: boolean;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'credit_card' | 'digital_wallet' | 'bank_transfer' | 'crypto' | 'gift_card';
  provider: string; // Stripe, PayPal, Alipay, etc.
  fees: {
    percentage: number;
    fixed: number;
  };
  supported: boolean;
}

// 국가별 설정
export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  // 한국
  KR: {
    code: 'KR',
    name: '대한민국',
    language: 'ko',
    currency: {
      code: 'KRW',
      symbol: '₩',
      exchangeRate: 1,
    },
    ageVerification: {
      required: true,
      method: 'phone',
      minAge: 19,
      service: 'NICE평가정보',
    },
    payment: {
      methods: [
        {
          id: 'kakaopay',
          name: '카카오페이',
          type: 'digital_wallet',
          provider: 'KakaoPay',
          fees: { percentage: 3.5, fixed: 0 },
          supported: true,
        },
        {
          id: 'card',
          name: '신용카드',
          type: 'credit_card',
          provider: 'Toss Payments',
          fees: { percentage: 2.9, fixed: 0 },
          supported: true,
        },
      ],
      defaultMethod: 'kakaopay',
      taxRate: 0.1, // 10%
    },
    legal: {
      termsRequired: true,
      privacyRequired: true,
      cookieConsent: false,
      gdprCompliant: false,
    },
    content: {
      allowAdultContent: true,
      contentRating: 'CUSTOM',
      localizedContent: true,
    },
  },

  // 미국
  US: {
    code: 'US',
    name: 'United States',
    language: 'en',
    currency: {
      code: 'USD',
      symbol: '$',
      exchangeRate: 0.00075, // 1 KRW = 0.00075 USD
    },
    ageVerification: {
      required: true,
      method: 'credit_card',
      minAge: 18,
    },
    payment: {
      methods: [
        {
          id: 'stripe',
          name: 'Credit Card',
          type: 'credit_card',
          provider: 'Stripe',
          fees: { percentage: 2.9, fixed: 30 }, // 30 cents
          supported: true,
        },
        {
          id: 'paypal',
          name: 'PayPal',
          type: 'digital_wallet',
          provider: 'PayPal',
          fees: { percentage: 3.49, fixed: 49 },
          supported: true,
        },
      ],
      defaultMethod: 'stripe',
      taxRate: 0.0825, // 평균 8.25%
    },
    legal: {
      termsRequired: true,
      privacyRequired: true,
      cookieConsent: true,
      gdprCompliant: false,
    },
    content: {
      allowAdultContent: true,
      contentRating: 'R',
      localizedContent: false,
    },
  },

};

// 유틸리티 함수들
export function getCountryByCode(code: CountryCode): CountryConfig {
  return COUNTRIES[code];
}

export function detectCountryFromIP(ip: string): CountryCode {
  // 실제로는 GeoIP 서비스를 사용
  // 예: MaxMind, IPGeolocation, etc.
  return 'KR'; // 기본값
}

export function getSupportedCountries(): CountryCode[] {
  return Object.keys(COUNTRIES) as CountryCode[];
}

export function convertCurrency(amount: number, fromCountry: CountryCode, toCountry: CountryCode): number {
  const fromRate = COUNTRIES[fromCountry].currency.exchangeRate;
  const toRate = COUNTRIES[toCountry].currency.exchangeRate;
  
  // KRW를 기준으로 환율 계산
  const krwAmount = amount / fromRate;
  return krwAmount * toRate;
}

export function formatCurrency(amount: number, countryCode: CountryCode): string {
  const country = COUNTRIES[countryCode];
  return new Intl.NumberFormat(country.language + '-' + countryCode, {
    style: 'currency',
    currency: country.currency.code,
  }).format(amount);
}