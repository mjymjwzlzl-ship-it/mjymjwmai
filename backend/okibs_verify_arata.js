const { PrismaClient } = require("@prisma/client");

const titles = [
  "페니스",
  "이모에게 최면을 걸었습니다",
  "오피스 리벤지",
  "젖어있는 여교수",
  "엄마친구랑 섹스를 하며 지냅니다",
  "코스프레 유부녀를 위로해주다가",
];

function parseImages(value) {
  if (!value) return [];
  const raw = String(value).trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {}
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const p = new PrismaClient();
  const works = [];
  for (const title of titles) {
    const comic = await p.comic.findFirst({
      where: { title, rating: "19" },
      include: { episodes: { orderBy: { episodeNumber: "asc" } } },
    });
    if (!comic) {
      works.push({ title, ok: false, error: "missing comic" });
      continue;
    }
    const episodes = comic.episodes.map((ep) => {
      const images = parseImages(ep.images);
      return {
        id: ep.id,
        episodeNumber: ep.episodeNumber,
        imageCount: images.length,
        nonWebp: images.filter((url) => !/\.webp(?:$|\?)/i.test(url)).length,
        firstImage: images[0] || null,
      };
    });
    works.push({
      title,
      ok: episodes.length > 0 && episodes.every((ep) => ep.nonWebp === 0),
      comicId: comic.id,
      rating: comic.rating,
      authorName: comic.authorName,
      status: comic.status,
      paidStartEpisode: comic.paidStartEpisode,
      episodeCoinPrice: comic.episodeCoinPrice,
      thumbnail: comic.thumbnail,
      episodeCount: episodes.length,
      episodes,
    });
  }
  console.log(JSON.stringify({ totalComics: await p.comic.count(), works }, null, 2));
  await p.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
