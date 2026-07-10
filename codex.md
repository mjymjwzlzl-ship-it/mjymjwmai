# ARATA 미국(US) 국가 사이트 구현 계획서
> 최종 업데이트: 2025-10-15

## 1) 배경 및 목표
- 목적: 글로벌 확장 1단계로 미국(us.arata.co.kr) 전용 사이트를 분기하여 결제/법적/콘텐츠/언어 요건을 충족.
- 결과물: 미국 사이트의 라우팅, UI 텍스트(영어), 결제(카드: Visa/Master – 외부 PG 연동), 법적 고지(CCPA/쿠키 배너), 통화(USD) 지원.
- 기준 문서: `agent.md`의 고정 포트/DB/프록시/i18n 제약을 반드시 준수.

## 2) 범위(Scope)
- 포함
  - 서브도메인 `us.arata.co.kr` 라우팅/컨텍스트 주입
  - 영어(i18n) 기본, 문자열 관리 전략(임시 하드코딩 → 점진적 i18n 복구)
  - 결제: 카드(Visa/Master) – PG 게이트웨이 연동(단일 또는 다중 PG 선택 가능 구조)
  - 통화/표시: USD, 가격 및 금액 표기/포맷
  - 법적: 개인정보/서비스/청소년 보호 고지의 미국 버전, CCPA 옵트아웃, 쿠키 배너
  - 콘텐츠 정책: 성인 콘텐츠 연령 게이팅(18+), 국가별 노출 규칙 반영
  - SEO/메타: `en-US` hreflang, canonical(us), 로봇 메타, 구조화 데이터 최소
