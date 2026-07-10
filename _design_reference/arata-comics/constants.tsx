import { Webtoon, MenuItem, BoardPost, CharacterProfile, ShortsVideo } from './types';
import { Home, Coins, Gamepad2, Library, MessageCircle, BookOpen, ClipboardList, Image, PlaySquare } from 'lucide-react';
import React from 'react';

export const MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: '홈', path: '/', icon: <Home size={20} /> },
  { id: 'unlimited', label: '무제한 웹툰', path: '/unlimited', icon: <Library size={20} /> },
  { id: 'novel', label: '소설', path: '/novel', icon: <BookOpen size={20} /> },
  { id: 'gallery', label: '화보', path: '/gallery', icon: <Image size={20} /> },
  { id: 'shorts', label: '숏추', path: '/shorts', icon: <PlaySquare size={20} /> },
  { id: 'board', label: '게시판', path: '/board', icon: <ClipboardList size={20} /> },
  { id: 'chat', label: '아라챗', path: '/chat', icon: <MessageCircle size={20} /> },
  { id: 'game', label: '게임', path: '/game', icon: <Gamepad2 size={20} /> },
];

export const CATEGORIES_ADULT = [
  "전체", "실시간", "무삭제", "누나", "가터벨트", "사촌", "엄마", "여동생", "제복", "OL", "유부녀", "NTR"
];

export const CATEGORIES_GENERAL = [
  "전체", "실시간", "로맨스", "판타지", "액션", "무협", "드라마", "학원", "코미디", "스릴러", "스포츠", "일상"
];

export const NOTICE_DATA = [
    { id: 1, title: "[안내] '아침식사 됩니다' 서비스 종료 예정 안내", date: "2026.01.15" },
    { id: 2, title: "[안내] 'S급 나무로 레벨업' 연재 주기 변경 안내", date: "2026.01.09" },
    { id: 3, title: "[안내] '요염 유령의 집착' 서비스 종료 예정 안내", date: "2025.12.19" },
    { id: 4, title: "[안내] '그녀는 실시간 검색어 1위' 서비스 종료 예정 안내", date: "2025.12.18" },
    { id: 5, title: "[안내] '초초수련천년' 연재 주기 변경 안내", date: "2025.12.04" },
    { id: 6, title: "[안내] '대표님과 하룻밤을 보냈습니다' 외 5작품 서비스 종료 예정 안내", date: "2025.11.26" },
    { id: 7, title: "[안내] '그라운드 제로' 서비스 종료 예정 안내", date: "2025.11.25" },
    { id: 8, title: "[안내] '나는 최약체 드래곤 테이머' 연재 주기 변경 안내", date: "2025.11.25" },
    { id: 9, title: "[안내] '대표님 진도가 너무 빨라요' 서비스 종료 예정 안내", date: "2025.10.21" },
    { id: 10, title: "[안내] '마녀 따위 안 할래요' 서비스 종료 예정 안내", date: "2025.09.30" },
];

