const { guardEpisode } = require('../services/legacy-episode-access');
const { isActivePurchase, episodePrices } = require('../services/purchase-access');
const { isPromoFreeEpisode } = require('../services/promotions');
const { expireEventCoins, consumeEventCoins } = require('../services/coin-wallet');
const { resolveCouponForPurchase, applyCoupon, useCoupon } = require('../services/coupons');
const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate: auth, optionalAuth, authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// 에피소드 조회수 증가 및 정보 조회 (구매 여부 확인 포함)
router.get('/:episodeId', ...guardEpisode(), async (req, res) => {
  try {
    const { episodeId } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // 인증된 사용자는 캐시하지 않음 (구매 상태 실시간 반영)
    if (authHeader) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      // 비로그인 사용자만 캐시 (30분)
      res.set('Cache-Control', 'private, no-store');
    }
    
    console.log('Episode ID received:', episodeId, 'Type:', typeof episodeId);
    
    if (!episodeId) {
      return res.status(400).json({ 
        success: false, 
        message: '에피소드 ID가 필요합니다.' 
      });
    }
    
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        userId = decoded.userId;
      } catch (error) {
        // 토큰이 유효하지 않아도 공개 정보는 반환
        console.log('토큰 검증 실패, 비로그인 사용자로 처리');
      }
    }
    
    // 에피소드 조회 (최소 필드만 가져오기)
    const episode = await prisma.episode.findUnique({
      where: { 
        id: episodeId 
      },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        images: true,
        textContent: true,
        authorNote: true,
        viewCount: true,
        createdAt: true,
        comicId: true,
        comic: {
          select: {
            title: true,
            authorName: true,
            rating: true,
            status: true,
            contentType: true,
            paidStartEpisode: true,
            episodeCoinPrice: true,
            rentalCoinPrice: true,
            rentalDays: true,
            author: {
              select: {
                nickname: true
              }
            }
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ 
        success: false, 
        message: '에피소드를 찾을 수 없습니다.' 
      });
    }

    // 조회수 증가를 비동기로 처리 (응답 속도 개선)
    setImmediate(async () => {
      try {
        // Raw SQL로 더 빠르게 처리 (SQLite는 소문자 테이블명 사용)
        await prisma.$executeRaw`
          UPDATE episodes SET viewCount = viewCount + 1 WHERE id = ${episodeId}
        `;
        await prisma.$executeRaw`
          UPDATE comics SET viewCount = viewCount + 1 WHERE id = ${episode.comicId}
        `;
      } catch (error) {
        console.error('조회수 업데이트 실패:', error);
      }
    });

    // 웹툰의 결제 설정을 기반으로 무료/유료 결정
    // fallback: paidStartEpisode나 episodeCoinPrice 필드가 없는 경우 기본값 사용
    const paidStartEpisode = episode.comic.paidStartEpisode !== undefined ? episode.comic.paidStartEpisode : 0;
    const episodeCoinPrice = episode.comic.episodeCoinPrice !== undefined ? episode.comic.episodeCoinPrice : 3;
    
    // 에피소드가 무료인지 확인 (paidStartEpisode가 0이면 모든 에피소드 무료)
    const isEpisodeFree = paidStartEpisode === 0 || episode.episodeNumber < paidStartEpisode || isPromoFreeEpisode(episode.comicId, episode.episodeNumber);
    const actualCoinPrice = isEpisodeFree ? 0 : episodeCoinPrice;
    
    // 기본 에피소드 정보
    const episodeInfo = {
      ...episode,
      images: [],
      viewCount: episode.viewCount,
      isFree: isEpisodeFree,
      coinPrice: actualCoinPrice,
      // 대여/소장 가격 (유료 회차에서만 의미 있음)
      ...(isEpisodeFree ? {} : episodePrices(episode.comic, episode.comicId)),
      purchaseType: null,
      expiresAt: null,
      // 판매중지 작품: 구매 버튼 대신 안내
      saleSuspended: episode.comic.status === 'SUSPENDED',
      canView: false,
      needsPurchase: false,
      needsLogin: false,
      requiresAdultVerification: false
    };

    // 무료 에피소드는 바로 볼 수 있음
    if (isEpisodeFree) {
      episodeInfo.canView = true;
      episodeInfo.needsPurchase = false;
    }

    // 이미지 파싱 헬퍼 함수 - WebP 변환 포함
    const parseImages = (images) => {
      if (!images) return [];
      let imageArray = [];
      
      if (Array.isArray(images)) {
        imageArray = images;
      } else if (typeof images === 'string') {
        try {
          imageArray = JSON.parse(images);
        } catch (e) {
          // JSON 파싱 실패 시 콤마로 구분된 문자열로 처리
          imageArray = images.split(',').map(img => img.trim()).filter(img => img);
        }
      }
      
      // 이미지 경로 그대로 반환 (DB에 저장된 대로)
      return imageArray;
    };

    // 무료 에피소드인 경우
    if (isEpisodeFree) {
      episodeInfo.canView = true;
      episodeInfo.images = parseImages(episode.images);
    } else {
      // 유료 에피소드인 경우
      if (userId) {
        // 로그인한 사용자 - 구매 여부 확인
        const purchase = await prisma.purchase.findUnique({
          where: {
            userId_episodeId: {
              userId: userId,
              episodeId: episodeId
            }
          }
        });
        
        if (isActivePurchase(purchase)) {
          // 구매한 에피소드 (소장, 또는 기간이 남은 대여)
          episodeInfo.canView = true;
          episodeInfo.images = parseImages(episode.images);
          episodeInfo.purchaseDate = purchase.createdAt;
          episodeInfo.purchaseType = purchase.type || 'OWN';
          episodeInfo.expiresAt = purchase.expiresAt;
        } else {
          if (purchase) episodeInfo.rentalExpired = true;
          // 아직 구매하지 않은 에피소드
          episodeInfo.canView = false;
          episodeInfo.needsPurchase = true;
          
          // 성인 콘텐츠 확인
          if (episode.comic.rating === '19') {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { adultVerified: true }
            });
            
            if (!user?.adultVerified) {
              episodeInfo.requiresAdultVerification = true;
            }
          }
        }
      } else {
        // 비로그인 사용자
        episodeInfo.canView = false;
        episodeInfo.needsLogin = true;
      }
    }

    // 조회수 증가와 읽음 처리 (canView인 경우에만)
    if (episodeInfo.canView) {
      // 무료 에피소드인 경우 자동으로 읽음 처리
      if (isEpisodeFree && userId) {
        setImmediate(async () => {
          try {
            const existingPurchase = await prisma.purchase.findUnique({
              where: {
                userId_episodeId: {
                  userId: userId,
                  episodeId: episodeId
                }
              }
            });
            
            if (!existingPurchase) {
              // 무료 에피소드는 코인 0으로 구매 기록 생성 (읽음 표시용)
              await prisma.purchase.create({
                data: {
                  userId: userId,
                  episodeId: episodeId,
                  coinPrice: 0
                }
              });
              console.log(`에피소드 ${episodeId} 읽음 처리 완료 (userId: ${userId})`);
            }
          } catch (err) {
            console.error('읽음 처리 오류:', err);
          }
        });
      }

      // 조회 기록 저장 (비동기)
      // 비로그인 조회도 시각을 남긴다 (실시간 랭킹 = 최근 24시간 조회 수)
      {
        setImmediate(async () => {
          try {
            await prisma.view.create({
              data: {
                episodeId: episodeId,
                userId: userId || null,
                comicId: episode.comicId
              }
            });
          } catch (err) {
            // 중복 조회는 무시
            if (!err.message?.includes('Unique constraint')) {
              console.error('조회 기록 저장 오류:', err);
            }
          }
        });
      }
    }

    // 웹소설: 본문은 볼 수 있을 때만 내려준다 (이미지 대신 text)
    episodeInfo.contentType = episode.comic.contentType || 'WEBTOON';
    const { textContent, authorNote, ...rest } = episodeInfo;
    // 작가의 말은 회차를 볼 수 있을 때만 (본문과 같이)
    const payload = { ...rest, text: episodeInfo.canView && episode.comic.contentType === 'NOVEL' ? (textContent || '') : null, authorNote: episodeInfo.canView ? (authorNote || null) : null };
    res.json({
      success: true,
      episode: payload
    });
  } catch (error) {
    console.error('Episode view count error:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// Comment routes removed - using comments.js routes instead
// The comment endpoints are now handled by /api/episodes/:episodeId/comments in comments.js

// Rating routes still handled here (could be moved to ratings.js later)

// 에피소드 좋아요/싫어요 상태 조회
router.get('/:episodeId/reaction', authenticate, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.id || req.user.userId;

    // 좋아요 확인
    const like = await prisma.episodeLike.findUnique({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      }
    });

    // 싫어요 확인
    const dislike = await prisma.episodeDislike.findUnique({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      }
    });

    // 좋아요/싫어요 개수 조회
    const likeCount = await prisma.episodeLike.count({
      where: { episodeId }
    });

    const dislikeCount = await prisma.episodeDislike.count({
      where: { episodeId }
    });

    res.json({
      isLiked: !!like,
      isDisliked: !!dislike,
      likeCount,
      dislikeCount
    });
  } catch (error) {
    console.error('반응 상태 조회 오류:', error);
    res.status(500).json({ error: '반응 상태를 조회할 수 없습니다' });
  }
});

