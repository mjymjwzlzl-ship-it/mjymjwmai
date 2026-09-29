// 작품 유형(웹툰/단행본/웹소설) 구분. DB 에 유형 필드가 아직 없어 프론트 lib/comic-content-format.ts 와 같은 목록을 쓴다.
// 목록을 바꾸면 두 곳을 같이 바꿀 것.
const MONOCHROME_COMIC_IDS = new Set([
  'cmrcowqbn000026hcnl74lq6v', // 죽음의 사막
  'cmrcoup2n0000sjeecwxzyale', // 주사위게임
  'cmrcoks1r0000az2ud9wupoy5', // 오태선의 포장마차
  'cmrcokbhd000013p03boxrp10', // 기억을 가지고 5년 전으로 돌아갈 기회가 생겼다
]);

function contentTypeOf(comic) {
  return MONOCHROME_COMIC_IDS.has(String(comic?.id || '')) ? 'book' : 'webtoon';
}

module.exports = { contentTypeOf, MONOCHROME_COMIC_IDS };