// Generates placeholder data mimicking the layout style
export const LATEST_WEBTOONS: Webtoon[] = [
  // --- General Webtoons (isAdult: undefined or false) ---
  {
    id: '1',
    title: '좋아하는 사람이 생겼다!',
    thumbnail: 'https://picsum.photos/400/225?random=1',
    author: '박작가',
    isNew: true,
    views: 1749,
    updatedAt: "11:06",
    likes: 520,
    tags: ["로맨스", "학원", "순정"],
    synopsis: "어느 날 갑자기 찾아온 설렘. 평범한 여고생에게 찾아온 첫사랑의 두근거림을 그린 달콤한 학원 로맨스.",
    freeType: 'completely_free'
  },
  {
    id: '2',
    title: '그 꽃은 아름답습니다',
    thumbnail: 'https://picsum.photos/400/225?random=2',
    author: '김스토리',
    views: 936,
    updatedAt: "11:02",
    likes: 310,
    tags: ["드라마", "감동", "일상"],
    synopsis: "삭막한 도시 속, 작은 꽃집을 운영하는 주인공과 그곳을 찾는 사람들의 따뜻하고 감동적인 이야기.",
    freeType: 'first_episode_free'
  },
  {
    id: '4',
    title: '용사와 공주',
    thumbnail: 'https://picsum.photos/400/225?random=4',
    author: '판타지마스터',
    views: 870,
    updatedAt: "11:01",
    tags: ["판타지", "모험", "액션"],
    synopsis: "마왕에게 납치된 공주를 구하기 위해 떠나는 용사의 모험! 하지만 공주에게는 엄청난 비밀이 숨겨져 있는데...",
    freeType: 'completely_free'
  },
  {
    id: '6',
    title: '우리집 강아지',
    thumbnail: 'https://picsum.photos/400/225?random=6',
    author: '멍멍이',
    views: 412,
    updatedAt: "10:58",
    likes: 800,
    tags: ["일상", "개그", "동물"],
    synopsis: "말썽꾸러기 강아지 '두부'와 초보 견주가 함께하는 좌충우돌 일상 코미디.",
    freeType: 'first_episode_free'
  },
  {
    id: '7',
    title: '옆집의 그 녀석',
    thumbnail: 'https://picsum.photos/400/225?random=7',
    author: '신사',
    views: 752,
    updatedAt: "10:57",
    likes: 150,
    tags: ["로맨스", "현대물"],
    synopsis: "새로 이사 온 옆집 남자가 알고 보니 내 상사?! 회사와 집을 오가는 아슬아슬한 이중생활 로맨스.",
    freeType: 'completely_free'
  },
  {
    id: '9',
    title: '돌아온 럭키짱',
    thumbnail: 'https://picsum.photos/400/225?random=9',
    author: '김화백',
    views: 50000,
    updatedAt: "10:55",
    likes: 120,
    tags: ["액션", "학원", "근성"],
    synopsis: "전설의 싸움짱이 돌아왔다! 더 이상의 설명은 생략한다. 근성으로 승부하는 사나이들의 뜨거운 액션."
  },
  {
    id: '10',
    title: '이세계 용사님',
    thumbnail: 'https://picsum.photos/400/225?random=10',
    author: '트럭',
    views: 1200,
    updatedAt: "10:50",
    likes: 12,
    tags: ["이세계", "판타지", "하렘"],
    synopsis: "트럭에 치여 눈을 떠보니 이세계?! 치트 능력을 가진 용사가 되어 세상을 구하고 하렘을 건설하라!"
  },
  {
    id: '11',
    title: '고교 싸움짱',
    thumbnail: 'https://picsum.photos/400/225?random=11',
    author: '주먹',
    views: 3400,
    updatedAt: "09:30",
    likes: 45,
    tags: ["액션", "학원"],
    synopsis: "전국 최강의 고교생을 가리는 배틀 로얄. 주먹 하나로 정상을 향해 달려가는 소년의 성장기."
  },
  {
    id: '12',
    title: '달콤한 신혼생활',
    thumbnail: 'https://picsum.photos/400/225?random=12',
    author: '허니',
    views: 2100,
    updatedAt: "09:15",
    likes: 88,
    tags: ["로맨스", "결혼"],
    synopsis: "계약 결혼으로 시작된 두 사람의 관계. 하지만 점점 서로에게 빠져드는데... 달콤살벌한 신혼 일기."
  },
  {
    id: '13',
    title: '공포의 저택',
    thumbnail: 'https://picsum.photos/400/225?random=13',
    author: '스크림',
    views: 560,
    updatedAt: "08:40",
    likes: 20,
    tags: ["스릴러", "공포"],
    synopsis: "숲속의 낡은 저택에 갇힌 사람들. 하나둘씩 사라지는 일행과 밝혀지는 저택의 끔찍한 비밀."
  },

  // --- Adult Webtoons (isAdult: true) ---
  {
    id: 'a1',
    title: '나의 위험한 소악마',
    thumbnail: 'https://picsum.photos/400/225?random=3',
    author: '이그림',
    isAdult: true,
    views: 4660,
    updatedAt: "11:01",
    likes: 1200,
    tags: ["거유", "소악마", "판타지", "mameko"],
    synopsis: "순진한 주인공 앞에 나타난 매혹적인 서큐버스. 그녀의 유혹을 뿌리칠 수 있을까?"
  },
  {
    id: 'a2',
    title: '음란한 웨이트리스',
    thumbnail: 'https://picsum.photos/400/225?random=5',
    author: '카페인',
    isAdult: true,
    views: 8460,
    updatedAt: "10:59",
    likes: 2300,
    tags: ["거유", "웨이트리스", "팬티스타킹", "유니폼"],
    synopsis: "평범해 보이는 카페의 비밀스러운 서비스. 웨이트리스들의 은밀한 사생활이 공개된다."
  },
  {
    id: 'a3',
    title: '숙녀 모노로그 Fake mom',
    thumbnail: 'https://picsum.photos/400/225?random=8',
    author: '드라마퀸',
    isAdult: true,
    views: 11220,
    updatedAt: "10:56",
    likes: 4500,
    tags: ["거유", "미시", "밀프", "드라마"],
    synopsis: "재혼한 아버지의 새 아내. 그녀가 나를 보는 눈빛이 심상치 않다. 위험한 관계의 시작."
  },
  {
    id: 'a4',
    title: '새엄마의 친구들',
    thumbnail: 'https://picsum.photos/400/225?random=30',
    author: '탑툰',
    isAdult: true,
    views: 45000,
    updatedAt: "12:00",
    likes: 5600,
    tags: ["미시", "불륜", "드라마"],
    synopsis: "새엄마와 그녀의 매력적인 친구들. 주인공을 둘러싼 그녀들의 아찔한 유혹."
  },
  {
    id: 'a5',
    title: '비밀 수업',
    thumbnail: 'https://picsum.photos/400/225?random=31',
    author: '가나다',
    isAdult: true,
    views: 32000,
    updatedAt: "11:50",
    likes: 4100,
    tags: ["과외", "하렘", "성장"],
    synopsis: "고아인 나를 거두어준 집의 누나와 아주머니. 어느 날 밤, 그녀들의 비밀 수업이 시작된다."
  },
  {
    id: 'a6',
    title: '집주인 딸내미',
    thumbnail: 'https://picsum.photos/400/225?random=32',
    author: '활화산',
    isAdult: true,
    views: 28000,
    updatedAt: "11:40",
    likes: 3900,
    tags: ["자취", "로맨스", "캠퍼스"],
    synopsis: "월세를 깎아주는 대신 집주인 딸의 과외를 맡게 되었다. 그런데 공부보다 다른 것에 관심이 더 많은데..."
  },
  {
    id: 'a7',
    title: '동네 누나',
    thumbnail: 'https://picsum.photos/400/225?random=33',
    author: '타르',
    isAdult: true,
    views: 25000,
    updatedAt: "11:30",
    likes: 3200,
    tags: ["누나", "순애", "드라마"],
    synopsis: "어릴 적부터 친하게 지내던 동네 누나. 어느새 여자가 되어버린 그녀와의 미묘한 관계 변화."
  },
  {
    id: 'a8',
    title: '멋진 신세계',
    thumbnail: 'https://picsum.photos/400/225?random=34',
    author: '윤곤지',
    isAdult: true,
    views: 21000,
    updatedAt: "11:20",
    likes: 2800,
    tags: ["오피스", "상사", "협박"],
    synopsis: "대기업 팀장의 약점을 잡게 된 신입사원. 회사 안에서 벌어지는 은밀하고 대담한 오피스 라이프."
  },
  {
    id: 'a9',
    title: '작은 전쟁',
    thumbnail: 'https://picsum.photos/400/225?random=35',
    author: '스튜디오',
    isAdult: true,
    views: 18000,
    updatedAt: "11:10",
    likes: 2100,
    tags: ["액션", "느와르", "복수"],
    synopsis: "뒷골목을 지배하는 조직 간의 전쟁. 그 속에서 피어나는 배신과 복수, 그리고 사랑."
  },
  {
    id: 'a10',
    title: '성적 취향',
    thumbnail: 'https://picsum.photos/400/225?random=36',
    author: '체리',
    isAdult: true,
    views: 15000,
    updatedAt: "11:00",
    likes: 1900,
    tags: ["BDSM", "조교", "SM"],
    synopsis: "완벽해 보이는 그녀의 은밀한 취미. 우연히 그 비밀을 알게 된 나는 그녀의 장난감이 되었다."
  },
  {
    id: 'a11',
    title: '여대생 룸메이트',
    thumbnail: 'https://picsum.photos/400/225?random=37',
    author: '피치',
    isAdult: true,
    views: 12000,
    updatedAt: "10:50",
    likes: 1500,
    tags: ["캠퍼스", "동거", "로맨스"],
    synopsis: "월세를 아끼기 위해 시작한 쉐어하우스 생활. 미모의 여대생들과 함께하는 두근두근 동거 일기."
  },
  {
    id: 'a12',
    title: '헬스장 그녀',
    thumbnail: 'https://picsum.photos/400/225?random=38',
    author: '머슬',
    isAdult: true,
    views: 9800,
    updatedAt: "10:40",
    likes: 1200,
    tags: ["운동", "레깅스", "유혹"],
    synopsis: "매일 헬스장에서 마주치는 레깅스 여신. 운동을 가르쳐주며 가까워지는 두 사람의 끈적한 관계."
  }
];