// 에피소드 좋아요
router.post('/:episodeId/like', authenticate, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.id || req.user.userId;

    // 기존 좋아요 확인
    const existingLike = await prisma.episodeLike.findUnique({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      }
    });

    if (existingLike) {
      // 좋아요 취소
      await prisma.episodeLike.delete({
        where: { id: existingLike.id }
      });

      const likeCount = await prisma.episodeLike.count({
        where: { episodeId }
      });

      res.json({ 
        isLiked: false, 
        likeCount,
        message: '좋아요가 취소되었습니다'
      });
    } else {
      // 싫어요가 있는지 확인하고 제거
      const existingDislike = await prisma.episodeDislike.findUnique({
        where: {
          userId_episodeId: {
            userId,
            episodeId
          }
        }
      });

      if (existingDislike) {
        await prisma.episodeDislike.delete({
          where: { id: existingDislike.id }
        });
      }

      // 좋아요 추가
      await prisma.episodeLike.create({
        data: {
          userId,
          episodeId
        }
      });

      const likeCount = await prisma.episodeLike.count({
        where: { episodeId }
      });

      const dislikeCount = await prisma.episodeDislike.count({
        where: { episodeId }
      });

      res.json({ 
        isLiked: true, 
        isDisliked: false,
        likeCount,
        dislikeCount,
        message: '좋아요를 눌렀습니다'
      });
    }
  } catch (error) {
    console.error('좋아요 처리 오류:', error);
    res.status(500).json({ error: '좋아요 처리 중 오류가 발생했습니다' });
  }
});

