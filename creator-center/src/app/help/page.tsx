'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { 
  HelpCircle, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Settings, 
  Star,
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  Palette,
  DollarSign
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'upload' | 'thumbnail' | 'general' | 'monetization';
}

export default function HelpPage() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqData: FAQItem[] = [
    {
      id: '1',
      category: 'upload',
      question: '웹툰은 어떻게 업로드하나요?',
      answer: '1. 상단 메뉴에서 "작품 등록"을 클릭합니다.\n2. 웹툰 제목, 설명, 장르 등 기본 정보를 입력합니다.\n3. 썸네일 이미지를 업로드합니다 (권장: 300x400px).\n4. "작품 등록" 버튼을 클릭하여 저장합니다.\n5. 등록 후 "에피소드 추가" 버튼으로 첫 화를 업로드할 수 있습니다.'
    },
    {
      id: '2',
      category: 'upload',
      question: '에피소드는 어떻게 추가하나요?',
      answer: '1. "작품 관리" 페이지에서 웹툰을 선택합니다.\n2. "에피소드 추가" 버튼을 클릭합니다.\n3. 에피소드 제목과 화수를 입력합니다.\n4. 에피소드 썸네일을 업로드합니다.\n5. 웹툰 이미지들을 드래그앤드롭으로 업로드합니다.\n6. 이미지 순서를 확인하고 "에피소드 업로드" 버튼을 클릭합니다.'
    },
    {
      id: '3',
      category: 'upload',
      question: '이미지 파일 형식과 크기 제한은?',
      answer: '• 지원 형식: JPG, PNG, GIF\n• 파일 크기: 이미지당 최대 20MB\n• 권장 해상도: 가로 690px (세로는 자유)\n• 에피소드당 최대 50장까지 업로드 가능\n• 원본 파일명이 보존되므로 01.jpg, 02.jpg 형태로 이름을 지으면 자동 정렬됩니다.'
    },
    {
      id: '4',
      category: 'upload',
      question: '이미지 순서를 바꾸고 싶어요',
      answer: '1. "작품 관리"에서 웹툰을 선택합니다.\n2. "수정" 버튼을 클릭합니다.\n3. 에피소드 목록에서 "이미지 편집" 버튼을 클릭합니다.\n4. 오름차순/내림차순 버튼으로 자동 정렬하거나 ↑↓ 버튼으로 수동 이동합니다.\n5. 새 이미지를 추가하거나 기존 이미지를 삭제할 수도 있습니다.\n6. "이미지 저장" 버튼으로 변경사항을 저장합니다.'
    },
    {
      id: '5',
      category: 'thumbnail',
      question: '좋은 썸네일을 만드는 방법은?',
      answer: '• 권장 크기: 300x400px (세로형)\n• 밝고 선명한 색상 사용\n• 주요 캐릭터의 얼굴이 잘 보이도록\n• 웹툰의 분위기와 장르를 잘 표현\n• 텍스트는 최소한으로, 읽기 쉽게\n• 작은 크기에서도 알아볼 수 있는 디자인\n• JPG 또는 PNG 형식으로 저장'
    },
    {
      id: '6',
      category: 'thumbnail',
      question: '썸네일이 흐릿하게 나와요',
      answer: '• 원본 이미지의 해상도가 낮을 수 있습니다\n• 300x400px 이상의 고해상도 이미지를 사용하세요\n• JPG 저장 시 품질을 90% 이상으로 설정\n• PNG 형식을 사용하면 더 선명합니다\n• 이미지 편집 프로그램에서 "웹용으로 저장" 기능 활용'
    },
    {
      id: '7',
      category: 'general',
      question: '웹툰이 독자들에게 어떻게 노출되나요?',
      answer: '• 최신 업데이트 순으로 메인페이지에 표시\n• 장르별 카테고리에 자동 분류\n• 인기도(조회수, 좋아요)에 따라 추천 섹션 노출\n• 관리자가 선별한 작품은 "추천" 섹션에 노출\n• 정기적인 업데이트가 노출 확률을 높입니다'
    },
    {
      id: '8',
      category: 'general',
      question: '업데이트 주기는 어떻게 정하나요?',
      answer: '• 주 1회 업데이트를 권장합니다\n• 일정한 요일과 시간을 정해 규칙적으로 업로드\n• 독자들이 기다릴 수 있는 적절한 주기 설정\n• 미리 공지하고 지키는 것이 중요합니다\n• 휴재 시에는 미리 공지해 주세요'
    },
    {
      id: '9',
      category: 'monetization',
      question: '수익은 어떻게 창출되나요?',
      answer: '• 조회수에 따른 광고 수익 분배\n• 독자의 후원 및 응원 기능\n• 유료 에피소드 설정 가능\n• 굿즈 판매 연동 (추후 제공 예정)\n• 월별 정산을 통해 수익 지급'
    },
    {
      id: '10',
      category: 'general',
      question: '독자와 소통하는 방법은?',
      answer: '• 댓글 기능을 통한 실시간 소통\n• 작가 소개 페이지에 SNS 링크 추가\n• 에피소드 마지막에 작가의 말 추가\n• 독자 설문이나 이벤트 개최\n• 팬아트나 2차 창작 허용 여부 명시'
    }
  ];

  const categories = [
    { key: 'all', label: '전체', icon: HelpCircle },
    { key: 'upload', label: '업로드', icon: Upload },
    { key: 'thumbnail', label: '썸네일', icon: ImageIcon },
    { key: 'general', label: '일반', icon: Settings },
    { key: 'monetization', label: '수익화', icon: DollarSign }
  ];

  const filteredFAQ = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const renderAnswer = (answer: string) => {
    return answer.split('\n').map((line, index) => (
      <div key={index} className="mb-1">
        {line.startsWith('•') ? (
          <div className="flex items-start">
            <span className="text-emerald-600 mr-2">•</span>
            <span>{line.substring(1).trim()}</span>
          </div>
        ) : (
          <div>{line}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className=" pt-16 p-8">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">도움말</h1>
            <p className="text-gray-600">웹툰 업로드부터 수익화까지, 모든 과정을 안내해드립니다</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 카테고리 사이드바 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                <h2 className="font-semibold text-gray-900 mb-4">카테고리</h2>
                <nav className="space-y-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.key}
                        onClick={() => setSelectedCategory(category.key)}
                        className={`w-full text-left flex items-center px-3 py-2 rounded-lg transition-colors ${
                          selectedCategory === category.key
                            ? 'bg-emerald-100 text-emerald-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {category.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-3">
              {/* 빠른 시작 가이드 */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-6 mb-8 text-white">
                <h2 className="text-xl font-bold mb-4">🚀 빠른 시작 가이드</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start">
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">1. 작품 등록</h3>
                      <p className="text-sm opacity-90">제목, 설명, 썸네일 등 기본 정보를 입력하세요</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">2. 에피소드 업로드</h3>
                      <p className="text-sm opacity-90">드래그앤드롭으로 간편하게 이미지를 업로드</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">3. 독자와 소통</h3>
                      <p className="text-sm opacity-90">댓글과 좋아요로 독자들과 교류하세요</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 권장 사양 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  권장 사양 및 가이드라인
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      웹툰 이미지
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>권장 해상도:</strong> 가로 690px (세로 자유)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>파일 형식:</strong> JPG, PNG, GIF</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>파일 크기:</strong> 최대 20MB per 이미지</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>에피소드당:</strong> 최대 50장</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Palette className="w-4 h-4 mr-2" />
                      썸네일 이미지
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>권장 크기:</strong> 300x400px (4:3 비율)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>파일 형식:</strong> JPG 또는 PNG</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>파일 크기:</strong> 최대 20MB</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-emerald-600 mr-2">•</span>
                        <span><strong>디자인 팁:</strong> 밝고 선명한 색상 권장</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  자주 묻는 질문
                </h2>
                
                <div className="space-y-4">
                  {filteredFAQ.map((faq) => (
                    <div key={faq.id} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        {expandedFAQ === faq.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                      {expandedFAQ === faq.id && (
                        <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-200 bg-gray-50">
                          <div className="pt-3">
                            {renderAnswer(faq.answer)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 추가 도움이 필요한 경우 */}
              <div className="bg-blue-50 rounded-lg p-6 mt-8">
                <h3 className="font-medium text-blue-900 mb-2">추가 도움이 필요하신가요?</h3>
                <p className="text-blue-700 text-sm mb-4">
                  위의 가이드로 해결되지 않는 문제가 있으시면 언제든 문의해 주세요.
                </p>
                <div className="flex space-x-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    고객센터 문의
                  </button>
                  <button className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors">
                    커뮤니티 포럼
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}