# Cloudflare CDN 설정 가이드

## 1. Cloudflare 대시보드 설정

### Speed 탭 설정
1. Cloudflare 대시보드 → arata.co.kr 선택
2. **Speed** → **Optimization** 메뉴로 이동

### 권장 설정:
- **Auto Minify**: JavaScript, CSS, HTML 모두 체크
- **Brotli**: On
- **Rocket Loader**: On
- **Mirage**: On (이미지 lazy loading)
- **Polish**: Lossy (이미지 압축)
- **WebP**: On (자동 WebP 변환)

## 2. Caching 설정

### Caching → Configuration
- **Browser Cache TTL**: 4 hours
- **Always Online**: On

### Page Rules 설정 (무료 3개)
1. `*arata.co.kr/uploads/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 week

2. `*api.arata.co.kr/*`
   - Cache Level: Bypass
   - Disable Performance

3. `*arata.co.kr/*.js` 및 `*arata.co.kr/*.css`
   - Cache Level: Standard
   - Edge Cache TTL: 1 week

## 3. 백엔드 코드 수정

### 이미지 URL을 CDN 경로로 변경

```javascript
// D:\ARATA\lib\config.ts
export const getCDNUrl = (path: string) => {
  if (!path) return '';
  
  // 이미 전체 URL인 경우
  if (path.startsWith('http')) {
    return path;
  }
  
  // CDN URL 사용
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 로컬에서는 직접 연결
      return `http://localhost:8000${path}`;
    } else {
      // 프로덕션에서는 CDN 경유
      return `https://cdn.arata.co.kr${path}`;
    }
  }
  
  return path;
};

// 이미지 URL 헬퍼 수정
export const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  
  // CDN 경로 사용
  return getCDNUrl(imagePath);
};
```

## 4. Cloudflare Workers (선택사항)

이미지 리사이징을 위한 Worker 스크립트:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // 이미지 요청인지 확인
  if (url.pathname.startsWith('/uploads/')) {
    // 쿼리 파라미터로 크기 조절
    const width = url.searchParams.get('w')
    const quality = url.searchParams.get('q') || '85'
    
    // Cloudflare Image Resizing
    const imageURL = `https://api.arata.co.kr${url.pathname}`
    const resizingOptions = {
      cf: {
        image: {
          width: width ? parseInt(width) : undefined,
          quality: parseInt(quality),
          format: 'auto' // 자동으로 WebP 변환
        }
      }
    }
    
    return fetch(imageURL, resizingOptions)
  }
  
  // 이미지가 아니면 원본 요청 전달
  return fetch(request)
}
```

## 5. 프론트엔드 이미지 최적화

```jsx
// 반응형 이미지 컴포넌트
const OptimizedImage = ({ src, alt, width }) => {
  const getSrcSet = () => {
    const baseUrl = getImageUrl(src);
    return `
      ${baseUrl}?w=400 400w,
      ${baseUrl}?w=800 800w,
      ${baseUrl}?w=1200 1200w
    `;
  };
  
  return (
    <img
      src={`${getImageUrl(src)}?w=${width || 800}`}
      srcSet={getSrcSet()}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      alt={alt}
      loading="lazy"
    />
  );
};
```

## 6. Cloudflare Analytics 모니터링

### 확인 사항:
- **Cache Hit Ratio**: 70% 이상 목표
- **Bandwidth Saved**: 증가 추세 확인
- **Page Load Time**: 감소 추세 확인

## 7. 추가 최적화 팁

### Cloudflare APO (Automatic Platform Optimization)
- Next.js 자동 최적화
- 월 $5 (선택사항)

### Argo Smart Routing
- 더 빠른 네트워크 경로 선택
- 월 $5 + 사용량 기준 (선택사항)

## 8. 테스트 방법

```bash
# CDN 캐시 확인
curl -I https://arata.co.kr/uploads/sample.jpg

# 헤더 확인
# cf-cache-status: HIT (캐시됨)
# cf-cache-status: MISS (캐시 안됨)
```

## 9. 주의사항

1. **개발 환경**
   - 로컬에서는 CDN 우회
   - 캐시 무효화 주의

2. **캐시 제거**
   - Cloudflare 대시보드 → Caching → Purge Cache
   - 특정 파일만 제거 가능

3. **비용**
   - Free 플랜: 충분함
   - Pro 플랜 ($20/월): Polish, Mirage 등 고급 기능

## 10. 즉시 적용 가능한 설정

Cloudflare 대시보드에서 바로 켜도 되는 기능:
- ✅ Auto Minify
- ✅ Brotli
- ✅ Always Online
- ✅ Browser Cache TTL (4시간)
- ✅ Hotlink Protection

---

설정 후 24-48시간 내에 CDN 효과를 체감할 수 있습니다.