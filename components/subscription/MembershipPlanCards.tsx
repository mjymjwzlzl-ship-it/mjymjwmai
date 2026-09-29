'use client';

import { Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export type DisplayPlan = {
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  isRecommended: boolean;
  benefits: string[];
};

const labels = {
  ko: { unit: '원', month: '/ 월', annual: '연 결제 시', annualUnit: '월', advance: '12개월 선결제 기준', total: '연간 총액', payment: '선택한 결제 금액', monthly: '월간', yearly: '연간', renewal: '이용기간 12개월 · 자동 갱신', unavailable: '연간 결제 미지원', descriptions: ['웹툰을 부담 없이 즐기는 기본 상품', '작품과 캐릭터를 더 깊이 즐기는 프리미엄 상품', '웹툰과 캐릭터 경험을 모두 연결한 최상위 상품'] },
  en: { unit: '₩', month: '/ month', annual: 'Billed annually', annualUnit: '/ month', advance: '12 months paid upfront', total: 'Annual total', payment: 'Selected amount', monthly: 'Monthly', yearly: 'Annual', renewal: '12 months · Auto-renews', unavailable: 'Annual billing unavailable', descriptions: ['Everyday access to the stories you love', 'Explore more stories, extras and character art', 'Stories and character experiences, together'] },
  ja: { unit: 'ウォン', month: '/ 月', annual: '年間払いで', annualUnit: '月', advance: '12か月分を一括前払い', total: '年間合計', payment: '選択したお支払い額', monthly: '月払い', yearly: '年払い', renewal: '利用期間12か月・自動更新', unavailable: '年払い未対応', descriptions: ['気軽にウェブトゥーンを楽しむ基本プラン', '作品とキャラクターをもっと深く楽しむプラン', '物語とキャラクター体験をすべて楽しむプラン'] },
  fr: { unit: '₩', month: '/ mois', annual: 'Paiement annuel', annualUnit: '/ mois', advance: '12 mois payés à l’avance', total: 'Total annuel', payment: 'Montant sélectionné', monthly: 'Mensuel', yearly: 'Annuel', renewal: '12 mois · Renouvellement automatique', unavailable: 'Paiement annuel indisponible', descriptions: ['Les histoires que vous aimez, au quotidien', 'Plus d’histoires, de bonus et d’illustrations', 'Histoires et expériences avec les personnages réunies'] },
} as const;

const translatedBenefits = {
  en: [
    ['Unlimited main episodes', 'Read completed works', 'Access new works and episodes', 'Regularly updated core content'],
    ['Unlimited main episodes', 'Side stories and special episodes', 'Character photobooks', 'Premium exclusive content', 'Selected shorts and extras (coming gradually)'],
    ['Main stories, extras and photobooks', 'AI character chat', 'Short animation (coming gradually)', 'Premium content in one plan', 'An ongoing character-centered experience'],
  ],
  ja: [
    ['本編読み放題', '完結作品を自由に閲覧', '新作・新エピソード', '日々更新される基本コンテンツ'],
    ['本編読み放題', '外伝・特別編', 'キャラクター画集', 'プレミアム限定コンテンツ', '一部ショート・拡張コンテンツ（順次公開）'],
    ['本編・外伝・画集', 'AIキャラクターチャット', 'ショートアニメ（順次公開）', '主要プレミアムコンテンツを統合', 'キャラクターとの長期的な体験'],
  ],
  fr: [
    ['Épisodes principaux illimités', 'Accès aux œuvres terminées', 'Nouvelles œuvres et nouveaux épisodes', 'Contenus de base régulièrement mis à jour'],
    ['Épisodes principaux illimités', 'Histoires bonus et épisodes spéciaux', 'Artbooks des personnages', 'Contenus premium exclusifs', 'Courts formats et bonus (à venir)'],
    ['Histoires, bonus et artbooks', 'Chat IA avec les personnages', 'Animation courte (à venir)', 'Contenus premium réunis', 'Une expérience durable avec les personnages'],
  ],
} as const;

export default function MembershipPlanCards({ plans, billingCycle, busyPlan, actionLabel, isDisabled, onChoose }: {
  plans: DisplayPlan[];
  billingCycle: 'MONTHLY' | 'YEARLY';
  busyPlan?: string | null;
  actionLabel: (plan: DisplayPlan) => string;
  isDisabled: (plan: DisplayPlan) => boolean;
  onChoose: (plan: DisplayPlan) => void;
}) {
  const { locale } = useLanguage();
  const text = labels[locale];
  const format = (value: number) => new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'fr' ? 'fr-FR' : 'en-US').format(value);

  return (
    <section data-testid="membership-plan-cards" className="mt-9 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-4 lg:pt-3">
      {plans.map((plan) => {
        const index = plan.code === 'BASIC' ? 0 : plan.code === 'PREMIUM' ? 1 : 2;
        const benefits = locale === 'ko' ? plan.benefits : translatedBenefits[locale][index];
        const total = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
        return (
          <article key={plan.code} data-plan-code={plan.code} className={`relative flex min-w-0 flex-col rounded-[24px] border px-5 py-7 sm:px-7 sm:py-8 lg:min-h-[590px] ${plan.isRecommended ? 'border-[#00a860] bg-gradient-to-b from-emerald-50 to-white shadow-lg shadow-emerald-500/5 dark:from-[#06251a] dark:to-[#0c1510] lg:-translate-y-3' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-[#0e1511]'}`}>
            <div className="flex min-h-8 items-center justify-between gap-3">
              <h2 className="text-sm font-black tracking-[0.12em] text-slate-600 dark:text-slate-300">{plan.name}</h2>
              {plan.isRecommended && <span className="shrink-0 rounded-full bg-[#00dc7c] px-3 py-2 text-[10px] font-black text-[#002b17]">CORE PLAN</span>}
            </div>
            <p className="mt-7 flex flex-wrap items-baseline gap-x-1 text-slate-950 dark:text-[#f4faf6]">
              <span data-price="monthly" className="text-[46px] font-black leading-none tracking-[-0.055em] sm:text-[50px]">{format(plan.monthlyPrice)}</span>
              <span className="text-xs font-bold text-slate-500">{text.unit} {text.month}</span>
            </p>
            <p className="mt-5 min-h-10 text-xs leading-5 text-slate-500 dark:text-[#859a94]">{text.descriptions[index]}</p>
            <div className="mt-5 flex min-h-[76px] flex-wrap items-center justify-between gap-2 rounded-[15px] border border-emerald-600/30 bg-emerald-50/70 px-3 py-3 dark:bg-[#0b2619] sm:px-4">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">{text.annual}</span>
              {plan.yearlyPrice != null ? (
                <div className="text-right">
                  <p data-price="annual-monthly" className="text-lg font-black tracking-tight text-[#008d47] dark:text-[#00dc7c]">
                    {(locale === 'ko' || locale === 'ja') && `${text.annualUnit} `}{format(Math.floor(plan.yearlyPrice / 12))}{text.unit}{locale === 'en' || locale === 'fr' ? ` ${text.annualUnit}` : ''}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-[#859a94]">{text.advance}</p>
                  <p data-price="annual-total" className="text-[10px] leading-4 text-slate-500 dark:text-[#859a94]">{text.total} {format(plan.yearlyPrice)}{text.unit}</p>
                </div>
              ) : <span className="text-xs text-slate-500">{text.unavailable}</span>}
            </div>
            <ul className="mb-7 mt-7 flex-1 space-y-3.5">
              {benefits.map(benefit => <li key={benefit} className="flex gap-2 text-[13px] leading-5 text-slate-700 dark:text-slate-200"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00c66b]" strokeWidth={3} /><span>{benefit}</span></li>)}
            </ul>
            <p className="mb-2 text-[11px] leading-4 text-slate-500 dark:text-[#859a94]">{text.payment}: {total == null ? '—' : `${format(total)}${text.unit}`} · {billingCycle === 'YEARLY' ? text.yearly : text.monthly}</p>
            {billingCycle === 'YEARLY' && <p className="mb-3 text-[10px] text-slate-500 dark:text-[#859a94]">{text.renewal}</p>}
            <button type="button" disabled={isDisabled(plan) || !!busyPlan} onClick={() => onChoose(plan)} className={`flex min-h-[52px] w-full items-center justify-center rounded-[14px] px-3 py-3 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00dc64] disabled:cursor-not-allowed ${plan.isRecommended ? 'bg-[#00dc7c] text-[#002917] shadow-lg shadow-emerald-500/10 enabled:hover:bg-[#21ee94]' : 'border border-slate-200 bg-slate-50 text-slate-800 enabled:hover:border-[#00dc64] dark:border-white/10 dark:bg-white/[0.04] dark:text-white'}`}>
              {busyPlan === plan.code ? <Loader2 className="h-5 w-5 animate-spin" /> : actionLabel(plan)}
            </button>
          </article>
        );
      })}
    </section>
  );
}
