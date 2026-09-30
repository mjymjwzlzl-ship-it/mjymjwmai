// 작품 관리 화면 공통 (admin-center/app/works)
export const TYPE_LABEL: Record<string, string> = { webtoon: '웹툰', book: '단행본', novel: '웹소설' };
// 이용등급: 전체 / 15세 / 19세 (사이트는 19만 성인 작품)
export const RATING_LABEL: Record<string, string> = { GENERAL: '전체', '15': '15세', '19': '19세', ADULT: '19세' };
export const LOCALE_LABEL: Record<string, string> = { ko: '한국어', en: '영어' };
export const DAY_LABEL: Record<string, string> = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };
// 장르 값 → 이름 (한글로 저장된 예전 값도 같은 이름으로 묶는다)
export const GENRE_LABEL: Record<string, string> = {
  fantasy: '판타지', romance: '로맨스', action: '액션', martial: '무협', drama: '드라마', school: '학원', comedy: '코미디', thriller: '스릴러', sports: '스포츠', daily: '일상',
  modern: '현대물', 'romance-fantasy': '로맨스판타지', 'modern-fantasy': '현대판타지', mystery: '미스터리·스릴러', sf: 'SF', horror: '공포·호러', historical: '역사·시대물', lightnovel: '라이트노벨', bl: 'BL', gl: 'GL', adult: '성인',
  '드라마': '드라마', '액션': '액션', '판타지': '판타지', '로맨스': '로맨스', '미상': '미분류', '': '미분류',
};
export const genreLabel = (g?: string | null) => GENRE_LABEL[String(g || '').trim()] || String(g || '미분류');
export const STATUS_LABEL: Record<string, string> = { ONGOING: '연재중', HIATUS: '휴재', COMPLETED: '완결', SUSPENDED: '판매중지', HIDDEN: '숨김' };
const isLocal = () => typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const apiBase = () => (isLocal() ? 'http://localhost:8000/api' : 'https://api.arata.co.kr/api');
export const siteBase = () => (isLocal() ? 'http://localhost:8000' : 'https://arata.co.kr');
export const authHeaders = (): Record<string, string> => ({ Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` });
export const img = (url?: string | null) => (!url ? '' : url.startsWith('http') ? url : `${siteBase()}${encodeURI(url)}`);
export async function adminApi<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() };
  let body = init.body;
  if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.json); }
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as any).message || '요청이 실패했습니다.');
  return data as T;
}
