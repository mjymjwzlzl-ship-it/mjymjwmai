import type { ReactNode } from 'react';

const rows = {
  collection: [
    ['이메일 회원가입·로그인', '이메일, 아이디, 닉네임, 암호화된 비밀번호', '계정 생성, 본인 식별, 로그인 및 보안'],
    ['Google 소셜 로그인', 'Google 계정 식별자, 이메일, 표시 이름, 프로필 사진', '간편 가입·로그인, 프로필 생성'],
    ['카카오 소셜 로그인', '카카오 계정 식별자, 이메일, 닉네임, 프로필 사진', '간편 가입·로그인, 프로필 생성'],
    ['서비스 이용', '열람·구매 내역, 좋아요, 댓글, 평점, 신고, 차단, 출석·게임 기록, 코인·구독 상태', '콘텐츠 제공, 이용 내역 복구, 부정 이용 방지, 서비스 운영'],
    ['AI 캐릭터 채팅', '사용자가 입력한 대화, 최근 대화 맥락, 작품·캐릭터 식별자, 생성 이미지·음성, 이용 횟수', '대화·요약·이미지 생성, 대화 이어보기, 이용량 관리'],
    ['고객 문의', '이름, 이메일, 문의 제목·내용·분류 및 답변 내역', '문의 접수, 본인 확인, 답변 및 분쟁 대응'],
    ['자동 생성 정보', 'IP 주소, 브라우저·기기 정보, 접속 일시, 쿠키·로컬 저장소 값, 유입 경로(UTM·추천 코드), 기능 이용 이벤트', '보안, 장애 대응, 로그인 유지, 이용환경 설정, 자체 통계·서비스 개선'],
  ],
  retention: [
    ['계정·프로필·서비스 이용 기록', '회원 탈퇴 또는 처리 목적 달성 시까지. 단, 법령상 보존 의무가 있거나 분쟁 처리가 진행 중인 경우 해당 기간까지 분리 보관'],
    ['AI 채팅 기록', '회원 탈퇴 또는 삭제 요청 시까지. 대화가 길어지면 최근 대화를 요약해 저장하고 원문 일부를 삭제할 수 있음'],
    ['고객 문의 및 답변', '문의 종결 후 3년'],
    ['계약 또는 청약철회에 관한 기록', '5년'],
    ['대금 결제 및 재화 등의 공급에 관한 기록', '5년'],
    ['소비자 불만 또는 분쟁 처리에 관한 기록', '3년'],
    ['표시·광고에 관한 기록', '6개월'],
  ],
  processors: [
    ['Amazon Web Services Korea LLC', '서비스 서버 운영 및 데이터 저장', '대한민국 리전'],
    ['Cloudflare, Inc.', 'DNS, 전송 보안, CDN 및 이미지·파일 저장', '글로벌 네트워크 및 Cloudflare 저장 인프라'],
    ['Resend, Inc.', '고객 문의 및 서비스 이메일 발송', '이메일 발송 완료 및 계약상 보존기간까지'],
    ['Beijing Volcano Engine Technology Co., Ltd.', 'AI 캐릭터 채팅의 대화·요약·이미지 생성', 'API 응답 생성 및 계약상 보존기간까지'],
  ],
  overseas: [
    ['Cloudflare, Inc.', '미국 등 Cloudflare 인프라가 운영되는 국가', '접속 시 암호화된 네트워크로 전송', 'IP 주소, 요청 정보, 캐시되는 이미지·파일', '콘텐츠 전송, 보안, 파일 저장', '처리 목적 달성 또는 계약상 보존기간까지'],
    ['Resend, Inc.', '미국', '이메일 발송 시 암호화된 네트워크로 전송', '수신 이메일 주소, 이름, 문의·안내 내용', '고객 문의 및 서비스 이메일 발송', '발송 완료 및 계약상 보존기간까지'],
    ['Beijing Volcano Engine Technology Co., Ltd.', '중국', 'AI 채팅 기능 사용 시 암호화된 API로 전송', '입력 대화, 최근 대화 맥락, 작품·캐릭터 정보, 선택한 이미지', '대화·요약·이미지 생성', 'API 처리 및 계약상 보존기간까지'],
  ],
};

