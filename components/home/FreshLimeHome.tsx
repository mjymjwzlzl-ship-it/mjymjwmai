'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Heart, ImageIcon, MessageCircle, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { getComicImage } from '@/lib/home-images';
import { discoverComics, recommendComics, type DiscoveryComic } from '@/lib/home-discovery';
import { removeHiddenComicDuplicates } from '@/lib/comic-deduplication';
import { localizeComicAuthor, localizeComicGenre, localizeComicSynopsis, localizeComicTitle, resolveComicGenre } from '@/lib/comic-localization';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAdultModeStore } from '@/store/adultMode';
import { useLoginModalStore } from '@/store/loginModal';
import { homeCopy } from './home-copy';
import styles from './FreshLimeHome.module.css';

type Work = DiscoveryComic & { image: string; heroImage: string; authorLabel: string; genreLabel: string; genreKey: string; synopsis: string; count: number };
type HistoryItem = { webtoonId: string; lastEpisode?: number };
type HomePlan = { code: string; name: string; monthlyPrice: number; yearlyPrice: number | null; isRecommended: boolean; isActive?: boolean };
const GENRES = ['all', 'action', 'fantasy', 'romance', 'thriller'];
const HERO_ID = 'cmfkt0q1a0001142ov9e5yqch';
const pricingPreviewNotice = {
  ko: '요금제의 가격과 혜택을 안내합니다. 구독 결제 연결은 준비 중입니다.',
  en: 'Explore plan prices and benefits. Subscription checkout is being prepared.',
  ja: 'プランの料金と特典をご案内します。サブスクリプション決済は準備中です。',
  fr: 'Consultez les prix et avantages. Le paiement des abonnements est en préparation.',
};

