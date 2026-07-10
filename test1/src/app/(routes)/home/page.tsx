import HeroCarousel from '@/components/ui/HeroCarousel';
import RankingSection from '@/components/ui/RankingSection';
import SectionStrip from '@/components/ui/SectionStrip';
import AppPromoBanner from '@/components/ui/AppPromoBanner';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <HeroCarousel />
      <RankingSection />
      <SectionStrip title="최신 업데이트" items={Array.from({length:10}).map((_,i)=>({id:`u${i}`, title:`최신 업데이트 ${i+1}`, meta:`제${i+1}화`}))} />
      <SectionStrip
        title="신작"
        items={Array.from({ length: 10 }).map((_, i) => ({ id: `n${i}`, title: `신작 ${i + 1}`, meta: 'NEW' }))}
      />
      <SectionStrip
        title="완전무료"
        items={Array.from({ length: 10 }).map((_, i) => ({ id: `f${i}`, title: `완전무료 ${i + 1}` }))}
        limit={4}
        itemWidth={260}
        mediaHeight={300}
      />
      <AppPromoBanner />
    </div>
  );
}


