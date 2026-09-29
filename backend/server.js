const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('passport');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// 환경변수 로드
dotenv.config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('A JWT_SECRET of at least 32 characters is required.');

// Cloudflare R2 설정 (환경변수에서 로드)
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'arata',
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || 8000; // 포트포워딩: 8000 -> 18000

// CORS 설정
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:4001',
      'http://localhost:5000',
      'http://localhost:5000',
      'http://localhost:5002', // 관리자 센터
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      'http://127.0.0.1:4001',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5002', // 관리자 센터
      'https://arata.co.kr',
      'https://www.arata.co.kr',
      'https://creator.arata.co.kr',
      'https://admin.arata.co.kr',
      'https://api.arata.co.kr',
      'https://achat.arata.co.kr' // 에이챗(아라따 계정 로그인·잔액·결제 연동)
    ];
    
    // 개발 환경에서는 origin이 없거나 (같은 origin) 허용된 origin인 경우 통과
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
};

// 미들웨어 설정
app.use(cors(corsOptions));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', 'Referrer-Policy':'no-referrer', 'Strict-Transport-Security':'max-age=31536000; includeSubDomains'});
  if (req.path.startsWith('/api/')) {
    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
      this.setHeader('Cache-Control', 'private, no-store, max-age=0');
      return writeHead.apply(this, args);
    };
    res.set('Cache-Control', 'private, no-store, max-age=0');
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(passport.initialize());

// WebP 자동 제공 미들웨어
const fs = require('fs');

const uploadsRoot = path.resolve(__dirname, 'uploads');

function resolveUploadPath(requestedPath) {
  let decodedPath = requestedPath;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const nextValue = decodeURIComponent(decodedPath);
      if (nextValue === decodedPath) break;
      decodedPath = nextValue;
    } catch (_error) {
      return null;
    }
  }

  if (decodedPath.includes('\0')) return null;

  const cleanPath = decodedPath.normalize('NFC').replace(/^[/\\]+/, '');
  const fullPath = path.resolve(uploadsRoot, cleanPath);
  const relativePath = path.relative(uploadsRoot, fullPath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return { cleanPath, fullPath };
}

// 파일 시스템에서 실제 파일 경로 구성
// 모든 파일이 NFC로 정규화되어 있으므로 직접 경로 구성 가능
function getActualFilePath(requestedPath) {
  try {
    const resolved = resolveUploadPath(requestedPath);
    if (!resolved) return null;
    const { fullPath } = resolved;
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile() ? fullPath : null;
  } catch (error) {
    console.error('[ERROR] getActualFilePath:', error.message);
    return null;
  }
}

