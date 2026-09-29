const{PrismaClient}=require("@prisma/client");const fs=require("fs");const p=new PrismaClient();
(async()=>{const ids=JSON.parse(fs.readFileSync(process.argv[2],"utf8")).map(x=>x.id);let n=0;for(const id of ids){await p.comic.update({where:{id},data:{thumbnail:null}});n++;}console.log("ARATA blanked:",n);await p.$disconnect();})().catch(e=>{console.error(e);process.exit(1);});
