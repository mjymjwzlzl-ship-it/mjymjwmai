# ARATA 테스트 계정 정보

## 로컬 서버 (http://localhost:4000)
✅ 모든 계정 로그인 정상 작동

### 테스트 계정
1. **관리자**
   - 이메일: admin@arata.com
   - 비밀번호: admin123
   - 권한: ADMIN

2. **일반 사용자 (성인인증 완료)**
   - 이메일: test123@arata.com
   - 비밀번호: test123
   - 코인: 994
   - 성인인증: ✅

3. **이병상**
   - 이메일: carryer12345@gmail.com
   - 비밀번호: 12345678

4. **바로**
   - 이메일: carryer123@naver.com
   - 비밀번호: 12345678

## 프로덕션 서버 (https://arata.co.kr)
⚠️ 데이터베이스 동기화 필요
- 현재 admin 계정만 로그인 가능
- 다른 계정들은 비밀번호 재설정 필요

## 로그인 테스트 방법
```bash
cd /d/ARATA/backend
node test-login.js
```

## 비밀번호 재설정 방법
```bash
cd /d/ARATA/backend
node reset-test-passwords.js
```