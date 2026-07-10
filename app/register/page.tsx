'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Check, Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { api, endpoints } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeAge: false,
    agreeMarketing: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const requiredAgreed = formData.agreeTerms && formData.agreePrivacy && formData.agreeAge;
  const allAgreed = requiredAgreed && formData.agreeMarketing;

  const registerMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      username: string;
      agreeMarketing: boolean;
    }) => {
      const response = await api.post(endpoints.register, data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('userLogin'));
      }
      router.push('/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!requiredAgreed) {
      setError('필수 약관에 모두 동의해주세요.');
      return;
    }

    registerMutation.mutate({
      email: formData.email,
      password: formData.password,
      username: formData.name,
      agreeMarketing: formData.agreeMarketing,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAgreeAll = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      agreeTerms: checked,
      agreePrivacy: checked,
      agreeAge: checked,
      agreeMarketing: checked,
    }));
  };

  const openExternalSignup = (url: string, provider: string) => {
    const isKakaoInApp = /KAKAOTALK/i.test(navigator.userAgent);

    if (isKakaoInApp) {
      const confirmed = confirm(`${provider} 가입은 외부 브라우저에서 진행합니다. 계속하시겠습니까?`);
      if (confirmed) {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
      }
      return;
    }

    window.location.href = url;
  };

  const socialButtons = [
    { label: '네이버', bg: 'bg-[#03c75a]', text: 'text-white', mark: 'N', url: 'https://api.arata.co.kr/api/auth/naver' },
    { label: '카카오톡', bg: 'bg-[#fee500]', text: 'text-[#3c1e1e]', mark: '●', url: 'https://api.arata.co.kr/api/auth/kakao' },
    { label: '페이스북', bg: 'bg-[#1877f2]', text: 'text-white', mark: 'f', url: 'https://api.arata.co.kr/api/auth/facebook' },
    { label: '구글', bg: 'bg-white border border-gray-200', text: 'text-gray-700', mark: 'G', url: 'https://api.arata.co.kr/api/auth/google' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f7] px-4 py-8 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,220,100,0.14),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(0,220,100,0.12),transparent_32%),linear-gradient(180deg,#101010_0%,#181818_100%)]" />

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-2xl shadow-black/15 dark:border-gray-800 dark:bg-[#1b1b1b]">
          <Link
            href="/home"
            aria-label="닫기"
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/8 text-gray-600 transition hover:bg-black/12 hover:text-gray-950 dark:bg-white/10 dark:text-gray-300 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </Link>

          <div className="relative min-h-[178px] overflow-hidden bg-gradient-to-br from-[#fff7ef] via-white to-[#eafff2] px-5 pb-5 pt-4 dark:from-[#211812] dark:via-[#181818] dark:to-[#092417]">
            <div className="relative z-10 max-w-[245px]">
              <span className="inline-flex rounded-full bg-[#202020] px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-black">
                지금 가입만 해도!
              </span>
              <h1 className="mt-3 text-[27px] font-black leading-[1.05] tracking-tight text-gray-950 dark:text-white">
                첫 달 <span className="text-[#00c85a]">990원</span>
                <br />
                연간 결제 시
                <br />
                <span className="text-[#00c85a]">월 2,800원</span>
              </h1>
              <p className="mt-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                다양한 웹툰을 무제한으로 감상하세요.
              </p>
            </div>

            <div className="absolute -right-8 bottom-0 top-3 w-[178px] overflow-hidden rounded-bl-[44px]">
              <img
                src="/uploads/promo/arata-launch-heroine.jpeg"
                alt="ARATA 가입 안내 캐릭터"
                className="h-full w-full scale-125 object-cover object-[50%_12%]"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/40 dark:to-[#181818]/40" />
            </div>

            <div className="absolute bottom-4 right-20 z-10 rotate-[-12deg] rounded-sm border-2 border-black bg-white px-2 py-1 text-xs font-black text-black shadow-sm">
              FREE
            </div>
          </div>

          <div className="px-5 pb-6 pt-5">
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-gray-800" />
              <span className="relative bg-white px-4 text-xs font-bold text-gray-400 dark:bg-[#1b1b1b]">
                SNS 간편 회원가입
              </span>
            </div>

            <div className="mb-7 grid grid-cols-4 gap-3">
              {socialButtons.map((button) => (
                <button
                  key={button.label}
                  type="button"
                  onClick={() => openExternalSignup(button.url, button.label)}
                  className="group flex flex-col items-center gap-2"
                >
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black shadow-sm transition group-hover:-translate-y-0.5 ${button.bg} ${button.text}`}>
                    {button.mark}
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{button.label}</span>
                </button>
              ))}
            </div>

            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-gray-800" />
              <span className="relative bg-white px-4 text-xs font-bold text-gray-400 dark:bg-[#1b1b1b]">
                이메일 회원가입
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-0 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="이메일"
                  className="w-full border-0 border-b border-gray-300 bg-transparent py-3 pl-8 pr-2 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-[#00dc64] dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="relative">
                <User className="pointer-events-none absolute left-0 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="닉네임"
                  className="w-full border-0 border-b border-gray-300 bg-transparent py-3 pl-8 pr-2 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-[#00dc64] dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-0 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="비밀번호"
                  className="w-full border-0 border-b border-gray-300 bg-transparent py-3 pl-8 pr-11 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-[#00dc64] dark:border-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-0 top-2.5 flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-0 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호 확인"
                  className="w-full border-0 border-b border-gray-300 bg-transparent py-3 pl-8 pr-11 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-[#00dc64] dark:border-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-0 top-2.5 flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label={showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="mt-2 w-full rounded-full bg-[#e60000] px-4 py-4 text-lg font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-[#d40000] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registerMutation.isPending ? '가입 중...' : '무료 회원가입'}
              </button>

              <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-gray-800 underline underline-offset-4 hover:text-[#00a84c] dark:text-gray-200 dark:hover:text-[#00dc64]">
                  로그인 바로가기
                </Link>
              </p>

              <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allAgreed}
                    onChange={(event) => handleAgreeAll(event.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-[#00dc64] focus:ring-[#00dc64]"
                  />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">전체 동의</span>
                </label>

                <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  {[
                    { name: 'agreeTerms', label: '[필수] 이용약관 동의', required: true },
                    { name: 'agreePrivacy', label: '[필수] 개인정보 수집 및 이용 동의', required: true },
                    { name: 'agreeAge', label: '[필수] 만 14세 이상입니다.', required: true },
                    { name: 'agreeMarketing', label: '[선택] 이벤트 등 혜택 정보 알림', required: false },
                  ].map((item) => (
                    <label key={item.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name={item.name}
                          checked={Boolean(formData[item.name as keyof typeof formData])}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-300 text-[#00dc64] focus:ring-[#00dc64]"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                      </span>
                      {item.required && <Check className="h-4 w-4 shrink-0 text-[#00c85a]" />}
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
