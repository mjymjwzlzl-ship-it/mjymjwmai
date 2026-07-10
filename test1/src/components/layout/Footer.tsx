export default function Footer() {
  return (
    <footer className="mt-8" style={{ background: 'var(--footer-bg)', borderTop: '1px solid var(--border-color)', color: 'var(--ui-text)' }}>
      <div className="mx-auto max-w-screen-xl px-4 py-10">
        {/* 상단 3열 */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* 이용안내 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>이용안내</h4>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:opacity-80" href="#">이용약관</a></li>
              <li><a className="hover:opacity-80" href="#">개인정보처리방침</a></li>
              <li><a className="hover:opacity-80" href="#">청소년보호정책</a></li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>고객지원</h4>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:opacity-80" href="#">문의하기</a></li>
              <li>support@arata.co.kr</li>
              <li>답변시간: 평일 09:00~18:00</li>
              <li>24시간 내 답변</li>
            </ul>
          </div>

          {/* 서비스 설명 */}
          <div>
            <h4 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>ARATA</h4>
            <p className="text-sm leading-6" style={{ color: 'var(--ui-text)' }}>
              다양한 웹툰 플랫폼<br />
              새로운 웹툰 경험을 제공합니다
            </p>
          </div>
        </div>

        {/* 구분선 */}
        <hr className="my-8" style={{ borderColor: 'var(--border-color)' }} />

        {/* 회사 정보 */}
        <div className="space-y-2 text-xs" style={{ color: 'var(--ui-text)' }}>
          <div>
            <span>상호명:</span> <strong>문테크놀러지(주)</strong>
            <span className="mx-2">|</span>
            <span>대표자:</span> 강태석, 문제용
            <span className="mx-2">|</span>
            <span>사업자등록번호:</span> 690-81-00705
          </div>
          <div>
            <span>주소:</span> (03927) 서울특별시 마포구 월드컵북로48길 29-5, 2층, 3층
            <span className="mx-2">|</span>
            <span>대표전화:</span> 02-1234-5678
          </div>
          <div>
            <span>통신판매업신고:</span> 제2017-서울강서-1279호
          </div>
          <div className="pt-2 text-[11px]" style={{ color: 'var(--ui-muted)' }}>© 2024 MOON TECHNOLOGY Co., Ltd. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}


