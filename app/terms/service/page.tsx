export default function ServiceTermsPage() {
  return (
    <TermsShell title="서비스 이용약관">
      <Notice title="구독 서비스 안내">
        ARATA는 첫 달 990원 체험 후 월 3,400원으로 이용하는 웹툰 구독 서비스입니다. 연간 구독은 연 33,600원이며 월환산 2,800원으로 안내됩니다.
      </Notice>

      <Section title="1. 목적">
        본 약관은 문테크놀러지가 제공하는 ARATA 웹툰 플랫폼의 이용 조건과 회사와 이용자의 권리, 의무 및 책임사항을 정합니다.
      </Section>
      <Section title="2. 서비스">
        ARATA는 일반 작품, 성인 인증 후 접근 가능한 완전판 작품, 작품 응원 기능, 친구초대 기능 등을 제공합니다.
      </Section>
      <Section title="3. 회원가입 및 계정">
        이용자는 정확한 정보를 제공해야 하며, 계정 정보 관리 책임은 이용자에게 있습니다. 타인의 계정을 무단으로 사용할 수 없습니다.
      </Section>
      <Section title="4. 구독 및 결제">
        무료회원은 일부 회차를 맛보기로 감상할 수 있고, 유료회원은 구독 기간 동안 제공 범위 내 작품을 제한 없이 감상할 수 있습니다.
      </Section>
      <Section title="5. 청약철회 및 환불">
        디지털 콘텐츠 특성상 콘텐츠 열람이 시작된 경우 환불이 제한될 수 있습니다. 결제 오류, 중복 결제 등은 고객센터를 통해 확인 후 처리합니다.
      </Section>
      <Section title="6. 이용 제한">
        불법 복제, 계정 공유, 결제 악용, 서비스 운영 방해, 미성년자의 성인 콘텐츠 접근 시도 등은 이용 제한 사유가 될 수 있습니다.
      </Section>
      <Section title="7. 고객센터">
        문의: support@arata.co.kr / 0507-1440-8816
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

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
      <strong>{title}: </strong>{children}
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
