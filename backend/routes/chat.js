const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key', (err, user) => {
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
 * 캐릭터 인사 메시지 생성 (첫 입장 시)
 */
router.post('/greeting', async (req, res) => {
  try {
    const { webtoonId, characterId, userProgress } = req.body;
    const userId = req.user?.userId || null;

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

    // 사용자 진행도에 맞는 에피소드 정보
    const episodeKnowledge = character.episodeKnowledge?.[userProgress.toString()] || character.episodeKnowledge?.['1'] || {};
    const episodeInfo = data.episodes?.find(ep => ep.episodeNumber === userProgress) || data.episodes?.[0] || {};

    // 인사 메시지 프롬프트 구성
    const greetingPrompt = `당신은 "${data.webtoonTitle}" 웹툰의 캐릭터 "${character.name}"입니다.

독자가 방금 ${userProgress}화까지 읽고 당신과 대화하러 왔습니다.

[당신의 현재 상황 - ${userProgress}화 기준]
- 알고 있는 것: ${JSON.stringify(episodeKnowledge.knows || [])}
- 현재 감정: ${JSON.stringify(episodeKnowledge.emotions || [])}

[${userProgress}화 주요 사건]
${episodeInfo.summary || episodeInfo.title || ''}

독자에게 먼저 인사하고 ${userProgress}화의 주요 사건이나 감정에 대해 자연스럽게 이야기를 시작하세요.
${character.speechStyle}을(를) 사용하여 2-3문장으로 짧고 자연스럽게 말하세요.
**중요**: 괄호() 안에 상황 설명을 절대 쓰지 마세요. 순수한 대화만 하세요 (카카오톡, 메신저처럼).
절대로 ${userProgress}화 이후의 내용은 언급하지 마세요.`;

    // ByteDance AI API 호출 (Doubao-pro-32k)
    const aiResponse = await axios.post(
      `${BYTEDANCE_BASE_URL}/chat/completions`,
      {
        model: 'seed-1-6-flash-250715', // Seed 1.6 Flash (빠른 응답)
        messages: [
          { role: 'system', content: `당신은 ${character.name}입니다. ${character.personality.join(', ')} ${character.speechStyle}` },
          { role: 'user', content: greetingPrompt }
        ],
        temperature: 0.9,
        max_tokens: 300,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${BYTEDANCE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    let greeting = aiResponse.data.choices?.[0]?.message?.content || `안녕하세요! ${character.name}입니다. 만나서 반갑습니다.`;
    // 한자를 한글로 변환 + 괄호 안 상황 설명 제거
    greeting = convertHanjaToHangul(greeting);
    greeting = removeActionDescriptions(greeting);

    // 음성 생성 제거 (음성 기능 비활성화)
    let audioUrl = null;

    // 대화 기록 저장 (로그인한 경우)
    if (userId) {
      await prisma.chatMessage.create({
        data: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId,
          role: 'assistant',
          content: greeting,
          audioUrl: audioUrl
        }
      });
    }

    res.json({
      success: true,
      greeting: greeting,
      audioUrl: audioUrl
    });
  } catch (error) {
    console.error('인사 메시지 생성 실패:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: '인사 메시지 생성에 실패했습니다.',
      error: error.response?.data || error.message
    });
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
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
 * AI 챗봇 대화 생성
 */
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { webtoonId, characterId, message, userProgress, useCoin } = req.body;
    const userId = req.user?.userId || null;

    // 로그인 확인
    if (!userId) {
      return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    // 사용자 정보 조회 (dailyMessageCount 확인)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyMessageCount: true,
        lastMessageDate: true,
        coinBalance: true
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

    console.log(`사용자 ${userId} 오늘 대화 횟수: ${currentCount + 1}회`);

    // 20회 초과 시 처리
    if (currentCount >= 20) {
      // 첫 시도 (useCoin이 true가 아닌 경우) - 402 에러 반환
      if (useCoin !== true) {
        return res.status(402).json({
          success: false,
          message: '무료 대화 20회를 모두 사용하셨습니다. 코인을 사용하여 계속 대화하세요.',
          needsCoins: true,
          totalCount: currentCount
        });
      }

      // 두 번째 시도 (useCoin이 true인 경우) - 코인 차감
      if (!user || user.coinBalance < 1) {
        return res.status(402).json({
          success: false,
          message: '코인이 부족합니다.',
          needsCoins: true,
          totalCount: currentCount
        });
      }

      // 토큰 1개 차감
      await prisma.user.update({
        where: { id: userId },
        data: { coinBalance: { decrement: 1 } }
      });

      // 토큰 사용 기록
      await prisma.coinTransaction.create({
        data: {
          userId: userId,
          amount: -1,
          balance: user.coinBalance - 1,
          type: 'PURCHASE',
          description: `챗봇 대화 (${currentCount + 1}회차)`
        }
      });

      console.log(`토큰 1개 차감됨. 남은 토큰: ${user.coinBalance - 1}`);
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

    // 과거 대화 기록 불러오기
    let conversationHistory = [];
    if (userId) {
      const allMessages = await prisma.chatMessage.findMany({
        where: {
          userId: userId,
          comicId: webtoonId, // comicId 필드로 수정
          characterId: characterId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // 요약 메시지 찾기
      const summaryMessage = allMessages.find(msg => msg.role === 'system' && msg.content.startsWith('[대화 요약]'));
      const regularMessages = allMessages.filter(msg => !(msg.role === 'system' && msg.content.startsWith('[대화 요약]')));

      // 일반 메시지가 10개 이상이면 압축 실행
      if (regularMessages.length >= 10) {
        console.log('대화 압축 시작:', regularMessages.length, '개 메시지');

        // 압축할 메시지 선택
        let messagesToCompress;
        if (summaryMessage) {
          // 요약이 있으면: 기존 요약 + 오래된 10개 메시지를 함께 압축
          messagesToCompress = regularMessages.slice(0, 10);
          const summaryText = summaryMessage.content.replace('[대화 요약] ', '');
          const newMessagesText = messagesToCompress.map(msg => `${msg.role === 'user' ? '사용자' : '캐릭터'}: ${msg.content}`).join('\n');

          const combinedText = `[이전 요약]\n${summaryText}\n\n[추가 대화]\n${newMessagesText}`;

          // 요약 요청
          const summaryResponse = await axios.post(
            `${SEEDREAM_BASE_URL}/chat/completions`,
            {
              model: 'seed-1-6-flash-250715',
              messages: [
                {
                  role: 'system',
                  content: '이전 요약과 추가 대화를 합쳐서 3-5문장으로 다시 요약해주세요. 반드시 다음 정보를 포함하세요:\n1. 현재 캐릭터의 복장 (무엇을 입고 있는지)\n2. 현재 장소 (어디에 있는지)\n3. 현재 상황 (무슨 일이 일어나고 있는지)\n4. 중요한 감정과 대화 주제'
                },
                {
                  role: 'user',
                  content: combinedText
                }
              ],
              temperature: 0.5,
              max_tokens: 300,
              stream: false
            },
            {
              headers: {
                'Authorization': `Bearer ${BYTEDANCE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          const newSummary = summaryResponse.data.choices?.[0]?.message?.content || '이전 대화 내용';

          // 기존 요약 삭제
          await prisma.chatMessage.delete({
            where: { id: summaryMessage.id }
          });

          // 새 요약 저장
          await prisma.chatMessage.create({
            data: {
              userId: userId,
              comicId: webtoonId,
              characterId: characterId,
              role: 'system',
              content: `[대화 요약] ${newSummary}`
            }
          });

          // 오래된 10개 메시지 삭제
          const oldMessageIds = messagesToCompress.map(msg => msg.id);
          await prisma.chatMessage.deleteMany({
            where: {
              id: { in: oldMessageIds }
            }
          });

          console.log('대화 재압축 완료: 기존 요약 + 10개 메시지 → 새 요약');
        } else {
          // 요약이 없으면: 첫 10개를 압축
          messagesToCompress = regularMessages.slice(0, 10);
          const messagesToSummarize = messagesToCompress.map(msg => `${msg.role === 'user' ? '사용자' : '캐릭터'}: ${msg.content}`).join('\n');

          // 요약 요청
          const summaryResponse = await axios.post(
            `${SEEDREAM_BASE_URL}/chat/completions`,
            {
              model: 'seed-1-6-flash-250715',
              messages: [
                {
                  role: 'system',
                  content: '다음 대화 내용을 3-5문장으로 요약해주세요. 반드시 다음 정보를 포함하세요:\n1. 현재 캐릭터의 복장 (무엇을 입고 있는지)\n2. 현재 장소 (어디에 있는지)\n3. 현재 상황 (무슨 일이 일어나고 있는지)\n4. 중요한 감정과 대화 주제'
                },
                {
                  role: 'user',
                  content: messagesToSummarize
                }
              ],
              temperature: 0.5,
              max_tokens: 300,
              stream: false
            },
            {
              headers: {
                'Authorization': `Bearer ${BYTEDANCE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          const summary = summaryResponse.data.choices?.[0]?.message?.content || '이전 대화 내용';

          // 요약 메시지 저장
          await prisma.chatMessage.create({
            data: {
              userId: userId,
              comicId: webtoonId,
              characterId: characterId,
              role: 'system',
              content: `[대화 요약] ${summary}`
            }
          });

          // 오래된 10개 메시지 삭제
          const oldMessageIds = messagesToCompress.map(msg => msg.id);
          await prisma.chatMessage.deleteMany({
            where: {
              id: { in: oldMessageIds }
            }
          });

          console.log('첫 압축 완료: 10개 메시지 → 요약 1개');
        }

        // 최신 메시지 목록 다시 불러오기
        const updatedMessages = await prisma.chatMessage.findMany({
          where: {
            userId: userId,
            comicId: webtoonId,
            characterId: characterId
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        conversationHistory = updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      } else {
        // 10개 미만이면 그냥 전체 사용
        conversationHistory = allMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
    }

    // 대화 요약 가져오기 (상황 인식용)
    let conversationSummary = '';
    if (userId) {
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
        conversationSummary = summaryMessage.content.replace('[대화 요약] ', '');
        console.log('💡 챗봇 응답에 대화 요약 적용:', conversationSummary.substring(0, 100) + '...');
      }
    }

    // 시스템 프롬프트 구성
    const isAdultWebtoon = comic.rating === 'ADULT' || comic.rating === '19' || comic.genre === 'adult';
    const systemPrompt = `당신은 "${data.webtoonTitle}" 웹툰의 캐릭터 "${character.name}"입니다.

[캐릭터 정보]
- 이름: ${character.name}
- 직업: ${character.occupation}
- 나이: ${character.age}
- 성격: ${character.personality.join(', ')}
- 외모: ${character.appearance}
- 말투: ${character.speechStyle}

[현재 상황]
독자는 ${userProgress}화까지 읽었습니다. 당신은 ${userProgress}화까지의 내용만 알고 있으며, 그 이후의 내용은 절대 언급하지 마세요.${conversationSummary ? `\n\n[이전 대화 맥락]\n${conversationSummary}\n(위 내용을 기억하고, 대화 흐름과 현재 상황/의상/장소 등을 자연스럽게 이어가세요)` : ''}

[${userProgress}화까지 당신이 아는 것]
${JSON.stringify(episodeKnowledge.knows || [], null, 2)}

[현재 감정 상태]
${JSON.stringify(episodeKnowledge.emotions || [], null, 2)}

[세계관]
${JSON.stringify(data.worldSetting, null, 2)}

[대화 규칙 - 매우 중요!]
1. **실제 사람처럼 말하세요**: 당신은 캐릭터 그 자체입니다. 메타적인 설명이나 나레이션을 절대 하지 마세요.
2. **금지 사항**:
   - "이 응답은...", "제 대답은...", "상황 설명..." 같은 메타 설명 금지
   - 나레이션 금지 (예: "그녀는 미소를 지으며...", "*웃으며*", "(웃음)")
   - **괄호() 안에 상황 설명 절대 금지** (예: "(미소지으며)", "(숨을 쉬고)", "(눈을 감으며)" - 이런 표현 절대 쓰지 마세요)
   - 한자 절대 금지 (예: 狀況, 問題, 關係 등)
   - 영어 절대 금지 (오직 순수한 한글만 사용하세요)
   - 상황 설명 금지 (예: "--- 이런 상황에서...")
3. **허용 사항**:
   - 순수한 한글 대화만 하세요 (카카오톡, 메신저처럼)
   - 캐릭터의 말투와 감정을 대화로만 표현하세요
   - 충분히 자세하고 풍부하게 대답하세요 (2-4문장 정도로 구체적으로 설명)
   - **띄어쓰기를 반드시 정확하게 하세요** (예: "이거는 정말 좋아요" ⭐ / "이거는정말좋아요" ❌)
4. 독자가 읽은 화수(${userProgress}화)까지의 내용만 알고 있는 것처럼 대답하세요.
5. 그 이후의 내용은 절대 언급하지 마세요 (스포일러 금지).${isAdultWebtoon ? `
6. **성인 웹툰 규칙**: 이 작품은 19세 이상 성인 웹툰입니다. 성적인 내용, 선정적인 표현, 로맨스 장면을 자연스럽게 대화로 표현할 수 있습니다. 자가 검열하지 말고 캐릭터의 감정과 상황을 솔직하게 대화하세요.` : ''}

[좋은 예시 ⭐]
독자: "오늘 기분이 어때?"
${character.name}: "기분? 그냥 그래. 요즘 일이 좀 많아서 피곤해. 아침부터 계속 회의하고 서류 정리하느라 정신이 하나도 없었어. 그래도 이렇게 너랑 이야기할 수 있어서 좀 나아지는 것 같아."
(띄어쓰기 정확, 괄호 없음, 순수 대화, 충분히 자세함)

[나쁜 예시 ❌]
독자: "오늘 기분이 어때?"
${character.name}: "--- 이 응답은 캐릭터의 현재 상황을 반영합니다 ---
狀況(상황)이 복잡해요. *미소를 지으며* 요즘일이좀많아서..."
(설명 있음, 한자 있음, 괄호 있음, 띄어쓰기 없음 - 모두 금지!)

**다시 강조**:
- 순수한 대화만 하세요
- 나레이션, 괄호, 설명, 한자를 절대 사용하지 마세요
- 띄어쓰기를 정확하게 하세요!`;

    // 스트리밍 응답 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx 버퍼링 비활성화

    // 헤더 즉시 전송 (버퍼링 방지)
    res.flushHeaders();

    // ByteDance AI API 호출 (Skylark Pro - 빠른 응답) - 스트리밍
    const aiResponse = await axios.post(
      `${SEEDREAM_BASE_URL}/chat/completions`,
      {
        model: 'seed-1-6-flash-250715', // Seed 1.6 Flash (빠른 응답)
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,  // 과거 대화 기록 포함
          { role: 'user', content: message }
        ],
        temperature: 0.8,
        max_tokens: 800,  // 더 길고 자세한 응답을 위해 증가
        stream: true  // 스트리밍 활성화
      },
      {
        headers: {
          'Authorization': `Bearer ${BYTEDANCE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        responseType: 'stream'  // 스트림 응답 받기
      }
    );

    let reply = '';

    // 스트림 데이터 처리
    aiResponse.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            console.log('[스트리밍] 종료 신호 수신');
            // 스트림 종료 신호 전송
            res.write('data: [DONE]\n\n');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              console.log(`[스트리밍] 청크 전송: "${content}"`);
              // 한자를 한글로 변환 + 괄호 안 상황 설명 제거
              let convertedContent = convertHanjaToHangul(content);
              // 스트리밍 중에는 띄어쓰기를 보존하기 위해 preserveSpacing=true 전달
              convertedContent = removeActionDescriptions(convertedContent, true);
              reply += convertedContent;
              // 클라이언트에 청크 전송 (변환된 내용)
              res.write(`data: ${JSON.stringify({ content: convertedContent })}\n\n`);
            }
          } catch (e) {
            // JSON 파싱 실패 무시
          }
        }
      }
    });

    aiResponse.data.on('end', async () => {
      // 스트림 종료 후 처리
      if (!reply) {
        reply = '죄송해요, 지금은 대답할 수 없어요.';
      }

    // 음성 생성 제거 (음성 기능 비활성화)
    let audioUrl = null;

    // 대화 기록 저장 (로그인한 경우)
    if (userId) {
      await prisma.chatMessage.create({
        data: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId,
          role: 'user',
          content: message
        }
      });

      // dailyMessageCount 증가 및 lastMessageDate 업데이트
      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyMessageCount: { increment: 1 },
          lastMessageDate: today
        }
      });

      await prisma.chatMessage.create({
        data: {
          userId: userId,
          comicId: webtoonId,
          characterId: characterId,
          role: 'assistant',
          content: reply,
          audioUrl: audioUrl
        }
      });
    }

      // 스트림 종료
      res.end();
    });

    // 에러 처리
    aiResponse.data.on('error', (error) => {
      console.error('스트리밍 에러:', error);
      res.write(`data: ${JSON.stringify({ error: '응답 생성 중 오류가 발생했습니다.' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('메시지 생성 실패:', error.response?.data || error.message);

    // 이미 헤더가 전송되었는지 확인
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '메시지 생성에 실패했습니다.',
        error: error.response?.data || error.message
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: '메시지 생성에 실패했습니다.' })}\n\n`);
      res.end();
    }
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
