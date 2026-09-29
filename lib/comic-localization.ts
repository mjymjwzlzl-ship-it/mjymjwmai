export type SupportedLocale = 'ko' | 'en' | 'ja' | 'fr';

const titleByComicId: Record<string, Record<SupportedLocale, string>> = {
  cmfgk7zw60000hfzdcb4xi7ie: {
    ko: '사막',
    en: 'Desert',
    ja: '砂漠',
    fr: 'Désert',
  },
  cmfkt0q1a0001142ov9e5yqch: {
    ko: '세상의 종말',
    en: 'The End of the World',
    ja: '世界の終末',
    fr: 'La fin du monde',
  },
  cmfgk82x5002ghfzdampkgahf: {
    ko: '세상의 종말',
    en: 'The End of the World',
    ja: '世界の終末',
    fr: 'La fin du monde',
  },
  cmfkt9a7w000j142oi8vh7tm0: {
    ko: '교주의 연인',
    en: "The Cult Leader's Lover",
    ja: '教祖の恋人',
    fr: "L'amante du gourou",
  },
  cmfgk83c6002rhfzdiw8gcsow: {
    ko: '교주의 연인',
    en: "The Cult Leader's Lover",
    ja: '教祖の恋人',
    fr: "L'amante du gourou",
  },
  cmhupnvhs0000cbnjbz2mg9l5: {
    ko: '최강일진이었던 사나이',
    en: 'The Former Top Fighter',
    ja: '最強の不良だった男',
    fr: "L'ancien boss du lycée",
  },
  cmfgk80p2000nhfzdetd5jkg6: {
    ko: '태권고등학교',
    en: 'Taekwondo High School',
    ja: 'テコンドー高校',
    fr: 'Lycée de taekwondo',
  },
  cmrbsvl8w0000uukvc3fkl5h0: {
    ko: '우리의 친구 조성제',
    en: 'Our Friend Jo Seong-je',
    ja: '僕たちの友達 チョ・ソンジェ',
    fr: 'Notre ami Jo Seong-je',
  },
  cmrbzm61x000011itpx93faas: {
    ko: '고교일반학생',
    en: 'An Ordinary High School Student',
    ja: '普通の高校生',
    fr: 'Un lycéen ordinaire',
  },
  cmrbzo6jm0000u9xd3xenu6yk: {
    ko: '고교전설',
    en: 'High School Legend',
    ja: '高校伝説',
    fr: 'La légende du lycée',
  },
  cmrco0luz00001huxs92zdti3: {
    ko: '고교정점',
    en: 'High School Apex',
    ja: '高校の頂点',
    fr: 'Au sommet du lycée',
  },
  cmrcokbhd000013p03boxrp10: {
    ko: '기억을 가지고 5년 전으로 돌아갈 기회가 생겼다',
    en: 'I Got a Chance to Go Back Five Years with My Memories Intact',
    ja: '記憶を持ったまま5年前に戻るチャンスを得た',
    fr: 'J’ai eu la chance de revenir cinq ans en arrière avec mes souvenirs',
  },
  cmrcoki1y0000qpu3zf5l8flk: {
    ko: '레알팜',
    en: 'Real Farm',
    ja: 'リアルファーム',
    fr: 'Real Farm',
  },
  cmrcoks1r0000az2ud9wupoy5: {
    ko: '오태선의 포장마차',
    en: "Oh Tae-seon's Street Bar",
    ja: 'オ・テソンの屋台',
    fr: "Le bar ambulant d’Oh Tae-seon",
  },
  cmrcomt1k0000ymjsmdcepx76: {
    ko: '일진양성학교',
    en: 'School for Raising Delinquents',
    ja: '不良育成学校',
    fr: 'L’école des futurs caïds',
  },
  cmrcoup2n0000sjeecwxzyale: {
    ko: '주사위게임',
    en: 'Dice Game',
    ja: 'サイコロゲーム',
    fr: 'Jeu de dés',
  },
  cmrcowqbn000026hcnl74lq6v: {
    ko: '죽음의 사막',
    en: 'Desert of Death',
    ja: '死の砂漠',
    fr: 'Le désert de la mort',
  },
  cmrcoxkct0000zasm0mrfliqz: {
    ko: 'MZ스님 박건우',
    en: 'MZ Monk Park Geon-woo',
    ja: 'MZ僧侶 パク・ゴヌ',
    fr: 'Park Geon-woo, le moine MZ',
  },
  cmhd1wrdp0000dtqp2vqkumzx: {
    ko: '고교전설 레드드래곤',
    en: 'High School Legend: Red Dragon',
    ja: '高校伝説 レッドドラゴン',
    fr: 'Légende du lycée : Red Dragon',
  },
  cmhd1z63y00h3dtqp6d0rsnuc: {
    ko: '고교전설 시즌2',
    en: 'High School Legend Season 2',
    ja: '高校伝説 シーズン2',
    fr: 'Légende du lycée Saison 2',
  },
  cmr7krmru0000hizzkwf4qaqj: {
    ko: '프로젝트 이더',
    en: 'Project Ether',
    ja: 'プロジェクト・エーテル',
    fr: 'Projet Éther',
  },
  cmhcw1u3d0000wcdwylb39b6i: {
    ko: '삼국지 병의',
    en: 'Samgukji: Soldier’s Art',
    ja: '三国志 兵義',
    fr: 'Trois Royaumes : art du soldat',
  },
  cmreczdiv0000qed947oxl5nw: {
    ko: '고교전설 레드드래곤',
    en: 'High School Legend: Red Dragon',
    ja: '高校伝説 レッドドラゴン',
    fr: 'Légende du lycée : Red Dragon',
  },
  cmred6jg00000t74honsbjxk1: {
    ko: '고교정점 시즌2',
    en: 'High School Apex Season 2',
    ja: '高校の頂点 シーズン2',
    fr: 'Au sommet du lycée – Saison 2',
  },
  cmredautv0000c4oz2a1637sl: {
    ko: '삼국지 병의',
    en: 'Samgukji: Soldier’s Art',
    ja: '三国志 兵義',
    fr: 'Trois Royaumes : art du soldat',
  },
};

