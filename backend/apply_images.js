// apply_images.js <updates.json>  -> lightweight Episode.images update. NO sharp. idempotent.
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const p = new PrismaClient();
(async()=>{
  const ups=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
  let changed=0,skipped=0;
  for(const u of ups){
    const cur=await p.episode.findUnique({where:{id:u.id},select:{images:true}});
    if(!cur){skipped++;continue;}
    if(cur.images===u.images){skipped++;continue;}
    await p.episode.update({where:{id:u.id},data:{images:u.images}});
    changed++;
  }
  console.log(JSON.stringify({changed,skipped,total:ups.length}));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
