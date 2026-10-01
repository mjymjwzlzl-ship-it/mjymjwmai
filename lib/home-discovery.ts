import { comicTimestamp } from './catalog-list';

export type DiscoveryComic = {
  id: string; title: string; genre?: string; rating?: string; ageRating?: string;
  contentRating?: string; isAdult?: boolean; status?: string; createdAt?: string;
  updatedAt?: string; completedAt?: string; viewCount?: number; views?: number;
  episodeCount?: number; _count?: { episodes?: number };
  [key: string]: any;
};

export function isAdultDiscoveryComic(comic: DiscoveryComic) {
  return comic.isAdult === true || [comic.contentRating, comic.rating, comic.ageRating].some(rating => /^(19\+?|adult)$/i.test(String(rating || '')))
    || /adult/i.test(String(comic.genre || ''));
}

export function discoverComics(source: DiscoveryComic[], adult = false) {
  const seen = new Set<string>();
  const all = source.filter(comic => {
    if (!comic.id || seen.has(comic.id) || comic.status === 'HIDDEN' || isAdultDiscoveryComic(comic) !== adult) return false;
    seen.add(comic.id);
    return true;
  });
  const latest = [...all].sort((a, b) => comicTimestamp(b.createdAt) - comicTimestamp(a.createdAt));
  const popular = [...all].sort((a, b) => Number(b.viewCount ?? b.views ?? 0) - Number(a.viewCount ?? a.views ?? 0));
  const completed = all.filter(comic => comic.status === 'COMPLETED');
  const short = completed.filter(comic => {
    const count = Number(comic._count?.episodes ?? comic.episodeCount ?? 0);
    return count > 0 && count <= 10;
  }).sort((a, b) => Number(a._count?.episodes ?? a.episodeCount) - Number(b._count?.episodes ?? b.episodeCount));
  // updatedAt can be an artwork/metadata edit, so it is not evidence of completion this week.
  const recentCompleted = [...completed].sort((a, b) => comicTimestamp(b.completedAt || b.createdAt) - comicTimestamp(a.completedAt || a.createdAt));
  return { all, latest, popular, completed: recentCompleted, short };
}

export function recommendComics<T extends { id: string; genreKey: string }>(comics: T[], historyIds: string[]) {
  const history = new Set(historyIds);
  const genres = new Set(comics.filter(comic => history.has(comic.id)).map(comic => comic.genreKey));
  const unseen = comics.filter(comic => !history.has(comic.id));
  return genres.size ? [...unseen.filter(comic => genres.has(comic.genreKey)), ...unseen.filter(comic => !genres.has(comic.genreKey))] : unseen;
}
