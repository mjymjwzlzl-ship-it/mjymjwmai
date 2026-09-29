const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
const { prisma } = require('../lib/prisma');
const { isValidEmail, validatePassword } = require('../lib/utils');
const naverAuth = require('../utils/naver-auth');
const kakaoAuth = require('../utils/kakao-auth');
const barocertAuth = require('../utils/barocert-auth');

const router = express.Router();
router.use((req, res, next) => {
  if (/^\/(adult-verification|adult-verify|naver-auth|kakao-auth|barocert)(\/|$)/.test(req.path) || req.path === '/naver/callback') {
    return res.status(410).json({ code: 'PASS_REQUIRED', message: '휴대폰 본인인증을 이용해주세요.' });
  }
  next();
});
router.use('/pass', require('./pass-verification').createPassRouter({ prisma }));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? "https://api.arata.co.kr/api/auth/google/callback" 
    : "http://localhost:8000/api/auth/google/callback",
  proxy: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // 기존 사용자 확인
    let user = await prisma.user.findUnique({
      where: { email: profile.emails[0].value }
    });

    if (!user) {
      // 고유 username 생성 (Google 표시명 기반)
      let uniqueUsername;
      let usernameCounter = 1;
      const baseUsername = profile.displayName || 'User';
      
      do {
        uniqueUsername = usernameCounter === 1 ? baseUsername : `${baseUsername}_${usernameCounter}`;
        const existingUserByUsername = await prisma.user.findUnique({
          where: { username: uniqueUsername }
        });
        if (!existingUserByUsername) break;
        usernameCounter++;
      } while (usernameCounter < 100);

      // 고유 닉네임 생성 (중복 방지)
      let uniqueNickname;
      let nicknameCounter = 1;
      const baseNickname = `사용자${Math.floor(Math.random() * 10000)}`;
      
      do {
        uniqueNickname = nicknameCounter === 1 ? baseNickname : `${baseNickname}_${nicknameCounter}`;
        const existingUserByNickname = await prisma.user.findUnique({
          where: { nickname: uniqueNickname }
        });
        if (!existingUserByNickname) break;
        nicknameCounter++;
      } while (nicknameCounter < 100);

      // 새 사용자 생성
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          username: uniqueUsername, // 고유한 사용자명
          nickname: uniqueNickname, // 고유 닉네임
          provider: 'google',
          providerId: profile.id,
          avatar: profile.photos[0].value,
          adultVerified: false, // 성인인증 미완료
          needsProfileSetup: true // 추가 프로필 설정 필요
        }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Kakao OAuth Strategy - 닉네임, 이메일 필수 동의 설정
passport.use(new KakaoStrategy({
  clientID: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? "https://api.arata.co.kr/api/auth/kakao/callback" 
    : "http://localhost:8000/api/auth/kakao/callback",
  proxy: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // 디버깅을 위한 로그
    console.log('=== 카카오 로그인 시도 ===');
    console.log('Kakao Profile ID:', profile.id);
    console.log('Profile JSON:', JSON.stringify(profile._json, null, 2));
    
    // 카카오에서 필수 동의받은 닉네임과 이메일 추출
    const kakaoAccount = profile._json.kakao_account;
    const kakaoProfile = kakaoAccount?.profile;
    const kakaoEmail = kakaoAccount?.email;
    const kakaoNickname = kakaoProfile?.nickname;
    
    console.log('카카오 정보:', {
      email: kakaoEmail,
      nickname: kakaoNickname,
      hasEmail: kakaoAccount?.has_email,
      isEmailValid: kakaoAccount?.is_email_valid,
      isEmailVerified: kakaoAccount?.is_email_verified
    });
    
    // 필수 동의 항목 확인
    if (!kakaoEmail || !kakaoNickname) {
      console.error('카카오 필수 동의 항목 누락:', { email: kakaoEmail, nickname: kakaoNickname });
      return done(new Error('카카오 로그인 시 이메일과 닉네임 동의가 필요합니다.'), null);
    }
    
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { providerId: String(profile.id), provider: 'kakao' },
          { email: kakaoEmail }
        ]
      }
    });

    console.log('기존 사용자 검색 결과:', user ? `찾음 (ID: ${user.id}, Email: ${user.email})` : '없음');

    if (!user) {
      console.log('새 카카오 사용자 생성 시작...');
      
      // 닉네임 중복 확인 및 고유화
      let uniqueNickname = kakaoNickname;
      let nicknameCounter = 1;
      
      while (await prisma.user.findUnique({ where: { nickname: uniqueNickname } })) {
        uniqueNickname = `${kakaoNickname}_${nicknameCounter}`;
        nicknameCounter++;
        if (nicknameCounter > 100) break; // 무한 루프 방지
      }
      
      // 사용자명도 카카오 닉네임 기반으로 생성
      let uniqueUsername = `kakao_${kakaoNickname.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}`;
      let usernameCounter = 1;
      
      while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `kakao_${kakaoNickname.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}_${usernameCounter}`;
        usernameCounter++;
        if (usernameCounter > 100) {
          uniqueUsername = `kakao_${profile.id}`;
          break;
        }
      }

      // 새 사용자 생성 - 카카오에서 받은 실제 정보 사용
      user = await prisma.user.create({
        data: {
          email: kakaoEmail,
          username: uniqueUsername, 
          nickname: uniqueNickname,
          provider: 'kakao',
          providerId: String(profile.id),
          avatar: kakaoProfile?.profile_image_url || kakaoProfile?.thumbnail_image_url,
          adultVerified: false,
          needsProfileSetup: false // 카카오에서 닉네임을 받았으므로 추가 설정 불필요
        }
      });
      
      console.log(`새 카카오 사용자 생성 완료: ${user.email} (${user.nickname})`);
    } else {
      console.log('기존 카카오 사용자로 로그인');
      
      // 기존 사용자의 정보 업데이트 (닉네임이 변경되었을 수 있음)
      if (user.nickname !== kakaoNickname && kakaoNickname) {
        // 닉네임 중복 확인
        const existingNickname = await prisma.user.findUnique({ 
          where: { nickname: kakaoNickname } 
        });
        
        if (!existingNickname || existingNickname.id === user.id) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              nickname: kakaoNickname,
              avatar: kakaoProfile?.profile_image_url || kakaoProfile?.thumbnail_image_url || user.avatar
            }
          });
          console.log(`카카오 사용자 정보 업데이트: ${user.nickname}`);
        }
      }
    }

    return done(null, user);
  } catch (error) {
    console.error('카카오 로그인 오류:', error);
    return done(error, null);
  }
}));

