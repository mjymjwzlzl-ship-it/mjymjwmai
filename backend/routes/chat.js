const { getJwtSecret } = require('../lib/jwt-secret');
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const { resolveCharacter, buildSystemPrompt, callChatModel, isAdultComic } = require('../services/character-chat');

// 토큰이 있으면 userId, 없거나 잘못되면 null
function optionalUserId(req) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return null;
  try { return jwt.verify(token, getJwtSecret()).userId || null; } catch { return null; }
}

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

// ByteDance API 설정
const BYTEDANCE_API_KEY = process.env.BYTEDANCE_API_KEY;

// 레퍼런스 이미지 캐시 (메모리)
const imageCache = new Map();
const BYTEDANCE_BASE_URL = process.env.BYTEDANCE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const SEEDREAM_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';

// 한자를 한글로 변환하는 매핑 (자주 사용되는 한자)
const hanjaToHangul = {
  '漢字': '한자', '問題': '문제', '關係': '관계', '狀況': '상황',
  '理由': '이유', '時間': '시간', '空間': '공간', '人間': '인간',
  '世界': '세계', '學校': '학교', '敎育': '교육', '學生': '학생',
  '先生': '선생', '敎師': '교사', '家族': '가족', '父母': '부모',
  '兄弟': '형제', '姉妹': '자매', '朋友': '친구', '戀人': '연인',
  '會社': '회사', '職場': '직장', '仕事': '일', '責任': '책임',
  '經驗': '경험', '記憶': '기억', '感情': '감정', '心情': '심정',
  '愛情': '애정', '友情': '우정', '信賴': '신뢰', '尊敬': '존경',
  '努力': '노력', '成功': '성공', '失敗': '실패', '希望': '희망',
  '夢想': '몽상', '目標': '목표', '計劃': '계획', '準備': '준비',
  '開始': '개시', '終了': '종료', '完成': '완성', '結果': '결과',
  '原因': '원인', '理解': '이해', '說明': '설명', '表現': '표현',
  '言葉': '말', '對話': '대화', '質問': '질문', '答': '답',
  '意見': '의견', '考': '생각', '判斷': '판단', '決定': '결정',
  '選擇': '선택', '方法': '방법', '手段': '수단', '過程': '과정',
  '程度': '정도', '水準': '수준', '能力': '능력', '才能': '재능',
  '特徵': '특징', '性格': '성격', '態度': '태도', '行動': '행동',
  '習慣': '습관', '生活': '생활', '日常': '일상', '瞬間': '순간',
  '場所': '장소', '位置': '위치', '地域': '지역', '國家': '국가',
  '都市': '도시', '村': '마을', '自然': '자연', '環境': '환경',
  '天氣': '날씨', '季節': '계절', '溫度': '온도', '氣候': '기후',
  '食事': '식사', '料理': '요리', '味': '맛', '香': '향',
  '色': '색', '形': '모양', '大小': '크기', '數': '수',
  '量': '양', '重量': '무게', '長短': '길이', '高低': '높이',
  '幅': '폭', '深淺': '깊이', '速度': '속도', '距離': '거리',
  '方向': '방향', '左右': '좌우', '上下': '상하', '前後': '전후',
  '內外': '내외', '中心': '중심', '邊': '가장자리', '角': '각도',
  '在一起': '함께', '在': '있다', '一起': '함께', '一': '하나', '起': '일어나다'
};

// 한자를 한글로 변환하는 함수
function convertHanjaToHangul(text) {
  let converted = text;

  // 먼저 긴 구문(3글자 이상)부터 변환 - 순서가 중요함
  converted = converted.replace(/在一起/g, '함께');
  converted = converted.replace(/一起/g, '함께');
  converted = converted.replace(/困难/g, '어려움');
  converted = converted.replace(/困難/g, '어려움');

  // 나머지 매핑된 한자를 한글로 변환
  for (const [hanja, hangul] of Object.entries(hanjaToHangul)) {
    // 이미 변환한 긴 구문은 스킵
    if (hanja === '在一起' || hanja === '一起' || hanja === '困难' || hanja === '困難') {
      continue;
    }
    const regex = new RegExp(hanja, 'g');
    converted = converted.replace(regex, hangul);
  }

  // 남은 한자 범위 문자 감지 및 경고 (U+4E00-U+9FFF: CJK 통합 한자)
  const remainingHanja = converted.match(/[\u4E00-\u9FFF]/g);
  if (remainingHanja) {
    console.warn('변환되지 않은 한자 발견:', remainingHanja.join(''));
  }

  return converted;
}

