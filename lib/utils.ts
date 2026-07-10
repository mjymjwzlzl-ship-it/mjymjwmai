import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getBackendUrl } from './api-config'

// Tailwind CSS 클래스 병합 유틸리티
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 날짜 포맷팅
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 상대 시간 표시
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return '방금 전'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}분 전`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}시간 전`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}일 전`
  } else {
    return formatDate(target)
  }
}

// 숫자 포맷팅 (1000 -> 1K)
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

// 이메일 유효성 검사
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 비밀번호 강도 검사
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다.')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다.')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 포함해야 합니다.')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// CDN URL (프로덕션에서 Cloudflare R2 CDN 사용)
const CDN_URL = 'https://cdn.arata.co.kr'

// Cloudflare Image Resizing 옵션 생성
// 썸네일용: width=400, quality=75
// PC에서도 최적화 적용 (원본보다 빠름)
function getImageResizingOptions(width: number = 400): string {
  return `/cdn-cgi/image/format=auto,quality=75,width=${width}`
}

// 이미지 URL 생성 (CDN + Cloudflare Image Resizing)
export function getImageUrl(path: string, options?: { width?: number, noResize?: boolean }): string {
  if (!path) return '/images/placeholder.png'

  // 이미 CDN URL인 경우 - Image Resizing 적용
  if (path.startsWith('https://cdn.arata.co.kr/')) {
    if (options?.noResize) return path
    // 이미 cdn-cgi가 포함되어 있으면 그대로 반환
    if (path.includes('/cdn-cgi/')) return path
    const cdnPath = path.replace('https://cdn.arata.co.kr', '')
    const width = options?.width || 400
    return `${CDN_URL}${getImageResizingOptions(width)}${cdnPath}`
  }

  // 외부 URL인 경우 그대로 반환
  if (path.startsWith('http')) {
    return path
  }

  // placeholder API인 경우 그대로 반환
  if (path.startsWith('/api/placeholder')) {
    return path
  }

  // 로컬 이미지 경로인 경우 (public 폴더)
  if (path.startsWith('/images/') || path.startsWith('/icons/')) {
    return path
  }

  // 로컬 개발 환경 체크 (클라이언트 사이드에서만)
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // 로컬 개발 환경에서는 백엔드 프록시 사용
  if (isLocalhost) {
    if (path.startsWith('/uploads/')) {
      return path
    }
    if (path.startsWith('uploads/')) {
      return `/${path}`
    }
    return path.startsWith('/') ? path : `/uploads/${path}`
  }

  // 프로덕션: CDN 경로 정규화
  let cdnPath = path
  if (!path.startsWith('/uploads/')) {
    cdnPath = path.startsWith('uploads/') ? `/${path}` : `/uploads/${path}`
  }

  // 한글 경로 URL 인코딩 (각 세그먼트별로)
  const encodedPath = cdnPath.split('/').map(segment => encodeURIComponent(segment)).join('/')

  // 원본 필요시
  if (options?.noResize) {
    return `${CDN_URL}${encodedPath}`
  }

  // Cloudflare Image Resizing 적용 (모바일/PC 모두)
  const width = options?.width || 400
  return `${CDN_URL}${getImageResizingOptions(width)}${encodedPath}`
}

// 슬러그 생성 (URL용)
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, '') // 시작/끝 하이픈 제거
}

// 페이지네이션 계산
export function calculatePagination(
  currentPage: number,
  totalItems: number,
  pageSize: number
) {
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1)
  
  return {
    totalPages,
    startIndex,
    endIndex,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  }
}

// 디바운스 함수
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }
} 