# ARATA 포트포워딩 환경 설정 가이드

## 🚀 현재 상황
- 메인 서버: 포트 4000 → 19000 (포트포워딩)
- 작가 센터: 포트 4001 → 20000 (포트포워딩)
- 관리자 센터: 포트 5000 → 21000 (포트포워딩)
- 백엔드 API: 포트 18000 (포트포워딩)
- 외부 접근 주소:
  - 메인 서버: http://59.6.135.217:19000
  - 작가 센터: http://59.6.135.217:20000
  - 관리자 센터: http://59.6.135.217:21000

## 🔧 해결된 문제들

### 1. 하드코딩된 API 주소 수정
- ✅ 작가 센터 API 주소 수정
- ✅ 관리자 센터 API 주소 수정
- ✅ 메인 서버 API 주소 수정
- ✅ 이미지 URL 처리 수정

### 2. Next.js 설정 업데이트
- ✅ 이미지 도메인 추가
- ✅ 환경변수 기본값 설정
- ✅ 포트포워딩 주소 반영

### 3. OAuth 설정 준비
- ✅ NextAuth 설정 수정
- ✅ 리다이렉트 URL 설정

## 📝 추가 설정 필요

### 1. 환경변수 파일 생성

**루트 디렉토리에 `.env.local` 파일 생성:**
```env
# 메인 서버 환경변수
NEXTAUTH_SECRET="arata-nextauth-secret-key-2024"
NEXTAUTH_URL="http://localhost:4000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_BACKEND_URL="http://59.6.135.217:18000"
NEXT_PUBLIC_API_URL="http://59.6.135.217:18000/api"
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="arata-jwt-secret-key-2024"
```

**작가 센터 디렉토리에 `creator-center/.env.local` 파일 생성:**
```env
NEXT_PUBLIC_API_URL="http://59.6.135.217:18000/api"
NEXT_PUBLIC_BACKEND_URL="http://59.6.135.217:18000"
```

**관리자 센터 디렉토리에 `admin-center/.env.local` 파일 생성:**
```env
NEXT_PUBLIC_API_URL="http://59.6.135.217:18000/api"
NEXT_PUBLIC_BACKEND_URL="http://59.6.135.217:18000"
```

### 2. 구글 OAuth 설정

⚠️ **현재 구글 OAuth에 문제가 있습니다. 임시로 비활성화 상태입니다.**

Google Cloud Console (https://console.cloud.google.com)에서 설정하려면:

#### 단계별 설정:
1. **새 프로젝트 생성** 또는 기존 프로젝트 선택
2. **API 및 서비스 > OAuth 동의 화면**:
   - 사용자 유형: 외부 선택
   - 앱 이름: ARATA
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
3. **API 및 서비스 > 사용자 인증 정보**:
   - OAuth 2.0 클라이언트 ID 생성
   - 애플리케이션 유형: 웹 애플리케이션
   - **승인된 JavaScript 원본**:
     ```
     http://localhost:4000
     ```
   - **승인된 리다이렉트 URI**:
     ```
     http://localhost:4000/api/auth/callback/google
     ```

#### 테스트 사용자 추가:
- **OAuth 동의 화면 > 테스트 사용자**에서 본인 이메일 추가
- 앱이 게시되지 않은 상태에서는 테스트 사용자만 로그인 가능

#### 환경변수 설정:
클라이언트 ID와 시크릿을 `.env.local` 파일에 추가:
```env
GOOGLE_CLIENT_ID="실제-클라이언트-ID"
GOOGLE_CLIENT_SECRET="실제-클라이언트-시크릿"
```

#### 일반적인 OAuth 에러 해결:
- **Error 400: invalid_request**: 리다이렉트 URI 확인
- **Access blocked**: 테스트 사용자에 이메일 추가
- **App not verified**: OAuth 동의 화면 설정 확인

### 3. 포트포워딩 확인

다음 포트들이 제대로 포트포워딩되어 있는지 확인:
- `4000` → `19000` (메인 서버) - **필수!**
- `4001` → `20000` (작가 센터) - **필수!**
- `5000` → `21000` (관리자 센터) - **필수!**
- `18000` → `18000` (백엔드 API) - **필수!**

## 🏃‍♂️ 서버 실행

### 방법 1: 배치 파일 사용
```bash
start-servers.bat
```

### 방법 2: 수동 실행
```bash
# 1. 메인 서버
npm run dev

# 2. 작가 센터 (새 터미널)
cd creator-center
npm run dev

# 3. 관리자 센터 (새 터미널)
cd admin-center
npm run dev
```

## 🔍 문제 해결

### 웹툰이 안 보이는 경우
1. 백엔드 API 서버(포트 18000)가 실행 중인지 확인
2. 포트포워딩이 제대로 설정되었는지 확인
3. 브라우저 개발자 도구에서 네트워크 에러 확인

### 로그인이 안 되는 경우
1. 구글 OAuth 설정 확인
2. NEXTAUTH_URL이 올바르게 설정되었는지 확인
3. 리다이렉트 URI가 구글 콘솔에 등록되었는지 확인

### 작가 센터 접속 안 되는 경우
1. 포트 4001이 열려있는지 확인
2. API 연결 상태 확인
3. 환경변수가 올바르게 설정되었는지 확인

## 📱 접속 주소

### 외부 접근 (포트포워딩)
- **메인 사이트**: http://59.6.135.217:19000
- **작가 센터**: http://59.6.135.217:20000
- **관리자 센터**: http://59.6.135.217:21000

### 내부 접근 (서버에서)
- **메인 사이트**: http://localhost:4000
- **작가 센터**: http://localhost:4001
- **관리자 센터**: http://localhost:5000

⚠️ **OAuth 로그인은 localhost에서만 가능합니다** (구글 정책) 