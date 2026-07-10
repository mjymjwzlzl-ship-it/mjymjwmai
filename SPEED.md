## ARATA 성능 최적화 실행 가이드 (SPEED)

이 문서는 ARATA 플랫폼(메인 Next.js, Creator Center, Admin Center, Express 백엔드, Cloudflare Tunnel)의 현재 구성과 `agent.md`에 정리된 최신 변경 사항을 반영하여, 빠른 런칭을 위한 성능 최적화 우선순위와 구체 실행 방법을 제시합니다. “바로 체감”되는 개선(P0)부터 단계적(P1/P2)으로 정리했습니다. 본 문서는 실행 계획이지, 코드를 변경하지 않습니다.

### 0) 현재 상황 요약(기준점)
- 아키텍처: Next.js(프론트 4000, 크리에이터 4001, 어드민 5000) + Express API(8000), Cloudflare Tunnel로 각 도메인 라우팅.
- 네트워킹: 프론트/어드민/크리에이터는 프록시(`/api`, `/api/proxy`, `/uploads`)로 백엔드에 통신. CORS는 넓게 허용.
- 이미지: `/uploads` 정적 서빙을 Next.js 리라이트로 전달. `getImageUrl`에서 경로/인코딩 정리. Mixed Content 이슈 제거됨.
- Next 설정: `_next/static` 장기 캐시 헤더 존재, `_next/image` 캐시 단위 설정 있음. 이미지 포맷/썸네일 파이프라인은 미구현.
- 이슈: 간헐적인 Cloudflare Tunnel 종료 로그(context canceled). Admin/Creator 로컬 통신 문제는 네트워크/방화벽 원인 의심(프록시 자체 설정은 일관화됨).

### 1) 목표 지표(SLA) 제안
- LCP: 모바일 ≤ 2.5s(90p), 데스크톱 ≤ 1.8s(90p)
- TTFB(첫 응답): ≤ 300ms(캐시 히트 시), ≤ 700ms(미스)
- API 응답: p50 ≤ 150ms, p95 ≤ 500ms (리스트 기준)
- 이미지 전송량: 홈/성인 홈 초기 페인트 시 ≤ 600KB(모바일 네트워크 기준)

---

## P0 — 즉시 체감(1–2시간 내 적용 가능한 항목)

### A. 전송 최적화(압축/캐시)
- 백엔드 전역 압축(gzip/deflate) 활성화.
- `/uploads` 정적 파일 캐시 헤더 강화: `Cache-Control: public, max-age=2592000, immutable`, `ETag` 활성화.
- Next 정적 리소스 캐시 검증: 이미 `_next/static` 1년 캐시 헤더 존재 → 유지.

참고 설정 예시(코드 적용은 별도 PR에서 수행):
```js
// Express 전역 압축 + 정적 캐시 헤더 강화(참고용)
const compression = require('compression');
app.use(compression());
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { ... }))
```

### B. 이미지 최적화(클라이언트 체감 향상)
- Next 이미지 포맷: `AVIF/WebP` 활성화 → 동일 화질 대비 용량 20~50% 절감.
- LCP 이미지에 `priority`·정확한 `sizes` 지정. 리스트 썸네일 `width/height` 고정, `quality` 하향(예: 60~70).
- 프리로드/프리페치 남용 금지, fold 위 콘텐츠만 우선 로딩.

### C. Cloudflare 캐시 룰(엣지 캐싱)
- `/_next/static/*`: Edge 1y, Browser 1y.
- `/_next/image*`: Edge 7d, Browser 1h.
- `/uploads/*`: Edge 30d, Browser 7d. 단, 인증 쿠키 존재 시 BYPASS.

### D. 프록시 경로 성능 검증
- 브라우저 확인: `http://localhost:8000/api/health`, `http://localhost:4001/api/proxy/health`, `http://localhost:5000/api/proxy/health`.
- 실패 시 헬스체크 페이지(각 앱에 단순 UI) 추가해 원클릭 진단(백엔드/프록시/이미지 3종 체크).

### E. Cloudflare Tunnel 안정화(운영 관점)
- 이름 있는 단일 터널만 사용(`tunnel-config.yml`의 `arata-main`). 임시 trycloudflare 터널과 혼용 금지.
- 반복 종료 시 HTTP/2 강제: `protocol: http2`(설정 또는 실행 플래그)로 재기동.
- Windows 서비스/작업 스케줄러로 자동 재시작 구성.

---

## P1 — 반나절 ~ 1일

### A. 서버 캐싱/ISR(비로그인 뷰 기준)
- 홈/성인 홈/카테고리 페이지 데이터에 ISR(`revalidate: 60~300s`) 적용.
- 인기/배너/추천: 서버 메모리 캐시(TTL 60~300s) 또는 응답 캐시.
- Admin에서 수정 시 무효화 트리거 API 설계(간단한 캐시 키 삭제 방식).

### B. DB/쿼리 최적화(SQLite)
- 인덱스 추가: `isApproved`, `genre`, `isAdult`, `createdAt`, `rating`.
- 리스트 API는 `LIMIT/OFFSET` 고정, 정렬 기준(인덱스 타는 방식) 단일화.