// 이미지 캐싱 및 WebP 변환 미들웨어
app.use('/uploads', require('./services/episode-media').guardEpisodeMedia);
app.use('/uploads', async (req, res, next) => {
  if (!resolveUploadPath(req.path)) { res.set('Cache-Control', 'no-store'); return res.status(400).json({message:'Invalid upload path'}); }
  // 강력한 캐싱 헤더 설정
  res.set({
    'Cache-Control': res.locals.protectedEpisodeMedia ? 'private, no-store' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Timing-Allow-Origin': '*'
  });

  // 실제 파일 경로 구성
  console.log('[DEBUG] req.path:', req.path);
  const actualPath = getActualFilePath(req.path);
  console.log('[DEBUG] actualPath:', actualPath);

  // Accept 헤더에서 WebP 지원 확인
  const acceptsWebP = req.headers.accept && req.headers.accept.includes('image/webp');

  // WebP 지원하고 원본이 jpg/png인 경우
  if (acceptsWebP && (req.path.endsWith('.jpg') || req.path.endsWith('.jpeg') || req.path.endsWith('.png'))) {
    const webpPath = actualPath ? actualPath.replace(/\.(jpg|jpeg|png)$/i, '.webp') : null;

    if (webpPath && fs.existsSync(webpPath)) {
      const stats = fs.statSync(webpPath);
      const etag = `W/"${stats.size}-${stats.mtime.getTime()}"`;

      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      res.set({
        'Content-Type': 'image/webp',
        'ETag': etag,
        'Vary': 'Accept'
      });

      return res.sendFile(webpPath);
    }
  }

  // 파일이 존재하면 서빙
  if (actualPath) {
    const stats = fs.statSync(actualPath);
    const etag = `W/"${stats.size}-${stats.mtime.getTime()}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    // Content-Type 결정
    let contentType = 'application/octet-stream';
    if (actualPath.endsWith('.jpg') || actualPath.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (actualPath.endsWith('.png')) {
      contentType = 'image/png';
    } else if (actualPath.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (actualPath.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (actualPath.endsWith('.mp4')) {
      contentType = 'video/mp4';
    } else if (actualPath.endsWith('.webm')) {
      contentType = 'video/webm';
    } else if (actualPath.endsWith('.mp3')) {
      contentType = 'audio/mpeg';
    } else if (actualPath.endsWith('.json')) {
      contentType = 'application/json';
    }

    // 비디오 파일의 경우 Range 요청 지원
    if (contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunkSize = (end - start) + 1;

        res.status(206).set({
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'ETag': etag,
          'Last-Modified': stats.mtime.toUTCString()
        });

        const stream = fs.createReadStream(actualPath, { start, end });
        return stream.pipe(res);
      }

      res.set({
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': stats.size,
        'ETag': etag,
        'Last-Modified': stats.mtime.toUTCString()
      });
    } else {
      res.set({
        'Content-Type': contentType,
        'ETag': etag,
        'Last-Modified': stats.mtime.toUTCString(),
        'Vary': 'Accept'
      });
    }

    return res.sendFile(actualPath);
  }

  // 로컬에 파일이 없으면 R2에서 가져오기
  try {
    // URL 디코딩 (EUC-KR 등 다양한 인코딩 처리)
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(req.path);
    } catch (decodeError) {
      // EUC-KR 등 UTF-8이 아닌 인코딩의 경우 원래 경로 사용
      console.warn('[R2] decodeURIComponent failed, using raw path:', decodeError.message);
      decodedPath = req.path;
    }

    const normalizedPath = decodedPath.normalize('NFC');
    const r2Key = `uploads${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;

    console.log('[R2] Fetching from R2:', r2Key);

    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: r2Key,
    });

    const response = await s3Client.send(command);

    // Content-Type 결정
    let contentType = response.ContentType || 'application/octet-stream';
    if (r2Key.endsWith('.webp')) contentType = 'image/webp';
    else if (r2Key.endsWith('.jpg') || r2Key.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (r2Key.endsWith('.png')) contentType = 'image/png';
    else if (r2Key.endsWith('.gif')) contentType = 'image/gif';

    res.set({
      'Content-Type': contentType,
      'Cache-Control': res.locals.protectedEpisodeMedia ? 'private, no-store' : 'public, max-age=31536000, immutable',
      'Vary': 'Accept'
    });

    // Stream the response body
    const stream = response.Body;
    stream.pipe(res);
  } catch (r2Error) {
    console.error('[R2] Error fetching from R2:', r2Error.message);
    res.status(404).send('File not found');
  }
});

// 라우터 import
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const creatorRouter = require('./routes/creator');
const comicsRouter = require('./routes/comics');
const usersRouter = require('./routes/users');
const frontendRouter = require('./routes/frontend');
const episodesRouter = require('./routes/episodes');
const paymentRouter = require('./routes/payment');
const bannersRouter = require('./routes/banners');
const favoritesRouter = require('./routes/favorites');
const supportRouter = require('./routes/support');
const emailWebhookRouter = require('./routes/email-webhook');
const commentsRouter = require('./routes/comments');
const ratingsRouter = require('./routes/ratings');
const novelsRouter = require('./routes/novels');
const communityRouter = require('./routes/community');
const gamesRouter = require('./routes/games');
const inicisRouter = require('./routes/inicis');
const reportRouter = require('./routes/report');
const searchRouter = require('./routes/search');
const attendanceRouter = require('./routes/attendance');
const chatRouter = require('./routes/chat');
const cheerRouter = require('./routes/cheer');

// API 라우트 설정
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/creator', creatorRouter);
app.use('/api/comics', comicsRouter);
app.use('/api/users', usersRouter);
app.use('/api/frontend', frontendRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/support', supportRouter);
app.use('/api/email', emailWebhookRouter);
app.use('/api', commentsRouter); // 댓글 라우트 추가
app.use('/api', ratingsRouter); // 평점 라우트 추가
app.use('/api', require('./routes/photobooks')); // 화보(PHOTOBOOK) 목록·상세·코인 소장
app.use('/api/novels', novelsRouter); // 소설 라우트 추가
app.use('/api/community', communityRouter); // 커뮤니티 라우트 추가
app.use('/api/games', gamesRouter); // 게임 라우트 추가
app.use('/api/inicis', inicisRouter); // 이니시스 결제 라우트 추가
app.use('/api/report', reportRouter); // 신고/차단 라우트 추가
app.use('/api/search', searchRouter); // 검색 라우트 추가
app.use('/api/attendance', attendanceRouter); // 출석체크 라우트 추가
app.use('/api/chat', chatRouter); // 챗봇 라우트 추가
app.use('/api/cheer', cheerRouter); // 작품 응원 라우트 추가

// 관리자 비밀번호 재설정 라우트 (임시)
// Insecure administrative password reset endpoint removed.

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running', timestamp: new Date().toISOString() });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: '서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 서버 시작
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server is running on port ${PORT}`);
});