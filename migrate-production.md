# 프로덕션 서버 마이그레이션 가이드

## 1. 데이터베이스 스키마 업데이트

프로덕션 서버에서 다음 명령어를 실행하세요:

```bash
# 1. 프로젝트 디렉토리로 이동
cd /path/to/arata

# 2. 최신 코드 가져오기
git pull origin master

# 3. 의존성 설치
npm install

# 4. Prisma 클라이언트 재생성
npx prisma generate

# 5. 데이터베이스 스키마 업데이트 (데이터 손실 없음)
npx prisma db push

# 6. 백엔드 서버 재시작
pm2 restart backend
# 또는
systemctl restart arata-backend
```

## 2. 필요한 스키마 변경사항

### User 모델에 추가된 필드:
- `coinBalance` (Int, 기본값: 0)
- `adultVerified` (Boolean, 기본값: false)
- `adultVerifiedAt` (DateTime?, nullable)
- `birthYear` (Int?, nullable)
- `nickname` (String?, nullable)

### Comic 모델에 추가된 필드:
- `paidStartEpisode` (Int, 기본값: 0) - 유료 시작 회차
- `episodeCoinPrice` (Int, 기본값: 3) - 에피소드당 코인 가격

### 새로 추가된 모델:
- `Purchase` - 구매 정보
- `CoinTransaction` - 코인 거래 내역

## 3. 임시 해결책 (스키마 업데이트 전)

스키마를 즉시 업데이트할 수 없는 경우, 다음 SQL을 실행하여 필요한 필드만 추가:

```sql
-- SQLite용
ALTER TABLE users ADD COLUMN coinBalance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN adultVerified BOOLEAN DEFAULT FALSE;
ALTER TABLE comics ADD COLUMN paidStartEpisode INTEGER DEFAULT 0;
ALTER TABLE comics ADD COLUMN episodeCoinPrice INTEGER DEFAULT 3;

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  coinPrice INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  episodeId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (episodeId) REFERENCES episodes(id),
  UNIQUE(userId, episodeId)
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  balance INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

## 4. 테스트

마이그레이션 후 다음을 확인:
1. 사용자 로그인 정상 작동
2. 웹툰 목록 조회 정상
3. 에피소드 구매 기능 정상 작동
4. 관리자/작가 센터에서 유료 설정 변경 가능