const titleKeyByKoreanTitle: Record<string, keyof typeof titleByComicId> = {
  사막: 'cmfgk7zw60000hfzdcb4xi7ie',
  '세상의 종말': 'cmfkt0q1a0001142ov9e5yqch',
  '교주의 연인': 'cmfkt9a7w000j142oi8vh7tm0',
  '최강일진이었던 사나이': 'cmhupnvhs0000cbnjbz2mg9l5',
  태권고등학교: 'cmfgk80p2000nhfzdetd5jkg6',
  '우리의 친구 조성제': 'cmrbsvl8w0000uukvc3fkl5h0',
  고교일반학생: 'cmrbzm61x000011itpx93faas',
  고교전설: 'cmrbzo6jm0000u9xd3xenu6yk',
  고교정점: 'cmrco0luz00001huxs92zdti3',
  '기억을 가지고 5년 전으로 돌아갈 기회가 생겼다': 'cmrcokbhd000013p03boxrp10',
  레알팜: 'cmrcoki1y0000qpu3zf5l8flk',
  '오태선의 포장마차': 'cmrcoks1r0000az2ud9wupoy5',
  '일진양성학교': 'cmrcomt1k0000ymjsmdcepx76',
  주사위게임: 'cmrcoup2n0000sjeecwxzyale',
  '죽음의 사막': 'cmrcowqbn000026hcnl74lq6v',
  'mz스님 박건우': 'cmrcoxkct0000zasm0mrfliqz',
  'MZ스님 박건우': 'cmrcoxkct0000zasm0mrfliqz',
  '고교전설 레드드래곤': 'cmhd1wrdp0000dtqp2vqkumzx',
  '고교전설_레드드래곤': 'cmreczdiv0000qed947oxl5nw',
  '고교전설 시즌2': 'cmhd1z63y00h3dtqp6d0rsnuc',
  '고교정점 시즌2': 'cmred6jg00000t74honsbjxk1',
  '프로젝트 이더': 'cmr7krmru0000hizzkwf4qaqj',
  '삼국지 병의': 'cmhcw1u3d0000wcdwylb39b6i',
  삼국지병의: 'cmredautv0000c4oz2a1637sl',
};

