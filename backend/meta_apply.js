// meta_apply.js <updates.json>  — fill EMPTY Comic.thumbnail/description only (빈값우선). Lightweight, no sharp.
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const p = new PrismaClient();
(async()=>{
  const ups = JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
  let thumbSet=0, descSet=0, skipped=0;
  for(const u of ups){
    const c = await p.comic.findUnique({where:{id:u.id},select:{thumbnail:true,description:true}});
    if(!c){skipped++;continue;}
    const data={};
    if(u.thumbnail && (!c.thumbnail || c.thumbnail==="")) { data.thumbnail=u.thumbnail; thumbSet++; }
    if(u.description && (!c.description || c.description==="" || c.description==="미상")) { data.description=u.description; descSet++; }
    if(Object.keys(data).length) await p.comic.update({where:{id:u.id},data});
    else skipped++;
  }
  console.log(JSON.stringify({thumbSet,descSet,skipped,total:ups.length}));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
