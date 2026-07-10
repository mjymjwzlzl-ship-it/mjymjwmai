export default function YouthPolicyPage() {
  return (
    <TermsShell title="청소년보호정책">
      <Section title="1. 기본 원칙">
        ARATA는 청소년이 유해 콘텐츠에 접근하지 않도록 일반 콘텐츠와 성인 인증 콘텐츠를 분리하여 운영합니다.
      </Section>
      <Section title="2. 성인 인증">
        완전판 및 성인 인증 작품은 성인 인증을 완료한 이용자에게만 제공됩니다. 인증 전에는 직접 노출을 최소화합니다.
      </Section>
      <Section title="3. 콘텐츠 등급 관리">
        작품별 등급 기준을 운영하고, 신고가 접수된 콘텐츠는 검토 후 노출 제한 또는 수정 조치를 진행합니다.
      </Section>
      <Section title="4. 보호책임자">
        청소년보호책임자: 문제용 / 문의: support@arata.co.kr
      </Section>
    </TermsShell>
  );
}

function TermsShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 text-3xl font-black">{title}</h1>
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          {children}
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black">{title}</h2>
      <p className="leading-7 text-gray-600 dark:text-gray-300">{children}</p>
    </section>
  );
}