const authorBySource: Record<string, Record<SupportedLocale, string>> = {
  '글 스튜디오문 · 그림 쫑이': {
    ko: '글 스튜디오문 · 그림 쫑이',
    en: 'Story: Studio Moon · Art: Jjong-i',
    ja: '原作：スタジオ・ムーン · 作画：チョンイ',
    fr: 'Scénario : Studio Moon · Dessin : Jjong-i',
  },
  '스튜디오 문': {
    ko: '스튜디오 문',
    en: 'Studio Moon',
    ja: 'スタジオ・ムーン',
    fr: 'Studio Moon',
  },
  문스튜디오: {
    ko: '문스튜디오',
    en: 'Studio Moon',
    ja: 'スタジオ・ムーン',
    fr: 'Studio Moon',
  },
  작가1: {
    ko: '작가1',
    en: 'Author 1',
    ja: '作家1',
    fr: 'Auteur 1',
  },
  작가2: {
    ko: '작가2',
    en: 'Author 2',
    ja: '作家2',
    fr: 'Auteur 2',
  },
  '강대용, Team J1': {
    ko: '강대용, Team J1',
    en: 'Kang Dae-yong, Team J1',
    ja: 'カン・デヨン、Team J1',
    fr: 'Kang Dae-yong, Team J1',
  },
  '콕키오, 하바바돌': {
    ko: '콕키오, 하바바돌',
    en: 'Kokkio, Hababadol',
    ja: 'コッキオ、ハババドル',
    fr: 'Kokkio, Hababadol',
  },
  유니: {
    ko: '유니',
    en: 'Yuni',
    ja: 'ユニ',
    fr: 'Yuni',
  },
  미상: {
    ko: '미상',
    en: 'Unknown',
    ja: '不明',
    fr: 'Inconnu',
  },
};

const synopsisByComicId: Record<string, Record<SupportedLocale, string>> = {
  cmfgk7zw60000hfzdcb4xi7ie: {
    ko: '사막을 배경으로 한 로맨스 웹툰',
    en: 'A romance webtoon set in the desert.',
    ja: '砂漠を舞台にしたロマンスウェブトゥーン。',
    fr: 'Un webtoon romantique qui se déroule dans le désert.',
  },
  cmfgk80p2000nhfzdetd5jkg6: {
    ko: '태권도 고등학교 학생들의 코미디 일상',
    en: 'A school comedy about the daily lives of taekwondo students.',
    ja: 'テコンドー高校の生徒たちの日常を描く学園コメディ。',
    fr: 'Une comédie scolaire sur le quotidien d’élèves de taekwondo.',
  },
  cmfkt0q1a0001142ov9e5yqch: {
    ko: '어느 날 세상 모든 사람들이 죽어나갔다. 홀로 살아남은 재혁은 또 다른 생존자 윤지윤을 발견한다.',
    en: 'After people around the world begin dying, lone survivor Jae-hyeok discovers another survivor: his boss, Yoon Ji-yoon.',
    ja: '世界中の人々が死に絶える中、独りで生き延びたジェヒョクは、もう一人の生存者である上司ユン・ジユンを発見する。',
    fr: 'Alors que le monde s’effondre, Jae-hyeok découvre une autre survivante : sa supérieure, Yoon Ji-yoon.',
  },
  cmfkt9a7w000j142oi8vh7tm0: {
    ko: '사이비 종교에 빠진 여자친구를 교주에게서 구해야 한다.',
    en: 'He must rescue his girlfriend after she falls under the control of a cult leader.',
    ja: 'カルト教団にのめり込んだ恋人を、教祖の支配から救い出さなければならない。',
    fr: 'Il doit sauver sa petite amie, tombée sous l’emprise du gourou d’une secte.',
  },
  cmhcw1u3d0000wcdwylb39b6i: {
    ko: '삼국지를 개그로 풀어낸 웹툰',
    en: 'A comedic webtoon take on the Three Kingdoms.',
    ja: '三国志をギャグで描いたウェブトゥーン。',
    fr: 'Une version comique des Trois Royaumes en webtoon.',
  },
  cmhd1wrdp0000dtqp2vqkumzx: {
    ko: '고교전설 레드드래곤 - 고교 액션 웹툰',
    en: 'A high-school action webtoon from the High School Legend series.',
    ja: '「高校伝説」シリーズの学園アクションウェブトゥーン。',
    fr: 'Un webtoon d’action scolaire de la série High School Legend.',
  },
  cmhd1z63y00h3dtqp6d0rsnuc: {
    ko: '고교전설 시즌2 - 고교 액션 웹툰',
    en: 'Season 2 of the high-school action webtoon High School Legend.',
    ja: '学園アクションウェブトゥーン「高校伝説」シーズン2。',
    fr: 'La saison 2 du webtoon d’action scolaire High School Legend.',
  },
  cmhupnvhs0000cbnjbz2mg9l5: {
    ko: '최강일진이었던 사나이 - 액션 웹툰',
    en: 'An action webtoon about a man who was once the strongest school fighter.',
    ja: 'かつて最強の不良だった男を描くアクションウェブトゥーン。',
    fr: 'Un webtoon d’action sur un homme autrefois considéré comme le plus fort du lycée.',
  },
  cmrbsvl8w0000uukvc3fkl5h0: {
    ko: '미국에서 전학 온 조성제와 친구들이 벌이는 코미디.',
    en: 'An offbeat comedy about Jo Seong-je, a transfer student from the United States, and his friends.',
    ja: 'アメリカから転校してきたチョ・ソンジェと仲間たちが繰り広げる異色コメディ。',
    fr: 'Une comédie décalée sur Jo Seong-je, nouvel élève venu des États-Unis, et ses amis.',
  },
  cmrbzo6jm0000u9xd3xenu6yk: {
    ko: '고교전설 시즌2 - 고교 액션 웹툰',
    en: 'A high-school action webtoon from the High School Legend series.',
    ja: '「高校伝説」シリーズの学園アクションウェブトゥーン。',
    fr: 'Un webtoon d’action scolaire de la série High School Legend.',
  },
};