// Google OAuth 라우트
router.get('/google', (req, res, next) => {
  // redirect_uri를 쿼리 파라미터로 받아서 세션에 저장
  if (req.query.redirect_uri) {
    req.session = req.session || {};
    req.session.redirect_uri = req.query.redirect_uri;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // JWT 토큰 생성
      const token = jwt.sign(
        { 
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
          provider: req.user.provider || 'google',
          nickname: req.user.nickname,
          needsProfileSetup: req.user.needsProfileSetup || false,
          adultVerified: req.user.adultVerified || false
        },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // 동적 redirect_uri 또는 기본값 사용
      const redirectBase = req.session?.redirect_uri || 'https://arata.co.kr/auth/callback';
      const userInfo = encodeURIComponent(JSON.stringify({
        id: req.user.id,
        email: req.user.email,
        nickname: req.user.nickname
      }));
      
      res.redirect(`${redirectBase}#token=${encodeURIComponent(token)}&user=${userInfo}`);
    } catch (error) {
      console.error('Google OAuth 콜백 오류:', error);
      const errorRedirect = req.session?.redirect_uri?.replace('/callback', '/error') || 'https://arata.co.kr/auth/error';
      res.redirect(errorRedirect);
    }
  }
);

// Kakao OAuth 라우트 - 필수 동의 항목 설정
router.get('/kakao', (req, res, next) => {
  console.log('🚀 카카오 OAuth 시작 - 카카오 사이트로 리다이렉트 시도...');
  // redirect_uri를 쿼리 파라미터로 받아서 세션에 저장
  if (req.query.redirect_uri) {
    req.session = req.session || {};
    req.session.redirect_uri = req.query.redirect_uri;
  }
  // 카카오 로그인에서 profile_nickname과 account_email을 필수 동의로 요청
  passport.authenticate('kakao', {
    scope: ['profile_nickname', 'account_email']
  })(req, res, next);
});

router.get('/kakao/callback', 
  passport.authenticate('kakao', { session: false }),
  async (req, res) => {
    console.log('📞 카카오 콜백 받음 - 카카오에서 돌아옴');
    try {
      // JWT 토큰 생성
      const token = jwt.sign(
        { 
          userId: req.user.id,
          email: req.user.email,
          role: req.user.role,
          provider: req.user.provider || 'kakao',
          nickname: req.user.nickname,
          needsProfileSetup: req.user.needsProfileSetup || false,
          adultVerified: req.user.adultVerified || false
        },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      // 동적 redirect_uri 또는 기본값 사용
      const redirectBase = req.session?.redirect_uri || 'https://arata.co.kr/auth/callback';
      const userInfo = encodeURIComponent(JSON.stringify({
        id: req.user.id,
        email: req.user.email,
        nickname: req.user.nickname
      }));
      
      res.redirect(`${redirectBase}#token=${encodeURIComponent(token)}&user=${userInfo}`);
    } catch (error) {
      console.error('Kakao OAuth 콜백 오류:', error);
      const errorRedirect = req.session?.redirect_uri?.replace('/callback', '/error') || 'https://arata.co.kr/auth/error';
      res.redirect(errorRedirect);
    }
  }
);

// 회원가입
router.post('/signup', async (req, res) => {
  try {
    if (![req.body.agreeTerms, req.body.agreePrivacy, req.body.agreeAge].every(v => v === true)) return res.status(400).json({ code: 'CONSENT_REQUIRED', message: '필수 약관과 연령 확인에 동의해주세요.' });
    
    const { email, username, password } = req.body;

    // 입력값 검증
    if (!email || !username || !password) {
      console.log('필드 누락:', { email: !!email, username: !!username, password: !!password });
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: '올바른 이메일 형식이 아닙니다.' });
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: '비밀번호가 보안 요구사항을 충족하지 않습니다.',
        errors: passwordValidation.errors 
      });
    }

    // 사용자명 길이 검증
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ message: '사용자명은 2-20자 사이여야 합니다.' });
    }

    // 이메일 중복 확인
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUserByEmail) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 사용자명 중복 확인
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUserByUsername) {
      return res.status(409).json({ message: '이미 사용 중인 사용자명입니다.' });
    }

    // 비밀번호 해싱
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        provider: 'email'
      },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        role: true,
        adultVerified: true,
        provider: true,
        createdAt: true
      }
    });

    // JWT 토큰 생성 (로그인과 동일)
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: '회원가입이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        provider: user.provider || 'email',
        nickname: user.nickname,
        adultVerified: user.adultVerified || false
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('로그인 시도:', { email, hasPassword: !!password });

    // 입력값 검증
    if (!email || !password) {
      console.log('로그인 실패: 필수 필드 누락');
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('로그인 실패: 사용자를 찾을 수 없음 -', email);
      return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }
    
    if (!user.password) {
      console.log('로그인 실패: 소셜 로그인 계정 -', email);
      return res.status(401).json({ message: '소셜 로그인 계정입니다. 구글 또는 카카오로 로그인해주세요.' });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('로그인 실패: 비밀번호 불일치 -', email);
      return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    console.log('로그인 성공:', user.email);
    
    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        provider: user.provider || 'email',
        nickname: user.nickname,
        adultVerified: user.adultVerified || false
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// 성인인증 - 개선된 검증 시스템
router.post('/adult-verification', async (req, res) => {
  try {
    const { birthDate, name, method, agreedToAdultContent } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 입력값 검증
    if (!birthDate || !agreedToAdultContent) {
      return res.status(400).json({ message: '생년월일과 약관 동의는 필수입니다.' });
    }
    
    // 생년월일 형식 검증 (YYYY-MM-DD)
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthDateRegex.test(birthDate)) {
      return res.status(400).json({ message: '생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }
    
    // 만 19세 이상 확인 (정확한 계산)
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    
    // 생일이 지났는지 확인
    const hasPassedBirthday = monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
    const actualAge = hasPassedBirthday ? age : age - 1;
    
    if (actualAge < 19) {
      return res.status(400).json({ 
        message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${actualAge}세)` 
      });
    }
    
    // 이미 인증된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (existingUser?.adultVerified) {
      return res.json({
        message: '이미 성인인증이 완료된 사용자입니다.',
        adultVerified: true,
        verificationDate: existingUser.adultVerifiedAt
      });
    }
    
    console.log(`성인인증 시도: ${existingUser?.email}, 나이: 만 ${actualAge}세, 방법: ${method || 'simple'}`);
    
    // 사용자 정보 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        birthYear: birth.getFullYear(),
        birthDate: birthDate,
        adultVerified: true,
        adultVerifiedAt: new Date(),
        adultVerificationMethod: method || 'simple'
      }
    });
    
    console.log(`성인인증 완료: ${user.email}`);
    
    res.json({
      message: '성인인증이 완료되었습니다.',
      adultVerified: true,
      verificationDate: user.adultVerifiedAt,
      age: actualAge
    });
    
  } catch (error) {
    console.error('성인인증 오류:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 성인인증 - 이전 버전 호환용 (같은 로직 사용)
router.post('/adult-verify', async (req, res) => {
  try {
    const { birthDate, name, method, agreedToAdultContent } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 입력값 검증
    if (!birthDate || !agreedToAdultContent) {
      return res.status(400).json({ message: '생년월일과 약관 동의는 필수입니다.' });
    }
    
    // 생년월일 형식 검증 (YYYY-MM-DD)
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthDateRegex.test(birthDate)) {
      return res.status(400).json({ message: '생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)' });
    }
    
    // 만 19세 이상 확인 (정확한 계산)
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    
    // 생일이 지났는지 확인
    const hasPassedBirthday = monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
    const actualAge = hasPassedBirthday ? age : age - 1;
    
    if (actualAge < 19) {
      return res.status(400).json({ 
        message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${actualAge}세)` 
      });
    }
    
    // 이미 인증된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (existingUser?.adultVerified) {
      return res.json({
        message: '이미 성인인증이 완료된 사용자입니다.',
        adultVerified: true,
        verificationDate: existingUser.adultVerifiedAt
      });
    }
    
    console.log(`성인인증 시도: ${existingUser?.email}, 나이: 만 ${actualAge}세, 방법: ${method || 'simple'}`);
    
    // 사용자 정보 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        birthYear: birth.getFullYear(),
        birthDate: birthDate,
        adultVerified: true,
        adultVerifiedAt: new Date(),
        adultVerificationMethod: method || 'simple'
      }
    });
    
    console.log(`성인인증 완료: ${user.email}`);
    
    res.json({
      message: '성인인증이 완료되었습니다.',
      adultVerified: true,
      verificationDate: user.adultVerifiedAt,
      age: actualAge
    });
    
  } catch (error) {
    console.error('성인인증 오류:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 네이버 성인인증 시작 (바로써트 연동)
router.post('/naver-auth/start', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // 요청 body에서 사용자 정보 추출 (userData 객체 또는 직접 필드)
    const userData = req.body.userData || req.body;
    const { name, phoneNumber, birthday } = userData;
    
    console.log('🔍 네이버 인증 요청:', { token, userData });
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    let decoded, userId;
    try {
      if (token === 'test123') {
        // 데모 토큰 처리
        console.log('🔧 데모 토큰 사용 - 네이버 인증');
        userId = 'cmfgjczly0000xh2mqn62ewsb';
      } else {
        decoded = jwt.verify(token, getJwtSecret());
        userId = decoded.userId;
      }
    } catch (jwtError) {
      console.error('JWT 토큰 검증 실패:', jwtError);
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    
    // 이미 인증된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (existingUser?.adultVerified) {
      return res.json({
        message: '이미 성인인증이 완료된 사용자입니다.',
        adultVerified: true
      });
    }
    
    // 네이버 OAuth 인증 URL 생성
    const clientId = process.env.NAVER_CLIENT_ID.replace(/"/g, ''); // 따옴표 제거
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'https://arata.co.kr/auth/naver/callback'
      : 'http://localhost:4000/auth/naver/callback';
    
    // state 파라미터에 userId 포함
    const state = Buffer.from(JSON.stringify({ userId, type: 'adult_verify' })).toString('base64');
    
    // 네이버 OAuth URL (프로필 정보 요청)
    const authUrl = `https://nid.naver.com/oauth2.0/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;
    
    res.json({
      success: true,
      authUrl: authUrl,
      message: '네이버 로그인을 통해 연령을 확인합니다.'
    });
    
  } catch (error) {
    console.error('네이버 성인인증 시작 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 네이버 OAuth 콜백 (성인인증용) - GET 방식 (브라우저 리다이렉트)
router.get('/naver/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect('/?auth_error=네이버 인증이 취소되었습니다');
    }

    if (!code || !state) {
      return res.redirect('/?auth_error=인증 파라미터가 누락되었습니다');
    }

    // state 디코딩
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.redirect('/?auth_error=잘못된 인증 요청입니다');
    }

    const { userId, type } = stateData;

    if (type !== 'adult_verify') {
      return res.redirect('/?auth_error=잘못된 인증 타입입니다');
    }

    try {
      // 네이버 액세스 토큰 획득
      const axios = require('axios');
      const clientId = process.env.NAVER_CLIENT_ID.replace(/"/g, '');
      const clientSecret = process.env.NAVER_CLIENT_SECRET.replace(/"/g, '');
      const redirectUri = process.env.NODE_ENV === 'production'
        ? 'https://arata.co.kr/auth/naver/callback'
        : 'http://localhost:4000/auth/naver/callback';

      const tokenResponse = await axios.post('https://nid.naver.com/oauth2.0/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code
        }
      });

      const accessToken = tokenResponse.data.access_token;

      // 네이버 사용자 정보 조회
      const userResponse = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const naverUser = userResponse.data.response;

      // 생년월일로 나이 계산 (네이버는 출생연도만 제공할 수 있음)
      const birthYear = naverUser.birthyear ? parseInt(naverUser.birthyear) : null;
      const currentYear = new Date().getFullYear();
      const age = birthYear ? currentYear - birthYear + 1 : null; // 한국 나이

      // 성인 여부 확인
      if (!age || age < 19) {
        return res.redirect('/?auth_error=성인인증은 만 19세 이상만 가능합니다');
      }

      // 사용자 성인인증 상태 업데이트
      await prisma.user.update({
        where: { id: userId },
        data: {
          adultVerified: true,
          adultVerifiedAt: new Date(),
          adultVerificationMethod: 'naver_oauth',
          birthYear: birthYear
        }
      });

      // 성공 페이지로 리다이렉트
      res.redirect('/?auth_success=성인인증이 완료되었습니다');

    } catch (tokenError) {
      console.error('네이버 토큰 획득 오류:', tokenError);
      res.redirect('/?auth_error=네이버 인증 처리 중 오류가 발생했습니다');
    }

  } catch (error) {
    console.error('네이버 성인인증 콜백 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 네이버 인증 콜백 (POST) - 프론트엔드 API 호출용
router.post('/naver-auth/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    console.log('🔍 네이버 인증 콜백 받음:', { code: !!code, state: !!state });

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: '인증 파라미터가 누락되었습니다.'
      });
    }

    // state 디코딩
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return res.status(400).json({
        success: false,
        message: '잘못된 인증 요청입니다.'
      });
    }

    const { userId, type } = stateData;

    if (type !== 'adult_verify') {
      return res.status(400).json({
        success: false,
        message: '잘못된 인증 타입입니다.'
      });
    }

    // 네이버 액세스 토큰 획득
    const axios = require('axios');
    const clientId = process.env.NAVER_CLIENT_ID.replace(/"/g, '');
    const clientSecret = process.env.NAVER_CLIENT_SECRET.replace(/"/g, '');
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://arata.co.kr/auth/naver/callback'
      : 'http://localhost:4000/auth/naver/callback';

    const tokenResponse = await axios.post('https://nid.naver.com/oauth2.0/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      }
    });

    if (!tokenResponse.data.access_token) {
      throw new Error('네이버 토큰 획득 실패');
    }

    const accessToken = tokenResponse.data.access_token;

    // 네이버 사용자 정보 조회 (nid/me API)
    const userResponse = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    console.log('📝 네이버 사용자 정보:', userResponse.data);

    if (userResponse.data.resultcode !== '00') {
      throw new Error('네이버 사용자 정보 조회 실패');
    }

    const naverUser = userResponse.data.response;

    // 생년월일로 나이 계산
    const birthYear = naverUser.birthyear ? parseInt(naverUser.birthyear) : null;
    const currentYear = new Date().getFullYear();
    const age = birthYear ? currentYear - birthYear + 1 : null;

    console.log('📅 나이 계산:', { birthYear, age });

    // 성인 여부 확인
    if (!age || age < 19) {
      return res.status(400).json({
        success: false,
        message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${age ? age - 1 : '알 수 없음'}세)`
      });
    }

    // 사용자 성인인증 상태 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: {
        adultVerified: true,
        adultVerifiedAt: new Date(),
        adultVerificationMethod: 'naver_oauth',
        birthYear: birthYear
      }
    });

    console.log('✅ 네이버 성인인증 완료:', userId);

    res.json({
      success: true,
      message: '성인인증이 완료되었습니다.',
      adultVerified: true
    });

  } catch (error) {
    console.error('❌ 네이버 인증 콜백 오류:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: '네이버 인증 처리 중 오류가 발생했습니다.'
    });
  }
});

