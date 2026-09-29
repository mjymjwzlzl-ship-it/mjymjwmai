// Translation helper for backend content
const translations = {
  webtoons: {
    // Example webtoon titles (in production, these would come from DB)
    'AI 그림 마법사': {
      en: 'AI Art Wizard',
      ja: 'AI アート魔法使い',
      zh: 'AI绘画魔法师'
    },
    '판타지 모험': {
      en: 'Fantasy Adventure',
      ja: 'ファンタジーアドベンチャー',
      zh: '奇幻冒险'
    },
    '로맨스 이야기': {
      en: 'Romance Story',
      ja: 'ロマンス物語',
      zh: '浪漫故事'
    },
    '액션 히어로': {
      en: 'Action Hero',
      ja: 'アクションヒーロー',
      zh: '动作英雄'
    },
    '미스터리 탐정': {
      en: 'Mystery Detective',
      ja: 'ミステリー探偵',
      zh: '神秘侦探'
    }
  },
  genres: {
    '판타지': {
      en: 'Fantasy',
      ja: 'ファンタジー',
      zh: '奇幻'
    },
    '로맨스': {
      en: 'Romance',
      ja: 'ロマンス',
      zh: '浪漫'
    },
    '액션': {
      en: 'Action',
      ja: 'アクション',
      zh: '动作'
    },
    '드라마': {
      en: 'Drama',
      ja: 'ドラマ',
      zh: '剧情'
    },
    '코미디': {
      en: 'Comedy',
      ja: 'コメディ',
      zh: '喜剧'
    },
    '스릴러': {
      en: 'Thriller',
      ja: 'スリラー',
      zh: '惊悚'
    },
    '호러': {
      en: 'Horror',
      ja: 'ホラー',
      zh: '恐怖'
    },
    '일상': {
      en: 'Slice of Life',
      ja: '日常',
      zh: '日常'
    },
    'SF': {
      en: 'Sci-Fi',
      ja: 'SF',
      zh: '科幻'
    }
  },
  descriptions: {
    'AI가 그린 환상적인 판타지 세계': {
      en: 'A fantastic fantasy world drawn by AI',
      ja: 'AIが描いた幻想的なファンタジーの世界',
      zh: 'AI绘制的奇幻世界'
    },
    '운명적인 사랑 이야기': {
      en: 'A fateful love story',
      ja: '運命的な恋物語',
      zh: '命运般的爱情故事'
    },
    '최강의 영웅이 되기 위한 여정': {
      en: 'A journey to become the strongest hero',
      ja: '最強のヒーローになるための旅',
      zh: '成为最强英雄的旅程'
    }
  }
};

// Helper function to translate content
function translateContent(content, targetLanguage, contentType = 'webtoons') {
  // If target language is Korean or not specified, return original
  if (!targetLanguage || targetLanguage === 'ko') {
    return content;
  }

  // Check if translation exists
  if (translations[contentType] && translations[contentType][content]) {
    const translation = translations[contentType][content][targetLanguage];
    return translation || content;
  }

  // Return original if no translation found
  return content;
}

// Translate a single comic object
function translateComic(comic, language) {
  if (!comic || language === 'ko') return comic;

  return {
    ...comic,
    title: translateContent(comic.title, language, 'webtoons'),
    description: translateContent(comic.description, language, 'descriptions'),
    genre: comic.genre ? comic.genre.map(g => translateContent(g, language, 'genres')) : []
  };
}

// Translate an array of comics
function translateComics(comics, language) {
  if (!comics || language === 'ko') return comics;
  return comics.map(comic => translateComic(comic, language));
}

// Translate a single episode object
function translateEpisode(episode, language) {
  if (!episode || language === 'ko') return episode;

  // For now, we'll just translate the comic info if it exists
  if (episode.comic) {
    episode.comic = translateComic(episode.comic, language);
  }

  // In production, episode titles and descriptions would also be translated
  return episode;
}

// Translate an array of episodes
function translateEpisodes(episodes, language) {
  if (!episodes || language === 'ko') return episodes;
  return episodes.map(episode => translateEpisode(episode, language));
}

