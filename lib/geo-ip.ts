'use client';

import { CountryCode } from './countries';

// GeoIP 서비스 API (여러 서비스 폴백)
const GEO_IP_SERVICES = [
  'https://ipapi.co/json/',
  'https://ip-api.com/json/',
  'https://freegeoip.app/json/',
];

interface GeoIPResponse {
  country_code?: string;
  countryCode?: string;
  country?: string;
}

// IP 기반 국가 감지
export async function detectCountryFromIP(): Promise<CountryCode> {
  // 개발 환경에서는 기본값 반환
  if (typeof window === 'undefined') {
    return 'KR'; // 서버사이드에서는 한국 기본
  }

  // 브라우저에서 위치 정보 확인 (이미 저장된 경우)
  const savedCountry = localStorage.getItem('user-country');
  if (savedCountry && isValidCountryCode(savedCountry)) {
    return savedCountry as CountryCode;
  }

  try {
    // 여러 GeoIP 서비스 시도
    for (const serviceUrl of GEO_IP_SERVICES) {
      try {
        const response = await fetch(serviceUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(3000), // 3초 타임아웃
        });

        if (!response.ok) continue;

        const data: GeoIPResponse = await response.json();
        const countryCode = data.country_code || data.countryCode || data.country;
        
        if (countryCode) {
          const detectedCountry = normalizeCountryCode(countryCode);
          if (isValidCountryCode(detectedCountry)) {
            // 감지된 국가 저장
            localStorage.setItem('user-country', detectedCountry);
            return detectedCountry as CountryCode;
          }
        }
      } catch (error) {
        console.warn(`GeoIP service ${serviceUrl} failed:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('Country detection failed:', error);
  }

  // 모든 서비스 실패 시 기본값 (한국)
  const defaultCountry = 'KR';
  localStorage.setItem('user-country', defaultCountry);
  return defaultCountry;
}

// 국가 코드 정규화
function normalizeCountryCode(code: string): string {
  const normalized = code.toUpperCase().trim();

  // 일반적인 매핑 (KR/US만 지원)
  const countryMapping: Record<string, string> = {
    'KOREA': 'KR',
    'SOUTH_KOREA': 'KR',
    'UNITED_STATES': 'US',
    'USA': 'US',
  };

  return countryMapping[normalized] || normalized;
}

// 유효한 국가 코드인지 확인 (KR/US만 지원)
function isValidCountryCode(code: string): boolean {
  const validCodes = ['KR', 'US'];
  return validCodes.includes(code.toUpperCase());
}

// 수동으로 국가 설정
export function setUserCountry(countryCode: CountryCode): void {
  localStorage.setItem('user-country', countryCode);
}

// 현재 설정된 국가 가져오기
export function getCurrentCountry(): CountryCode {
  if (typeof window === 'undefined') return 'KR';
  
  const saved = localStorage.getItem('user-country');
  if (saved && isValidCountryCode(saved)) {
    return saved as CountryCode;
  }
  
  return 'KR'; // 기본값
}

// 서브도메인 생성
export function getCountrySubdomain(countryCode: CountryCode): string {
  return `${countryCode.toLowerCase()}.arata.co.kr`;
}

// 현재 도메인에서 국가 코드 추출
export function getCountryFromDomain(): CountryCode | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  if (isValidCountryCode(subdomain)) {
    return subdomain.toUpperCase() as CountryCode;
  }
  
  return null;
}

// 국가별 서브도메인으로 리다이렉트
export function redirectToCountryDomain(countryCode: CountryCode): void {
  if (typeof window === 'undefined') return;
  
  const currentCountry = getCountryFromDomain();
  if (currentCountry === countryCode) return; // 이미 올바른 도메인
  
  const targetDomain = getCountrySubdomain(countryCode);
  const currentPath = window.location.pathname + window.location.search;
  
  // 프로덕션에서만 리다이렉트 (개발 환경에서는 무시)
  if (window.location.hostname.includes('arata.co.kr')) {
    window.location.href = `https://${targetDomain}${currentPath}`;
  } else {
    console.log(`Would redirect to: https://${targetDomain}${currentPath}`);
    // 개발 환경에서는 localStorage에 국가만 저장
    localStorage.setItem('user-country', countryCode);
  }
}