// 네이버 휴대폰 인증 요청
router.post('/naver-auth/mobile', async (req, res) => {
  try {
    const { name, birthday, gender, mobile, carrier } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    
    // 휴대폰 인증 요청
    const result = await naverAuth.requestMobileAuth({
      name,
      birthday, // YYYYMMDD
      gender, // 1: 남자, 2: 여자
      mobile,
      carrier // SKT, KT, LGU+
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('네이버 휴대폰 인증 요청 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 네이버 인증번호 확인
router.post('/naver-auth/verify', async (req, res) => {
  try {
    const { requestId, verifyCode } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 인증번호 확인
    const result = await naverAuth.verifyMobileCode(requestId, verifyCode);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.message || '인증에 실패했습니다.' 
      });
    }
    
    // 나이 계산
    const birthYear = parseInt(result.data.birthYear);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear + 1; // 한국 나이
    
    if (age < 19) {
      return res.status(400).json({ 
        message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${age - 1}세)` 
      });
    }
    
    // 사용자 정보 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        birthYear: birthYear,
        adultVerified: true,
        adultVerifiedAt: new Date(),
        adultVerificationMethod: 'naver_mobile'
      }
    });
    
    console.log(`네이버 휴대폰 성인인증 완료: ${user.email}`);
    
    res.json({
      success: true,
      message: '성인인증이 완료되었습니다.',
      adultVerified: true,
      verificationDate: user.adultVerifiedAt
    });
    
  } catch (error) {
    console.error('네이버 인증번호 확인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 카카오 성인인증 시작 (카카오 인증서)
router.post('/kakao-auth/start', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 이미 인증된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (existingUser?.adultVerified) {
      return res.json({
        message: '이미 성인인증이 완료된 사용자입니다.',
        adultVerified: true
      });
    }
    
    // 카카오 인증서 URL 생성
    const redirectUri = `${process.env.NODE_ENV === 'production' 
      ? 'https://arata.co.kr' 
      : 'http://localhost:3000'}/auth/kakao-cert/callback`;
    
    const authUrl = kakaoAuth.getCertAuthUrl(redirectUri);
    
    res.json({
      success: true,
      authUrl: authUrl
    });
    
  } catch (error) {
    console.error('카카오 성인인증 시작 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 카카오 인증서 콜백
router.post('/kakao-auth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    const redirectUri = `${process.env.NODE_ENV === 'production' 
      ? 'https://arata.co.kr' 
      : 'http://localhost:3000'}/auth/kakao-cert/callback`;
    
    // 카카오 인증서 검증
    const result = await kakaoAuth.verifyCertAuth(code, redirectUri);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.message || '인증에 실패했습니다.' 
      });
    }
    
    // 성인 여부 확인
    if (!result.isAdult) {
      return res.status(400).json({ 
        message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${result.age}세)` 
      });
    }
    
    // 사용자 정보 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        birthYear: parseInt(result.birthday.substring(0, 4)),
        adultVerified: true,
        adultVerifiedAt: new Date(),
        adultVerificationMethod: 'kakao_cert'
      }
    });
    
    console.log(`카카오 인증서 성인인증 완료: ${user.email}`);
    
    res.json({
      success: true,
      message: '성인인증이 완료되었습니다.',
      adultVerified: true,
      verificationDate: user.adultVerifiedAt
    });
    
  } catch (error) {
    console.error('카카오 인증서 콜백 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 카카오 간편 성인인증 (OAuth 연령대 정보 활용)
router.post('/kakao-auth/simple', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 카카오 OAuth URL 생성 (연령대 정보 요청)
    const redirectUri = `${process.env.NODE_ENV === 'production' 
      ? 'https://arata.co.kr' 
      : 'http://localhost:3000'}/auth/kakao-age/callback`;
    
    const state = Buffer.from(JSON.stringify({ userId, type: 'age_verification' })).toString('base64');
    const authUrl = kakaoAuth.getAuthUrl(redirectUri, state);
    
    res.json({
      success: true,
      authUrl: authUrl
    });
    
  } catch (error) {
    console.error('카카오 간편 성인인증 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 닉네임 변경
router.post('/update-nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 닉네임 유효성 검증
    if (!nickname || nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ message: '닉네임은 2-20자 사이여야 합니다.' });
    }
    
    // 욕설 필터링 (기본적인)
    const forbiddenWords = ['바보', '멍청이', '관리자', 'admin'];
    if (forbiddenWords.some(word => nickname.includes(word))) {
      return res.status(400).json({ message: '사용할 수 없는 닉네임입니다.' });
    }
    
    // 중복 검사
    const existingUser = await prisma.user.findUnique({
      where: { nickname }
    });
    
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
    }
    
    // 닉네임 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        nickname: nickname,
        needsProfileSetup: false
      },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        adultVerified: true,
        needsProfileSetup: true
      }
    });
    
    res.json({
      message: '닉네임이 변경되었습니다.',
      user
    });
    
  } catch (error) {
    console.error('닉네임 변경 오류:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/auth/update-password - 비밀번호 변경
router.post('/update-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '새 비밀번호는 6자 이상이어야 합니다.' });
    }
    
    // JWT 토큰에서 사용자 ID 추출
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // Google OAuth 사용자인 경우 비밀번호 변경 불가
    if (!user.password) {
      return res.status(400).json({ message: 'Google 로그인 계정은 비밀번호를 변경할 수 없습니다.' });
    }
    
    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
    }
    
    // 새 비밀번호 암호화
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword
      }
    });
    
    res.json({
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
    
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});


