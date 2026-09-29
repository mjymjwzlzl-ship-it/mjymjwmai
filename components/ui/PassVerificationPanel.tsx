'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { confirmPassVerification, PASS_SESSION_KEY, passErrorMessage, passRedirectUrl, safePassReturnPath } from '@/lib/pass-verification';

export default function PassVerificationPanel({ onSuccess }: { onSuccess: () => void }) {
  const [config, setConfig] = useState<{ configured: boolean; adultVerified: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    api.get('/auth/pass/config').then(({ data }) => {
      if (active) setConfig(data);
    }).catch((err) => {
      if (!active) return;
      setError(passErrorMessage(err));
      setNeedsLogin(err.response?.status === 401);
    });
    return () => { active = false; mounted.current = false; };
  }, []);

  async function start() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const PortOne = await import('@portone/browser-sdk/v2');
      const { data } = await api.post('/auth/pass/prepare');
      const redirectUrl = passRedirectUrl(data.redirectUrl, window.location.origin);
      const pending = { identityVerificationId: data.identityVerificationId,
        verificationToken: data.verificationToken,
        returnTo: safePassReturnPath(window.location.pathname + window.location.search) };
      // Refuse to launch if session storage cannot preserve the mobile redirect state.
      sessionStorage.setItem(PASS_SESSION_KEY, JSON.stringify(pending));
      const response = await PortOne.requestIdentityVerification({
        storeId: data.storeId, channelKey: data.channelKey,
        identityVerificationId: data.identityVerificationId, redirectUrl,
      });
      if (!response) throw new Error('인증창이 닫혔거나 열리지 않았습니다. 다시 시도해주세요.');
      if (response.code !== undefined) throw new Error('인증이 취소되었거나 완료되지 않았습니다. 다시 시도해주세요.');
      if (response.identityVerificationId !== pending.identityVerificationId) throw new Error('인증 요청이 일치하지 않습니다.');
      await confirmPassVerification(pending);
      sessionStorage.removeItem(PASS_SESSION_KEY);
      if (mounted.current) onSuccess();
    } catch (err) {
      if (mounted.current) setError(passErrorMessage(err));
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-slate-900 dark:text-white">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00dc64]/15 text-[#00a94c] dark:text-[#00dc64]"><Smartphone aria-hidden="true" className="h-6 w-6" /></div>
        <div><h3 className="text-lg font-black">PASS 휴대폰 본인인증</h3><p className="text-xs text-slate-500 dark:text-slate-400">본인 명의의 휴대폰으로 안전하게 인증</p></div>
      </div>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">통신사 인증창에서 PASS 앱 또는 문자 인증을 진행합니다. 인증된 생년월일로 만 19세 이상 여부를 확인하며, 결제는 진행되지 않습니다.</p>
      {config?.adultVerified ? (
        <><p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><ShieldCheck className="h-5 w-5" />성인인증이 완료된 계정입니다.</p>
          <button type="button" onClick={onSuccess} className="min-h-12 w-full rounded-xl bg-[#00dc64] px-4 font-bold text-black">성인 콘텐츠 이용하기</button></>
      ) : (
        <>
          {config && !config.configured && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm leading-6 text-slate-600 dark:bg-white/5 dark:text-slate-300">PASS 본인인증 연동을 준비 중입니다. 연결이 완료되면 여기서 인증할 수 있습니다.</p>}
          <button type="button" onClick={start} disabled={loading || !config?.configured} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00dc64] px-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-45">
            {loading && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
            {loading ? '본인인증 확인 중…' : config?.configured ? 'PASS로 본인인증하기' : !config && !error ? '연동 상태 확인 중…' : '본인인증 준비 중'}
          </button>
        </>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
      {needsLogin && <Link href="/login" className="flex min-h-11 items-center justify-center rounded-xl border border-slate-300 text-sm font-bold dark:border-white/20">로그인하기</Link>}
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">인증은 현재 로그인한 계정에 적용됩니다. 개인정보 제공 동의는 통신사 인증창에서 진행해주세요.</p>
    </div>
  );
}