export const LATEST_NOVELS: Webtoon[] = [
    {
        id: 'n1',
        title: '재벌집 막내아들 [독점]',
        thumbnail: 'https://picsum.photos/400/225?random=20',
        author: '산경',
        views: 15230,
        updatedAt: "12:00",
        likes: 540,
        tags: ["현대판타지", "회귀", "복수", "재벌"],
        synopsis: "재벌가 비서에서 막내아들로 회귀하다! 미래의 기억을 이용해 순양그룹을 집어삼키려는 윤현우의 복수극."
    },
    {
        id: 'n2',
        title: '전지적 독자 시점',
        thumbnail: 'https://picsum.photos/400/225?random=21',
        author: '싱숑',
        views: 24100,
        updatedAt: "11:45",
        likes: 1200,
        tags: ["판타지", "성좌", "아포칼립스"],
        synopsis: "10년 동안 연재된 소설의 결말을 아는 유일한 독자. 멸망한 세상에서 소설의 내용을 이용해 살아남아라!"
    },
    {
        id: 'n3',
        title: '나 혼자만 레벨업',
        thumbnail: 'https://picsum.photos/400/225?random=22',
        author: '추공',
        views: 32000,
        updatedAt: "11:30",
        likes: 2400,
        tags: ["헌터", "성장", "먼치킨"],
        synopsis: "인류 최약병기 E급 헌터 성진우. 죽음의 위기에서 얻은 기이한 능력으로 혼자서만 레벨업을 시작한다."
    },
    {
        id: 'n4',
        title: '달빛 조각사',
        thumbnail: 'https://picsum.photos/400/225?random=23',
        author: '남희성',
        views: 8900,
        updatedAt: "11:00",
        likes: 340,
        tags: ["게임판타지", "노가다", "전설"],
        synopsis: "가난에서 벗어나기 위해 게임을 시작했다. 노가다로 다져진 근성과 조각술로 전설의 직업을 얻게 되는데..."
    },
    {
        id: 'n5',
        title: '화산귀환',
        thumbnail: 'https://picsum.photos/400/225?random=24',
        author: '비가',
        views: 45000,
        updatedAt: "10:55",
        likes: 3100,
        tags: ["무협", "환생", "개그"],
        synopsis: "대화산파 13대 제자 청명. 천마의 목을 치고 백 년 뒤의 아이로 환생했다. 망해버린 화산파를 다시 일으켜 세워라!"
    }
];

