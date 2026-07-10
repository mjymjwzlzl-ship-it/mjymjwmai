'use client';

import { useState } from 'react';
import { Check, Crown, MessageCircle, Sparkles } from 'lucide-react';

type Billing = 'yearly' | 'monthly';

const plans = [
  {
    id: 'webtoon',
    name: '웹툰 무제한',
    icon: Crown,
    highlight: true,
    yearly: {
      badge: '추천 · 18% 할인',
      original: '3,400원',
      price: '2,800원',
      note: '연간 결제 · 연 33,600원 청구',
      cta: '연간 구독 시작하기',
    },
    monthly: {
      badge: '첫 달 990원',
      original: null,
      price: '3,400원',
      note: '첫 달은 990원, 이후 월 3,400원 자동 갱신',
      cta: '첫 달 990원으로 시작하기',
    },
    features: ['모든 웹툰 무제한 감상', '기다림 없이 몰아보기', '작품 응원 참여', '외전·시즌2 제작 투표 참여', '언제든 해지 가능'],
  },
  {
    id: 'premium',
    name: '챗봇 + 웹툰 무제한',
    icon: MessageCircle,
    highlight: false,
    yearly: {
      badge: '12% 할인',
      original: '16,900원',
      price: '14,900원',
      note: '연간 결제 · 연 178,800원 청구',
      cta: '연간 구독 시작하기',
    },
    monthly: {
      badge: '올인원',
      original: null,
      price: '16,900원',
      note: '매월 16,900원 자동 갱신',
      cta: '월간 구독 시작하기',
    },
    features: [
      '웹툰 무제한 멤버십의 모든 혜택',
      'ARATA CHAT 캐릭터 무제한 대화',
      '모든 캐릭터·시나리오 개방',
      '신규 캐릭터 우선 공개',
      '언제든 해지 가능',
    ],
  },
];

export default function SubscribePage() {
  // 연간 결제가 기본 - 월 환산가가 먼저 보이도록
  const [billing, setBilling] = useState<Billing>('yearly');
  const [notice, setNotice] = useState('');

  const isYearly = billing === 'yearly';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00dc64]/10 px-3 py-1 text-xs font-black text-[#00a84c] dark:text-[#00dc64]">
            <Crown className="h-3.5 w-3.5" />
            ARATA 멤버십
          </span>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">멤버십 구독하기</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">나에게 맞는 플랜을 선택하세요.</p>
        </div>

        {/* 결제 주기 토글 - 연간이 기본 */}
        <div className="mt-7 flex justify-center">
          <div className="flex rounded-full border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`rounded-full px-5 py-2 text-sm font-black transition ${
                isYearly
                  ? 'bg-[#00dc64] text-black shadow'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              연간 결제
            </button>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-black transition ${
                !isYearly
                  ? 'bg-[#00dc64] text-black shadow'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              월간 결제
            </button>
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="mx-auto mt-9 grid max-w-3xl gap-5 md:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.yearly : plan.monthly;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-7 shadow-sm dark:bg-[#1b1b1b] ${
                  plan.highlight
                    ? 'border-[#00dc64] shadow-lg ring-2 ring-[#00dc64]/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${
                    plan.highlight ? 'bg-[#00dc64] text-black' : 'bg-gray-900 text-white dark:bg-white dark:text-black'
                  }`}
                >
                  {price.badge}
                </span>

                <h2 className="flex items-center gap-1.5 text-sm font-black text-gray-500 dark:text-gray-400">
                  <Icon className="h-4 w-4" />
                  {plan.name}
                </h2>

                <p className="mt-3 flex flex-wrap items-end gap-2">
                  {price.original && (
                    <span className="text-lg font-bold text-gray-400 line-through">{price.original}</span>
                  )}
                  <span className="text-4xl font-black">{price.price}</span>
                  <span className="pb-1 text-sm font-bold text-gray-400">/ 월</span>
                </p>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{price.note}</p>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="h-4 w-4 shrink-0 text-[#00a84c] dark:text-[#00dc64]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setNotice('구독 결제는 곧 오픈됩니다. 조금만 기다려주세요!')}
                  className={`mt-7 h-12 w-full rounded-xl font-black transition ${
                    plan.highlight
                      ? 'bg-[#00dc64] text-black shadow-lg shadow-green-500/15 hover:bg-[#00c85a]'
                      : 'border border-[#00dc64] text-[#00a84c] hover:bg-[#00dc64] hover:text-black dark:text-[#00dc64] dark:hover:text-black'
                  }`}
                >
                  {price.cta}
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setBilling(isYearly ? 'monthly' : 'yearly')}
          className="mx-auto mt-5 block text-center text-xs font-bold text-gray-400 underline-offset-2 transition hover:text-[#00a84c] hover:underline dark:hover:text-[#00dc64]"
        >
          {isYearly ? '월간 결제 보기 ↗' : '연간 결제로 더 저렴하게 이용하기 ↗'}
        </button>

        {isYearly && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
            <Sparkles className="h-3.5 w-3.5 text-[#00dc64]" />
            처음이라면 월간 결제로 첫 달 990원 체험도 가능해요
          </p>
        )}

        {notice && (
          <p className="mx-auto mt-6 max-w-md rounded-xl bg-[#00dc64]/10 px-4 py-3 text-center text-sm font-bold text-[#00a84c] dark:text-[#00dc64]">
            {notice}
          </p>
        )}

        <p className="mt-10 text-center text-xs leading-relaxed text-gray-400">
          프롤로그와 1화는 구독 없이 무료로 감상할 수 있습니다.
          <br />
          갱신 가격은 결제 전 명확히 고지되며, 구독은 언제든 해지할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
