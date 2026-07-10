export default function PrivacyPolicyPage() {
  return (
    <TermsShell title="개인정보처리방침">
      <Section title="1. 개인정보 수집 및 이용 목적">
        회사는 회원 관리, 서비스 제공, 구독 결제, 성인 인증, 고객 문의 처리, 콘텐츠 추천, 서비스 이용 분석을 위해 개인정보를 처리합니다.
      </Section>
      <Section title="2. 수집 항목">
        필수 항목은 이메일, 비밀번호, 닉네임입니다. 성인 인증 시 이름, 생년월일, 성별, 휴대전화번호 등 인증에 필요한 정보가 처리될 수 있습니다.
      </Section>
      <Section title="3. 보유 및 이용 기간">
        회원 정보는 회원 탈퇴 시까지 보유합니다. 결제 및 전자상거래 관련 기록은 관련 법령에 따라 일정 기간 보관될 수 있습니다.
      </Section>
      <Section title="4. 쿠키 사용">
        ARATA는 맞춤형 서비스, 콘텐츠 추천, 광고 성과 측정, 서비스 이용 분석을 위해 쿠키를 사용할 수 있습니다.
      </Section>
      <Section title="5. 개인정보 보호책임자">
        개인정보 보호책임자: 문제용 / 연락처: support@arata.co.kr / 주소: 서울 강서구 마곡중앙8로 14 410호
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