참고 SQL(마이그레이션 시 반영):
```sql
CREATE INDEX IF NOT EXISTS idx_comics_isApproved ON Comic(isApproved);
CREATE INDEX IF NOT EXISTS idx_comics_genre ON Comic(genre);
CREATE INDEX IF NOT EXISTS idx_comics_isAdult ON Comic(isAdult);
CREATE INDEX IF NOT EXISTS idx_comics_createdAt ON Comic(createdAt);
CREATE INDEX IF NOT EXISTS idx_comics_rating ON Comic(rating);
```

### C. API 페이로드 슬림화
- 리스트 전용 DTO: `id, title, author, thumbnail, rating` 등 최소 필드만.
- 상세 전용 DTO: 본문/태그 등 확장 필드는 상세에서만 제공.

### D. 보안/프리플라이트 감소
- CORS 허용 도메인을 실제 도메인/localhost로 축소 → 프리플라이트 감소 + 보안 강화.
- 공용 환경의 과도한 콘솔 로그 제거.

---

## P2 — 1~2일

### A. 썸네일 파이프라인(업로드 시 전처리)
- 업로드 시 서버가 규격 썸네일 세트 생성(예: 240, 480, 720px) → `/thumbs/{size}/...` 저장.
- 프론트는 레이아웃별로 맞는 크기 URL만 요청 → 원본 대용량 전송 방지, LCP 개선.
- 점진적 도입: 기존 `/uploads` 그대로 두고, 가능하면 `/thumbs` 우선 사용.

### B. 번들 다이어트/코드 분할
- `next-bundle-analyzer`로 무거운 모듈 파악.
- 모달/슬라이더/에디터 등 지연 로딩(`dynamic import`)으로 초기 번들 축소.
- 공통 유틸/폴리필 중복 제거, dead code 제거.

### C. 폰트/CSS
- 폰트 서브셋 생성, `font-display: swap`, 핵심 폰트 `preload`.
- Tailwind purge 경로 재확인(모노레포 경로 전체 포함)으로 CSS 부피 최소화.

---

## Cloudflare/Tunnel 운영 수칙
- 단일 명명 터널만 사용. 충돌 방지를 위해 임시 터널(`start-tunnels.bat`)과 병행 금지.
- 재시도/종료 로그(`context canceled`) 반복 시:
  1) 동시 실행 인스턴스 확인 → 중복 종료
  2) `protocol: http2`로 실행
  3) 방화벽/네트워크 점검(QUIC 차단 환경)
- 모니터링: `127.0.0.1:<metrics-port>/metrics` 노출을 Uptime/프로메테우스형 수집기로 감시.

---

## 모니터링/헬스체크
- 백엔드: `/api/health`(이미 존재). 프론트 각 앱: `/api/health`(간단 JSON 반환) 추가.
- RUM: 간단한 Web-Vitals 수집(LCP/FID/CLS), 최소한 콘솔/로그로 샘플링.
- 에러 추적: Sentry(프론트/백엔드) 또는 대체 솔루션.
- 가용성: 외부 Uptime 모니터(프론트 3도메인 + API + 이미지 1경로).

참고 예시(프론트 헬스):
```ts
// app/api/health/route.ts (참고용)
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

---

## 검증 플로우(체크리스트)
1) 로컬
   - `localhost:4000/` LCP 측정(Chrome DevTools, Slow 4G), 초기 전송량 확인.
   - `/_next/static/*` 200(HIT), `/_next/image*` 캐시 동작.
   - `/uploads/...` 응답 헤더(Cache-Control/ETag) 확인.
2) 외부(Cloudflare)
   - 엣지 캐시 HIT 비율 확인.
   - 도메인별(메인/크리에이터/어드민) 프록시 헬스 정상.
3) Lighthouse/WebPageTest
   - 홈/성인 홈, 카테고리, 상세 각 1회 측정 → LCP/CLS/TTFB 기록.
4) 부하/회귀
   - 리스트 API p95 응답 ≤ 500ms 유지 확인.

---

## 롤아웃/리스크 관리
- 순서: 스테이징(동일 설정) → 점진적 적용(Cloudflare 캐시 룰/압축) → 실측 후 확정.
- 문제 시 롤백: 캐시 룰/압축 설정 되돌리기, ISR 해제, 이미지 포맷(AVIF/WebP) 비활성화.

---

## 작업 우선순위 요약(권장 실행 순서)
1) 백엔드 압축 + `/uploads` 캐시 헤더 강화(P0)
2) Next 이미지 포맷(AVIF/WebP) + LCP 이미지 설정(P0)
3) Cloudflare 캐시 룰 설정(P0)
4) 프록시/헬스체크 UI로 운영 진단 간소화(P0)
5) ISR 적용(홈/카테고리)(P1)
6) DB 인덱스 추가 + 리스트 DTO 슬림화(P1)
7) 썸네일 파이프라인 도입(P2)
8) 번들 다이어트/폰트 최적화(P2)

각 단계는 독립적으로 적용 가능하며, 문제 발생 시 쉽게 롤백할 수 있습니다. P0 완료만으로도 체감 속도는 크게 개선되며, 런칭 품질 기준을 충족할 수 있습니다.


