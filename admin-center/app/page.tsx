'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, CreditCard, Eye, Image, Mail, RefreshCw, Shield, ShoppingCart, Users } from 'lucide-react';
import { adminApi } from '@/lib/works';

interface Summary { works: number; scheduled: number; users: number; newUsers: number; views: number; hiatus: number; upToday: number; pendingReports: number; purchases: number; coins: number; payments: number }
const number = (value: number | undefined, suffix = '') => value === undefined ? '—' : value.toLocaleString('ko-KR') + suffix;
const actions = [
  { href: '/works', label: '작품·회차 관리', note: '작품 정보, 공개 상태와 회차 관리', icon: BookOpen },
  { href: '/exposure', label: '홈 노출 관리', note: '배너와 추천 작품 배치', icon: Image },
  { href: '/payments/history', label: '구매·결제 내역', note: '결제 내역과 환불 확인', icon: CreditCard },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await adminApi<Summary>('/admin/ops/dashboard');
      const fields: (keyof Summary)[] = ['works','scheduled','users','newUsers','views','hiatus','upToday','pendingReports','purchases','coins','payments'];
      if (fields.some(field => typeof result[field] !== 'number' || !Number.isFinite(result[field]))) throw new Error('운영 현황 응답을 확인할 수 없습니다.');
      setSummary(result);
      setCheckedAt(new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }));
    } catch (failure) {
      setSummary(null);
      setError(failure instanceof Error ? failure.message : '운영 현황을 불러오지 못했습니다.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const metrics = [
    { label: '오늘 조회', value: number(summary?.views), note: '오늘의 작품 조회수', icon: Eye, href: '/stats' },
    { label: '오늘 구매', value: number(summary?.purchases, '건'), note: '사용 코인 ' + number(summary?.coins), icon: ShoppingCart, href: '/payments/purchases' },
    { label: '오늘 결제', value: number(summary?.payments, '원'), note: '오늘의 결제 금액', icon: CreditCard, href: '/payments/history' },
    { label: '신규 회원', value: number(summary?.newUsers, '명'), note: '전체 회원 ' + number(summary?.users, '명'), icon: Users, href: '/users' },
  ];
  return <div className="admin-dashboard">
    <div className="admin-page-heading">
      <div><h1>운영 대시보드</h1><p>오늘의 운영 현황을 한눈에 확인하세요.</p></div>
      <div className="admin-page-actions"><button className="admin-secondary-button" disabled={loading} onClick={load}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />{loading ? '불러오는 중' : '새로고침'}</button><Link className="admin-primary-button" href="/works"><BookOpen size={18} />작품 관리</Link></div>
    </div>
    {error && <div className="admin-error" role="alert">{error}<button onClick={load} disabled={loading}>다시 시도</button></div>}
    <div className="admin-metrics" aria-busy={loading}>
      {metrics.map(metric => <Link className="admin-metric admin-work-stats-link" key={metric.label} href={metric.href}><div><metric.icon size={20} /><span>{metric.label}</span></div><strong>{loading ? '—' : metric.value}</strong><p>{metric.note}</p></Link>)}
    </div>
    <div className="admin-dashboard-grid">
      <section className="admin-panel">
        <div className="admin-panel-heading"><h2>콘텐츠 운영 현황</h2><Link href="/works">작품 관리 <ArrowRight size={16} /></Link></div>
        <div className="admin-content-stats">
          <Link href="/exposure?tab=auto"><div><span>오늘 공개</span><strong>{number(summary?.upToday, '작품')}</strong></div></Link>
          <Link href="/works?dateField=nextScheduledAt"><div><span>예약 공개 대기</span><strong>{number(summary?.scheduled, '회차')}</strong></div></Link>
          <Link href="/works?status=HIATUS"><div><span>휴재 중</span><strong>{number(summary?.hiatus, '작품')}</strong></div></Link>
        </div>
        <h3 className="admin-section-label">관리 바로가기</h3>
        <div className="admin-action-list">{actions.map(action => <Link key={action.href} href={action.href}><action.icon size={23} /><div><strong>{action.label}</strong><span>{action.note}</span></div><ArrowRight size={18} /></Link>)}</div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><h2>확인할 항목</h2></div>
        <div className="admin-check-list">
          <Link href="/reports"><Shield size={20} /><span>처리할 신고</span><strong>{number(summary?.pendingReports, '건')}</strong><ArrowRight size={17} /></Link>
          <Link href="/works?status=HIATUS"><BookOpen size={20} /><span>휴재 작품</span><strong>{number(summary?.hiatus, '작품')}</strong><ArrowRight size={17} /></Link>
          <Link href="/support"><Mail size={20} /><span>고객센터 문의</span><strong>확인</strong><ArrowRight size={17} /></Link>
        </div>
        {!loading && summary?.pendingReports === 0 && <div className="admin-all-clear"><CheckCircle2 size={29} /><p>처리 대기 중인 신고가 없습니다.</p></div>}
        <p className="admin-data-note">일별 집계 기준: 한국 시간<br />{checkedAt && <>마지막 확인 {checkedAt}<br /></>}등록 작품 {number(summary?.works, '작품')}</p>
      </section>
    </div>
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>빠른 실행</h2><p>자주 사용하는 작업을 바로 시작하세요.</p></div></div>
      <div className="admin-quick-actions"><Link href="/works"><BookOpen size={20} />작품·회차 관리</Link><Link href="/banners"><Image size={20} />배너 편집</Link><Link href="/events"><ShoppingCart size={20} />프로모션 관리</Link><Link href="/users"><Users size={20} />회원 조회</Link></div>
    </section>
  </div>;
}
