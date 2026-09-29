// nw_export.js --title X | --all  -> JSON [{id,title,images}] for episodes containing non-webp images. READ-ONLY.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const args = new Map();
for (let i=2;i<process.argv.length;i++){const a=process.argv[i];if(a.startsWith("--")){const n=process.argv[i+1];if(n&&!n.startsWith("--")){args.set(a,n);i++;}else args.set(a,true);}}
function imgs(v){if(!v)return[];v=String(v).trim();try{const j=JSON.parse(v);if(Array.isArray(j))return j.map(String);}catch{}return v.split(",").map(s=>s.trim()).filter(Boolean);}
(async()=>{
  let where={};
  if(args.get("--title")) where={title:String(args.get("--title"))};
  const comics=await p.comic.findMany({where,include:{episodes:{select:{id:true,episodeNumber:true,images:true}}}});
  const out=[];
  for(const c of comics) for(const e of c.episodes){
    if(imgs(e.images).some(u=>/\.(jpe?g|png)$/i.test(u))) out.push({id:e.id,title:`${c.title} #${e.episodeNumber}`,images:e.images});
  }
  console.log(JSON.stringify(out));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