export const BOARD_POSTS: BoardPost[] = [
    { id: 101, title: '아라타 코믹스 정식 오픈 기념 이벤트 안내', author: '관리자', date: '2024.03.20', views: 5420, isNotice: true, category: '공지', commentCount: 15 },
    { id: 100, title: '3월 25일(월) 정기 점검 안내 (02:00 ~ 06:00)', author: '관리자', date: '2024.03.19', views: 2300, isNotice: true, category: '점검', commentCount: 0 },
    { id: 15, title: '이 웹툰 진짜 재밌네요 추천합니다', author: '웹툰조아', date: '14:30', views: 124, category: '잡담', commentCount: 5 },
    { id: 14, title: '코인 충전 오류 문의드립니다', author: 'user123', date: '13:15', views: 45, category: '문의', commentCount: 2 },
    { id: 13, title: '소설 업데이트 시간 언제인가요?', author: '독서왕', date: '12:40', views: 89, category: '질문', commentCount: 1 },
    { id: 12, title: '사이트 속도가 빨라져서 좋네요', author: '스피드', date: '12:10', views: 210, category: '후기', commentCount: 8 },
    { id: 11, title: '다음 화 언제 올라오나요?', author: '기다림', date: '11:55', views: 300, category: '질문', commentCount: 3 }
];