const genreByKey: Record<string, Record<SupportedLocale, string>> = {
  action: { ko: '액션', en: 'Action', ja: 'アクション', fr: 'Action' },
  romance: { ko: '로맨스', en: 'Romance', ja: 'ロマンス', fr: 'Romance' },
  fantasy: { ko: '판타지', en: 'Fantasy', ja: 'ファンタジー', fr: 'Fantasy' },
  drama: { ko: '드라마', en: 'Drama', ja: 'ドラマ', fr: 'Drame' },
  comedy: { ko: '코미디', en: 'Comedy', ja: 'コメディ', fr: 'Comédie' },
  thriller: { ko: '스릴러', en: 'Thriller', ja: 'スリラー', fr: 'Thriller' },
  school: { ko: '학원', en: 'School', ja: '学園', fr: 'École' },
  daily: { ko: '일상', en: 'Slice of Life', ja: '日常', fr: 'Tranche de vie' },
  'slice-of-life': { ko: '일상', en: 'Slice of Life', ja: '日常', fr: 'Tranche de vie' },
  historical: { ko: '시대극', en: 'Historical', ja: '歴史', fr: 'Historique' },
  adult: { ko: '성인', en: 'Adult', ja: '成人向け', fr: 'Adulte' },
  unknown: { ko: '미상', en: 'Unknown', ja: '不明', fr: 'Inconnu' },
};

const fallbackGenreByComicId: Record<string, keyof typeof genreByKey> = {
  cmrcoxkct0000zasm0mrfliqz: 'comedy',
  cmrcowqbn000026hcnl74lq6v: 'fantasy',
  cmrcoup2n0000sjeecwxzyale: 'thriller',
  cmrcomt1k0000ymjsmdcepx76: 'school',
  cmrcoks1r0000az2ud9wupoy5: 'drama',
  cmrcoki1y0000qpu3zf5l8flk: 'daily',
  cmrcokbhd000013p03boxrp10: 'fantasy',
  cmrco0luz00001huxs92zdti3: 'action',
  cmrbzm61x000011itpx93faas: 'school',
};

