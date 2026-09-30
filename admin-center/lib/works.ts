// 작품 관리 화면 공통 (admin-center/app/works)
export const TYPE_LABEL: Record<string, string> = { webtoon: '웹툰', book: '단행본', novel: '웹소설' };
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
