const SAMAK_COMIC_ID = 'cmfgk7zw60000hfzdcb4xi7ie';
const WORLD_END_GENERAL_ID = 'cmfkt0q1a0001142ov9e5yqch';
const CULT_LOVER_GENERAL_ID = 'cmfkt9a7w000j142oi8vh7tm0';
const FORMER_BULLY_ID = 'cmhupnvhs0000cbnjbz2mg9l5';
const TAEKWON_HIGH_ID = 'cmfgk80p2000nhfzdetd5jkg6';
const ORDINARY_HIGH_STUDENT_ID = 'cmrbzm61x000011itpx93faas';
const RED_DRAGON_ID = 'cmhd1wrdp0000dtqp2vqkumzx';
const HIGH_SCHOOL_BOOST_ID = 'cmhd1z63y00h3dtqp6d0rsnuc';
const PROJECT_ETHER_ID = 'cmr7krmru0000hizzkwf4qaqj';
const SAMGUKJI_BYEONGUI_ID = 'cmhcw1u3d0000wcdwylb39b6i';
const ILJIN_SCHOOL_ID = 'cmrcomt1k0000ymjsmdcepx76';
const MEMORY_FIVE_YEARS_ID = 'cmrcokbhd000013p03boxrp10';
const OTAESEON_POJANGMACHA_ID = 'cmrcoks1r0000az2ud9wupoy5';
const DICE_GAME_ID = 'cmrcoup2n0000sjeecwxzyale';
const DEATH_DESERT_ID = 'cmrcowqbn000026hcnl74lq6v';
const OUR_FRIEND_JO_SEONGJE_ID = 'cmrbsvl8w0000uukvc3fkl5h0';

const uploadedComicImages = (title: string, version = 'banner-20260711') => {
  const base = `/uploads/webtoons/general/${encodeURIComponent(title)}`;
  return {
    thumbnail: `${base}/thumbnail.webp?v=${version}`,
    banner: `${base}/banner-4x3.webp?v=${version}`,
    poster: `${base}/poster.webp?v=recent-3x4-20260711`,
  };
};

const SPECIAL_COMIC_IMAGES: Record<string, { thumbnail: string; banner: string; poster: string }> = {
  [SAMAK_COMIC_ID]: uploadedComicImages('사막'),
  [WORLD_END_GENERAL_ID]: uploadedComicImages('세상의 종말'),
  [CULT_LOVER_GENERAL_ID]: uploadedComicImages('교주의 연인'),
  [FORMER_BULLY_ID]: uploadedComicImages('최강일진이었던 사나이'),
  [TAEKWON_HIGH_ID]: uploadedComicImages('태권고등학교', 'taekwon-illustration-20260830'),
  [ORDINARY_HIGH_STUDENT_ID]: uploadedComicImages('고교일반학생'),
  [RED_DRAGON_ID]: uploadedComicImages('고교전설 레드드래곤'),
  [HIGH_SCHOOL_BOOST_ID]: uploadedComicImages('고교전설 부스트'),
  [PROJECT_ETHER_ID]: uploadedComicImages('프로젝트 이더'),
  [SAMGUKJI_BYEONGUI_ID]: uploadedComicImages('삼국지병의'),
  [ILJIN_SCHOOL_ID]: uploadedComicImages('일진양성학교'),
  [MEMORY_FIVE_YEARS_ID]: uploadedComicImages('기억을 가지고 5년 전으로 돌아갈 기회가 생겼다', 'cel-2d-20260711'),
  [OTAESEON_POJANGMACHA_ID]: uploadedComicImages('오태선의 포장마차'),
  [DICE_GAME_ID]: uploadedComicImages('주사위게임', 'cel-2d-20260711'),
  [DEATH_DESERT_ID]: uploadedComicImages('죽음의 사막', 'cel-2d-20260711'),
};

const SPECIAL_COMIC_IMAGES_BY_TITLE: Record<string, { thumbnail: string; banner: string; poster: string }> = {
  사막: uploadedComicImages('사막'),
  '세상의 종말': uploadedComicImages('세상의 종말'),
  '교주의 연인': uploadedComicImages('교주의 연인'),
  '최강일진이었던 사나이': uploadedComicImages('최강일진이었던 사나이'),
  태권고등학교: uploadedComicImages('태권고등학교', 'taekwon-illustration-20260830'),
  고교일반학생: uploadedComicImages('고교일반학생'),
  '고교전설 레드드래곤': uploadedComicImages('고교전설 레드드래곤'),
  '고교전설 시즌2': uploadedComicImages('고교전설 부스트'),
  '고교전설 부스트': uploadedComicImages('고교전설 부스트'),
  '프로젝트 이더': uploadedComicImages('프로젝트 이더'),
  삼국지병의: uploadedComicImages('삼국지병의'),
  '삼국지 병의': uploadedComicImages('삼국지병의'),
  일진양성학교: uploadedComicImages('일진양성학교'),
  '기억을 가지고 5년 전으로 돌아갈 기회가 생겼다': uploadedComicImages('기억을 가지고 5년 전으로 돌아갈 기회가 생겼다', 'cel-2d-20260711'),
  '오태선의 포장마차': uploadedComicImages('오태선의 포장마차'),
  주사위게임: uploadedComicImages('주사위게임', 'cel-2d-20260711'),
  '죽음의 사막': uploadedComicImages('죽음의 사막', 'cel-2d-20260711'),
};

const EXTRA_RECENT_POSTERS: Record<string, string> = {
  [OUR_FRIEND_JO_SEONGJE_ID]: '/uploads/webtoons/general/%EC%9A%B0%EB%A6%AC%EC%9D%98%20%EC%B9%9C%EA%B5%AC%20%EC%A1%B0%EC%84%B1%EC%A0%9C/poster.webp?v=recent-3x4-20260711',
};

export const getComicImage = (comic: any, fallback: string, variant: 'thumbnail' | 'banner' | 'poster' = 'thumbnail') => {
  if (variant === 'poster') {
    const recentPoster = EXTRA_RECENT_POSTERS[String(comic?.id)];
    if (recentPoster) return recentPoster;
  }

  const idImage = SPECIAL_COMIC_IMAGES[String(comic?.id)]?.[variant];
  if (idImage) return idImage;

  const title = String(comic?.title || comic?.titleKo || comic?.name || '');
  return SPECIAL_COMIC_IMAGES_BY_TITLE[title]?.[variant] || fallback;
};


