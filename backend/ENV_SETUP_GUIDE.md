# .env 파일 설정 가이드

## 1. .env 파일 생성

`.env` 파일은 이미 생성되어 있습니다. 위치: `D:/arata-backend/.env`

## 2. 환경변수 설명

### PORT
- 서버가 실행될 포트 번호
- 기본값: `8000`
- 예시: `PORT=8000`

### DATABASE_URL
- PostgreSQL 데이터베이스 연결 URL
- 형식: `postgresql://[사용자명]:[비밀번호]@[호스트]:[포트]/[데이터베이스명]?schema=public`
- 예시: `DATABASE_URL="postgresql://postgres:password@localhost:5432/arata?schema=public"`

구성 요소:
- `postgres` - PostgreSQL 사용자명 (기본값)
- `password` - PostgreSQL 비밀번호 (변경 필요!)
- `localhost` - 데이터베이스 호스트
- `5432` - PostgreSQL 기본 포트
- `arata` - 데이터베이스 이름

### JWT_SECRET
- JWT 토큰 생성/검증에 사용되는 비밀키
- **중요**: 프로덕션 환경에서는 반드시 복잡하고 안전한 키로 변경해야 합니다!
- 안전한 키 생성 방법:
  ```bash
  # Node.js 사용
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  
  # 또는 온라인 생성기 사용
  ```

### NODE_ENV
- 실행 환경 설정
- 옵션: `development`, `production`, `test`
- 기본값: `development`

## 3. PostgreSQL 설정

### PostgreSQL 설치 확인
```bash
psql --version
```

### 데이터베이스 생성
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE arata;

# 확인
\l

# 종료
\q
```

### 비밀번호 설정
PostgreSQL 설치 시 설정한 비밀번호를 DATABASE_URL에 입력합니다.

## 4. .env 파일 수정 예시

### 로컬 개발 환경
```env
PORT=8000
DATABASE_URL="postgresql://postgres:mypassword123@localhost:5432/arata?schema=public"
JWT_SECRET="my-super-secret-jwt-key-for-development"
NODE_ENV="development"
```

### 프로덕션 환경
```env
PORT=3000
DATABASE_URL="postgresql://produser:strongpassword@db.example.com:5432/arata_prod?schema=public"
JWT_SECRET="generated-64-character-random-string-here"
NODE_ENV="production"
```

## 5. 보안 주의사항

1. **.env 파일은 절대 Git에 커밋하지 마세요**
   - `.gitignore`에 `.env`가 포함되어 있는지 확인

2. **JWT_SECRET은 반드시 변경하세요**
   - 기본값 사용 시 보안 위험

3. **프로덕션 환경에서는 강력한 비밀번호 사용**
   - 데이터베이스 비밀번호
   - JWT 시크릿 키

## 6. 환경변수 확인

서버 실행 전 환경변수가 제대로 설정되었는지 확인:

```javascript
// test-env.js 파일 생성
require('dotenv').config();

console.log('환경변수 확인:');
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '설정됨' : '미설정');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '설정됨' : '미설정');
console.log('NODE_ENV:', process.env.NODE_ENV);
```

```bash
node test-env.js
```

## 7. 문제 해결

### PostgreSQL 연결 오류
- PostgreSQL 서비스가 실행 중인지 확인
- 방화벽 설정 확인
- 사용자명/비밀번호 확인

### 포트 충돌
- 다른 프로세스가 같은 포트를 사용 중인 경우
- PORT 값을 다른 번호로 변경 (예: 3001, 8080)

### 환경변수 인식 안 됨
- .env 파일이 프로젝트 루트에 있는지 확인
- 파일명이 정확히 `.env`인지 확인 (`.env.txt` X)