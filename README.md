# ARATA

AI 기반 웹툰 전문 플랫폼 - 광고 기반 반응형 웹서비스

## 📋 프로젝트 개요

- **서비스명**: ARATA
- **개발 스택**: Next.js 14, React 18, TypeScript, Tailwind CSS, Prisma, PostgreSQL
- **수익 모델**: 광고 기반 (Google AdSense)
- **플랫폼**: 웹 & 모바일 반응형

## ✨ 주요 기능

### 사용자 기능
- 🏠 **메인 홈페이지**: 정식연재/유저웹툰 리스트, 프로모션 배너
- 📚 **정식연재 웹툰**: 운영자 업로드 웹툰, 회차별 이미지 슬라이드
- 👤 **유저 웹툰**: 일반 사용자 업로드 웹툰, 신고/댓글 기능
- 🔐 **회원가입/로그인**: 이메일 인증 + 소셜 로그인 (구글, 카카오)
- 📱 **반응형 디자인**: 모바일/태블릿/데스크탑 최적화

### 관리자 기능
- 📊 **메인 대시보드**: 콘텐츠 수, 회원 통계, 신고 현황
- 🎨 **정식 웹툰 관리**: 작품 추가/수정/삭제, 회차 이미지 관리
- 👥 **유저 업로드 관리**: 검수/승인, 신고 처리
- 👨‍💼 **회원 관리**: 회원 정보 조회, 경고/정지 기능
- 💰 **광고 관리**: 광고 위치/코드 관리, 수익 분석

### 광고 시스템
- 📺 **배너 광고**: 헤더/푸터 반응형 배너
- 📰 **네이티브 광고**: 콘텐츠 사이 자연스러운 배치
- 🖥️ **인터스티셜 광고**: 전면 광고 (선택사항)

## 🛠️ 기술 스택

### Frontend
- **Next.js 14**: React 프레임워크, App Router
- **React 18**: 사용자 인터페이스 라이브러리
- **TypeScript**: 타입 안정성
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Zustand**: 상태 관리 라이브러리

### Backend
- **Prisma**: ORM 및 데이터베이스 관리
- **PostgreSQL**: 메인 데이터베이스
- **NextAuth.js**: 인증 시스템

### 기타
- **Lucide React**: 아이콘 라이브러리
- **Swiper**: 이미지 슬라이더
- **Google AdSense**: 광고 시스템

## 🚀 설치 및 실행

