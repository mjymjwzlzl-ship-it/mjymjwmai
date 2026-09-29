// 사이트 안에서 이동한 기록이 있으면 브라우저 뒤로가기, 없으면(바로 열었을 때) fallback 으로 이동
const DEPTH_KEY = 'arata:navDepth';

export function markNavigation() {
  try {
    const depth = Number(sessionStorage.getItem(DEPTH_KEY) || '0');
    sessionStorage.setItem(DEPTH_KEY, String(depth + 1));
  } catch {
    // sessionStorage 를 못 쓰면 기록 없이 동작
  }
}

export function goBackOr(router: { back: () => void; push: (href: string) => void }, fallback: string) {
  let depth = 0;
  try {
    depth = Number(sessionStorage.getItem(DEPTH_KEY) || '0');
  } catch {
    depth = 0;
  }
  if (depth > 1 && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}