export const GALLERY_CHARACTERS: CharacterProfile[] = [
    {
        id: 'c1',
        name: '유나',
        webtoonTitle: '나의 위험한 소악마',
        thumbnail: 'https://picsum.photos/400/600?random=101',
        description: '매혹적인 매력을 가진 소악마 유나. 그녀의 비밀스러운 사생활을 엿볼 수 있는 기회.',
        photobooks: [
            { id: 'pb1', title: 'Private Beach', description: '여름 해변에서의 데이트', thumbnail: 'https://picsum.photos/400/225?random=102', price: 10, isPurchased: false, imageCount: 20 },
            { id: 'pb2', title: 'Office Look', description: '오피스에서의 은밀한 시간', thumbnail: 'https://picsum.photos/400/225?random=103', price: 15, isPurchased: true, imageCount: 25 },
        ]
    },
    {
        id: 'c2',
        name: '미소',
        webtoonTitle: '음란한 웨이트리스',
        thumbnail: 'https://picsum.photos/400/600?random=104',
        description: '카페에서 일하는 귀여운 웨이트리스 미소. 유니폼 뒤에 숨겨진 반전 매력.',
        photobooks: [
            { id: 'pb3', title: 'Cat Maid', description: '고양이 메이드 코스프레', thumbnail: 'https://picsum.photos/400/225?random=105', price: 12, isPurchased: false, imageCount: 18 },
        ]
    },
     {
        id: 'c3',
        name: '지원',
        webtoonTitle: '동네 누나',
        thumbnail: 'https://picsum.photos/400/600?random=106',
        description: '친근하면서도 섹시한 동네 누나 지원.',
        photobooks: [
            { id: 'pb4', title: 'Daily Life', description: '집에서의 편안한 복장', thumbnail: 'https://picsum.photos/400/225?random=107', price: 8, isPurchased: false, imageCount: 15 },
             { id: 'pb5', title: 'Gym wear', description: '운동하는 누나', thumbnail: 'https://picsum.photos/400/225?random=108', price: 10, isPurchased: false, imageCount: 20 },
        ]
    }
];

export const SHORTS_VIDEOS: ShortsVideo[] = [
    {
        id: 's1',
        title: '촬영장 비하인드',
        thumbnail: 'https://picsum.photos/400/225?random=201',
        duration: '00:45',
        views: 12000,
        tags: ['비하인드', '촬영장'],
        author: '나의 위험한 소악마'
    },
    {
        id: 's2',
        title: '미소의 댄스 챌린지',
        thumbnail: 'https://picsum.photos/400/225?random=202',
        duration: '00:30',
        views: 25000,
        tags: ['댄스', '챌린지', '귀여움'],
        author: '음란한 웨이트리스'
    },
     {
        id: 's3',
        title: '운동하는 지원누나',
        thumbnail: 'https://picsum.photos/400/225?random=203',
        duration: '01:00',
        views: 8000,
        tags: ['운동', '헬스', '브이로그'],
        author: '동네 누나'
    },
    {
        id: 's4',
        title: '여름 휴가 스케치',
        thumbnail: 'https://picsum.photos/400/225?random=204',
        duration: '02:10',
        views: 15000,
        tags: ['여행', '비키니'],
        author: '새엄마의 친구들'
    }
];
