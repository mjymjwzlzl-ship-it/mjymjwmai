const { PrismaClient } = require("@prisma/client");

const titles = [
  "페니스",
  "이모에게 최면을 걸었습니다",
  "오피스 리벤지",
  "젖어있는 여교수",
  "엄마친구랑 섹스를 하며 지냅니다",
  "코스프레 유부녀를 위로해주다가",
];

async function main() {
  const p = new PrismaClient();
  for (const title of titles) {
    const comics = await p.comic.findMany({
      where: { title },
      orderBy: { createdAt: "asc" },
      include: {
        episodes: {
          orderBy: { episodeNumber: "asc" },
          select: {
            id: true,
            episodeNumber: true,
            images: true,
            _count: {
              select: {
                purchases: true,
                views: true,
                ratings: true,
                comments: true,
                episodeLikes: true,
                episodeDislikes: true,
              },
            },
          },
        },
      },
    });

    console.log(JSON.stringify({
      title,
      comicCount: comics.length,
      comics: comics.map((comic) => ({
        id: comic.id,
        rating: comic.rating,
        authorName: comic.authorName,
        createdAt: comic.createdAt,
        updatedAt: comic.updatedAt,
        hasThumbnail: Boolean(comic.thumbnail),
        episodeCount: comic.episodes.length,
        episodeNumbers: comic.episodes.map((ep) => ep.episodeNumber),
        purchaseCount: comic.episodes.reduce((sum, ep) => sum + ep._count.purchases, 0),
        childCounts: comic.episodes.map((ep) => ({
          episodeNumber: ep.episodeNumber,
          purchases: ep._count.purchases,
          views: ep._count.views,
          ratings: ep._count.ratings,
          comments: ep._count.comments,
          likes: ep._count.episodeLikes,
          dislikes: ep._count.episodeDislikes,
          imageCount: String(ep.images || "").split(",").filter(Boolean).length,
        })),
      })),
    }, null, 2));
  }

  console.log(JSON.stringify({ totalComics: await p.comic.count() }));
  await p.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
