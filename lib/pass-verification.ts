import { api } from '@/lib/api';

export const PASS_SESSION_KEY = 'arata.pending-pass-verification';
export type PassSession = { identityVerificationId: string; verificationToken: string; returnTo: string };

export function safePassReturnPath(path?: string) {
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path) ||
    path.startsWith('/auth/pass-return')) return '/home';
  return path;
}

export function passRedirectUrl(configuredUrl: string, currentOrigin: string) {
  const configured = new URL(configuredUrl);
  const current = new URL(currentOrigin);
  const loopback = (url: URL) => url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  // localhost and 127.0.0.1 have different sessionStorage. Keep local redirects on the launch origin.
  if (configured.origin === current.origin || (loopback(configured) && loopback(current))) {
    return new URL('/auth/pass-return', current.origin).href;
  }
  throw new Error('현재 사이트 주소와 본인인증 복귀 주소가 다릅니다. 운영 설정을 확인해주세요.');
}

export function readPassSession(): PassSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PASS_SESSION_KEY) || 'null');
    return typeof value?.identityVerificationId === 'string' && typeof value?.verificationToken === 'string' ? value : null;
  } catch { return null; }
}

// UI cache only: the backend remains responsible for adult-content access.
export async function confirmPassVerification(pending: PassSession) {
  const { data } = await api.post('/auth/pass/confirm', {
    identityVerificationId: pending.identityVerificationId, verificationToken: pending.verificationToken,
  });
  if (data.success !== true || data.adultVerified !== true) throw new Error('본인인증 결과를 확인하지 못했습니다.');
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.id === data.userId) {
      localStorage.setItem('user', JSON.stringify({ ...user, adultVerified: true,
        adultVerifiedAt: data.adultVerifiedAt, adultVerificationMethod: data.adultVerificationMethod }));
    }
  } catch { /* A blocked cache must not undo successful server verification. */ }
  return data;
}

export function passErrorMessage(error: unknown) {
  const value = error as { response?: { data?: { message?: string } }; message?: string; isAxiosError?: boolean };
  return value?.response?.data?.message || (!value?.isAxiosError && value?.message) || '본인인증을 진행하지 못했습니다. 다시 시도해주세요.';
}