// 에피소드 싫어요
router.post('/:episodeId/dislike', authenticate, async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.id || req.user.userId;

    // 기존 싫어요 확인
    const existingDislike = await prisma.episodeDislike.findUnique({
      where: {
        userId_episodeId: {
          userId,
          episodeId
        }
      }
    });

    if (existingDislike) {
      // 싫어요 취소
      await prisma.episodeDislike.delete({
        where: { id: existingDislike.id }
      });

      const dislikeCount = await prisma.episodeDislike.count({
        where: { episodeId }
      });

      res.json({ 
        isDisliked: false, 
        dislikeCount,
        message: '싫어요가 취소되었습니다'
      });
    } else {
      // 좋아요가 있는지 확인하고 제거
      const existingLike = await prisma.episodeLike.findUnique({
        where: {
          userId_episodeId: {
            userId,
            episodeId
          }
        }
      });

      if (existingLike) {
        await prisma.episodeLike.delete({
          where: { id: existingLike.id }
        });
      }

      // 싫어요 추가
      await prisma.episodeDislike.create({
        data: {
          userId,
          episodeId
        }
      });

      const likeCount = await prisma.episodeLike.count({
        where: { episodeId }
      });

      const dislikeCount = await prisma.episodeDislike.count({
        where: { episodeId }
      });

      res.json({ 
        isLiked: false,
        isDisliked: true, 
        likeCount,
        dislikeCount,
        message: '싫어요를 눌렀습니다'
      });
    }
  } catch (error) {
    console.error('싫어요 처리 오류:', error);
    res.status(500).json({ error: '싫어요 처리 중 오류가 발생했습니다' });
  }
});

