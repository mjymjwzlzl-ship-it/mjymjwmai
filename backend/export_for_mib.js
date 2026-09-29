// export_for_mib.js --title "X"  |  --all   -> prints JSON array of comics(+episodes) for MIB reflection
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const args = new Map();
for (let i = 2; i < process.argv.length; i++) { const a=process.argv[i]; if(a.startsWith("--")){const n=process.argv[i+1]; if(n&&!n.startsWith("--")){args.set(a,n);i++;}else args.set(a,true);} }
(async () => {
  let where;
  if (args.get("--all")) where = { rating: { in: ["19","ADULT","GENERAL","all"] } };
  else if (args.get("--title")) where = { title: String(args.get("--title")) };
  else { console.error("need --title or --all"); process.exit(2); }
  const comics = await p.comic.findMany({ where, include: { episodes: { orderBy: { episodeNumber: "asc" } } } });
  const out = comics
    .filter(c => c.episodes.length > 0)
    .map(c => ({
      title: c.title, description: c.description, thumbnail: c.thumbnail, genre: c.genre,
      rating: c.rating, status: c.status, authorName: c.authorName,
      paidStartEpisode: c.paidStartEpisode, episodeCoinPrice: c.episodeCoinPrice,
      episodes: c.episodes.map(e => ({ episodeNumber: e.episodeNumber, title: e.title, thumbnail: e.thumbnail, images: e.images, isFree: e.isFree, coinPrice: e.coinPrice })),
    }));
  console.log(JSON.stringify(out));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
