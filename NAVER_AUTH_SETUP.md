# 네이버 성인인증 설정 가이드

## 현재 상황
- Client ID: carryer123
- Client Secret: PIv9h8Kukk
- IV: 6C2Syq8tbK3eApue

## 네이버 인증 방법

### 방법 1: 네이버 개발자 센터 앱 등록 (무료)
1. https://developers.naver.com 접속
2. Application > 애플리케이션 등록
3. 사용 API: 네이버 로그인 선택
4. 서비스 환경: PC 웹, 모바일 웹 선택
5. 서비스 URL: https://arata.co.kr
6. Callback URL: https://arata.co.kr/auth/naver/callback

**문제점**: 
- 일반 OAuth 로그인만 가능
- 성인인증 전용 API가 아님
- 생년월일 정보를 받을 수 없을 수 있음

### 방법 2: 바로써트 통합 인증 (유료)
바로써트를 통해 네이버/카카오/통신사 인증을 통합 관리

**장점**:
- 실제 본인인증 가능
- 생년월일 확인으로 정확한 나이 확인
- 법적 효력 있는 인증

### 방법 3: 카카오 인증 사용 (권장) ✅
이미 구현되어 있고 바로 사용 가능!
- 카카오 OAuth로 연령대 정보 확인
- 19세 이상 여부 즉시 확인 가능

## 권장사항
**카카오 인증을 사용하세요!**
- 이미 완전히 구현됨
- 추가 설정 불필요
- 바로 사용 가능