// 에피소드 구매
router.post('/:episodeId/purchase', auth, ...guardEpisode({ purchasing: true }), async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.userId || req.user.id;  // auth 미들웨어가 userId로 설정함

    console.log('에피소드 구매 시도:', { episodeId, userId, user: req.user });

    // 에피소드 정보 조회
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        comic: {
          select: {
            title: true,
            rating: true,
            status: true,
            contentType: true,
            paidStartEpisode: true,
            episodeCoinPrice: true,
            rentalCoinPrice: true,
            rentalDays: true
          }
        }
      }
    });

    if (!episode) {
      return res.status(404).json({ 
        success: false,
        message: '에피소드를 찾을 수 없습니다.' 
      });
    }

    // 웹툰의 결제 설정을 기반으로 무료/유료 판단
    // fallback: 필드가 없는 경우 기본값 사용 (프로덕션 호환성)
    const paidStartEpisode = episode.comic.paidStartEpisode !== undefined ? episode.comic.paidStartEpisode : 0;
    const episodeCoinPrice = episode.comic.episodeCoinPrice !== undefined ? episode.comic.episodeCoinPrice : 3;
    const isFree = paidStartEpisode === 0 || episode.episodeNumber < paidStartEpisode || isPromoFreeEpisode(episode.comicId, episode.episodeNumber);
    const coinPrice = isFree ? 0 : episodeCoinPrice;
    
    // 무료 에피소드인 경우
    if (isFree) {
      // 이미지 파싱 처리
      let parsedImages = [];
      try {
        if (typeof episode.images === 'string') {
          parsedImages = JSON.parse(episode.images);
        } else if (Array.isArray(episode.images)) {
          parsedImages = episode.images;
        }
      } catch (e) {
        // JSON 파싱 실패 시 콤마로 구분된 문자열로 처리
        if (typeof episode.images === 'string') {
          parsedImages = episode.images.split(',').map(img => img.trim());
        }
      }
      
      return res.json({
        success: true,
        message: '무료 에피소드입니다.',
        episode: {
          id: episode.id,
          title: episode.title,
          images: parsedImages,
          isFree: true
        }
      });
    }

    // 판매중지 작품: 새 구매 불가 (이미 소장·대여 중인 회차는 계속 열람)
    if (episode.comic.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, code: 'SALE_SUSPENDED', message: '판매가 중지된 작품이라 새로 구매할 수 없어요. 이미 소장·대여한 회차는 계속 볼 수 있어요.' });
    }

    // 유료 회차: 소장(OWN) 또는 대여(RENT)
    const prices = episodePrices(episode.comic, episode.comicId);
    let mode = String(req.body?.mode || 'OWN').toUpperCase() === 'RENT' && prices.rentalEnabled ? 'RENT' : 'OWN';
    let price = mode === 'RENT' ? prices.rentPrice : prices.ownPrice;
    // 쿠폰·이용권: 할인 쿠폰은 선택한 방식 가격에서 할인, 이용권은 대여/소장을 0코인으로
    let coupon = null;
    if (req.body?.userCouponId) {
      const resolved = await resolveCouponForPurchase({ userId, userCouponId: String(req.body.userCouponId), comicId: episode.comicId });
      if (resolved.error) return res.status(400).json({ success: false, code: 'COUPON_INVALID', message: resolved.error });
      if (resolved.coupon.type === 'DISCOUNT' && price === 0) return res.status(400).json({ success: false, code: 'COUPON_NOT_NEEDED', message: '이미 무료라 쿠폰이 필요 없어요.' });
      ({ mode, price } = applyCoupon(resolved.coupon, { mode, price }));
      coupon = resolved;
    }
    const parseEpisodeImages = () => {
      if (Array.isArray(episode.images)) return episode.images;
      try { return JSON.parse(episode.images); } catch { return String(episode.images || '').split(',').map((img) => img.trim()).filter(Boolean); }
    };
    const episodePayload = (purchase) => ({
      id: episode.id,
      title: episode.title,
      images: parseEpisodeImages(),
      text: episode.comic.contentType === 'NOVEL' ? (episode.textContent || '') : null,
      authorNote: episode.authorNote || null,
      purchaseDate: purchase.createdAt,
      purchaseType: purchase.type || 'OWN',
      expiresAt: purchase.expiresAt,
    });

    const existingPurchase = await prisma.purchase.findUnique({ where: { userId_episodeId: { userId, episodeId } } });
    const active = isActivePurchase(existingPurchase);
    // 중복 결제 방지: 소장했거나, 대여 중에 또 대여하려는 경우
    if (active && ((existingPurchase.type || 'OWN') === 'OWN' || mode === 'RENT')) {
      return res.json({
        success: true,
        alreadyPurchased: true,
        message: (existingPurchase.type || 'OWN') === 'OWN' ? '이미 소장한 회차입니다.' : '이미 대여 중인 회차입니다.',
        episode: episodePayload(existingPurchase),
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { coinBalance: true, adultVerified: true } });
    if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    if (episode.comic.rating === '19' && !user.adultVerified) {
      return res.status(403).json({ success: false, message: '성인인증이 필요한 콘텐츠입니다.', requiresAdultVerification: true });
    }

    const expiresAt = mode === 'RENT' ? new Date(Date.now() + prices.rentalDays * 24 * 60 * 60 * 1000) : null;
    // 기한 지난 이벤트 코인은 먼저 소멸 처리 (지난 코인으로 결제되지 않게)
    await expireEventCoins(userId);
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const fresh = await tx.user.findUnique({ where: { id: userId }, select: { coinBalance: true } });
        const balance = fresh?.coinBalance || 0;
        if (balance < price) {
          const error = new Error('INSUFFICIENT_COINS');
          error.insufficient = { required: price, current: balance };
          throw error;
        }
        const updatedUser = await tx.user.update({ where: { id: userId }, data: { coinBalance: { decrement: price } }, select: { coinBalance: true } });
        // 이벤트 코인부터 차감
        await consumeEventCoins(tx, userId, price);
        if (coupon) await useCoupon(tx, coupon.row.id);
        // 기록은 회원·회차당 1건: 만료된 대여 재대여, 대여→소장 전환은 기존 기록을 갱신
        const purchase = await tx.purchase.upsert({
          where: { userId_episodeId: { userId, episodeId } },
          create: { userId, episodeId, coinPrice: price, type: mode, expiresAt },
          update: { coinPrice: price, type: mode, expiresAt, createdAt: new Date() },
        });
        await tx.coinTransaction.create({
          data: {
            userId,
            amount: -price,
            balance: updatedUser.coinBalance || 0,
            type: 'PURCHASE',
            description: `에피소드 ${mode === 'RENT' ? `대여(${prices.rentalDays}일)` : '소장'}: ${episode.title} (${episode.episodeNumber}화)${coupon ? ` · ${coupon.coupon.name} 사용` : ''}`,
          },
        });
        return { purchase, newBalance: updatedUser.coinBalance };
      });
    } catch (transactionError) {
      if (transactionError.couponUsed) return res.status(409).json({ success: false, code: 'COUPON_INVALID', message: '이미 사용한 쿠폰입니다.' });
      if (transactionError.insufficient) {
        const { required, current } = transactionError.insufficient;
        return res.status(400).json({ success: false, code: 'INSUFFICIENT_COINS', message: '코인이 부족합니다.', required, current, needed: required - current });
      }
      throw transactionError;
    }

    res.json({
      success: true,
      mode,
      message: mode === 'RENT'
        ? `${price === 0 ? "무료로" : `${price}코인으로`} ${prices.rentalDays}일 동안 대여했습니다.`
        : `${price === 0 ? '무료로' : `${price}코인으로`} 소장했습니다.`,
      episode: { ...episodePayload(result.purchase), coinPrice: price },
      coinBalance: result.newBalance,
    });
  } catch (error) {
    console.error('에피소드 구매 오류 상세:', error);
    console.error('에러 스택:', error.stack);
    
    // Prisma 관련 에러인 경우 더 자세한 정보 제공
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        success: false,
        message: '이미 구매한 에피소드입니다.'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false,
        message: '요청한 리소스를 찾을 수 없습니다.',
        detail: error.meta
      });
    }
    
    // 개발 환경에서만 상세 에러 표시
    const isDev = process.env.NODE_ENV === 'development';
    
    res.status(500).json({ 
      success: false,
      message: '에피소드 구매 중 오류가 발생했습니다.',
      ...(isDev && { 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code,
        stack: error.stack 
      })
    });
  }
});

