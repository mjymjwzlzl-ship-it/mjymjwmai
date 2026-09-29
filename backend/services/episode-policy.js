const { isAdultComic } = require('./adult-access');
const { isPromoFreeEpisode } = require('./promotions');

// One interpretation for all episode delivery endpoints. Never make episode 1
// free implicitly: the catalogue, not a client-side convention, owns pricing.
function episodeContent(episode) {
  const explicitAccess = episode.accessType;
  const legacyFree = episode.comic?.paidStartEpisode === 0 ||
    episode.episodeNumber < episode.comic?.paidStartEpisode ||
    isPromoFreeEpisode(episode.comicId || episode.comic?.id, episode.episodeNumber);
  return {
    ...episode,
    images: undefined,
    contentType: String(episode.contentType || 'MAIN').toUpperCase(),
    contentRating: isAdultComic(episode) || isAdultComic(episode.comic) ? 'ADULT' : 'GENERAL',
    isFree: explicitAccess ? explicitAccess === 'FREE' : legacyFree,
    coinPrice: Number(episode.coinPrice || episode.comic?.episodeCoinPrice || 0),
  };
}

function parseEpisodeImages(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = value.split(','); }
  }
  return Array.isArray(value) ? value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean) : [];
}

module.exports = { episodeContent, parseEpisodeImages };