const genreKeyAliases: Record<string, keyof typeof genreByKey> = {
  액션: 'action',
  로맨스: 'romance',
  판타지: 'fantasy',
  드라마: 'drama',
  코미디: 'comedy',
  스릴러: 'thriller',
  학원: 'school',
  일상: 'daily',
  시대극: 'historical',
  성인: 'adult',
  미상: 'unknown',
};

const statusByKey: Record<string, Record<SupportedLocale, string>> = {
  ONGOING: { ko: '연재중', en: 'Ongoing', ja: '連載中', fr: 'En cours' },
  COMPLETED: { ko: '완결', en: 'Completed', ja: '完結', fr: 'Terminé' },
  HIATUS: { ko: '휴재', en: 'On hiatus', ja: '休載', fr: 'En pause' },
};

const getLocale = (locale: string): SupportedLocale => {
  if (locale === 'en' || locale === 'ja' || locale === 'fr') return locale;
  return 'ko';
};

export const localizeKnownComicTitle = (title: unknown, locale: string) => {
  const sourceTitle = String(title || '').trim();
  const id = titleKeyByKoreanTitle[sourceTitle];
  if (!id) return sourceTitle;
  return titleByComicId[id][getLocale(locale)] || sourceTitle;
};

export const localizeComicTitle = (comic: unknown, locale: string, fallback = '제목 없음') => {
  const record = (comic || {}) as { id?: unknown; title?: unknown };
  const id = String(record.id || '');
  const localized = titleByComicId[id]?.[getLocale(locale)];
  if (localized) return localized;
  return localizeKnownComicTitle(record.title, locale) || fallback;
};

export const localizeComicAuthor = (comic: unknown, locale: string, fallback = 'ARATA') => {
  const record = (comic || {}) as {
    authorName?: unknown;
    author?: unknown | { username?: unknown; name?: unknown };
  };
  const authorObject = typeof record.author === 'object' && record.author !== null
    ? record.author as { username?: unknown; name?: unknown }
    : null;
  const source = String(
    record.authorName || authorObject?.username || authorObject?.name || record.author || '',
  ).trim();
  if (!source) return fallback;
  return authorBySource[source]?.[getLocale(locale)] || source;
};

export const localizeComicSynopsis = (comic: unknown, locale: string, fallback: string) => {
  const record = (comic || {}) as {
    id?: unknown;
    description?: unknown;
    synopsis?: unknown;
    subtitle?: unknown;
  };
  const targetLocale = getLocale(locale);
  const id = String(record.id || '');
  const known = synopsisByComicId[id]?.[targetLocale];
  if (known) return known;

  const source = String(record.description || record.synopsis || record.subtitle || '').trim();
  if (source === '미상') {
    return {
      ko: '미상',
      en: 'No synopsis available.',
      ja: 'あらすじはまだありません。',
      fr: 'Aucun résumé disponible.',
    }[targetLocale];
  }
  return targetLocale === 'ko' && source ? source : fallback;
};

export const resolveComicGenre = (comic: unknown) => {
  const record = (comic || {}) as { id?: unknown; genre?: unknown };
  const source = String(record.genre || '').trim();
  const normalizedSource = source.toLowerCase();

  if (normalizedSource && normalizedSource !== '미상' && normalizedSource !== 'unknown') {
    return source;
  }

  return fallbackGenreByComicId[String(record.id || '')] || normalizedSource || 'unknown';
};

export const localizeComicGenre = (genre: unknown, locale: string, fallback = '') => {
  const source = String(genre || '').trim();
  const key = source.toLowerCase();
  const normalizedKey = genreKeyAliases[key] || (key === '미상' || !key ? 'unknown' : key);
  return genreByKey[normalizedKey]?.[getLocale(locale)] || (getLocale(locale) === 'ko' ? source : fallback || source);
};

export const localizeComicStatus = (status: unknown, locale: string) => {
  const key = String(status || '').trim().toUpperCase();
  return statusByKey[key]?.[getLocale(locale)] || statusByKey.ONGOING[getLocale(locale)];
};
