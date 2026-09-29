// 메모리 캐시 구현
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 5분마다 만료된 캐시 정리
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set(key: string, data: any, ttl: number = 60000) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  get(key: string) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// 싱글톤 인스턴스
const memoryCache = new MemoryCache();

// API 요청 캐싱 래퍼
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl: number = 60000 // 기본 1분 캐싱
): Promise<Response> {
  const cacheKey = `${url}${JSON.stringify(options || {})}`;
  
  // 캐시 확인
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  try {
    // 실제 요청
    const response = await fetch(url, options);
    
    if (response.ok) {
      const data = await response.json();
      // 캐시 저장
      memoryCache.set(cacheKey, data, ttl);
      
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
      });
    }
    
    return response;
  } catch (error) {
    console.error('Cached fetch error:', error);
    throw error;
  }
}

// 로컬스토리지 캐싱 (브라우저 전용)
export class LocalStorageCache {
  private prefix = 'arata_cache_';

  set(key: string, data: any, ttl: number = 3600000) { // 기본 1시간
    if (typeof window === 'undefined') return;
    
    const item = {
      data,
      expiry: Date.now() + ttl
    };
    
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (e) {
      // 스토리지 용량 초과 시 오래된 캐시 삭제
      this.cleanup();
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(item));
      } catch (e) {
        console.warn('LocalStorage is full');
      }
    }
  }

  get(key: string) {
    if (typeof window === 'undefined') return null;
    
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  delete(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }

  cleanup() {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (now > parsed.expiry) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  clear() {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}

export const localCache = new LocalStorageCache();
export default memoryCache;