// 괄호 안 상황 설명 제거 (메신저처럼 대화만)
function removeActionDescriptions(text, preserveSpacing = false) {
  // (액션 설명) 형태 제거
  const cleaned = text.replace(/\([^)]*\)/g, '');
  // preserveSpacing이 true면 trim()하지 않음 (스트리밍 중 띄어쓰기 보존)
  return preserveSpacing ? cleaned : cleaned.trim();
}

/**
 * GET /api/chat/webtoon/:webtoonId/characters
 * 웹툰의 캐릭터 목록 조회
 */
router.get('/webtoon/:webtoonId/characters', async (req, res) => {
  try {
    const { webtoonId } = req.params;

    // 웹툰 정보 조회
    const comic = await prisma.comic.findUnique({
      where: { id: webtoonId }
    });

    if (!comic) {
      return res.status(404).json({ success: false, message: '웹툰을 찾을 수 없습니다.' });
    }

    // characters.json 파일 경로 찾기 - adult/general 둘 다 체크
    const isAdult = comic.rating === 'ADULT' || comic.rating === '19' || comic.genre === 'adult';
    let charactersFilePath;
    let basePath;

    // adult 폴더 먼저 확인
    if (isAdult) {
      basePath = path.join(__dirname, '../uploads/webtoons', 'adult', comic.title);
      charactersFilePath = path.join(basePath, 'characters.json');
      try {
        await fs.access(charactersFilePath);
      } catch {
        // adult 폴더에 없으면 general 폴더 확인
        basePath = path.join(__dirname, '../uploads/webtoons', 'general', comic.title);
        charactersFilePath = path.join(basePath, 'characters.json');
      }
    } else {
      basePath = path.join(__dirname, '../uploads/webtoons', 'general', comic.title);
      charactersFilePath = path.join(basePath, 'characters.json');
    }

    // 파일 존재 여부 확인
    try {
      await fs.access(charactersFilePath);
    } catch (error) {
      console.log(`[Chat] characters.json 파일 없음: ${charactersFilePath}`);
      return res.json({ success: true, characters: [] });
    }

    // 캐릭터 데이터 로드
    const charactersData = await fs.readFile(charactersFilePath, 'utf-8');
    const data = JSON.parse(charactersData);

    res.json({
      success: true,
      characters: data.characters || []
    });
  } catch (error) {
    console.error('캐릭터 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/chat/history/:webtoonId/:characterId
 * 대화 기록 조회 (로그인 필요)
 */
router.get('/history/:webtoonId/:characterId', authenticateToken, async (req, res) => {
  try {
    const { webtoonId, characterId } = req.params;
    const userId = req.user.userId;

    // 대화 기록 조회 (DB에서)
    const chatHistory = await prisma.chatMessage.findMany({
      where: {
        userId: userId,
        comicId: webtoonId,
        characterId: characterId
      },
      orderBy: { createdAt: 'asc' },
      take: 100 // 최근 100개 메시지만
    });

    const messages = chatHistory.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      imageUrl: msg.imageUrl,
      audioUrl: msg.audioUrl,
      timestamp: msg.createdAt
    }));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('대화 기록 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/chat/greeting
 * 캐릭터 첫 인사 (캐릭터 말투로 생성). 로그인 사용자이고 기록이 없으면 대화 기록에 저장한다.
 */
router.post('/greeting', async (req, res) => {
  try {
    const { webtoonId, characterId, userProgress } = req.body || {};
    const userId = optionalUserId(req);
    const comic = await prisma.comic.findUnique({ where: { id: webtoonId } });
    if (!comic) return res.status(404).json({ success: false, message: '웹툰을 찾을 수 없습니다.' });
    const { character, data } = await resolveCharacter(comic, characterId);
    if (!character) return res.status(404).json({ success: false, message: '캐릭터를 찾을 수 없습니다.' });

    if (userId) {
      const existing = await prisma.chatMessage.count({ where: { userId, comicId: webtoonId, characterId } });
      if (existing > 0) return res.json({ success: true, greeting: null, alreadyStarted: true });
    }

    let greeting;
    try {
      const system = buildSystemPrompt({ comic, character, data, userProgress });
      greeting = await callChatModel({
        system,
        message: '독자가 방금 대화방에 들어왔다. 너의 성격과 말투로 먼저 짧게 인사하고, 자연스럽게 말을 건네라. 2문장 이내. 작품 안내원처럼 말하지 말 것.',
        maxTokens: 200,
        temperature: 0.9,
      });
      greeting = removeActionDescriptions(convertHanjaToHangul(greeting));
    } catch (error) {
      console.error('[Chat] 인사 생성 실패:', error.response?.status || error.message);
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: '캐릭터가 잠시 응답하지 못하고 있어요.' });
    }

    if (userId) {
      await prisma.chatMessage.create({ data: { userId, comicId: webtoonId, characterId, role: 'assistant', content: greeting } });
    }
    res.json({ success: true, greeting });
  } catch (error) {
    console.error('인사 메시지 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/chat/conversations
 * 내 채팅: 대화한 캐릭터 목록 (최근 대화순)
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const groups = await prisma.chatMessage.groupBy({
      by: ['comicId', 'characterId'],
      where: { userId, role: { in: ['user', 'assistant'] } },
      _max: { createdAt: true },
      _count: { _all: true },
    });
    groups.sort((a, b) => new Date(b._max.createdAt) - new Date(a._max.createdAt));
    const comics = await prisma.comic.findMany({
      where: { id: { in: [...new Set(groups.map((g) => g.comicId))] } },
      select: { id: true, title: true, thumbnail: true, rating: true, genre: true, description: true },
    });
    const comicMap = new Map(comics.map((comic) => [comic.id, comic]));
    const conversations = [];
    for (const group of groups.slice(0, 50)) {
      const comic = comicMap.get(group.comicId);
      if (!comic) continue;
      const { character } = await resolveCharacter(comic, group.characterId);
      const last = await prisma.chatMessage.findFirst({
        where: { userId, comicId: group.comicId, characterId: group.characterId, role: { in: ['user', 'assistant'] } },
        orderBy: { createdAt: 'desc' },
        select: { content: true, role: true, createdAt: true },
      });
      conversations.push({
        webtoonId: comic.id,
        webtoonTitle: comic.title,
        characterId: group.characterId,
        characterName: character ? character.name : comic.title,
        unnamed: Boolean(character?.unnamed),
        imageUrl: character?.imageUrl || comic.thumbnail || '',
        isAdult: isAdultComic(comic),
        lastMessage: last?.content?.slice(0, 80) || '',
        lastRole: last?.role || null,
        lastAt: last?.createdAt || group._max.createdAt,
        messageCount: group._count._all,
      });
    }
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('대화 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * DELETE /api/chat/history/:webtoonId/:characterId
 * 대화 초기화 (사용자가 직접 선택했을 때만)
 */
router.delete('/history/:webtoonId/:characterId', authenticateToken, async (req, res) => {
  try {
    const { webtoonId, characterId } = req.params;
    const result = await prisma.chatMessage.deleteMany({ where: { userId: req.user.userId, comicId: webtoonId, characterId } });
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('대화 초기화 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});


/**
 * GET /api/chat/daily-count
 * 총 대화 횟수 조회 (날짜 무관, 전체 카운트)
 */
router.get('/daily-count', async (req, res) => {
  try {
    // JWT 토큰에서 userId 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        userId = decoded.userId;
      } catch (err) {
        // 토큰 검증 실패 시 비로그인 처리
      }
    }

    // 비로그인 사용자는 로그인 필요 메시지 반환
    if (!userId) {
      return res.json({ success: false, needsLogin: true, message: '로그인이 필요합니다.' });
    }

    // 사용자 정보 조회 (dailyMessageCount, lastMessageDate 포함)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyMessageCount: true,
        lastMessageDate: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 오늘 날짜 (YYYY-MM-DD 형식)
    const today = new Date().toISOString().split('T')[0];

    // 날짜가 바뀌었으면 카운트 초기화
    let currentCount = user.dailyMessageCount || 0;
    if (user.lastMessageDate !== today) {
      currentCount = 0;

      // DB 업데이트 (카운트 초기화)
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyMessageCount: 0,
          lastMessageDate: today
        }
      });
    }

    const remaining = Math.max(0, 20 - currentCount);

    res.json({
      success: true,
      count: currentCount,
      remaining: remaining,
      needsCoins: currentCount >= 20
    });
  } catch (error) {
    console.error('대화 횟수 조회 실패:', error);
    res.status(500).json({ success: false, message: '대화 횟수 조회에 실패했습니다.' });
  }
});

/**
 * POST /api/chat/message
 * 캐릭터 대화 (SSE 형식으로 한 번에 응답). AI 호출이 성공했을 때만 기록 저장·횟수 차감·코인 차감.
 * 실패하면 503 { code: 'AI_UNAVAILABLE' } — 화면은 캐릭터 대사가 아닌 시스템 안내와 다시 시도 버튼을 보여준다.
 */
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { webtoonId, characterId, message, userProgress, useCoin } = req.body || {};
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    const text = String(message || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ success: false, message: '메시지를 입력해주세요.' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyMessageCount: true, lastMessageDate: true, coinBalance: true },
    });
    if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

    const today = new Date().toISOString().split('T')[0];
    const currentCount = user.lastMessageDate === today ? (user.dailyMessageCount || 0) : 0;
    const needsCoin = currentCount >= 20;
    if (needsCoin && useCoin !== true) {
      return res.status(402).json({ success: false, needsCoins: true, totalCount: currentCount, message: '무료 대화 20회를 모두 사용하셨습니다. 코인을 사용하여 계속 대화하세요.' });
    }
    if (needsCoin && (user.coinBalance || 0) < 1) {
      return res.status(402).json({ success: false, needsCoins: true, totalCount: currentCount, message: '코인이 부족합니다.' });
    }

    const comic = await prisma.comic.findUnique({ where: { id: webtoonId } });
    if (!comic) return res.status(404).json({ success: false, message: '웹툰을 찾을 수 없습니다.' });
    const { character, data } = await resolveCharacter(comic, characterId);
    if (!character) return res.status(404).json({ success: false, message: '캐릭터를 찾을 수 없습니다.' });

    const history = await prisma.chatMessage.findMany({
      where: { userId, comicId: webtoonId, characterId, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { role: true, content: true },
    });
    history.reverse();

    let reply;
    try {
      const system = buildSystemPrompt({ comic, character, data, userProgress });
      reply = await callChatModel({ system, history, message: text });
      reply = removeActionDescriptions(convertHanjaToHangul(reply));
    } catch (error) {
      console.error('[Chat] AI 응답 실패:', error.response?.status || error.message);
      return res.status(503).json({ success: false, code: 'AI_UNAVAILABLE', message: '캐릭터가 잠시 응답하지 못하고 있어요. 잠시 후 다시 시도해 주세요.' });
    }

    // 성공한 경우에만 기록·횟수·코인 반영
    await prisma.$transaction(async (tx) => {
      await tx.chatMessage.create({ data: { userId, comicId: webtoonId, characterId, role: 'user', content: text } });
      await tx.chatMessage.create({ data: { userId, comicId: webtoonId, characterId, role: 'assistant', content: reply } });
      await tx.user.update({
        where: { id: userId },
        data: {
          dailyMessageCount: currentCount + 1,
          lastMessageDate: today,
          ...(needsCoin ? { coinBalance: { decrement: 1 } } : {}),
        },
      });
      if (needsCoin) {
        await tx.coinTransaction.create({
          data: { userId, amount: -1, balance: (user.coinBalance || 0) - 1, type: 'PURCHASE', description: `챗봇 대화 (${currentCount + 1}회차)` },
        });
      }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.write(`data: ${JSON.stringify({ content: reply })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    if (!res.headersSent) res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});


/**
 * POST /api/chat/generate-image
 * 캐릭터 이미지 생성 (Seedream) - 특정 메시지 기반
 */
router.post('/generate-image', authenticateToken, async (req, res) => {
  try {
    const { webtoonId, characterId, userProgress, messageContent } = req.body;
    const userId = req.user.userId;

    if (!messageContent) {
      return res.status(400).json({ success: false, message: '메시지 내용이 필요합니다.' });
    }

    // 웹툰 정보 조회
    const comic = await prisma.comic.findUnique({
      where: { id: webtoonId }
    });

    if (!comic) {
      return res.status(404).json({ success: false, message: '웹툰을 찾을 수 없습니다.' });
    }

    // 캐릭터 정보 로드 - adult/general 둘 다 체크
    const isAdult = comic.rating === 'ADULT' || comic.rating === '19' || comic.genre === 'adult';
    let basePath;
    let charactersFilePath;

    // adult 폴더 먼저 확인
    if (isAdult) {
      basePath = path.join(__dirname, '../uploads/webtoons', 'adult', comic.title);
      charactersFilePath = path.join(basePath, 'characters.json');
      try {
        await fs.access(charactersFilePath);
      } catch {
        // adult 폴더에 없으면 general 폴더 확인
        basePath = path.join(__dirname, '../uploads/webtoons', 'general', comic.title);
        charactersFilePath = path.join(basePath, 'characters.json');
      }
    } else {
      basePath = path.join(__dirname, '../uploads/webtoons', 'general', comic.title);
      charactersFilePath = path.join(basePath, 'characters.json');
    }

    const charactersData = await fs.readFile(charactersFilePath, 'utf-8');
    const data = JSON.parse(charactersData);
    const character = data.characters.find(c => c.id === characterId);

    if (!character) {
      return res.status(404).json({ success: false, message: '캐릭터를 찾을 수 없습니다.' });
    }

    // 사용자 진행도에 맞는 에피소드 지식 가져오기
    const episodeKnowledge = character.episodeKnowledge?.[userProgress.toString()] || character.episodeKnowledge?.['1'] || {};

    // 과거 대화 기록 가져오기 (최근 5개) - 이미지 생성 맥락 제공
    let recentConversation = '';
    let conversationContext = ''; // 대화 요약에서 추출한 상황/의상 정보

    if (userId) {
      const recentMessages = await prisma.chatMessage.findMany({
        where: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });

      if (recentMessages.length > 0) {
        recentConversation = recentMessages
          .reverse()
          .map(msg => `${msg.role === 'user' ? '사용자' : character.name}: ${msg.content}`)
          .join('\n');
      }

      // 대화 요약 가져오기 (의상/장소/상황 정보 포함)
      const summaryMessage = await prisma.chatMessage.findFirst({
        where: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId,
          role: 'system',
          content: { startsWith: '[대화 요약]' }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (summaryMessage) {
        const summaryText = summaryMessage.content.replace('[대화 요약] ', '');
        conversationContext = `[이전 대화 맥락: ${summaryText}]\n`;
        console.log('📝 이미지 생성에 대화 요약 적용:', summaryText.substring(0, 100) + '...');
      }
    }

    // 캐릭터 레퍼런스 이미지 URL (얼굴만 참고)
    const characterImageUrl = character.imageUrl ? `https://arata.co.kr${character.imageUrl}` : null;

    // 이미지 프롬프트 구성 - 대화 맥락을 반영하여 자유도 높게
    const gender = character.gender === 'female' ? 'beautiful woman' : 'handsome man';
    const faceDescription = character.appearance || 'korean webtoon character';

    // 사용자 메시지와 캐릭터 응답 모두 포함 (독자와 소통하는 이미지)
    let fullSceneDescription = messageContent;

    // req.body.message가 없으면 DB에서 가장 최근 사용자 메시지 가져오기
    let userMessage = req.body.message || '';
    if (!userMessage && userId) {
      const lastUserMessage = await prisma.chatMessage.findFirst({
        where: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId,
          role: 'user'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (lastUserMessage) {
        userMessage = lastUserMessage.content;
        console.log('DB에서 가져온 최근 사용자 메시지:', userMessage);
      }
    }

    // 캐릭터 응답 부분만 추출
    let characterResponse = '';
    if (recentConversation) {
      characterResponse = recentConversation.substring(recentConversation.lastIndexOf(character.name + ':'));
    } else if (messageContent) {
      characterResponse = `${character.name}: ${messageContent}`;
    }

    // 한자 변환 + 괄호 안 상황 설명 제거 (캐릭터 응답에만 적용)
    characterResponse = convertHanjaToHangul(characterResponse);
    characterResponse = removeActionDescriptions(characterResponse);

    // 사용자 메시지는 그대로 유지 + 캐릭터 응답만 정제
    // 주의: 성인 웹툰의 경우 사용자가 입력한 성인 콘텐츠 표현(괄호 포함)은 모두 보존됨
    // 대화 맥락(요약)을 맨 앞에 추가하여 의상/장소/상황 정보 제공
    fullSceneDescription = `${conversationContext}User: ${userMessage}\n${characterResponse}`;
    console.log('🔞 [성인 콘텐츠 처리] 사용자 메시지 괄호 보존, 캐릭터 응답만 정제');

    // 레퍼런스는 얼굴만 참고하고, 복장/배경은 대화 맥락에 따라 자유롭게
    // 성인 웹툰의 경우 명시적 해부학적 디테일 추가
    let adultPromptAddition = '';
    if (isAdult) {
      adultPromptAddition = '\nADULT CONTENT: Explicitly show all anatomical details including nipples and genitals accurately. Detailed, realistic anatomy for mature content.';
    }

    const prompt = `Face reference only: ${gender}, ${character.name}, facial features: ${faceDescription}.
Scene details: ${fullSceneDescription.substring(0, 300)}.
IMPORTANT: Use the reference image ONLY for facial features (face shape, eyes, hair).
Freely interpret clothing, pose, background, and setting based on the scene description.
HANDS: Draw exactly TWO normal human hands with FIVE fingers each, anatomically correct hands, well-drawn hands, perfect hand anatomy.${adultPromptAddition}
Korean manhwa style, professional webtoon illustration, high quality, detailed, cinematic composition, dynamic pose, NO TEXT, NO SPEECH BUBBLES`;

    console.log('이미지 생성 프롬프트:', prompt);
    if (characterImageUrl) {
      console.log('레퍼런스 이미지:', characterImageUrl);
    }

    // Seedream 이미지 생성 API 호출 (image 배열로 레퍼런스 전달)
    // ByteDance API Key 레벨에서 성인 콘텐츠 허용됨
    const requestBody = {
      model: 'seedream-4-0-250828',
      prompt: prompt,
      negative_prompt: 'ugly, deformed, noisy, blurry, distorted, out of focus, bad anatomy, extra limbs, THREE HANDS, FOUR HANDS, FIVE HANDS, MULTIPLE HANDS, EXTRA HANDS, NO HANDS, MISSING HANDS, extra fingers, missing fingers, fused fingers, mutated hands, poorly drawn hands, malformed hands, extra arms, extra legs, poorly drawn face, different face, different person, wrong gender, multiple people, inconsistent art style, text, speech bubble, dialogue, watermark, signature, words, letters, caption, korean text, hangul',
      response_format: 'url',
      size: '1K', // 1024x1024 정사각형
      stream: false,
      watermark: false
    };

    // 레퍼런스 이미지가 있으면 JPG로 변환 후 base64로 인코딩해서 전달
    if (characterImageUrl) {
      try {
        // 캐시에서 먼저 확인
        let base64Image = imageCache.get(character.id);

        if (!base64Image) {
          // 캐시에 없으면 처음 한 번만 변환
          const localImagePath = path.join(__dirname, '..', character.imageUrl);

          // 최적화: 가장 긴 변을 512px로 제한 (종횡비 유지) + 품질 75%
          const jpgBuffer = await sharp(localImagePath)
            .resize(512, 512, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 75 })
            .toBuffer();

          base64Image = `data:image/jpeg;base64,${jpgBuffer.toString('base64')}`;

          // 캐시에 저장 (다음 요청부터는 재사용)
          imageCache.set(character.id, base64Image);
          console.log(`레퍼런스 이미지 최적화 완료 (512x512, 75% quality) - 캐시 저장됨`);
        } else {
          console.log('레퍼런스 이미지 캐시 사용');
        }

        requestBody.image = [base64Image]; // base64 배열로 전달
      } catch (imageError) {
        console.error('레퍼런스 이미지 로드 실패:', imageError);
        // 이미지 없이 생성
      }
    }

    const imageGenUrl = `${SEEDREAM_BASE_URL}/images/generations`;
    console.log('🔗 이미지 생성 API URL:', imageGenUrl);
    console.log('📦 요청 body:', JSON.stringify(requestBody, null, 2));

    const imageResponse = await axios.post(
      imageGenUrl,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${BYTEDANCE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    const imageUrl = imageResponse.data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('이미지 생성에 실패했습니다.');
    }

    // 대화 기록에 이미지 메시지 저장 (로그인한 경우)
    if (userId) {
      await prisma.chatMessage.create({
        data: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId,
          role: 'assistant',
          content: `[이미지] ${messageContent.substring(0, 50)}...`,
          imageUrl: imageUrl
        }
      });
    }

    res.json({
      success: true,
      imageUrl: imageUrl,
      description: `${character.name}이(가) 이미지를 생성했습니다.`
    });
  } catch (error) {
    console.error('이미지 생성 실패:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: '이미지 생성에 실패했습니다.',
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
