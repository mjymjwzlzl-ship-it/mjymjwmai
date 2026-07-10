# ARATA Backend API Server

ARATA 플랫폼의 백엔드 API 서버입니다.

## 기술 스택

- Node.js + Express.js
- PostgreSQL + Prisma ORM
- JWT 인증
- bcryptjs 암호화

## 설치 및 실행

1. 의존성 설치
```bash
npm install
```

2. 환경변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 설정값을 입력합니다.

```bash
cp .env.example .env
```

3. 데이터베이스 설정
```bash
npm run db:generate
npm run db:push
```

4. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## API 엔드포인트

### 인증 (Auth)
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인

### 웹툰 (Comics)
- `GET /api/comics` - 웹툰 목록 조회
- `GET /api/comics/:id` - 웹툰 상세 조회
- `GET /api/comics/:id/episodes` - 에피소드 목록 조회

### 관리자 (Admin)
- `GET /api/admin/comics` - 관리자 웹툰 목록
- `POST /api/admin/comics` - 웹툰 등록
- `PUT /api/admin/comics/:id` - 웹툰 수정
- `DELETE /api/admin/comics/:id` - 웹툰 삭제

### 크리에이터 (Creator)
- `GET /api/creator/comics` - 내 웹툰 목록
- `POST /api/creator/comics` - 웹툰 등록
- `PUT /api/creator/comics/:id` - 웹툰 수정
- `POST /api/creator/comics/:id/episodes` - 에피소드 추가
- `DELETE /api/creator/comics/:id` - 웹툰 삭제

### 사용자 (Users)
- `GET /api/users/profile` - 프로필 조회
- `PUT /api/users/profile` - 프로필 수정
- `GET /api/users/likes` - 좋아요 목록
- `POST /api/users/likes/:comicId` - 좋아요 토글
- `GET /api/users/history` - 시청 기록

## 인증

JWT Bearer 토큰을 사용합니다. 인증이 필요한 API 요청 시 헤더에 토큰을 포함해야 합니다:

```
Authorization: Bearer YOUR_JWT_TOKEN
```