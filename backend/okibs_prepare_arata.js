const { PrismaClient } = require("@prisma/client");

const works = [
  { title: "페니스", episodes: 11 },
  { title: "이모에게 최면을 걸었습니다", episodes: 12 },
  { title: "오피스 리벤지", episodes: 7 },
  { title: "젖어있는 여교수", episodes: 7 },
  { title: "엄마친구랑 섹스를 하며 지냅니다", episodes: 6 },
  { title: "코스프레 유부녀를 위로해주다가", episodes: 12 },
];

const prisma = new PrismaClient();

async function childCounts(episodeIds) {
  const [purchases, views, ratings, comments, likes, dislikes] = await Promise.all([
    prisma.purchase.count({ where: { episodeId: { in: episodeIds } } }),
    prisma.view.count({ where: { episodeId: { in: episodeIds } } }),
    prisma.rating.count({ where: { episodeId: { in: episodeIds } } }),
    prisma.comment.count({ where: { episodeId: { in: episodeIds } } }),
    prisma.episodeLike.count({ where: { episodeId: { in: episodeIds } } }),
    prisma.episodeDislike.count({ where: { episodeId: { in: episodeIds } } }),
  ]);
  return { purchases, views, ratings, comments, likes, dislikes };
}

async function main() {
  const results = [];
  for (const work of works) {
    const existing = await prisma.comic.findMany({
      where: { title: work.title },
      orderBy: { createdAt: "asc" },
      include: { episodes: { select: { id: true, episodeNumber: true } } },
    });

    let comic = existing[0];
    if (existing.length > 1) {
      throw new Error(`${work.title}: duplicate Comic rows found; refusing ambiguous replacement`);
    }

    if (!comic) {
      comic = await prisma.comic.create({
        data: {
          title: work.title,
          description: "",
          thumbnail: null,
          genre: "adult",
          rating: "19",
          status: "ONGOING",
          authorName: "문스튜디오",
          paidStartEpisode: 2,
          episodeCoinPrice: 3,
          locale: "ko",
          isOfficial: true,
        },
        include: { episodes: { select: { id: true, episodeNumber: true } } },
      });
    }

    const episodeIds = comic.episodes.map((ep) => ep.id);
    const counts = episodeIds.length ? await childCounts(episodeIds) : {
      purchases: 0, views: 0, ratings: 0, comments: 0, likes: 0, dislikes: 0,
    };
    if (counts.purchases > 0) {
      throw new Error(`${work.title}: ${counts.purchases} purchases exist; refusing to delete Episodes`);
    }

    const deleted = await prisma.episode.deleteMany({ where: { comicId: comic.id } });
    const updated = await prisma.comic.update({
      where: { id: comic.id },
      data: {
        description: "",
        thumbnail: null,
        genre: "adult",
        rating: "19",
        status: "ONGOING",
        authorName: "문스튜디오",
        paidStartEpisode: 2,
        episodeCoinPrice: 3,
        locale: "ko",
        isOfficial: true,
      },
    });

    results.push({
      title: work.title,
      comicId: updated.id,
      deletedEpisodes: deleted.count,
      priorChildCounts: counts,
      expectedEpisodes: work.episodes,
    });
  }

  console.log(JSON.stringify({ prepared: results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
