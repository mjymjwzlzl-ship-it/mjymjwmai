import Link from 'next/link';

type Banner = { id: string; title: string; desc?: string; href: string; bg: string };

const defaultBanners: Banner[] = [
  { id: 'attendance', title: '출석체크', desc: '매일 보너스', href: '/event/attendance', bg: 'from-yellow-400 to-orange-400' },
  { id: 'welcomeBack', title: '복귀 보너스', desc: '놓치지 마세요', href: '/event/welcome', bg: 'from-emerald-500 to-teal-500' },
  { id: 'freeGift', title: '무료 선물', desc: '오늘만!', href: '/event/gift', bg: 'from-green-500 to-emerald-500' },
];

export default function PromoBannerStrip({ banners = defaultBanners }: { banners?: Banner[] }) {
  return (
    <section aria-label="프로모션" className="px-4">
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-3 md:grid-cols-3">
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.href}
            className={`rounded-2xl bg-gradient-to-br ${b.bg} p-4 text-white shadow-lg transition hover:brightness-105`}
          >
            <div className="text-base font-semibold">{b.title}</div>
            {b.desc && <div className="text-sm opacity-90">{b.desc}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}