export default function PrivacyPolicyPage() {
  return (
    <TermsShell title="개인정보처리방침">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
        에이단 스튜디오스(이하 “회사”)는 ARATA를 운영하며, 실제 서비스에서 처리하는 개인정보의 흐름을 이 방침에 공개합니다.
        이 방침은 2026년 9월 20일부터 시행합니다.
      </div>

      <Section title="1. 개인정보처리자">
        <p>상호: 에이단 스튜디오스 / 대표자: 문제용 / 사업자등록번호: 690-81-00705</p>
        <p>주소: 서울 강서구 마곡중앙8로 14 410호 / 개인정보 문의: support@arata.co.kr</p>
      </Section>

      <Section title="2. 처리 목적과 개인정보 항목">
        <p>회사는 아래 기능을 제공하는 데 필요한 범위에서 개인정보를 처리합니다. 선택 기능을 사용하지 않으면 해당 항목은 처리하지 않습니다.</p>
        <DataTable headers={['구분', '처리 항목', '목적']} rows={rows.collection} />
        <p className="mt-3 text-sm">비밀번호 원문은 저장하지 않고 단방향 암호화한 값만 저장합니다. AI 채팅에는 주민등록번호, 금융정보, 건강정보 등 민감한 내용을 입력하지 마십시오.</p>
      </Section>

      <Section title="3. 아직 활성화되지 않은 기능">
        <p>
          현재 운영 환경에서 유료 결제와 PASS 등 외부 성인 본인인증은 정식 활성화 전입니다. 회사는 해당 기능을 활성화하기 전에 실제 PG사·인증기관,
          처리 항목, 보유기간, 제3자 제공·국외이전 여부를 확정하여 이 방침과 기능 화면에 고지하고 필요한 동의를 받습니다.
          단순 생년월일 입력만으로 성인 인증을 완료하지 않습니다.
        </p>
      </Section>

      <Section title="4. 보유 및 이용 기간">
        <p>회사는 목적 달성 후 개인정보를 지체 없이 파기합니다. 다만 관계 법령에 보존 의무가 있으면 아래 기간 동안 서비스 이용 정보와 분리하여 보관합니다.</p>
        <DataTable headers={['기록', '보유기간']} rows={rows.retention} />
      </Section>

      <Section title="5. 처리업무 위탁">
        <p>회사는 서비스 운영에 필요한 일부 업무를 다음 업체에 맡깁니다. 계약과 점검을 통해 목적 외 처리를 제한하고 보호조치를 관리합니다.</p>
        <DataTable headers={['수탁자', '위탁 업무', '보관 위치·기간']} rows={rows.processors} />
      </Section>

      <Section title="6. 개인정보의 국외 처리·이전">
        <p>
          아래 기능을 사용할 때 개인정보가 국외 사업자의 서버에서 처리될 수 있습니다. 이전은 서비스 제공 계약의 이행과 선택 기능 제공을 위해 발생하며,
          해당 기능을 이용하지 않으면 관련 전송을 거부할 수 있습니다. 이 경우 AI 채팅, 이메일 문의·안내 또는 일부 이미지 전송 기능이 제한될 수 있습니다.
        </p>
        <DataTable headers={['받는 자', '국가', '시기·방법', '항목', '목적', '기간']} rows={rows.overseas} compact />
        <p className="mt-3 text-sm">국외 처리에 관한 문의 또는 중단 요청은 support@arata.co.kr로 접수할 수 있습니다.</p>
      </Section>

      <Section title="7. 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 별도 동의 없이 제3자에게 판매하거나 제공하지 않습니다. 법령에 특별한 근거가 있거나 이용자가 별도로 동의한 경우에는
          제공받는 자, 목적, 항목, 보유기간을 사전에 알립니다. Google·카카오 로그인 과정에서는 각 사업자가 이용자의 선택에 따라 계정 정보를 회사에 전달합니다.
        </p>
      </Section>

      <Section title="8. 쿠키와 브라우저 저장소">
        <p>
          회사는 로그인 토큰, 언어·테마·목록 보기 설정, 최근 열람 위치, 알림·팝업 상태, 유입 경로를 쿠키·localStorage·sessionStorage에 저장합니다.
          현재 별도의 외부 광고·웹분석 SDK는 사용하지 않으며 이용 통계는 회사 서버에서 자체 처리합니다. 이용자는 브라우저 설정에서 이를 삭제하거나 차단할 수 있지만,
          로그인 유지와 개인 설정 등 일부 기능이 정상 동작하지 않을 수 있습니다.
        </p>
      </Section>

      <Section title="9. 파기 절차와 방법">
        <p>
          보유기간이 끝나거나 목적이 달성된 정보는 별도 검토 후 삭제합니다. 전자적 파일은 복구하기 어려운 방법으로 삭제하고, 종이 문서가 생기는 경우 분쇄하거나 소각합니다.
          법령상 보존 대상은 다른 정보와 분리하고 접근 권한을 제한하며, 백업 사본은 정해진 백업 교체 주기에 따라 삭제합니다.
        </p>
      </Section>

      <Section title="10. 이용자의 권리와 행사 방법">
        <p>
          이용자는 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다. 계정 설정 또는 support@arata.co.kr로 요청하면 본인 확인 후 처리하고,
          법령상 제한 사유가 있으면 그 이유를 안내합니다. 대리인을 통한 요청도 가능하며, 필요한 경우 위임장과 본인 확인 자료를 요청할 수 있습니다.
        </p>
      </Section>

      <Section title="11. 만 14세 미만 아동">
        <p>ARATA는 만 14세 미만 아동을 대상으로 회원 서비스를 제공하지 않습니다. 만 14세 미만 아동의 정보가 수집된 사실을 알게 되면 확인 후 지체 없이 삭제합니다.</p>
      </Section>

      <Section title="12. 안전성 확보 조치">
        <p>회사는 비밀번호 단방향 암호화, 전송구간 암호화, 접근 권한 제한, 관리자 인증, 보안 업데이트, 데이터 백업 및 이상 징후 확인 등 개인정보 보호에 필요한 기술적·관리적 조치를 시행합니다.</p>
      </Section>

      <Section title="13. 개인정보 보호책임자 및 구제 방법">
        <p>개인정보 보호책임자: 문제용 / 이메일: support@arata.co.kr / 주소: 서울 강서구 마곡중앙8로 14 410호</p>
        <p className="mt-2">회사의 처리 결과에 이의가 있거나 상담이 필요한 경우 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972), 경찰청(국번 없이 182) 등에 도움을 요청할 수 있습니다.</p>
      </Section>

      <Section title="14. 방침 변경">
        <p>처리 업체, 기능 또는 법령이 바뀌면 시행 전에 서비스 공지 또는 이 페이지를 통해 알립니다. 이용자 권리에 중대한 변경은 합리적인 기간을 두고 별도로 안내합니다.</p>
        <p className="mt-2 text-sm">공고일·시행일: 2026년 9월 20일 / 현행 버전: 1.0</p>
      </Section>
    </TermsShell>
  );
}

function TermsShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h1 className="mb-3 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">ARATA 개인정보 처리 현황과 이용자 권리 안내</p>
        <div className="space-y-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 dark:border-gray-800 dark:bg-[#1b1b1b]">{children}</div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-3 text-xl font-black">{title}</h2><div className="space-y-2 leading-7 text-gray-700 dark:text-gray-300">{children}</div></section>;
}

function DataTable({ headers, rows: tableRows, compact = false }: { headers: string[]; rows: string[][]; compact?: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className={`${compact ? 'min-w-[980px]' : 'min-w-[720px]'} w-full border-collapse text-left text-sm`}>
        <thead className="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"><tr>{headers.map((header) => <th key={header} className="border-b border-gray-200 px-3 py-3 font-bold dark:border-gray-700">{header}</th>)}</tr></thead>
        <tbody>{tableRows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="align-top even:bg-gray-50/70 dark:even:bg-gray-900/30">{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-b border-gray-100 px-3 py-3 last:border-b-0 dark:border-gray-800">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
