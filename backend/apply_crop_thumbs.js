const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const p = new PrismaClient();
const MAP = [
 ["cmrck4wyl000038xh2vk5df0l","처형의 음란한 육체가 날 유혹한다","adult"],
 ["cmrj7in8h00005z1wkg0mayr6","신혼부부 NTR게임","adult"],
 ["cmrcdy5uv00006ecsn5hwx3bj","옆집 아줌마와 이세계로 가버렸습니다","adult"],
 ["cmrj7cfz5000098a9ssoxbppl","무인도에 유부녀와 표류했습니다","adult"],
 ["cmrbyby6c0000fhrpuufrhk6i","결혼전에는 괜찮아","adult"],
 ["cmrcomt1k0000ymjsmdcepx76","일진양성학교","general"],
];
(async()=>{
 const backup=[];
 for(const [id,title,genre] of MAP){
  const c=await p.comic.findUnique({where:{id}});
  if(!c){console.log("MISSING id",id,title);continue;}
  const nu=`/uploads/webtoons/${genre}/${title}/thumbnail_crop.webp`;
  backup.push({id,title,old:c.thumbnail});
  if(c.thumbnail===nu){console.log("SKIP(same)",title);continue;}
  await p.comic.update({where:{id},data:{thumbnail:nu}});
  console.log("UPDATED",title,"\n   old:",c.thumbnail,"\n   new:",nu);
 }
 const fn=`_thumb_crop_backup_${Date.now()}.json`;
 fs.writeFileSync(fn,JSON.stringify(backup,null,2));
 console.log("BACKUP",fn);
 await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
