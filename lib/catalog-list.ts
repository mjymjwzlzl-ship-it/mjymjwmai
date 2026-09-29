export type CatalogSort = 'updated' | 'created' | 'oldest' | 'popular';

const asNumber = (value: unknown): number | undefined => {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

export function getComicFreeAccess(comic: {
  isFree?: unknown; free?: unknown; paidStartEpisode?: unknown; episodeCoinPrice?: unknown;
  episodeCount?: unknown; _count?: { episodes?: unknown };
}) {
  const paidStart = asNumber(comic.paidStartEpisode);
  const price = asNumber(comic.episodeCoinPrice);
  const episodes = asNumber(comic._count?.episodes ?? comic.episodeCount);
  // paidStartEpisode=0 means the entire work is free in the backend contract.
  // Missing price data must not be interpreted as a zero price.
  const isFullyFree = comic.isFree === true || comic.free === true || paidStart === 0
    || price === 0 || (episodes !== undefined && episodes > 0 && paidStart !== undefined && paidStart > episodes);
  return { isFullyFree, isFirstEpisodeFree: isFullyFree || (paidStart !== undefined && paidStart > 1) };
}

export function comicTimestamp(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortCatalog<T extends {
  createdAtTimestamp: number; updatedAtTimestamp: number; views: number; likes: number;
}>(items: readonly T[], sort: CatalogSort): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'popular') return b.views - a.views || b.likes - a.likes;
    const left = sort === 'created' ? a.createdAtTimestamp : a.updatedAtTimestamp;
    const right = sort === 'created' ? b.createdAtTimestamp : b.updatedAtTimestamp;
    // Unknown dates always go last, including in ascending order.
    if (!left || !right) return Number(Boolean(right)) - Number(Boolean(left));
    return sort === 'oldest' ? left - right : right - left;
  });
}
