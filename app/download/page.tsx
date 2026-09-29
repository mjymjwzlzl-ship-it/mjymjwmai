'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Download, Share, Shield, Smartphone, Star, Zap } from 'lucide-react';

export default function AppDownloadPage() {
  const router = useRouter();
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    setIsAndroid(/android/i.test(userAgent));
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));
  }, []);

  const features = [
    { icon: <Zap className="h-6 w-6" />, title: '빠른 감상', description: '작품 목록과 뷰어를 모바일 환경에 맞게 가볍게 제공합니다.' },
    { icon: <Shield className="h-6 w-6" />, title: '완전판 분리', description: '성인 인증 작품은 인증 후 별도 영역에서 이용할 수 있습니다.' },
    { icon: <Star className="h-6 w-6" />, title: '구독자 혜택', description: '첫 달 990원, 이후 월 3,400원으로 다양한 웹툰을 감상하세요.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-black md:text-5xl">ARATA 앱으로 더 편하게 감상하세요</h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-500 dark:text-gray-400">
            다양한 웹툰을 모바일에서 빠르게 감상하고, 구독자 혜택을 놓치지 마세요.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <h2 className="mb-6 text-2xl font-black">설치 방법</h2>
          <div className="space-y-4">
            {['APK 다운로드 버튼을 눌러 설치 파일을 받습니다.', '기기 설정에서 출처를 알 수 없는 앱 설치를 허용합니다.', '다운로드한 APK 파일을 실행해 설치를 완료합니다.'].map((text, index) => (
              <div key={text} className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00dc64] font-black text-black">{index + 1}</div>
                <p className="pt-1 text-gray-600 dark:text-gray-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 text-center">
          <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={() => { window.location.href = '/downloads/arata-v1.0.3.apk'; }}
              className="group inline-flex items-center justify-center rounded-2xl bg-[#00dc64] px-8 py-4 font-black text-black shadow-xl shadow-green-500/20 transition hover:bg-[#00c85a]"
            >
              <Smartphone className="mr-3 h-6 w-6" />
              Android APK 다운로드
              <ChevronRight className="ml-3 h-5 w-5 transition group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => setShowIOSGuide(true)}
              className="group inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-8 py-4 font-black text-gray-950 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-[#1b1b1b] dark:text-white dark:hover:bg-white/5"
            >
              <Share className="mr-3 h-6 w-6" />
              iOS 홈 화면 추가
              <ChevronRight className="ml-3 h-5 w-5 transition group-hover:translate-x-1" />
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAndroid && '안드로이드 기기에서 접속했습니다. APK를 다운로드해 설치하세요.'}
            {isIOS && 'iOS 기기에서는 Safari 공유 버튼으로 홈 화면에 추가해 사용하세요.'}
            {!isAndroid && !isIOS && '모바일 기기에서 접속하면 앱 설치 안내를 더 쉽게 확인할 수 있습니다.'}
          </p>
        </section>

        <section className="mb-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-[#00a84c] dark:bg-green-950/30 dark:text-[#00dc64]">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-black">{feature.title}</h3>
              <p className="text-gray-500 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-gray-200 py-8 text-center dark:border-gray-800">
          <p className="mb-4 text-gray-500 dark:text-gray-400">문제가 발생했나요?</p>
          <button onClick={() => router.push('/support')} className="font-black text-[#00a84c] hover:text-[#00dc64]">
            고객센터 문의하기
          </button>
        </section>
      </main>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#1b1b1b]">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="닫기"
            >
              ×
            </button>
            <h3 className="mb-6 text-2xl font-black">iOS 홈 화면에 추가하기</h3>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>1. Safari로 arata.co.kr에 접속합니다.</p>
              <p>2. 하단 공유 버튼을 누릅니다.</p>
              <p>3. 홈 화면에 추가를 선택하고 추가를 누릅니다.</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-[#00dc64] py-3 font-black text-black hover:bg-[#00c85a]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
