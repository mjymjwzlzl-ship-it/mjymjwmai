'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

function InicisReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // INICIS에서 전달받은 파라미터들
        const resultCode = searchParams.get('resultCode');
        const resultMsg = searchParams.get('resultMsg');
        const tid = searchParams.get('tid');
        const merchantUid = searchParams.get('MOID'); // INICIS에서는 MOID로 전달
        const authToken = searchParams.get('authToken');
        const authUrl = searchParams.get('authUrl');

        console.log('INICIS 결제 결과:', { 
          resultCode, 
          resultMsg, 
          tid, 
          merchantUid, 
          authToken 
        });

        if (resultCode === '0000') {
          // 결제 성공 - 백엔드에서 승인 처리
          try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            
            if (token && tid && merchantUid) {
              const response = await api.post('/payment/complete', {
                imp_uid: tid,
                merchant_uid: merchantUid
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (response.data.success) {
                setStatus('success');
                setMessage(`${response.data.coinAmount} 코인이 성공적으로 충전되었습니다!`);
              } else {
                setStatus('failed');
                setMessage('결제는 완료되었으나 코인 지급 중 오류가 발생했습니다.');
              }
            } else {
              setStatus('failed');
              setMessage('결제 정보가 올바르지 않습니다.');
            }
          } catch (error) {
            console.error('결제 완료 처리 실패:', error);
            setStatus('failed');
            setMessage('결제 완료 처리 중 오류가 발생했습니다.');
          }
        } else {
          // 결제 실패
          setStatus('failed');
          setMessage(resultMsg || '결제가 실패했습니다.');
        }
      } catch (error) {
        console.error('INICIS 결제 결과 처리 실패:', error);
        setStatus('failed');
        setMessage('결제 결과 처리 중 오류가 발생했습니다.');
      }
    };

    processPaymentResult();
  }, [searchParams]);

  const handleGoBack = () => {
    router.push('/coin');
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              INICIS 결제 결과 처리 중...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              잠시만 기다려주세요.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              결제가 완료되었습니다!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleGoHome}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                홈으로 가기
              </button>
              <button
                onClick={handleGoBack}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                코인 충전하기
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              결제에 실패했습니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleGoBack}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                다시 시도하기
              </button>
              <button
                onClick={() => router.push('/support')}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                고객센터 문의
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function InicisReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <InicisReturnContent />
    </Suspense>
  );
}