export default function FreshLimeHome({ adultOnly = false, publishedPlans = [] }: { adultOnly?: boolean; publishedPlans?: HomePlan[] }) {
  const { locale, t } = useLanguage();
  const text = homeCopy[locale];
  const adultEnabled = useAdultModeStore(state => state.enabled);
  const adult = adultOnly || adultEnabled;
  const setLoginOpen = useLoginModalStore(state => state.setOpen);
  const [genre, setGenre] = useState('all');
  const [slide, setSlide] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasSession, setHasSession] = useState(false);
  const prefix = adult ? '/adult' : '';
  const catalog = useQuery({
    queryKey: ['fresh-lime-home', adult ? 'ADULT' : 'GENERAL'],
    queryFn: async () => (await api.get(adult ? '/frontend/adult-home' : '/frontend/home', { timeout: 10000, params: { adultMode: adult } })).data,
    enabled: !adult || hasSession,
    retry: false,
  });
  const pricing = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      try {
        return { plans: (await api.get('/plans', { timeout: 8000 })).data.plans as HomePlan[], preview: false };
      } catch (error: any) {
        // Production currently publishes prices from its server-owned config.
        // Only an absent billing endpoint uses those prices; outages remain errors.
        if (error?.response?.status === 404 && publishedPlans.length) return { plans: publishedPlans, preview: true };
        throw error;
      }
    },
    retry: false,
    staleTime: 60000,
  });

  useEffect(() => {
    const sync = () => {
      setHasSession(Boolean(localStorage.getItem('authToken') || localStorage.getItem('token')));
      try {
        const stored = JSON.parse(localStorage.getItem('viewedWebtoons') || '[]');
        setHistory(Array.isArray(stored) ? stored.filter(item => typeof item?.webtoonId === 'string').slice(0, 12) : []);
      } catch { setHistory([]); }
    };
    sync();
    const events = ['storage', 'viewedWebtoonsUpdated', 'userLogin', 'loginStateChanged'];
    events.forEach(event => window.addEventListener(event, sync));
    return () => events.forEach(event => window.removeEventListener(event, sync));
  }, []);
  useEffect(() => { setSlide(0); setGenre('all'); }, [adult]);

  const works = useMemo(() => {
    const data = catalog.data?.data || {};
    const source = (data.allComics || data.categories?.allComics || data.comics || []).filter((comic: DiscoveryComic) => !String(comic.thumbnailUrl || comic.thumbnail || '').includes('/uploads/novels/'));
    return discoverComics(removeHiddenComicDuplicates(source), adult).all.map((comic): Work => {
      const genreKey = String(resolveComicGenre(comic)).toLowerCase();
      const image = getComicImage(comic, comic.thumbnailUrl || comic.thumbnail || '', 'poster');
      return {
        ...comic,
        title: localizeComicTitle(comic, locale),
        image,
        heroImage: getComicImage(comic, image, 'banner'),
        authorLabel: localizeComicAuthor(comic, locale),
        genreKey,
        genreLabel: localizeComicGenre(genreKey, locale),
        synopsis: localizeComicSynopsis(comic, locale, text.heroSub),
        count: Number(comic._count?.episodes ?? comic.episodeCount ?? 0),
      };
    });
  }, [catalog.data, adult, locale, text.heroSub]);

  const discovery = useMemo(() => discoverComics(works, adult) as { all: Work[]; latest: Work[]; popular: Work[]; completed: Work[]; short: Work[] }, [works, adult]);
  const heroes = useMemo(() => {
    const preferred = works.find(work => work.id === HERO_ID);
    return [...(preferred ? [preferred] : []), ...discovery.popular.filter(work => work.id !== preferred?.id)].slice(0, 4);
  }, [works, discovery.popular]);
  const active = heroes[slide % Math.max(heroes.length, 1)];
  const recent = history.map(item => ({ work: works.find(work => work.id === item.webtoonId), episode: item.lastEpisode })).filter(item => item.work);
  const recommendations = recommendComics(discovery.popular, history.map(item => item.webtoonId));
  const latest = discovery.latest.filter(work => genre === 'all' || work.genreKey.includes(genre)).slice(0, 6);
  const plans = (pricing.data?.plans || []).filter(plan => ['BASIC', 'PREMIUM', 'ALL_ACCESS'].includes(plan.code) && plan.isActive !== false);

  const sectionHeading = (title: string, subtitle: string, href?: string) => (
    <div className={styles.sectionHeading}>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {href && <Link href={href} className={styles.more}>{text.all}<ChevronRight size={16} /></Link>}
    </div>
  );
  const card = (work: Work, badge?: string) => (
    <Link className={styles.card} href={`/webtoons/${work.id}`} key={work.id}>
      <div className={styles.cover}>
        {work.image ? <img src={getImageUrl(work.image, { width: 450 })} alt={work.title} loading="lazy" /> : <BookOpen className={styles.missingImage} />}
        {badge && <span className={styles.badge}>{badge}</span>}
        {work.status === 'COMPLETED' && <span className={styles.completeLabel}><Check size={11} />{text.completeBadge}</span>}
      </div>
      <h3>{work.title}</h3><p>{work.genreLabel}{work.count > 0 && <> · {work.count}{text.episodes}</>}</p>
    </Link>
  );

  const blocked = adult && (!hasSession || [401, 403].includes((catalog.error as any)?.response?.status));
  return (
    <div className={styles.page} data-home-design="fresh-lime" data-content-mode={adult ? 'ADULT' : 'GENERAL'}>
      <div className={styles.container}>
        <section className={styles.hero} aria-label={text.discover}>
          {active?.heroImage && <img key={active.id} className={styles.heroArtwork} src={getImageUrl(active.heroImage, { width: 1600 })} alt="" fetchPriority="high" />}
          <div className={styles.heroGradient} />
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>ARATA COMICS ORIGINAL</p>
            <div className={styles.heroTags}><span>{text.discover}</span>{active?.status === 'COMPLETED' && <span><Check size={12} />{text.completeBadge}</span>}</div>
            <h1>{active?.title || text.discover}</h1>
            <p className={styles.heroSynopsis}>{active?.synopsis || text.heroSub}</p>
            <Link className={styles.primaryButton} href={active ? `/webtoons/${active.id}` : `${prefix}/complete`}>{active ? text.start : text.complete}<ArrowRight size={19} /></Link>
          </div>
          {heroes.length > 1 && <div className={styles.heroControls}>
            <div className={styles.dots} aria-label={text.banner}>{heroes.map((work, index) => <button type="button" key={work.id} aria-label={`${index + 1}. ${work.title}`} aria-pressed={slide === index} onClick={() => setSlide(index)} className={slide === index ? styles.activeDot : ''} />)}</div>
            <div className={styles.arrows}><span>{String(slide + 1).padStart(2, '0')} / {String(heroes.length).padStart(2, '0')}</span><button type="button" aria-label={text.previous} onClick={() => setSlide(value => (value - 1 + heroes.length) % heroes.length)}><ChevronLeft size={18} /></button><button type="button" aria-label={text.next} onClick={() => setSlide(value => (value + 1) % heroes.length)}><ChevronRight size={18} /></button></div>
          </div>}
        </section>

        <div className={styles.discoveryLinks}>
          <Link href={`${prefix}/new`}><Sparkles size={18} /><span>{t('nav.new')}</span><ChevronRight size={15} /></Link>
          <Link href={`${prefix}/complete`}><Check size={18} /><span>{text.completeBadge}</span><ChevronRight size={15} /></Link>
          <Link href={adult ? '/adult/daily?category=ranking' : '/popular'}><Heart size={18} /><span>{text.popular}</span><ChevronRight size={15} /></Link>
          <Link href={`${prefix}/daily`}><BookOpen size={18} /><span>{text.genreDiscover}</span><ChevronRight size={15} /></Link>
        </div>

        {blocked ? <div className={styles.empty} role="status"><p>{text.verify}</p><button type="button" className={styles.primaryButton} onClick={() => hasSession ? window.location.assign('/auth/verify') : setLoginOpen(true)}>{text.verifyCta}<ArrowRight size={16} /></button></div> : catalog.isError ? <div className={styles.empty} role="alert"><p>{text.error}</p><button type="button" className={styles.primaryButton} disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>{text.retry}</button></div> : catalog.isLoading ? <div className={styles.skeletonGrid} role="status" aria-label={text.loading}>{Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton} />)}</div> : works.length === 0 ? <p className={styles.empty}>{text.empty}</p> : <>
          <section className={styles.section}>
            <div className={styles.latestHeading}>{sectionHeading(text.latest, text.latestSub, `${prefix}/new`)}
              <div className={styles.genreChips} aria-label={t('common.category')}>{GENRES.map(value => <button type="button" key={value} aria-pressed={genre === value} className={genre === value ? styles.selectedChip : ''} onClick={() => setGenre(value)}>{value === 'all' ? text.allGenres : localizeComicGenre(value, locale)}</button>)}</div>
            </div>
            {latest.length ? <div className={styles.grid}>{latest.map(work => card(work, work.isNew === true ? 'NEW' : undefined))}</div> : <p className={styles.empty}>{text.emptyGenre}</p>}
          </section>

          <div className={styles.splitSections}>
            <section className={`${styles.section} ${styles.completeSection}`}>
              {sectionHeading(text.complete, text.completeSub, `${prefix}/complete`)}
              {discovery.completed.length ? <div className={styles.compactGrid}>{discovery.completed.slice(0, 4).map(work => card(work))}</div> : <p className={styles.empty}>{text.empty}</p>}
            </section>
            <section className={`${styles.section} ${styles.rankingSection}`}>
              {sectionHeading(text.popular, text.popularSub, adult ? '/adult/daily?category=ranking' : '/popular')}
              <div className={styles.rankingGrid}>{discovery.popular.slice(0, 3).map((work, index) => <Link href={`/webtoons/${work.id}`} className={styles.rankCard} key={work.id}><span className={styles.rankNumber}>{index + 1}</span><div>{work.image && <img src={getImageUrl(work.image, { width: 300 })} alt={work.title} loading="lazy" />}<h3>{work.title}</h3><p>{work.genreLabel}</p></div></Link>)}</div>
              <p className={styles.rankingNote}>{text.rankingNote}</p>
            </section>
          </div>

          {recent.length > 0 && <section className={styles.section}>{sectionHeading(text.continue, text.continueSub)}<div className={styles.continueRail}>{recent.map(({ work, episode }) => work && <Link key={work.id} href={`/webtoons/${work.id}`} className={styles.continueCard}>{work.image && <img src={getImageUrl(work.image, { width: 150 })} alt="" loading="lazy" />}<div><h3>{work.title}</h3><p>{episode ? t('recent.episode', { episode }) : work.genreLabel}</p></div><ChevronRight size={17} /></Link>)}</div></section>}

          {discovery.short.length > 0 && <section className={styles.section}>{sectionHeading(text.short, text.shortSub, `${prefix}/complete`)}<div className={styles.grid}>{discovery.short.slice(0, 6).map(work => card(work, `${work.count}${text.episodes}`))}</div></section>}
          {discovery.completed.length > 0 && <section className={styles.section}>{sectionHeading(text.recentComplete, text.recentSub, `${prefix}/complete`)}<div className={styles.grid}>{discovery.completed.slice(0, 6).map(work => card(work))}</div></section>}
          {recommendations.length > 0 && <section className={styles.section}>{sectionHeading(text.recommended, recent.length > 0 ? text.recommendedSub : text.editorSub)}<div className={styles.grid}>{recommendations.slice(0, 6).map(work => card(work))}</div></section>}
        </>}

        <section className={`${styles.section} ${styles.universe}`}>
          {sectionHeading(text.universe, text.universeSub)}
          <div className={styles.universeGrid}>
            {[{ icon: BookOpen, title: text.extras, description: text.extraSub, cta: text.extraCta, href: `${prefix}/complete`, label: 'SIDE STORY' }, { icon: ImageIcon, title: text.photobook, description: text.photoSub, cta: text.photoCta, href: adult ? '/adult/library' : '/gallery', label: 'PHOTOBOOK' }, { icon: MessageCircle, title: text.chat, description: text.chatSub, cta: text.chatCta, href: `${prefix}/chat`, label: 'CHARACTER CHAT' }].map(item => <Link key={item.label} href={item.href} className={styles.universeCard}><div className={styles.universeTop}><span>{item.label}</span><item.icon size={25} strokeWidth={1.6} /></div><h3>{item.title}</h3><p>{item.description}</p><span className={styles.universeCta}>{item.cta}<ArrowRight size={17} /></span></Link>)}
          </div>
        </section>

        <section className={styles.membership}>
          {pricing.data?.preview && <p className={styles.planDescription} role="status">{pricingPreviewNotice[locale]}</p>}
          <div className={styles.membershipHeading}><span className={styles.membershipKicker}>ARATA MEMBERSHIP</span><h2>{text.membership}</h2><p>{text.membershipSub}</p></div>
          {plans.length > 0 ? <div className={styles.planGrid}>{plans.map(plan => <Link href={`/subscribe?plan=${plan.code}&billing=MONTHLY`} key={plan.code} className={`${styles.planCard} ${plan.isRecommended ? styles.featuredPlan : ''}`}><div className={styles.planTop}><h3>{plan.code === 'ALL_ACCESS' ? 'ALL ACCESS' : plan.name}</h3>{plan.isRecommended && <span>{text.recommendedPlan}</span>}</div><p className={styles.planDescription}>{plan.code === 'BASIC' ? text.basic : plan.code === 'PREMIUM' ? text.premium : text.access}</p><p className={styles.price}><strong>{plan.monthlyPrice.toLocaleString('ko-KR')}</strong><span>{text.month}</span></p>{plan.yearlyPrice != null ? <p className={styles.annual}>{text.annual} <strong>{Math.floor(plan.yearlyPrice / 12).toLocaleString('ko-KR')}{text.unit}</strong><small>{text.annualTotal} {plan.yearlyPrice.toLocaleString('ko-KR')}{text.unit} · {text.prepaid}</small></p> : <p className={styles.annual}>{text.annualPending}</p>}<span className={styles.planCta}>{text.planCta}<ArrowRight size={16} /></span></Link>)}</div> : <Link href="/subscribe" className={styles.pricingFallback}>{pricing.isLoading ? text.loading : text.pricesError}<ArrowRight size={18} /></Link>}
          <div className={styles.freeNote}><div><strong>{text.free}</strong><p>{text.freeSub}</p></div><Link href="/subscribe">{text.freeCta}<ChevronRight size={16} /></Link></div>
        </section>
        <div className={styles.supportNote}><Heart size={19} /><div><strong>{text.support}</strong><p>{text.supportSub}</p></div><span>ARATA COMICS</span></div>
      </div>
    </div>
  );
}
