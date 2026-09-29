// 이메일 유효성 검사
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 비밀번호 강도 검사
function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다.');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다.');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 포함해야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 날짜 포맷팅
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// 상대 시간 표시
function formatRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  } else {
    return formatDate(target);
  }
}

// 숫자 포맷팅 (1000 -> 1K)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 페이지네이션 계산
function calculatePagination(currentPage, totalItems, pageSize) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);
  
  return {
    totalPages,
    startIndex,
    endIndex,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

// 슬러그 생성 (URL용)
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, ''); // 시작/끝 하이픈 제거
}

module.exports = {
  isValidEmail,
  validatePassword,
  formatDate,
  formatRelativeTime,
  formatNumber,
  calculatePagination,
  generateSlug
};