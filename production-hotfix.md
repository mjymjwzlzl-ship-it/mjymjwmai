# 프로덕션 긴급 패치

## 문제
프로덕션 서버에서 에피소드 구매 시 500 에러 발생
- 원인: 데이터베이스 스키마가 최신 버전이 아님
- 누락된 테이블/필드: Purchase, CoinTransaction, User.coinBalance, Comic.paidStartEpisode 등

## 즉시 적용 가능한 해결책

### 옵션 1: 최신 코드 배포 (권장)
1. 프로덕션 서버에서:
```bash
git pull origin master
cd backend
npm install
npx prisma generate
npx prisma db push
pm2 restart backend
```

### 옵션 2: 핫픽스 적용
백엔드 코드에 이미 fallback 처리가 추가되어 있습니다:
- `coinBalance` 필드가 없으면 0으로 처리
- `paidStartEpisode`가 없으면 모든 에피소드 무료로 처리
- `Purchase` 테이블이 없어도 에러 발생하지 않음

### 옵션 3: 데이터베이스만 업데이트
```sql
-- SQLite 명령어
-- 1. User 테이블에 필드 추가
ALTER TABLE users ADD COLUMN coinBalance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN adultVerified BOOLEAN DEFAULT 0;

-- 2. Comic 테이블에 필드 추가  
ALTER TABLE comics ADD COLUMN paidStartEpisode INTEGER DEFAULT 0;
ALTER TABLE comics ADD COLUMN episodeCoinPrice INTEGER DEFAULT 3;

-- 3. Purchase 테이블 생성
CREATE TABLE purchases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  coinPrice INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  episodeId TEXT NOT NULL,
  UNIQUE(userId, episodeId)
);

-- 4. CoinTransaction 테이블 생성 (선택사항)
CREATE TABLE coin_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  amount INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL
);
```

## 테스트 코인 지급 (테스트용)
```sql
UPDATE users SET coinBalance = 1000 WHERE email = 'test123@arata.com';
```

## 확인 사항
1. 구매 기능 정상 작동
2. 코인 차감 정상 작동
3. 이미 구매한 에피소드 중복 구매 방지