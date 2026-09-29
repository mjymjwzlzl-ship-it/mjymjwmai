type ComicWithId = {
  id?: unknown;
};

// The backend does not expose a book/webtoon format field yet, so keep the
// visually verified monochrome titles in one place until that metadata exists.
const MONOCHROME_COMIC_IDS = new Set([
  'cmrcowqbn000026hcnl74lq6v', // 죽음의 사막
  'cmrcoup2n0000sjeecwxzyale', // 주사위게임
  'cmrcoks1r0000az2ud9wupoy5', // 오태선의 포장마차
  'cmrcokbhd000013p03boxrp10', // 기억을 가지고 5년 전으로 돌아갈 기회가 생겼다
]);

export function isMonochromeComic(comic: ComicWithId): boolean {
  return MONOCHROME_COMIC_IDS.has(String(comic?.id || ''));
}

export function selectWebtoonComics<T extends ComicWithId>(
  comics: readonly T[] | null | undefined,
): T[] {
  if (!Array.isArray(comics)) return [];
  return comics.filter((comic) => !isMonochromeComic(comic));
}

export function selectBookComics<T extends ComicWithId>(
  comics: readonly T[] | null | undefined,
): T[] {
  if (!Array.isArray(comics)) return [];
  return comics.filter(isMonochromeComic);
}
