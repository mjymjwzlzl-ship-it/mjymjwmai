// 신고 사유 (대상별). 예전 사유 값(COPYRIGHT·VIOLENCE 등)도 이름표는 남겨 둔다.
const REASONS = {
  COMMENT: { ABUSE: '욕설·비방', SPAM: '도배·광고', SPOILER: '스포일러', INAPPROPRIATE: '부적절한 내용', OTHER: '기타' },
  USER: { ABUSE: '욕설·비방', SPAM: '도배·광고', INAPPROPRIATE: '부적절한 활동', OTHER: '기타' },
  // 작품·회차: 감상 중 문제 제보
  COMIC: { CONTENT_ERROR: '작품 오류', IMAGE_BROKEN: '이미지 누락·깨짐', TYPO: '오탈자', EPISODE_ORDER: '회차 내용·순서 오류', INAPPROPRIATE: '부적절한 콘텐츠', OTHER: '기타 문의' },
};
REASONS.EPISODE = REASONS.COMIC;

const LEGACY = { COPYRIGHT: '저작권 침해', VIOLENCE: '폭력적인 콘텐츠', ADULT: '성인물 노출', HATE: '혐오 발언', PRIVACY: '개인정보 노출', ILLEGAL: '불법 콘텐츠' };
const reasonLabel = (type, reason) => REASONS[type]?.[reason] || LEGACY[reason] || REASONS.COMIC[reason] || REASONS.COMMENT[reason] || reason;

const TYPE_LABEL = { COMIC: '작품', EPISODE: '회차', COMMENT: '댓글', USER: '사용자' };
const STATUS_LABEL = { PENDING: '접수', PROCESSING: '확인 중', RESOLVED: '처리 완료', REJECTED: '반려' };

module.exports = { REASONS, reasonLabel, TYPE_LABEL, STATUS_LABEL };