// 특정 웹툰의 사용자가 구매한 에피소드 목록
router.get('/comic/:comicId/purchases', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { comicId } = req.params;
    
    const purchases = await prisma.purchase.findMany({
      where: { 
        userId: userId,
        episode: {
          comicId: comicId
        }
      },
      select: {
        episodeId: true,
        createdAt: true,
        coinPrice: true,
        type: true,
        expiresAt: true,
        episode: {
          select: {
            episodeNumber: true
          }
        }
      }
    });

    // 만료된 대여는 목록에서 뺀다 (다시 대여/소장 가능)
    res.json({
      success: true,
      purchasedEpisodes: purchases.filter((p) => isActivePurchase(p)).map(p => ({
        episodeId: p.episodeId,
        episodeNumber: p.episode.episodeNumber,
        purchaseDate: p.createdAt,
        purchaseType: p.coinPrice > 0 ? (p.type || 'OWN') : 'READ',
        expiresAt: p.expiresAt
      }))
    });
  } catch (error) {
    console.error('구매 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '구매 목록 조회 실패' });
  }
});

// 사용자의 구매한 에피소드 목록 조회
router.get('/user/purchases', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const purchases = await prisma.purchase.findMany({
      where: { userId: userId },
      include: {
        episode: {
          include: {
            comic: {
              select: {
                title: true,
                thumbnail: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.purchase.count({
      where: { userId: userId }
    });

    res.json({
      success: true,
      purchases: purchases.map(purchase => ({
        id: purchase.id,
        coinPrice: purchase.coinPrice,
        purchaseDate: purchase.createdAt,
        episode: {
          id: purchase.episode.id,
          title: purchase.episode.title,
          episodeNumber: purchase.episode.episodeNumber,
          thumbnail: purchase.episode.thumbnail,
          comic: purchase.episode.comic
        }
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('구매 내역 조회 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '구매 내역 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 회차 평점(GET/POST /:episodeId/rating, /user-rating)은 routes/ratings.js 가 회원별로 처리한다.
// (여기 있던 옛 구현은 마지막 평점으로 덮어쓰고 회원별로 저장하지 않아 제거, 2026-09-29)

module.exports = router;