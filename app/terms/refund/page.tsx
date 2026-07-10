export default function RefundPolicyPage() {
  return (
    <TermsShell title="환불 정책">
      <Section title="1. 구독 결제">
        첫 달 체험가는 990원이며 이후 월 3,400원으로 갱신됩니다. 연간 구독은 연 33,600원으로 결제됩니다.
      </Section>
      <Section title="2. 환불 제한">
        디지털 콘텐츠 특성상 구독 후 콘텐츠 이용이 시작된 경우 환불이 제한될 수 있습니다.
      </Section>
      <Section title="3. 환불 가능 사례">
        중복 결제, 결제 오류, 서비스 장애로 콘텐츠 이용이 불가능했던 경우 고객센터 검토 후 환불 또는 보상 조치를 진행합니다.
      </Section>
      <Section title="4. 신청 방법">
        환불 문의는 support@arata.co.kr 또는 고객센터 0507-1440-8816로 접수해주세요.
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
