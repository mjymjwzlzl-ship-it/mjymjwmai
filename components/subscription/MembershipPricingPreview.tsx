'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import MembershipPlanCards, { type DisplayPlan } from './MembershipPlanCards';

const copy = {
  ko: { eyebrow: 'ARATA MEMBERSHIP', title: '나에게 맞는 ARATA', intro: '본편부터 외전·화보·캐릭터 채팅까지, 필요한 만큼 선택하세요.', monthly: '월간 결제', yearly: '연간 결제', pending: '결제 준비 중', notice: '새 요금제의 결제 연결을 준비하고 있습니다. 현재는 가격과 혜택을 확인하실 수 있으며, 결제는 진행되지 않습니다.', contact: '요금제 문의', operator: '판매자 및 계약 상대방: 에이단 스튜디오스 · 사업자등록번호 690-81-00705', footer: '숏폼·확장 콘텐츠는 순차 공개됩니다. 성인 콘텐츠 이용에는 별도의 성인인증이 필요합니다.' },
  en: { eyebrow: 'ARATA MEMBERSHIP', title: 'Find your ARATA plan', intro: 'Choose the stories, extras, artbooks and character chat that fit you.', monthly: 'Monthly', yearly: 'Annual', pending: 'Coming soon', notice: 'Payment setup for these plans is in progress. You can review prices and benefits; checkout is not available yet.', contact: 'Ask about membership', operator: 'Seller and contracting party: AIDAN STUDIOS · Business Registration No. 690-81-00705', footer: 'Shorts and expanded content will roll out gradually. Adult content requires separate age verification.' },
  ja: { eyebrow: 'ARATA MEMBERSHIP', title: 'あなたに合うARATA', intro: '本編・外伝・画集・キャラクターチャットから選べます。', monthly: '月払い', yearly: '年払い', pending: '決済準備中', notice: '新プランの決済連携を準備中です。現在は料金と特典の確認のみ可能で、決済は行われません。', contact: 'プランのお問い合わせ', operator: '販売者・契約当事者: AIDAN STUDIOS · 事業者登録番号 690-81-00705', footer: 'ショート・拡張コンテンツは順次公開されます。成人向けコンテンツには別途年齢認証が必要です。' },
  fr: { eyebrow: 'ARATA MEMBERSHIP', title: 'Votre forfait ARATA', intro: 'Histoires, bonus, artbooks et chat : choisissez ce qui vous convient.', monthly: 'Mensuel', yearly: 'Annuel', pending: 'Bientôt disponible', notice: 'La connexion au paiement est en préparation. Consultez les prix et avantages ; aucun paiement ne peut être effectué pour le moment.', contact: 'Questions sur les forfaits', operator: 'Vendeur et cocontractant : AIDAN STUDIOS · No d’enregistrement 690-81-00705', footer: 'Les courts formats et contenus étendus seront publiés progressivement. Les contenus adultes nécessitent une vérification d’âge distincte.' },
} as const;

/** Public pricing while the production billing service is not yet connected. */
export default function MembershipPricingPreview({ plans }: { plans: DisplayPlan[] }) {
  const { locale } = useLanguage();
  const text = copy[locale];
  const [billing, setBilling] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('billing')?.toUpperCase() === 'YEARLY') setBilling('YEARLY');
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f8f6] px-3 py-8 text-slate-950 dark:bg-[#080e0a] dark:text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[1180px]">
        <header className="text-center">
          <p className="text-[11px] font-black tracking-[0.2em] text-emerald-700 dark:text-[#00dc7c]">{text.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-[#859a94]">{text.intro}</p>
        </header>
        <div className="mt-6 flex justify-center" role="group" aria-label={locale === 'ko' ? '결제 주기' : 'Billing cycle'}>
          <div className="inline-flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.03]">
            {(['MONTHLY', 'YEARLY'] as const).map(cycle => <button key={cycle} type="button" aria-pressed={billing === cycle} onClick={() => setBilling(cycle)} className={`min-h-11 rounded-full px-5 text-sm font-bold transition ${billing === cycle ? 'bg-[#00dc7c] text-[#002b17]' : 'text-slate-500 dark:text-slate-300'}`}>{cycle === 'MONTHLY' ? text.monthly : text.yearly}</button>)}
          </div>
        </div>
        <MembershipPlanCards plans={plans} billingCycle={billing} actionLabel={() => text.pending} isDisabled={() => true} onChoose={() => {}} />
        <p role="status" className="mx-auto mt-7 max-w-2xl text-center text-xs leading-6 text-slate-500 dark:text-[#93a69d]">{text.notice}</p>
        <div className="mt-2 text-center"><Link href="/support" className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-emerald-700 underline underline-offset-4 dark:text-[#00dc7c]">{text.contact}</Link></div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] font-bold leading-5 text-slate-600 dark:text-[#9db0a7]">{text.operator}</p>
        <p className="mx-auto mt-5 max-w-2xl text-center text-[11px] leading-5 text-slate-500 dark:text-[#859a94]">{text.footer}</p>
      </div>
    </main>
  );
}
