'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, Crown } from 'lucide-react';
import { useLanguage, type Locale } from '@/components/providers/LanguageProvider';

const copy = {
  ko: { title: '다음 이야기도,', secondLine: '기다림 없이.', benefit: '웹툰 본편 무제한 감상', annual: 'BASIC · 연간 멤버십', price: '월 2,800원', prefix: '월', amount: '2,800', suffix: '원', billed: '연 33,600원 · 12개월 선결제', offerLabel: '월간 결제 첫 달', offerPrice: '990원', offerAfter: '이후 월 3,400원', action: '멤버십 혜택 보기', label: '웹툰 감상 후 멤버십 안내' },
  en: { title: 'One more story.', secondLine: 'No more waiting.', benefit: 'Unlimited main-series webtoons', annual: 'BASIC · ANNUAL MEMBERSHIP', price: '₩2,800 / month', prefix: '₩', amount: '2,800', suffix: '/ mo', billed: '₩33,600 billed yearly · 12 months prepaid', offerLabel: 'First month on monthly billing', offerPrice: '₩990', offerAfter: 'Then ₩3,400 / month', action: 'Explore membership', label: 'Membership after this episode' },
  ja: { title: '次の物語も、', secondLine: '待たずに。', benefit: 'ウェブトゥーン本編が読み放題', annual: 'BASIC · 年間メンバーシップ', price: '月2,800ウォン', prefix: '月', amount: '2,800', suffix: 'ウォン', billed: '年33,600ウォン・12か月分前払い', offerLabel: '月払いの初月', offerPrice: '990ウォン', offerAfter: '以降は月3,400ウォン', action: 'メンバーシップを見る', label: '読了後のメンバーシップ案内' },
  fr: { title: 'Encore une histoire.', secondLine: 'Sans attendre.', benefit: 'Webtoons : séries principales en illimité', annual: 'BASIC · ABONNEMENT ANNUEL', price: '2 800 ₩ / mois', prefix: '', amount: '2 800', suffix: '₩ / mois', billed: '33 600 ₩ par an · 12 mois prépayés', offerLabel: 'Premier mois en paiement mensuel', offerPrice: '990 ₩', offerAfter: 'Puis 3 400 ₩ / mois', action: 'Découvrir les offres', label: 'Abonnement après cet épisode' },
} as const;

/** Only mount after readable manuscript images; never inside a locked preview. */
export default function EpisodeEndMembershipBanner({ locale: localeOverride }: { locale?: Locale }) {
  const { locale } = useLanguage();
  const text = copy[localeOverride || locale];

  return (
    <section
      data-promotion="episode-end-membership"
      aria-label={text.label}
      className="mx-auto w-full max-w-3xl px-3 py-7 sm:px-4 sm:py-10"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative isolate overflow-hidden rounded-[24px] border border-[#24dd8b]/35 bg-[#061320] text-white shadow-[0_18px_55px_-30px_rgba(0,70,50,0.65)]">
        <div className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full border border-[#36f1a3]/10 shadow-[0_0_90px_30px_rgba(0,220,100,0.06),inset_0_0_70px_rgba(0,220,100,0.06)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -right-5 w-[63%] sm:right-0 sm:w-[50%]">
            <img
              src="/images/promo/episode-membership-heroine-navy-v2.webp"
              width={1024}
              height={1536}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-y-0 left-0 w-[30%] bg-gradient-to-r from-[#061320] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#061320] to-transparent" />
          </div>
          <div className="relative z-10 min-h-[314px] px-5 py-6 sm:min-h-[360px] sm:px-8 sm:py-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#42f4ac]/30 bg-[#092c2c]/85 px-3 py-1.5 text-[9px] font-bold tracking-[0.15em] text-[#72efb7] sm:text-[10px]">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />ARATA MEMBERSHIP
            </p>
            <div className="mt-5 w-[69%] min-w-0 sm:mt-6 sm:w-[59%]">
              <h2 className="text-[24px] font-black leading-[1.25] tracking-[-0.035em] text-white min-[375px]:text-[28px] sm:text-[36px]">
                {text.title}<br /><span className="text-[#76f5b8]">{text.secondLine}</span>
              </h2>
              <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-300 sm:text-xs">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#55e89f]" aria-hidden="true" />{text.benefit}
              </p>
              <div className="mt-6 sm:mt-7">
                <p className="text-[9px] font-bold tracking-wide text-[#8ca9ae] sm:text-[10px]">{text.annual}</p>
                <p aria-label={text.price} className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[#30ed8d]">
                  {text.prefix && <span aria-hidden="true" className="text-sm font-bold sm:text-lg">{text.prefix}</span>}
                  <span aria-hidden="true" className="text-[43px] font-black leading-none tracking-[-0.055em] min-[375px]:text-[49px] sm:text-[60px]">{text.amount}</span>
                  <span aria-hidden="true" className="text-xs font-bold sm:text-base">{text.suffix}</span>
                </p>
                <p className="mt-2 text-[9px] leading-relaxed text-slate-400 sm:text-[11px]">{text.billed}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative flex flex-col gap-4 border-t border-white/10 bg-[#031019] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-8">
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px] text-slate-300">
              <span>{text.offerLabel}</span><strong className="text-lg font-extrabold text-white">{text.offerPrice}</strong>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">{text.offerAfter}</p>
          </div>
          <Link
            href="/subscribe?plan=BASIC&billing=YEARLY"
            className="group inline-flex min-h-12 w-full shrink-0 items-center justify-between gap-4 rounded-xl bg-[#00e578] px-5 py-3 text-sm font-black text-[#002b16] shadow-[0_6px_24px_-10px_rgba(0,229,120,0.5)] transition-colors hover:bg-[#57f5aa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#76f5b8] sm:w-auto sm:min-w-[210px] sm:px-6"
          >
            {text.action}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
