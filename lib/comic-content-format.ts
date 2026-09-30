type ComicWithId = {
  id?: unknown;
  contentType?: unknown;
};

// 작품 유형: Comic.contentType(WEBTOON | BOOK | NOVEL)이 정답.
// 예전에 눈으로 골라 둔 흑백(단행본) 작품은 contentType 이 없을 때의 보조 기준. 백엔드 lib/content-format.js 와 같은 목록.
const MONOCHROME_COMIC_IDS = new Set([
  'cmrcowqbn000026hcnl74lq6v', // 죽음의 사막
  'cmrcoup2n0000sjeecwxzyale', // 주사위게임
  'cmrcoks1r0000az2ud9wupoy5', // 오태선의 포장마차
  'cmrcokbhd000013p03boxrp10', // 기억을 가지고 5년 전으로 돌아갈 기회가 생겼다
]);

const typeOf = (comic: ComicWithId) => String(comic?.contentType || '').toUpperCase();

export function isNovelComic(comic: ComicWithId): boolean {
  return typeOf(comic) === 'NOVEL';
}

export function isMonochromeComic(comic: ComicWithId): boolean {
  return typeOf(comic) === 'BOOK' || (!isNovelComic(comic) && MONOCHROME_COMIC_IDS.has(String(comic?.id || '')));
}

export function comicContentType(comic: ComicWithId): 'webtoon' | 'book' | 'novel' {
  if (isNovelComic(comic)) return 'novel';
  return isMonochromeComic(comic) ? 'book' : 'webtoon';
}

export function selectWebtoonComics<T extends ComicWithId>(
  comics: readonly T[] | null | undefined,
): T[] {
  if (!Array.isArray(comics)) return [];
  return comics.filter((comic) => comicContentType(comic) === 'webtoon');
}

export function selectBookComics<T extends ComicWithId>(
  comics: readonly T[] | null | undefined,
): T[] {
  if (!Array.isArray(comics)) return [];
  return comics.filter((comic) => comicContentType(comic) === 'book');
}

export function selectNovelComics<T extends ComicWithId>(
  comics: readonly T[] | null | undefined,
): T[] {
  if (!Array.isArray(comics)) return [];
  return comics.filter(isNovelComic);
}