// DELETE /api/auth/delete-account - 계정 탈퇴
router.delete('/delete-account', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;
    
    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    console.log(`계정 탈퇴 요청: ${user.email} (${userId})`);
    
    // 트랜잭션으로 관련 데이터 모두 삭제
    await prisma.$transaction(async (prisma) => {
      // 사용자와 관련된 모든 데이터 삭제
      // 1. 댓글 좋아요 삭제
      await prisma.commentLike.deleteMany({
        where: { userId: userId }
      });
      
      // 2. 댓글 삭제
      await prisma.comment.deleteMany({
        where: { userId: userId }
      });
      
      // 3. 좋아요 삭제
      await prisma.like.deleteMany({
        where: { userId: userId }
      });
      
      // 4. 조회 기록 삭제
      await prisma.view.deleteMany({
        where: { userId: userId }
      });
      
      // 5. 신고 기록 삭제
      await prisma.report.deleteMany({
        where: { reporterId: userId }
      });
      
      // 6. 사용자가 작성한 웹툰 삭제 (작가인 경우)
      const userComics = await prisma.comic.findMany({
        where: { authorId: userId }
      });
      
      for (const comic of userComics) {
        // 웹툰의 에피소드들도 삭제
        await prisma.episode.deleteMany({
          where: { comicId: comic.id }
        });
      }
      
      await prisma.comic.deleteMany({
        where: { authorId: userId }
      });
      
      // 7. 최종적으로 사용자 계정 삭제
      await prisma.user.delete({
        where: { id: userId }
      });
    });
    
    console.log(`계정 탈퇴 완료: ${user.email}`);
    
    res.json({
      message: '계정이 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('계정 탈퇴 오류:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// 현재 로그인한 사용자 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        provider: true,
        adultVerified: true,
        needsProfileSetup: true,
        coinBalance: true,
        createdAt: true,
        birthYear: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      user: {
        ...user,
        coinBalance: user.coinBalance || 0
      }
    });

  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 바로써트 네이버 인증 시작
router.post('/barocert/naver/start', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;

    // 이미 인증된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingUser?.adultVerified) {
      return res.json({
        success: false,
        message: '이미 성인인증이 완료된 사용자입니다.',
        adultVerified: true
      });
    }

    // 요청 본문에서 사용자 정보 추출
    const { name, phoneNumber, birthday } = req.body;

    if (!name || !phoneNumber || !birthday) {
      return res.status(400).json({
        success: false,
        message: '이름, 휴대폰번호, 생년월일이 필요합니다.'
      });
    }

    console.log('📱 바로써트 네이버 인증 시작:', { name, phoneNumber, birthday, userId });

    // 바로써트 네이버 인증 요청
    const result = await barocertAuth.requestNaverAuth({
      name,
      phoneNumber: phoneNumber.replace(/-/g, ''), // 하이픈 제거
      birthday: birthday.replace(/-/g, '') // YYYYMMDD 형식
    });

    // 세션에 userId 저장 (나중에 콜백에서 사용)
    if (!req.session) req.session = {};
    req.session.userId = userId;
    req.session.receiptID = result.receiptID;

    res.json({
      success: true,
      receiptID: result.receiptID,
      scheme: result.scheme, // 네이버 앱 실행 URL
      message: '네이버 인증서로 본인인증을 진행해주세요.'
    });

  } catch (error) {
    console.error('바로써트 네이버 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      message: '인증 요청 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 바로써트 네이버 인증 결과 조회
router.post('/barocert/naver/result', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { receiptID } = req.body;

    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    if (!receiptID) {
      console.error('❌ [400 ERROR] receiptID 누락 - req.body:', req.body);
      return res.status(400).json({ message: '인증 ID가 필요합니다.' });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;

    console.log('🔍 바로써트 네이버 인증 결과 조회:', { receiptID, userId });

    // 사용자가 입력한 생년월일 가져오기
    const { birthday } = req.body;

    if (!birthday) {
      return res.status(400).json({
        success: false,
        message: '생년월일 정보가 필요합니다.'
      });
    }

    // 바로써트에서 인증 결과 조회
    const result = await barocertAuth.getAuthResult(receiptID);

    console.log('📋 인증 결과 (전체):', JSON.stringify(result, null, 2));

    // 먼저 API 에러 체크
    if (!result.success) {
      console.error('❌ [NAVER 400 ERROR] API 에러 - result:', result);
      res.status(400).json({
        success: false,
        message: result.message || '인증 요청 처리 중 오류가 발생했습니다.'
      });
      return;
    }

    // 인증 완료 확인 (state: 1=완료, 0=대기, 2=만료)
    if (result.status === 1) {
      // 바로써트 인증이 성공했다면, 입력한 생년월일이 실제 본인의 생년월일과 일치한다는 것이 검증된 것
      // 입력한 생년월일로 성인 여부 판단
      const birthdayStr = birthday.replace(/-/g, ''); // YYYYMMDD
      const birthYear = parseInt(birthdayStr.substring(0, 4));
      const birthMonth = parseInt(birthdayStr.substring(4, 6));
      const birthDay = parseInt(birthdayStr.substring(6, 8));

      const today = new Date();
      const birth = new Date(birthYear, birthMonth - 1, birthDay);

      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      const isAdult = age >= 19;

      console.log('📅 성인 여부 판단:', { birthday: birthdayStr, age, isAdult });

      if (!isAdult) {
        console.error('❌ [NAVER 400 ERROR] 미성년자 - age:', age);
        res.status(400).json({
          success: false,
          message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${age}세)`,
          isAdult: false
        });
        return;
      }

      // 사용자 성인인증 상태 업데이트
      await prisma.user.update({
        where: { id: userId },
        data: {
          adultVerified: true,
          adultVerifiedAt: new Date(),
          adultVerificationMethod: 'barocert_naver',
          birthDate: `${birthdayStr.substring(0, 4)}-${birthdayStr.substring(4, 6)}-${birthdayStr.substring(6, 8)}`,
          birthYear: birthYear
        }
      });

      console.log('✅ 바로써트 네이버 성인인증 완료:', userId);

      res.json({
        success: true,
        completed: true,
        message: '성인인증이 완료되었습니다.',
        adultVerified: true
      });
    } else if (result.status === 0) {
      // 대기 중
      res.json({
        success: true,
        completed: false,
        message: '인증 대기 중입니다.',
        status: 'pending'
      });
    } else if (result.status === 2) {
      // 만료됨
      res.json({
        success: false,
        completed: false,
        message: '인증 시간이 만료되었습니다.',
        status: 'expired'
      });
    } else {
      console.error('❌ [NAVER 400 ERROR] 인증 실패 - result:', { success: result.success, status: result.status });
      res.status(400).json({
        success: false,
        message: '인증에 실패했습니다.',
        status: result.status
      });
    }

  } catch (error) {
    console.error('❌ 바로써트 네이버 결과 조회 오류 (catch):', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: '인증 결과 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 바로써트 카카오 인증 시작
router.post('/barocert/kakao/start', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;

    // 이미 인증된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingUser?.adultVerified) {
      return res.json({
        success: false,
        message: '이미 성인인증이 완료된 사용자입니다.',
        adultVerified: true
      });
    }

    // 요청 본문에서 사용자 정보 추출
    const { name, phoneNumber, birthday } = req.body;

    if (!name || !phoneNumber || !birthday) {
      return res.status(400).json({
        success: false,
        message: '이름, 휴대폰번호, 생년월일이 필요합니다.'
      });
    }

    console.log('📱 바로써트 카카오 인증 시작:', { name, phoneNumber, birthday, userId });

    // 바로써트 카카오 인증 요청
    const result = await barocertAuth.requestKakaoAuth({
      name,
      phoneNumber: phoneNumber.replace(/-/g, ''), // 하이픈 제거
      birthday: birthday.replace(/-/g, '') // YYYYMMDD 형식
    });

    // 세션에 userId 저장 (나중에 콜백에서 사용)
    if (!req.session) req.session = {};
    req.session.userId = userId;
    req.session.receiptID = result.receiptID;

    res.json({
      success: true,
      receiptID: result.receiptID,
      scheme: result.scheme, // 카카오톡 앱 실행 URL
      message: '카카오 인증서로 본인인증을 진행해주세요.'
    });

  } catch (error) {
    console.error('바로써트 카카오 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      message: '인증 요청 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 바로써트 카카오 인증 결과 조회
router.post('/barocert/kakao/result', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { receiptID } = req.body;

    if (!token) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    if (!receiptID) {
      console.error('❌ [400 ERROR] receiptID 누락 (Kakao) - req.body:', req.body);
      return res.status(400).json({ message: '인증 ID가 필요합니다.' });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.userId;

    console.log('🔍 바로써트 카카오 인증 결과 조회:', { receiptID, userId });

    // 세션에서 사용자가 입력한 생년월일 가져오기
    const { birthday } = req.body;

    if (!birthday) {
      return res.status(400).json({
        success: false,
        message: '생년월일 정보가 필요합니다.'
      });
    }

    // 바로써트에서 카카오 인증 결과 조회
    const result = await barocertAuth.getKakaoAuthResult(receiptID);

    console.log('📋 카카오 인증 결과 (전체):', JSON.stringify(result, null, 2));

    // 먼저 API 에러 체크
    if (!result.success) {
      console.error('❌ [KAKAO 400 ERROR] API 에러 - result:', result);
      res.status(400).json({
        success: false,
        message: result.message || '인증 요청 처리 중 오류가 발생했습니다.'
      });
      return;
    }

    // 인증 완료 확인 (state: 1=완료, 0=대기, 2=만료)
    if (result.status === 1) {
      // 바로써트 인증이 성공했다면, 입력한 생년월일이 실제 본인의 생년월일과 일치한다는 것이 검증된 것
      // 입력한 생년월일로 성인 여부 판단
      const birthdayStr = birthday.replace(/-/g, ''); // YYYYMMDD
      const birthYear = parseInt(birthdayStr.substring(0, 4));
      const birthMonth = parseInt(birthdayStr.substring(4, 6));
      const birthDay = parseInt(birthdayStr.substring(6, 8));

      const today = new Date();
      const birth = new Date(birthYear, birthMonth - 1, birthDay);

      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      const isAdult = age >= 19;

      console.log('📅 성인 여부 판단:', { birthday: birthdayStr, age, isAdult });

      if (!isAdult) {
        console.error('❌ [KAKAO 400 ERROR] 미성년자 - age:', age);
        res.status(400).json({
          success: false,
          message: `성인인증은 만 19세 이상만 가능합니다. (현재 만 ${age}세)`,
          isAdult: false
        });
        return;
      }

      // 사용자 성인인증 상태 업데이트
      await prisma.user.update({
        where: { id: userId },
        data: {
          adultVerified: true,
          adultVerifiedAt: new Date(),
          adultVerificationMethod: 'barocert_kakao',
          birthDate: `${birthdayStr.substring(0, 4)}-${birthdayStr.substring(4, 6)}-${birthdayStr.substring(6, 8)}`,
          birthYear: birthYear
        }
      });

      console.log('✅ 바로써트 카카오 성인인증 완료:', userId);

      res.json({
        success: true,
        completed: true,
        message: '성인인증이 완료되었습니다.',
        adultVerified: true
      });
    } else if (result.status === 0) {
      // 대기 중
      res.json({
        success: true,
        completed: false,
        message: '인증 대기 중입니다.',
        status: 'pending'
      });
    } else if (result.status === 2) {
      // 만료됨
      res.json({
        success: false,
        completed: false,
        message: '인증 시간이 만료되었습니다.',
        status: 'expired'
      });
    } else {
      console.error('❌ [KAKAO 400 ERROR] 인증 실패 - result:', { success: result.success, status: result.status });
      res.status(400).json({
        success: false,
        message: '인증에 실패했습니다.',
        status: result.status
      });
    }

  } catch (error) {
    console.error('❌ 바로써트 카카오 결과 조회 오류 (catch):', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: '인증 결과 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 바로써트 콜백 처리 (레거시 - 하위 호환성)
router.post('/barocert/callback', async (req, res) => {
  try {
    const { receiptID, status } = req.body;

    if (!receiptID) {
      return res.status(400).json({ message: '인증 ID가 필요합니다.' });
    }

    // 바로써트에서 인증 결과 조회
    const result = await barocertAuth.getAuthResult(receiptID);

    if (result.success && result.status === 1 && result.isAdult) {
      // 세션에서 사용자 ID 가져오기
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(400).json({ message: '세션이 만료되었습니다.' });
      }

      // 사용자 성인인증 상태 업데이트
      await prisma.user.update({
        where: { id: userId },
        data: {
          adultVerified: true,
          adultVerifiedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: '성인인증이 완료되었습니다.',
        adultVerified: true
      });
    } else {
      res.status(400).json({
        message: '성인인증에 실패했습니다. 19세 이상만 이용 가능합니다.',
        success: false
      });
    }

  } catch (error) {
    console.error('바로써트 콜백 처리 오류:', error);
    res.status(500).json({ message: '인증 처리 중 오류가 발생했습니다.' });
  }
});

// 바로써트 인증 상태 확인
router.get('/barocert/status/:receiptID', async (req, res) => {
  try {
    const { receiptID } = req.params;

    const result = await barocertAuth.getAuthResult(receiptID);

    res.json({
      status: result.status,
      completed: result.status === 1,
      isAdult: result.isAdult || false
    });

  } catch (error) {
    console.error('바로써트 상태 확인 오류:', error);
    res.status(500).json({ message: '상태 확인 중 오류가 발생했습니다.' });
  }
});

module.exports = router;