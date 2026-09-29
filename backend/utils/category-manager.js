const fs = require('fs');
const path = require('path');

// 카테고리 설정 파일 경로
const CATEGORY_FILES = {
  general: path.join(__dirname, '../data/category-settings.json'),
  adult: path.join(__dirname, '../data/adult-category-settings.json'),
  englishGeneral: path.join(__dirname, '../data/english-category-settings.json'),
  englishAdult: path.join(__dirname, '../data/english-adult-category-settings.json')
};

/**
 * 카테고리 설정 파일 읽기
 */
function loadCategoryFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`카테고리 파일 읽기 오류 (${filePath}):`, error.message);
  }

  // 기본 구조 반환
  return {
    banner: [],
    realtime: [],
    daily: [],
    week: [],
    complete: [],
    latest: [],
    new: [],
    finished: []
  };
}

/**
 * 카테고리 설정 파일 저장
 */
function saveCategoryFile(filePath, settings) {
  try {
    // data 디렉토리가 없으면 생성
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`카테고리 파일 저장 오류 (${filePath}):`, error.message);
    return false;
  }
}

/**
 * 웹툰 ID가 카테고리에 이미 있는지 확인
 */
function isInCategory(settings, webtoonId) {
  const categories = ['banner', 'realtime', 'daily', 'week', 'complete', 'latest', 'new', 'finished'];

  for (const category of categories) {
    if (Array.isArray(settings[category]) && settings[category].includes(webtoonId)) {
      return category;
    }
  }

  return null;
}

/**
 * 웹툰을 적절한 카테고리에 자동 추가
 * @param {string} webtoonId - 웹툰 ID
 * @param {string} rating - 연령 등급 ('19', 'adult', 'all', etc.)
 * @param {string} locale - 언어 ('ko', 'en')
 * @param {string} category - 추가할 카테고리 (기본값: 'new')
 * @returns {object} 결과 { success: boolean, message: string, file: string }
 */
function addToCategory(webtoonId, rating = 'all', locale = 'ko', category = 'new') {
  try {
    // rating과 locale에 따라 적절한 파일 선택
    let filePath;
    let fileType;

    const isAdult = (rating === '19' || rating === 'adult');
    const isEnglish = (locale === 'en');

    if (isEnglish && isAdult) {
      filePath = CATEGORY_FILES.englishAdult;
      fileType = 'english-adult';
    } else if (isEnglish) {
      filePath = CATEGORY_FILES.englishGeneral;
      fileType = 'english-general';
    } else if (isAdult) {
      filePath = CATEGORY_FILES.adult;
      fileType = 'adult';
    } else {
      filePath = CATEGORY_FILES.general;
      fileType = 'general';
    }

    // 파일 읽기
    const settings = loadCategoryFile(filePath);

    // 이미 카테고리에 있는지 확인
    const existingCategory = isInCategory(settings, webtoonId);
    if (existingCategory) {
      console.log(`✓ 웹툰 ${webtoonId}는 이미 ${fileType} 파일의 '${existingCategory}' 카테고리에 있습니다.`);
      return {
        success: true,
        message: `웹툰이 이미 '${existingCategory}' 카테고리에 있습니다.`,
        file: fileType,
        category: existingCategory
      };
    }

    // 지정된 카테고리가 없으면 생성
    if (!settings[category]) {
      settings[category] = [];
    }

    // 웹툰 ID 추가 (중복 방지)
    if (!settings[category].includes(webtoonId)) {
      settings[category].push(webtoonId);

      // 파일 저장
      const saved = saveCategoryFile(filePath, settings);

      if (saved) {
        console.log(`✓ 웹툰 ${webtoonId}를 ${fileType} 파일의 '${category}' 카테고리에 추가했습니다.`);
        return {
          success: true,
          message: `웹툰이 '${category}' 카테고리에 추가되었습니다.`,
          file: fileType,
          category: category
        };
      } else {
        return {
          success: false,
          message: '카테고리 파일 저장에 실패했습니다.',
          file: fileType
        };
      }
    } else {
      return {
        success: true,
        message: `웹툰이 이미 '${category}' 카테고리에 있습니다.`,
        file: fileType,
        category: category
      };
    }

  } catch (error) {
    console.error('카테고리 추가 오류:', error);
    return {
      success: false,
      message: `카테고리 추가 중 오류: ${error.message}`
    };
  }
}

/**
 * 웹툰을 카테고리에서 제거
 * @param {string} webtoonId - 웹툰 ID
 * @param {string} rating - 연령 등급
 * @param {string} locale - 언어
 * @returns {object} 결과
 */
function removeFromCategory(webtoonId, rating = 'all', locale = 'ko') {
  try {
    // rating과 locale에 따라 적절한 파일 선택
    let filePath;
    let fileType;

    const isAdult = (rating === '19' || rating === 'adult');
    const isEnglish = (locale === 'en');

    if (isEnglish && isAdult) {
      filePath = CATEGORY_FILES.englishAdult;
      fileType = 'english-adult';
    } else if (isEnglish) {
      filePath = CATEGORY_FILES.englishGeneral;
      fileType = 'english-general';
    } else if (isAdult) {
      filePath = CATEGORY_FILES.adult;
      fileType = 'adult';
    } else {
      filePath = CATEGORY_FILES.general;
      fileType = 'general';
    }

    // 파일 읽기
    const settings = loadCategoryFile(filePath);

    // 모든 카테고리에서 제거
    let removed = false;
    const categories = ['banner', 'realtime', 'daily', 'week', 'complete', 'latest', 'new', 'finished'];

    for (const category of categories) {
      if (Array.isArray(settings[category])) {
        const index = settings[category].indexOf(webtoonId);
        if (index > -1) {
          settings[category].splice(index, 1);
          removed = true;
          console.log(`✓ 웹툰 ${webtoonId}를 ${fileType} 파일의 '${category}' 카테고리에서 제거했습니다.`);
        }
      }
    }

    if (removed) {
      // 파일 저장
      const saved = saveCategoryFile(filePath, settings);

      if (saved) {
        return {
          success: true,
          message: '웹툰이 모든 카테고리에서 제거되었습니다.',
          file: fileType
        };
      } else {
        return {
          success: false,
          message: '카테고리 파일 저장에 실패했습니다.',
          file: fileType
        };
      }
    } else {
      return {
        success: true,
        message: '웹툰이 카테고리에 없습니다.',
        file: fileType
      };
    }

  } catch (error) {
    console.error('카테고리 제거 오류:', error);
    return {
      success: false,
      message: `카테고리 제거 중 오류: ${error.message}`
    };
  }
}

module.exports = {
  addToCategory,
  removeFromCategory,
  CATEGORY_FILES
};
