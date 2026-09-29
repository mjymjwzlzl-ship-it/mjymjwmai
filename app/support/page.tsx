'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, Mail, MessageCircle, Phone } from 'lucide-react';
import { api } from '@/lib/api';

const faqData = [
  {
    question: '구독하면 어떤 작품을 볼 수 있나요?',
    answer: 'ARATA의 다양한 웹툰을 무제한으로 감상할 수 있습니다. 성인 인증 작품은 인증 완료 후 별도 영역에서 제공됩니다.',
  },
  {
    question: '첫 달 990원 이후에는 얼마인가요?',
    answer: '첫 달 체험 이후 월 3,400원으로 갱신됩니다. 연간 결제 시 월환산 2,800원으로 더 저렴하게 이용할 수 있습니다.',
  },
  {
    question: '구독은 언제든 해지할 수 있나요?',
    answer: '네. 계정 설정 또는 고객센터를 통해 언제든 해지할 수 있습니다.',
  },
  {
    question: '성인 인증 작품은 어디에서 보나요?',
    answer: '성인 인증을 완료한 계정만 완전판 영역에 접근할 수 있습니다. 일반 홈에는 직접 노출을 최소화합니다.',
  },
  {
    question: '작품 응원은 무엇인가요?',
    answer: '좋아하는 작품을 응원하면 외전, 시즌2, 스핀오프 제작 우선순위에 반영될 수 있습니다.',
  },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setContactForm((prev) => ({
          ...prev,
          email: user.email || '',
          name: user.username || user.nickname || user.name || '',
        }));
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    }
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await api.post('/support/contact', {
        ...contactForm,
        timestamp: new Date().toISOString(),
      });

      if (response.data) {
        setSubmitMessage('문의가 정상적으로 접수되었습니다. 24시간 이내에 답변드리겠습니다.');
        setContactForm({ name: '', email: '', subject: '', message: '' });
      }
    } catch (error) {
      console.error('문의 전송 실패:', error);
      setSubmitMessage('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 text-gray-950 transition-colors dark:bg-[#141414] dark:text-white">
      <div className="mx-auto max-w-4xl px-4">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1b1b1b]">
          <div className="bg-[#00dc64] p-6 text-black">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center font-bold transition hover:opacity-70"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              돌아가기
            </button>

            <h1 className="mb-2 text-2xl font-black">고객센터</h1>
            <p className="font-medium">궁금한 점이나 문제가 있으면 언제든 문의해주세요.</p>
          </div>

          <nav className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-4 font-bold transition ${
                activeTab === 'faq'
                  ? 'border-b-2 border-[#00dc64] text-[#00a84c]'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <HelpCircle className="mr-2 inline h-5 w-5" />
              자주 묻는 질문
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-6 py-4 font-bold transition ${
                activeTab === 'contact'
                  ? 'border-b-2 border-[#00dc64] text-[#00a84c]'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <MessageCircle className="mr-2 inline h-5 w-5" />
              문의하기
            </button>
          </nav>

          <div className="p-6">
            {activeTab === 'faq' && (
              <div className="space-y-4">
                {faqData.map((faq) => (
                  <div key={faq.question} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                    <h3 className="mb-2 font-black">Q. {faq.question}</h3>
                    <p className="leading-relaxed text-gray-600 dark:text-gray-300">A. {faq.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="max-w-2xl">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="이름" id="name" value={contactForm.name} onChange={(value) => setContactForm({ ...contactForm, name: value })} />
                    <Field label="이메일" id="email" type="email" value={contactForm.email} onChange={(value) => setContactForm({ ...contactForm, email: value })} />
                  </div>

                  <Field label="제목" id="subject" value={contactForm.subject} onChange={(value) => setContactForm({ ...contactForm, subject: value })} />

                  <div>
                    <label htmlFor="message" className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">내용</label>
                    <textarea
                      id="message"
                      rows={6}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
                      placeholder="문의 내용을 자세히 적어주세요"
                    />
                  </div>

                  {submitMessage && (
                    <div className={`rounded-lg p-3 text-sm ${submitMessage.includes('접수') ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300'}`}>
                      {submitMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-[#00dc64] px-4 py-3 font-black text-black transition hover:bg-[#00c85a] disabled:opacity-50"
                  >
                    {isSubmitting ? '전송 중...' : '문의 전송'}
                  </button>
                </form>

                <div className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-800">
                  <h3 className="mb-4 text-lg font-black">기타 연락처</h3>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">운영 및 문의 책임 주체: 에이단 스튜디오스</p>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <Mail className="mr-3 h-5 w-5 text-[#00a84c]" />
                      <span>support@arata.co.kr</span>
                    </div>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <Phone className="mr-3 h-5 w-5 text-[#00a84c]" />
                      <span>0507-1440-8816 (평일 09:00-18:00)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-200">{label}</label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-[#00dc64] focus:ring-2 focus:ring-[#00dc64]/20 dark:border-gray-700 dark:bg-[#121212] dark:text-white"
        placeholder={`${label}을 입력해주세요`}
      />
    </div>
  );
}
