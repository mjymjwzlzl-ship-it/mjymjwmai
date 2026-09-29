export const SAMGUKJI_BYEONGUI_CANONICAL_ID = 'cmhcw1u3d0000wcdwylb39b6i';
export const SAMGUKJI_BYEONGUI_DUPLICATE_ID = 'cmredautv0000c4oz2a1637sl';
export const HIGH_SCHOOL_SUMMIT_SEASON_2_ID = 'cmred6jg00000t74honsbjxk1';
export const RED_DRAGON_DRAMA_DUPLICATE_ID = 'cmreczdiv0000qed947oxl5nw';
export const MZ_MONK_PARK_GEON_WOO_ID = 'cmrcoxkct0000zasm0mrfliqz';
export const REAL_FARM_DUPLICATE_ID = 'cmrcoki1y0000qpu3zf5l8flk';
export const HIGH_SCHOOL_APEX_DUPLICATE_ID = 'cmrco0luz00001huxs92zdti3';
export const HIGH_SCHOOL_LEGEND_DUPLICATE_ID = 'cmrbzo6jm0000u9xd3xenu6yk';

const hiddenDuplicateComicIds = new Set([
  SAMGUKJI_BYEONGUI_DUPLICATE_ID,
  HIGH_SCHOOL_SUMMIT_SEASON_2_ID,
  RED_DRAGON_DRAMA_DUPLICATE_ID,
  MZ_MONK_PARK_GEON_WOO_ID,
  REAL_FARM_DUPLICATE_ID,
  HIGH_SCHOOL_APEX_DUPLICATE_ID,
  HIGH_SCHOOL_LEGEND_DUPLICATE_ID,
]);

export function removeHiddenComicDuplicates<T extends { id?: unknown }>(items: readonly T[] | null | undefined): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !hiddenDuplicateComicIds.has(String(item?.id || '')));
}