### 1. 프로젝트 클론
\`\`\`bash
git clone [repository-url]
cd ARATA
\`\`\`

### 2. 의존성 설치
\`\`\`bash
npm install
\`\`\`

### 3. 환경 변수 설정
\`.env\` 파일을 생성하고 다음 내용을 추가하세요:

\`\`\`env
# 데이터베이스
DATABASE_URL="postgresql://username:password@localhost:5432/arata_platform"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth 설정
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# AWS S3 (이미지 업로드)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET="your-s3-bucket-name"

# Google AdSense
GOOGLE_ADSENSE_CLIENT_ID="ca-pub-xxxxxxxxxx"

# JWT
JWT_SECRET="your-jwt-secret-key"
\`\`\`

### 4. 데이터베이스 설정
\`\`\`bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma db push

# (선택사항) 데이터베이스 시드 데이터
npx prisma db seed
\`\`\`

### 5. 개발 서버 실행
\`\`\`bash
npm run dev
\`\`\`

프로젝트가 http://localhost:3000 에서 실행됩니다.

## 📱 반응형 화면 크기 기준

- **모바일**: 320px ~ 767px
- **태블릿**: 768px ~ 1023px
- **데스크탑**: 1024px 이상

## 🗂️ 프로젝트 구조

\`\`\`
ARATA/
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API 라우트
│   ├── globals.css        # 전역 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx          # 메인 페이지
├── components/            # 재사용 가능한 컴포넌트
│   ├── Header.tsx        # 헤더 컴포넌트
│   ├── ComicCard.tsx     # 웹툰 카드
│   └── AdSlot.tsx        # 광고 슬롯
├── lib/                  # 유틸리티 함수
│   ├── prisma.ts         # Prisma 클라이언트
│   └── utils.ts          # 공통 유틸리티
├── prisma/               # 데이터베이스 스키마
│   └── schema.prisma     # Prisma 스키마
├── store/                # 상태 관리 (Zustand)
│   ├── authStore.ts      # 인증 상태
│   └── uiStore.ts        # UI 상태
├── types/                # TypeScript 타입 정의
│   └── index.ts          # 메인 타입들
└── public/               # 정적 파일
    └── images/           # 이미지 파일
\`\`\`

## 🔧 개발 명령어

\`\`\`bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 린팅
npm run lint

# Prisma Studio (데이터베이스 GUI)
npm run db:studio

# 데이터베이스 마이그레이션
npm run db:push
\`\`\`

## 🎨 UI/UX 특징

### 반응형 디자인
- **모바일 우선 설계**: 작은 화면부터 큰 화면으로 확장
- **터치 친화적**: 44px 이상의 터치 타겟
- **자동 메뉴 조정**: 화면 크기에 따른 네비게이션 변경

### 접근성
- **시맨틱 HTML**: 스크린 리더 지원
- **키보드 네비게이션**: Tab 키를 통한 접근
- **고대비 색상**: WCAG 가이드라인 준수

### 성능 최적화
- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **코드 분할**: 동적 임포트를 통한 번들 크기 최소화
- **SEO 최적화**: 메타 태그 및 구조화된 데이터

## 📊 광고 시스템

### 광고 위치
1. **헤더 배너**: 상단 고정 배너 (728x90 / 320x100)
2. **푸터 배너**: 하단 배너 (728x90 / 320x50)
3. **네이티브 광고**: 콘텐츠 리스트 중간 삽입
4. **인터스티셜**: 전면 광고 (선택적 표시)

### 수익 분석
- Google AdSense 연동
- 광고 노출/클릭 통계
- 수익 대시보드 제공

## 🔐 보안

- **HTTPS**: SSL/TLS 암호화
- **JWT 토큰**: 안전한 인증
- **입력 검증**: XSS, SQL 인젝션 방지
- **이미지 검수**: 부적절한 콘텐츠 필터링

## 🚀 배포

### AWS 배포 (권장)
- **EC2**: 애플리케이션 서버
- **RDS**: PostgreSQL 데이터베이스
- **S3**: 이미지 저장소
- **CloudFront**: CDN

### Docker 배포
\`\`\`bash
# Docker 이미지 빌드
docker build -t arata .

# 컨테이너 실행
docker run -p 3000:3000 arata
\`\`\`

## 🤝 기여 방법

1. Fork 프로젝트
2. Feature 브랜치 생성 (\`git checkout -b feature/AmazingFeature\`)
3. 변경사항 커밋 (\`git commit -m 'Add some AmazingFeature'\`)
4. 브랜치에 Push (\`git push origin feature/AmazingFeature\`)
5. Pull Request 생성

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈 리포팅**: [GitHub Issues](https://github.com/your-repo/issues)
- **문의**: contact@arata.com
- **문서**: [개발자 가이드](https://docs.arata.com)

---

## 🎯 로드맵

### Phase 1 (현재)
- [x] 기본 프로젝트 구조 설정
- [x] 반응형 메인 페이지
- [ ] 사용자 인증 시스템
- [ ] 웹툰 업로드 기능

### Phase 2
- [ ] 관리자 페이지 구현
- [ ] 댓글 시스템
- [ ] 신고 기능
- [ ] 광고 최적화

### Phase 3
- [ ] AI 추천 시스템
- [ ] 실시간 알림
- [ ] 모바일 앱 (React Native)
- [ ] 다국어 지원

---

**ARATA**와 함께 웹툰의 새로운 시대를 열어가세요! 🚀 