// 국가별 인증 및 설정 관리
const countryConfigs = {
  'KR': {
    language: 'ko',
    authMethods: ['email', 'kakao', 'naver', 'google'], // 한국만 모든 방식
    allowAdultContent: true,
    paymentMethods: ['kakaopay', 'card'],
    currency: 'KRW',
    ageVerification: {
      required: true,
      method: 'phone',
      service: 'NICE평가정보'
    }
  },
  'US': {
    language: 'en',
    authMethods: ['google'], // 해외는 구글만
    allowAdultContent: true,
    paymentMethods: ['stripe', 'paypal'],
    currency: 'USD',
    ageVerification: {
      required: true,
      method: 'credit_card'
    }
  },
  'JP': {
    language: 'ja',
    authMethods: ['google'],
    allowAdultContent: true,
    paymentMethods: ['stripe_jp', 'konbini'],
    currency: 'JPY',
    ageVerification: {
      required: true,
      method: 'external_service',
      service: 'Age Check Japan'
    }
  },
  'CN': {
    language: 'zh',
    authMethods: ['google'],
    allowAdultContent: false, // 중국은 성인 콘텐츠 차단
    paymentMethods: ['alipay', 'wechatpay'],
    currency: 'CNY',
    ageVerification: {
      required: true,
      method: 'id_card'
    }
  },
  // 기타 국가들은 기본 영어 + 구글 로그인
  'TW': { language: 'zh', authMethods: ['google'], allowAdultContent: true, paymentMethods: ['stripe_tw'], currency: 'TWD' },
  'TH': { language: 'en', authMethods: ['google'], allowAdultContent: false, paymentMethods: ['stripe_th'], currency: 'THB' },
  'VN': { language: 'en', authMethods: ['google'], allowAdultContent: false, paymentMethods: ['stripe_vn'], currency: 'VND' },
  'IN': { language: 'en', authMethods: ['google'], allowAdultContent: false, paymentMethods: ['razorpay'], currency: 'INR' },
  'ID': { language: 'en', authMethods: ['google'], allowAdultContent: false, paymentMethods: ['stripe_id'], currency: 'IDR' },
  'PH': { language: 'en', authMethods: ['google'], allowAdultContent: false, paymentMethods: ['stripe_ph'], currency: 'PHP' },
};

// 요청에서 국가 코드 추출
function getCountryFromRequest(req) {
  // 헤더에서 국가 정보 확인 (프론트엔드에서 설정)
  const countryHeader = req.headers['x-user-country'];
  if (countryHeader && countryConfigs[countryHeader]) {
    return countryHeader;
  }
  
  // URL 서브도메인에서 추출 (kr.arata.co.kr -> KR)
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && countryConfigs[subdomain.toUpperCase()]) {
    return subdomain.toUpperCase();
  }
  
  // 기본값은 한국
  return 'KR';
}

// 국가별 설정 가져오기
function getCountryConfig(countryCode) {
  return countryConfigs[countryCode] || countryConfigs['KR'];
}

// 국가별 로그인 방식 검증
function isLoginMethodAllowed(countryCode, method) {
  const config = getCountryConfig(countryCode);
  return config.authMethods.includes(method);
}

// 국가별 성인 콘텐츠 필터링
function filterAdultContentByCountry(comics, countryCode) {
  const config = getCountryConfig(countryCode);
  
  if (config.allowAdultContent) {
    return comics; // 성인 콘텐츠 허용 국가
  }
  
  // 성인 콘텐츠 차단 국가 - 필터링
  return comics.filter(comic => 
    comic.genre !== 'adult' && 
    (!comic.ageRating || comic.ageRating === 'all' || parseInt(comic.ageRating) < 19)
  );
}

module.exports = {
  translateContent,
  translateComic,
  translateComics,
  translateEpisode,
  translateEpisodes,
  
  // 새로 추가된 국가별 기능
  getCountryFromRequest,
  getCountryConfig,
  isLoginMethodAllowed,
  filterAdultContentByCountry,
  countryConfigs
};