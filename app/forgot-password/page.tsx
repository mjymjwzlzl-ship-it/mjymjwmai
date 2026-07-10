'use client';

import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSent(true);
      setMessage('비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인해주세요.');
    } catch {
      setSent(false);
      setMessage('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-sm font-bold text-gray-500 transition hover:text-[#00a84c] dark:text-gray-400 dark:hover:text-[#00dc64]"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            돌아가기
          </button>

          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-black">비밀번호 찾기</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              가입한 이메일 주소를 입력해주세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-100">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
                  placeholder="이메일을 입력해주세요"
                />
              </div>
            </div>

            {message && (
              <div className={`rounded-lg p-3 text-sm ${sent ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#00dc64] px-4 py-3 font-black text-black transition hover:bg-[#00c85a] disabled:opacity-50"
            >
              {isLoading ? '발송 중...' : '재설정 이메일 발송'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-bold text-[#00a84c] hover:text-[#00dc64]"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
