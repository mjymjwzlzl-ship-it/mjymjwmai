'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { confirmPassVerification, PASS_SESSION_KEY, passErrorMessage, readPassSession, safePassReturnPath } from '@/lib/pass-verification';
import { useAdultModeStore } from '@/store/adultMode';

function ReturnHandler() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('본인인증 결과를 서버에서 확인하고 있습니다.');
  const [returnTo, setReturnTo] = useState('/home');
  const [attempt, setAttempt] = useState(0);
  // Reuse the request during StrictMode effect replay.
  const request = useRef<Promise<{ returnTo: string }> | null>(null);
  useEffect(() => {
    let active = true;
    if (!request.current) request.current = (async () => {
      if (params.has('code')) throw new Error('인증이 취소되었거나 완료되지 않았습니다. 다시 인증해주세요.');
      const pending = readPassSession();
      if (!pending || params.get('identityVerificationId') !== pending.identityVerificationId) {
        throw new Error('인증을 시작한 브라우저에서 다시 시도해주세요. 인증 요청 정보를 찾을 수 없습니다.');
      }
      await confirmPassVerification(pending);
      sessionStorage.removeItem(PASS_SESSION_KEY);
      return { returnTo: safePassReturnPath(pending.returnTo) };
    })();
    request.current.then((result) => {
      if (!active) return;
      useAdultModeStore.getState().setEnabled(true);
      setReturnTo(result.returnTo);
      setStatus('success');
      setMessage('PASS 본인인증이 완료되었습니다. 성인 콘텐츠를 이용할 수 있습니다.');
    }).catch((error) => {
      if (!active) return;
      setStatus('error');
      setMessage(passErrorMessage(error));
    });
    return () => { active = false; };
  }, [params, attempt]);
  return (
    <main className="flex min-h-[65vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-900 shadow-lg dark:border-white/10 dark:bg-[#161d22] dark:text-white">
        {status === 'loading' ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#00c85a]" /> : status === 'success' ? <CheckCircle2 className="mx-auto h-10 w-10 text-[#00c85a]" /> : <AlertCircle className="mx-auto h-10 w-10 text-red-500" />}
        <h1 className="mt-4 text-xl font-black">PASS 본인인증</h1>
        <p role={status === 'error' ? 'alert' : 'status'} className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
        {status === 'success' && <Link href={returnTo} className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#00dc64] font-bold text-black">이전 화면으로 돌아가기</Link>}
        {status === 'error' && <div className="mt-6 space-y-3">{!params.has('code') && <button type="button" onClick={() => { request.current = null; setStatus('loading'); setAttempt((n) => n + 1); }} className="min-h-12 w-full rounded-xl bg-[#00dc64] font-bold text-black">인증 결과 다시 확인</button>}<Link href="/auth/verify" className="flex min-h-12 items-center justify-center rounded-xl border border-[#00dc64] text-sm font-bold">본인인증 다시 시작</Link></div>}
      </section>
    </main>
  );
}

export default function PassReturnPage() {
  return <Suspense fallback={<p className="p-10 text-center">인증 결과 확인 중…</p>}><ReturnHandler /></Suspense>;
}
