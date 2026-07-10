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
};

const titleKeyByKoreanTitle: Record<string, keyof typeof titleByComicId> = {
  사막: 'cmfgk7zw60000hfzdcb4xi7ie',
  '세상의 종말': 'cmfkt0q1a0001142ov9e5yqch',
  '교주의 연인': 'cmfkt9a7w000j142oi8vh7tm0',
  '최강일진이었던 사나이': 'cmhupnvhs0000cbnjbz2mg9l5',
  '고교전설 레드드래곤': 'cmhd1wrdp0000dtqp2vqkumzx',
  '고교전설 시즌2': 'cmhd1z63y00h3dtqp6d0rsnuc',
  '프로젝트 이더': 'cmr7krmru0000hizzkwf4qaqj',
  '삼국지 병의': 'cmhcw1u3d0000wcdwylb39b6i',
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
