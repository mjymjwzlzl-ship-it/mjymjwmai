export type ReferenceComic = {
  id: string;
  title: string;
  author: string;
  image: string;
  synopsis: string;
  updatedAt: string;
  views: number;
  likes: number;
  tags: string[];
  isNew?: boolean;
};

export const referenceComics: ReferenceComic[] = [
  {
    id: 'ref-1',
    title: '좋아하는 사람이 생겼다!',
    author: '박작가',
    image: 'https://picsum.photos/seed/arata-romance/800/450',
    synopsis: '어느 날 갑자기 찾아온 설렘. 평범한 여고생에게 찾아온 첫사랑의 두근거림을 그린 달콤한 학원 로맨스.',
    updatedAt: '11:06',
    views: 1749,
    likes: 520,
    tags: ['로맨스', '학원', '순정'],
    isNew: true,
  },
  {
    id: 'ref-2',
    title: '그 꽃은 아름답습니다',
    author: '김스토리',
    image: 'https://picsum.photos/seed/arata-flower/800/450',
    synopsis: '삭막한 도시 속, 작은 꽃집을 운영하는 주인공과 그곳을 찾는 사람들의 따뜻하고 감동적인 이야기.',
    updatedAt: '11:02',
    views: 936,
    likes: 310,
    tags: ['드라마', '감동', '일상'],
  },
  {
    id: 'ref-3',
    title: '용사와 공주',
    author: '판타지마스터',
    image: 'https://picsum.photos/seed/arata-fantasy/800/450',
    synopsis: '마왕에게 납치된 공주를 구하기 위해 떠나는 용사의 모험. 하지만 공주에게는 엄청난 비밀이 숨겨져 있는데...',
    updatedAt: '11:01',
    views: 870,
    likes: 0,
    tags: ['판타지', '모험', '액션'],
  },
  {
    id: 'ref-4',
    title: '우리집 강아지',
    author: '멍멍이',
    image: 'https://picsum.photos/seed/arata-puppy/800/450',
    synopsis: '말썽꾸러기 강아지 두부와 초보 견주가 함께하는 좌충우돌 일상 코미디.',
    updatedAt: '10:58',
    views: 412,
    likes: 800,
    tags: ['일상', '개그', '동물'],
  },
  {
    id: 'ref-5',
    title: '옆집의 그 녀석',
    author: '신사',
    image: 'https://picsum.photos/seed/arata-neighbor/800/450',
    synopsis: '새로 이사 온 옆집 남자가 알고 보니 내 상사?! 회사와 집을 오가는 아슬아슬한 이중생활 로맨스.',
    updatedAt: '10:57',
    views: 752,
    likes: 150,
    tags: ['로맨스', '현대물'],
  },
  {
    id: 'ref-6',
    title: '돌아온 럭키짱',
    author: '김학백',
    image: 'https://picsum.photos/seed/arata-action/800/450',
    synopsis: '전설의 싸움짱이 돌아왔다. 더 이상의 설명은 생략한다. 근성으로 승부하는 사나이들의 뜨거운 액션.',
    updatedAt: '10:55',
    views: 50000,
    likes: 120,
    tags: ['액션', '학원', '근성'],
  },
  {
    id: 'ref-7',
    title: '이세계 용사님',
    author: '트럭',
    image: 'https://picsum.photos/seed/arata-isekai/800/450',
    synopsis: '트럭에 치여 눈을 떠보니 이세계?! 치트 능력을 가진 용사가 되어 세상을 구하고 하렘을 건설하라!',
    updatedAt: '10:50',
    views: 1200,
    likes: 12,
    tags: ['이세계', '판타지', '하렘'],
  },
  {
    id: 'ref-8',
    title: '고교 싸움짱',
    author: '주먹',
    image: 'https://picsum.photos/seed/arata-school/800/450',
    synopsis: '전국 최강의 고교생을 가리는 배틀 로얄. 주먹 하나로 정상을 향해 달려가는 소년의 성장기.',
    updatedAt: '09:30',
    views: 3400,
    likes: 45,
    tags: ['액션', '학원'],
  },
  {
    id: 'ref-9',
    title: '달콤한 신혼생활',
    author: '허니',
    image: 'https://picsum.photos/seed/arata-marriage/800/450',
    synopsis: '계약 결혼으로 시작된 두 사람의 관계. 하지만 점점 서로에게 빠져드는데... 달콤쌉쌀한 신혼 일기.',
    updatedAt: '09:15',
    views: 2100,
    likes: 88,
    tags: ['로맨스', '결혼'],
  },
  {
    id: 'ref-10',
    title: '공포의 저택',
    author: '스크림',
    image: 'https://picsum.photos/seed/arata-horror/800/450',
    synopsis: '숲속의 낡은 저택에 갇힌 사람들. 하나둘씩 사라지는 일행과 밝혀지는 저택의 끔찍한 비밀.',
    updatedAt: '08:40',
    views: 560,
    likes: 20,
    tags: ['스릴러', '공포'],
  },
];

export const referenceBanners = [
  {
    id: 'banner-subscription',
    title: '첫 달 990원',
    subtitle: '연간 결제 시 월 2,800원',
    imageUrl: 'https://picsum.photos/seed/arata-banner-green/960/600',
    href: '/payment',
    badge: 'VIP',
  },
  {
    id: 'banner-update',
    title: '매일 새로운 웹툰',
    subtitle: '기다림 없이 무제한 감상',
    imageUrl: 'https://picsum.photos/seed/arata-banner-update/960/600',
    href: '/daily',
    badge: 'NEW',
  },
  {
    id: 'banner-complete',
    title: '일반부터 완전판까지',
    subtitle: '성인 인증 영역은 별도 분리',
    imageUrl: 'https://picsum.photos/seed/arata-banner-premium/960/600',
    href: '/adult',
    badge: 'ONLY',
  },
  {
    id: 'banner-fan',
    title: '인기작 시즌2 응원',
    subtitle: '좋아하는 작품을 직접 밀어주세요',
    imageUrl: 'https://picsum.photos/seed/arata-banner-fan/960/600',
    href: '/chat',
    badge: 'FAN',
  },
];
