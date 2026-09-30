// 관리자 센터 메뉴 구조 (상단 메뉴바 8개 + 메뉴별 세부 탭)
// 작품 정보 = 작품 관리 / 게시판 = 커뮤니티 관리 / 사용자 화면에 어떻게 보여 줄지 = 노출 관리 / 혜택 = 프로모션 / 돈 = 결제 관리 / 회원 = 사용자 관리 / 운영 결과 = 통계
export interface NavTab { label: string; href: string }
export interface NavGroup { key: string; label: string; href: string; match: string[]; tabs: NavTab[] }

export const NAV: NavGroup[] = [
  { key: 'dashboard', label: '대시보드', href: '/', match: [], tabs: [] },
  { key: 'works', label: '작품 관리', href: '/works', match: ['/works', '/comic-status', '/novels'], tabs: [{ label: '작품 목록', href: '/works' }] },
  {
    key: 'community', label: '커뮤니티 관리', href: '/community', match: ['/community'],
    tabs: [
      { label: '게시판 관리', href: '/community' },
      { label: '게시글 관리', href: '/community/posts' },
      { label: '댓글 관리', href: '/community/comments' },
      { label: '카테고리 관리', href: '/community/categories' },
    ],
  },
  {
    key: 'exposure', label: '노출 관리', href: '/exposure', match: ['/exposure', '/banners', '/popular'],
    tabs: [
      { label: '홈 화면 섹션', href: '/exposure?tab=sections' },
      { label: '배너 관리', href: '/banners' },
      { label: '오늘의 추천작', href: '/exposure?tab=today' },
      { label: '추천 신작', href: '/exposure?tab=new' },
      { label: '인기 작품', href: '/exposure?tab=popular' },
      { label: '실시간 랭킹', href: '/exposure?tab=realtime' },
      { label: '자동 분류(요일·완결·신작·최신)', href: '/exposure?tab=auto' },
    ],
  },
  {
    key: 'promotion', label: '프로모션', href: '/events', match: ['/events', '/promotions', '/benefits'],
    tabs: [
      { label: '이벤트 관리', href: '/events' },
      { label: '할인·무료 작품', href: '/promotions' },
      { label: '쿠폰', href: '/benefits#coupons' },
      { label: '선물함 지급', href: '/benefits#gifts' },
    ],
  },
  {
    key: 'payment', label: '결제 관리', href: '/payment', match: ['/payment', '/payments'],
    tabs: [
      { label: '작품별 대여·소장 가격', href: '/payment' },
      { label: '코인 가격', href: '/payments/coins' },
      { label: '결제 내역', href: '/payments/history' },
      { label: '구매·대여 내역', href: '/payments/purchases' },
      { label: '환불 관리', href: '/payments/refunds' },
    ],
  },
  {
    key: 'users', label: '사용자 관리', href: '/users', match: ['/users', '/adult-settings', '/support'],
    tabs: [
      { label: '회원 목록', href: '/users' },
      { label: '성인 인증 설정', href: '/adult-settings' },
      { label: '고객센터', href: '/support' },
    ],
  },
  { key: 'reports', label: '신고 관리', href: '/reports', match: ['/reports'], tabs: [] },
  { key: 'stats', label: '통계', href: '/stats', match: ['/stats'], tabs: [] },
];

export function groupOf(pathname: string): NavGroup {
  if (pathname === '/' || pathname === '') return NAV[0];
  return NAV.find((g) => g.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))) || NAV[0];
}