- 제외(초기 단계)
  - 온보딩용 별도 퍼널/마케팅 페이지
  - 지역 전용 추천 알고리즘
  - 완전한 번역 인프라 복구(React Error #310 이슈 재발 방지 후 단계적 진행)

## 3) 전제/제약(중요)
- 포트: `4000/4001/5000/8000` 고정. 절대 변경 금지.
- API: 프론트는 절대 경로 대신 상대 경로 `/api/...` 사용(nginx 프록시). `localhost:8000` 하드코딩 금지.
- DB: 파괴적 명령/스크립트 금지. 스키마/데이터 변경 필요 시, 먼저 `cd backend && node backup-db.js` 로 백업 후 진행, 반드시 코드 리뷰/승인.
- 토큰: `authToken`/`token` 호환 처리 유지.
- i18n: `useTranslation()`로 인한 무한 루프 회귀 금지. 초기에는 안전한 범위의 하드코딩 병행.

## 3-1) 과거 시도 및 교훈(반영 사항)
- 결제 PoC(Stripe/PayPal)에서 검증된 플로우 유지: "세션/의도 생성 → 사용자 인증(필요 시) → 성공/실패 콜백 → 웹훅 최종 확정" 패턴을 PG로 이전.
- API 호출 정책 유지: 상대 경로(`/api/...`)만 사용, 베이스 URL 하드코딩 금지(nginx 프록시).
- 인증 토큰 호환 유지: `authToken`/`token` 모두 지원.
- 캐시 정책 유지: 로그인 사용자의 구매/잔액/권한 자원은 캐시 비활성화(헤더 강제).
- 이벤트 버스 재활용: 결제 완료 시 `COIN_BALANCE_UPDATED`, 구매 시 `EPISODE_PURCHASED`를 기존과 동일하게 발생.
- i18n 회귀 방지: 초기에는 영문 하드코딩 최소 세트로 시작, 점진적으로 i18n 재연결.
- DB 안전: 웹훅/결제 생성에 멱등성 키 적용, 파괴적 스크립트 금지, 백업 선행.

## 4) 아키텍처 개요
- 서브도메인 전략
  - 운영: `us.arata.co.kr` → 프론트(4000) + `/api` 프록시 → 백엔드(8000)
  - 로컬 개발: hosts에 `127.0.0.1 us.arata.co.kr` 임시 매핑(운영 시 제거), Cloudflare Named Tunnel로 실제 도메인 테스트.
- 국가 감지/주입
  - `middleware.ts`에서 `Host` 헤더 파싱 → `US` 판별 → 요청 컨텍스트/쿠키에 `country=US` 주입.
  - 백엔드도 `x-arata-country: US` 헤더 신뢰(미들웨어에서 추가), 누락 시 호스트 파싱으로 보정.
- 구성 원본
  - `lib/countries.ts`의 `US` 항목 사용(결제: 카드(Visa/Master)+PG, 인증: 신용카드 간편 인증, 통화: USD, 법적 필수 고지).

## 5) 기능 요구사항(US 전용)
- 결제/정산
  - 결제 수단: 카드(Visa/Master) – 외부 PG(결제대행사) 연동. 초기에는 카드 단일 옵션으로 제공.
  - 보안/컴플라이언스: PCI-DSS SAQ A 수준 유지(서버는 PAN 미수집). PG의 JS SDK/Hosted Fields로 토큰화 후 서버로 토큰만 전달.
  - 인증/보호: AVS/CVV 검증(미국), 3DS2(선택적) 시나리오 지원(도입 시 PG 설정 기반으로 분기).
  - 정산: 승인+매입(Authorize+Capture) 혹은 즉시매입(Sale) 플로우를 설정값으로 분리. 기본은 즉시매입.
  - 웹훅/상태: 승인/성공/실패/취소/환불 이벤트를 웹훅으로 수신하여 코인 적립/차감/구매상태 반영.
  - 환율/통화: USD 고정, 표기는 `$` 및 미국식 포맷.
- 본인인증/연령 확인
  - 기본: 신용카드 결제 시 최소한의 카드 소유 확인(추가 KYC 없음).
  - 성인 콘텐츠 접근: 만 18세 확인 체크/배리어(연령 게이트), 세션에 상태 보관.
- 법적/정책
  - 개인정보/이용약관/청소년 보호의 US 버전 페이지.
  - 쿠키 배너: CCPA 기준 옵트아웃 제공(Do Not Sell/Share 링크), 분석 쿠키 동의에 따라 비활성화.
- 언어/표기
  - 기본 언어: English(en-US). 날짜/숫자/통화 미국식 포맷.
- SEO/분석
  - `hreflang` en-US, canonical은 us 서브도메인, robots meta 기본 allow.
  - Cookie 동의 상태에 따라 Analytics 로드 분기.

## 6) UI/페이지(최소 구현)
- 홈: US 카피, 배너 CTA(Start Reading), US 전용 배지/가격 노출
- 작품 상세/에피소드: 유/무료 배지 동일, 가격/결제 버튼은 USD 문구
- 코인 구매: 카드(Visa/Master) 결제, 결제 금액은 USD
- 결제 결과: success/cancel 페이지, 코인 반영/실패 안내
- 프로필: 코인 잔액, 구매 이력, 지역 표기
- 문의/FAQ: 영어 콘텐츠, 미국 사용자용 가이드
- 약관/개인정보/청소년: US 버전 문구

## 7) 백엔드/API 변경
- 요청 컨텍스트에서 국가값 수신(`x-arata-country`), 미수신 시 호스트 파싱.
- 콘텐츠 필터: 미국 정책에 맞는 카탈로그만 노출(성인물은 연령 게이트 뒤에 표시).
- 결제
  - 어댑터 계층 도입: `PaymentAdapter`(PG 중심, 향후 Stripe/PayPal 호환) 인터페이스로 내부 결제 로직을 추상화.
  - 카드 결제 API: 결제 의도/세션 생성(create-payment), 확정(confirm-payment), 취소(cancel-payment), 환불(refund) 엔드포인트 설계.
  - 웹훅 처리: 승인/매입/취소/환불/차지백 이벤트 수신 → 코인/구매 이력 반영 및 `coinBalance` 업데이트.
  - 멱등성: 결제 생성/확정 및 웹훅 처리에 멱등성 키 적용(중복/재시도 안전).
  - 레거시 경로 호환: 기존 콜백/웹훅 경로를 유지하되 내부에서 어댑터로 분기 가능.
  - 응답 필드 표준화: `coinBalance`, `purchaseStatus`, `currency`.
- 레이트/캐시
  - 로그인 사용자는 구매/잔액 관련 엔드포인트 캐시 비활성화.

## 8) 프론트엔드 변경
- 국가 컨텍스트
  - `middleware.ts` + `lib/country.ts`(새)에서 `getCurrentCountry()` 제공.
  - `countries.ts`의 US 설정을 읽어 결제/문구/법적 표시 분기.
- 결제 UI
  - 어댑터 패턴 도입: `PaymentClient` 인터페이스로 PG/타 프로바이더를 추상화(기존 Stripe PoC와 호환 용이).
  - `components/ui/CardPaymentForm.tsx`(신규): PG Hosted Fields/JS SDK로 카드번호/만료/보안코드 입력(토큰화 처리).
  - `app/coin/page.tsx`: USD 표기/카드 결제 플로우 연결, 이벤트 버스 반영, 결제 진행 중 UI 상태 처리.
  - 에러/상태 표준화: AVS/CVV/3DS 결과 코드 공통화 및 사용자 메시지 일관성 유지.
- 언어/문구
  - 임시: 안전한 범위에서 하드코딩된 영문 문자열 사용(이슈 #310 재발 방지).
  - 추후: `useTranslation` 복구 시 다시 연결.
- 법적/쿠키
  - `components/layout/CookieBanner.tsx`(신규): CCPA 옵트아웃, 동의 상태 로컬/서버 반영.
  - `app/terms/*`: US 버전 문구 분기.
- SEO
  - `app/layout.tsx`: `hreflang`, canonical(us) 동적 설정.

## 9) 환경변수/설정
- 프론트
  - `NEXT_PUBLIC_COUNTRY_DEFAULT=US`(로컬 테스트용)
  - `NEXT_PUBLIC_PG_PUBLIC_KEY`(PG JS SDK/Hosted Fields 초기화용)
- 백엔드
  - `PG_API_KEY`, `PG_MERCHANT_ID`(선정 PG의 API 키/가맹점 ID)
  - `ALLOWED_COUNTRIES=KR,US,JP,CN,TH,...`
  - (선택) `PAYMENT_PROVIDER=PG`(향후 전환/롤백 플래그)
- 보안: 키는 로컬 .env, 서버는 안전한 시크릿 스토어 사용.

## 10) 배포/인프라
- DNS: `us.arata.co.kr` A/CNAME 설정(Cloudflare Tunnel 사용 시 터널 라우트 연결)
- Nginx: 서버블록에 호스트 기반 라우팅, `/api`는 8000으로 프록시, 정적은 4000
- 포트: 절대 변경 금지(4000/8000 등 기존 유지)
- PM2: 백엔드는 기존 프로세스 재사용, 배치 분리는 현행 유지

## 11) 테스트/검증 시나리오
- 라우팅: `us.arata.co.kr` 접속 시 US 컨텍스트 주입 검증
- 결제: PG 테스트 카드로 승인/실패/거절/취소/환불/3DS 챌린지 케이스, AVS/CVV 실패 케이스
- 잔액/구매: 구매 후 캐시 무효화, 코인 잔액 즉시 갱신 이벤트 수신
- 성인 게이트: 18+ 체크 전후 콘텐츠 가시성 변경
- 쿠키/분석: 동의/비동의에 따른 스크립트 로드 분기
- SEO: hreflang/canonical/robots 노출 확인

## 11-1) 레거시 호환 테스트(이전 시도 고려)
- 이벤트 버스: 결제 완료 시 기존 리스너가 `COIN_BALANCE_UPDATED` 수신하는지 확인.
- 토큰 처리: `authToken`/`token` 어느 쪽이 존재해도 결제 플로우 정상 동작.
- 캐시/헤더: 결제 후 페이지 재진입 시 캐시 무효화가 적용되어 즉시 상태 반영.
- API 경로: 모든 호출이 `/api/...`를 사용하며 베이스 URL 하드코딩 없음.
- 웹훅 재시도: 멱등성으로 중복 처리 방지 및 최종 상태 일관.

## 12) 구현 단계 로드맵
- Phase 0: 준비/안전
  - [ ] `.env` 키 준비(PG: `PG_API_KEY`, `PG_MERCHANT_ID`, `NEXT_PUBLIC_PG_PUBLIC_KEY`), 비밀키 분리
  - [ ] `lib/countries.ts` US 설정 재확인, 누락 필드 보완
  - [ ] DB 백업 스크립트 점검(`backend && node backup-db.js`)
- Phase 1: 골격
  - [ ] `middleware.ts`에서 호스트→국가 컨텍스트 주입
  - [ ] `lib/country.ts` 유틸 추가, `getCurrentCountry()`
  - [ ] 레이아웃/헤더에서 국가별 표기/통화 포맷 적용
- Phase 2: 결제
  - [ ] 결제 어댑터 도입(서버 `PaymentAdapter`, 클라이언트 `PaymentClient`)
  - [ ] 카드 결제 API(생성/확정/취소/환불) 및 웹훅 처리
  - [ ] `CardPaymentForm` UI, 코인 구매 플로우 연결
  - [ ] AVS/CVV/3DS 결과 코드 매핑 및 에러 문구 표준화
  - [ ] 멱등성 키 적용 및 중복 처리 테스트
- Phase 3: 법적/쿠키/SEO
  - [ ] CCPA 쿠키 배너/옵트아웃
  - [ ] US 약관/개인정보/청소년 보호 문구
  - [ ] hreflang/canonical 설정
- Phase 4: 페이지 마감/콘텐츠 정책
  - [ ] 홈/작품/에피소드/코인/프로필/문의 UI 영문화
  - [ ] 성인 게이트 구현 및 테스트
- Phase 5: QA/런치
  - [ ] E2E 시나리오 점검
  - [ ] Cloudflare Tunnel+DNS 연결 검증
  - [ ] 런치 체크리스트 확인 후 공개

## 12-1) 마이그레이션 전략(Stripe/PayPal → 카드 PG)
- API 호환: 기존 `create/confirm/cancel/refund` 형태 유지, 내부 구현만 PG 어댑터로 교체.
- 경로 유지: 기존 콜백/웹훅 경로 유지, 내부 라우팅에서 어댑터로 분기.
- 환경 플래그: `PAYMENT_PROVIDER` 스위치로 신속 롤백 가능.
- 데이터: 기존 구매/코인 레코드 스키마 재사용. PG 트랜잭션 식별자는 메타/참조 필드에 저장(스키마 변경 필요 시 백업·승인 후 최소 변경).
- 테스트: 과거 PoC 시나리오(성공/취소/실패)를 PG 테스트 카드로 재현하여 회귀 검증.

## 13) 위험/완화/롤백
- i18n 루프 재발 위험 → 초기 하드코딩 유지, 점진적 연결
- 결제 실패/웹훅 누락 → 재시도 큐/수동 복구 절차 문서화
- 잘못된 카탈로그 노출 → 국가 필터 기본 폐쇄형(허용 목록 기반)
- 롤백: us 호스트를 KR 기본 페이지로 임시 리다이렉트, 신규 플래그 비활성화

## 14) 작업 체크리스트(요약)
- [ ] 호스트 기반 국가 컨텍스트
- [ ] USD 통화 포맷 일괄 적용
- [ ] 카드 결제(PG) 연동 및 결과 처리
- [ ] CCPA 쿠키 배너 + Do Not Sell 링크
- [ ] US 약관/개인정보/청소년 페이지 분기
- [ ] SEO 메타(en-US, canonical)
- [ ] 성인 게이트(18+)
- [ ] E2E/운영 체크(터널/DNS/프록시)

---
본 계획은 `agent.md`의 운영 가이드를 준수하며, 포트/DB/프록시 규칙을 절대 위반하지 않습니다. 세부 구현 중 추가 이슈가 확인되면 본 문서를 갱신합니다.

## 영어 플랫폼 개발 계획 (작가센터 업로드 + 관리자센터 카테고리)
> 목적: 영어권 전용 플랫폼을 `/en` 경로로 제공하면서, 에피소드 업로드는 작가센터에서, 카테고리/노출 관리는 관리자센터에서 수행. 한국 흐름과 결제창은 그대로 유지.

### 1) 목표
- 영어판 웹툰을 한국판과 별도 카탈로그로 운영(자동 판단 없음). 
- 업로드(작가센터)와 분류/노출(관리자센터) 책임 분리. 
- 결제는 PG 확정 전까지 UI/문구만 영어/달러 표기(Coming soon), 구독형은 UI 선구현.

### 2) 범위
- 포함
  - `/en` 경로의 영어 전용 사이트(정적 배포) 기획/운영 가이드
  - 작가센터: 영어판 시리즈 생성/에피소드 업로드/메타 입력 플로우
  - 관리자센터: 영어 플랫폼용 카테고리 체계 운영(생성/수정/정렬/편성)
  - 데이터 식별 규칙(그룹키/로케일/슬러그), 에셋 경로 컨벤션, QA/승인 체크리스트
- 제외(현 단계)
  - DB 스키마 변경/마이그레이션(필요 시 백업·승인 후 별도 진행)
  - PG 연동(미확정) 및 실제 결제 처리

### 3) 데이터/식별 규칙
- 그룹키: 원작과 번역판을 묶는 `seriesGroupId` 유지(예: `grp-123`).
- 로케일: 각 작품·에피소드에 `locale='en'`(영문), 한국판은 `ko`로 유지.
- 슬러그: 언어별 충돌 방지를 위해 `/en/webtoons/[slug-en]`, `/webtoons/[slug-ko]`를 분리.
- 에셋 경로: `assets/webtoons/{seriesGroupId}/{locale}/{episodeNo}/{pageNo}.jpg`.
- 등급/연령: 영어판은 18+ 기준, 미국 표기 준수.
- 가격/통화: 영어판 표기는 USD(달러, en-US 포맷). 결제는 PG 확정 전까지 비활성/안내.

### 4) 작가센터: 영어판 업로드 워크플로우
1. 영어판 시리즈 생성
   - 기존 원작 선택 → "영어판 시리즈 생성" → `seriesGroupId` 상속.
   - 기본 메타(제목/설명/장르/태그/작가명) 영문 입력. 자동 번역 금지, 수동 검수.
2. 에피소드 업로드
   - 에피소드 번호 매핑(원작과 동기화 권장, 누락/추가 허용).
   - 이미지 업로드(영문 말풍선 이미지) 및 섬네일.
   - 메타: 제목/요약/연령/유료여부/코인가격(USD 정책과 정합) 입력.
3. 검수/비공개 저장 → QA 후 공개 스케줄 설정(즉시/예약/조기공개).
4. 접근 제어
   - 성인물은 연령 게이트 플래그 지정(만 18세 확인 필요).
   - 구독 전용 선공개 범위 설정(구독형 도입 시 활성화).

### 5) 관리자센터: 카테고리/노출 운영
- 카테고리 체계(영문)
  - 분류 예시: Popular, New Releases, Completed, Romance, Action, Fantasy, Mature 등.
  - 카테고리 엔티티는 영어 전용(표기/설명/슬러그).
- 편성/정렬
  - 시리즈를 카테고리에 매핑(가중치/순서/기간 설정).
  - 홈섹션(히어로/추천/인기/신작) 슬롯 편성, 예약 시작/종료.
- 품질/정책
  - 성인 카테고리는 별도 섹션 및 배너 경고 적용.
  - 카테고리 활성/비활성 플래그로 노출 제어.

### 6) 사이트/노출 정책
- `/`(한국)과 `/en`(영문)은 완전 분리, 혼합/자동판단 없음.
- `/en` 내 작품·에피소드는 `locale='en'`만 노출. 영문 미출시 타이틀은 비노출.
- SEO: `/en`에 `hreflang=en-US`, canonical은 `/en/*`. 한국판과 상호 `alternate` 링킹.

### 7) 구독형(준비 단계)
- 상품(예시): Monthly $4.99 — 광고 제거, 조기공개, 일부 유료 해제(범위는 추후 정의).
- UI: `/en/subscribe` 플랜 카드 + 혜택 리스트 + "Coming soon"/알림 신청.
- 권한 모델: 구독권 플래그(코인과 별개). 결제 연동 전에는 체험/내부 QA만.

### 8) QA/승인 체크리스트(요약)
- 메타 검수: 영문 제목/설명/태그/연령 표기 확인.
- 에셋 품질: 해상도/용량/색공간/누락 페이지 점검.
- 노출 확인: `/en` 홈/목록/상세/에피소드 렌더링, 성인 게이트 동작.
- 카테고리 편성: 홈 섹션/카테고리별 목록 정렬·기간 검증.
- SEO: title/description/hreflang/canonical/robots 확인.
- 결제 표기: 모든 금액 `$` 표기, 결제 버튼은 "Coming soon" 상태(오작동 금지).

### 9) 운영/릴리스 전략
- 1차: `/en` 정적 페이지(홈/리스트/상세/에피소드/코인/구독/약관/프라이버시/쿠키) 공개 — 결제는 비활성.
- 2차: PG 확정 후 코인/구독 결제 플로우 연결(어댑터 도입), QA 후 점진 공개.
- 롤백: `/en` 경로 비활성화로 즉시 롤백, 한국판 무영향.

## 영문 디자인 가이드 (Toomics Global 스타일 준용)
> 주의: 본 섹션은 외부 서비스의 UX 패턴을 참고하되, 법적 리스크(트레이드드레스/상표/저작권)를 회피하기 위해 자체 에셋/문구/간격을 최소 변형하여 적용합니다. 색상/폰트 값은 운영 확정 시 실제 값으로 대체합니다.

### 1) 테마 토큰(EN 전용)
- Colors (임시 값, 실제 레퍼런스 확정 필요)
  - `--color-primary`: TBC_PRIMARY_HEX
  - `--color-primary-600`: TBC_PRIMARY_600_HEX
  - `--color-accent`: TBC_ACCENT_HEX
  - `--color-neutral-900`: #0F172A
  - `--color-neutral-700`: #334155
  - `--color-neutral-500`: #6B7280
  - `--color-neutral-200`: #E5E7EB
  - `--color-neutral-50`: #F9FAFB
  - `--color-success`: #22C55E
  - `--color-warning`: #F59E0B
  - `--color-error`: #EF4444

- Typography (폰트/스케일)
  - Primary font: TBC_EN_FONT_FAMILY (대체: Inter, system-ui)
  - H1: 32/40, 700
  - H2: 24/32, 700
  - H3: 20/28, 600
  - Body: 16/24, 400/500
  - Caption: 13/18, 400

- Spacing/Radius/Elevation
  - Spacing: 4px scale(4,8,12,16,24,32,48)
  - Radius: 16(배너/카드), 12(패널), 9999(pill)
  - Elevation: 카드 기본 0→호버 8, 전환 150–200ms ease-out

### 2) 레이아웃/컴포넌트 패턴(EN)
- 헤더: 좌 로고, 중앙 네비(Home, Browse, Completed, Genres, Subscribe), 우측 검색/로그인, 스티키
- 히어로: 대형 커버 캐러셀, 오버레이 그라데이션, CTA(“Read Now”, “Continue”), 인디케이터(점/화살표)
- 홈 섹션: Recommended / Trending / New Releases / Completed / Editor’s Picks / Genres 가로 스크롤 로우, 섹션 우측 “More”
- 카드: 3:4 커버, 라운드 16, 미세 호버 확대, 배지(Free/Completed/Hot), 제목·작가 2줄 제한
- 장르/탭: 필터 pill, 활성 강조, 리스트↔그리드 토글(선택)
- 푸터: 링크 컬럼(About/Terms/Privacy/Support/CCPA/Cookies), 언어 셀렉터

### 3) 페이지별 가이드(EN)
- Home(/en): 상단 히어로 → 4–6개 섹션(섹션 타이틀·More 링크), 카드 그리드 균일 간격
- Browse/Genres: 좌측 필터(장르/완결/성인), 우측 그리드(12/24 여백), 페이징 또는 무한스크롤
- Detail: 커버/메타/장르 배지/작가/평점/팔로우/에피소드 리스트(무료/유료/완결 배지), CTA(“Start from Ep.1”, “Continue”)
- Episode: 리더(좌우 네비), 18+ 게이트(EN 문구), 다음 화 CTA, 광고 영역(구독 시 제거)
- Coins: USD 표기, 패키지 카드 그리드, 결제 버튼은 “Coming soon”(PG 확정 전), 환불/FAQ 아코디언
- Subscribe: 월 플랜 카드(1–2개), 혜택(Ad‑free, Early access, Discounts), “Coming soon”/알림 수집
- Legal: Terms/Privacy/CCPA/Cookies – EN 문구, Do Not Sell/Share 링크 시각 강조

### 4) 에셋/카피 가이드
- 폰트: EN 전용 웹폰트(woff2) 프리로드, 한국어 폰트와 분리 로드
- 아이콘: 일관된 세트 사용(lucide/Feather 등), 굵기 1.5–2px
- 컬러/톤: Toomics Global 톤에 맞추되 채도/명도 5–10% 범위 내 조정 가능(법적 리스크 대비)
- 카피: 간결/행동 유도형(“Start reading”, “See all”, “Continue”)

### 5) SEO/접근성
- SEO: `hreflang=en-US`, canonical `/en/*`, 구조화 데이터(Organization/WebSite/CollectionPage)
- 접근성: 대비비율 WCAG AA 이상, 키보드 포커스, 스크린리더용 대체텍스트

### 6) 롤아웃
- Phase A: 디자인 토큰/컴포넌트 키트 확정(폰트/색상 값 TBC 자리 채우기)
- Phase B: `/en` 정적 페이지에 EN 테마 적용(홈/리스트/상세/코인/구독/약관)
- Phase C: QA(모바일/접근성/성능/SEO) → 공개
