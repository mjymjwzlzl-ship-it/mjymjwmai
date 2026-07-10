import React, { useState } from 'react';
import { X, Eye, EyeOff, Check, Ticket, ChevronRight } from 'lucide-react';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    age: false,
    marketing: false,
  });

  if (!isOpen) return null;

  const handleAllAgree = () => {
    const newState = !agreements.all;
    setAgreements({
      all: newState,
      terms: newState,
      privacy: newState,
      age: newState,
      marketing: newState,
    });
  };

  const handleSingleAgree = (key: keyof typeof agreements) => {
    const newAgreements = { ...agreements, [key]: !agreements[key] };
    const allChecked = newAgreements.terms && newAgreements.privacy && newAgreements.age && newAgreements.marketing;
    setAgreements({ ...newAgreements, all: allChecked });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-[#121212] w-full max-w-[400px] rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar border border-gray-200 dark:border-gray-800">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 z-20 text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-white/10 p-1 rounded-full backdrop-blur-sm"
        >
          <X size={20} />
        </button>

        <div className="p-6 md:p-8 flex flex-col h-full">
            
            {/* Header: Brand & Welcome */}
            <div className="mb-6 text-center">
                <h1 className="text-arata-green font-black text-2xl tracking-tighter uppercase mb-2">ARATA</h1>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    무제한 웹툰의 시작
                </h2>
                <p className="text-gray-500 text-sm mt-1">지금 가입하고 멤버십 혜택을 미리 체험해보세요.</p>
            </div>

            {/* Benefit Ticket UI */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-arata-green/20 dark:to-arata-green/5 border border-gray-200 dark:border-arata-green/30 rounded-xl p-4 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-arata-green opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity"></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-arata-green flex items-center justify-center text-black shadow-lg shadow-green-500/20">
                        <Ticket size={20} />
                    </div>
                    <div className="flex-1">
                        <div className="text-arata-green text-[10px] font-bold uppercase tracking-wider mb-0.5">Welcome Gift</div>
                        <div className="text-white font-bold text-base">아라타플러스 7일권</div>
                    </div>
                    <div className="text-white/50">
                        <Check size={18} />
                    </div>
                </div>
            </div>

            {/* Email Sign Up Form */}
            <div className="space-y-3 mb-6">
                <div>
                    <input 
                        type="email" 
                        placeholder="이메일 주소"
                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-arata-green dark:focus:border-arata-green transition-colors text-sm dark:text-white placeholder-gray-400 font-medium"
                    />
                </div>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호"
                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-arata-green dark:focus:border-arata-green transition-colors text-sm dark:text-white placeholder-gray-400 font-medium"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* Main Action Button */}
            <button className="w-full bg-arata-green hover:bg-[#00c058] text-black font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 active:scale-98 transition-all text-base mb-6 flex items-center justify-center gap-2 group">
                회원가입하고 혜택받기
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>

            {/* SNS Login Divider */}
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-[#121212] px-3 text-gray-400">SNS 계정으로 계속하기</span>
                </div>
            </div>

            {/* SNS Buttons */}
            <div className="flex justify-center gap-4 mb-6">
                <button className="w-10 h-10 rounded-full bg-[#03C75A] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm" title="네이버로 시작하기">
                    <span className="font-black text-xs">N</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-[#FEE500] text-[#3c1e1e] flex items-center justify-center hover:scale-110 transition-transform shadow-sm" title="카카오로 시작하기">
                    <span className="font-black text-xs">K</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm" title="페이스북으로 시작하기">
                    <span className="font-black text-xs">F</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:scale-110 transition-transform shadow-sm" title="구글로 시작하기">
                    <span className="font-black text-xs">G</span>
                </button>
            </div>

            {/* Terms Accordion Style */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-[#1e1e1e]/50">
                <div 
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={handleAllAgree}
                >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${agreements.all ? 'bg-arata-green border-arata-green text-black' : 'border-gray-300 dark:border-gray-600 text-transparent bg-white dark:bg-transparent'}`}>
                        <Check size={12} strokeWidth={4} />
                    </div>
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">약관 전체 동의</span>
                </div>

                {/* Expanded Details - Simplified */}
                <div className={`mt-3 space-y-2 pl-8 transition-all duration-300 overflow-hidden ${agreements.all ? 'opacity-50' : 'opacity-100'}`}>
                    {[
                        { key: 'terms', label: '이용약관 동의 (필수)' },
                        { key: 'privacy', label: '개인정보 수집 및 이용 (필수)' },
                        { key: 'age', label: '만 14세 이상입니다 (필수)' },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center gap-2" onClick={() => handleSingleAgree(item.key as keyof typeof agreements)}>
                             <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors cursor-pointer ${agreements[item.key as keyof typeof agreements] ? 'bg-gray-600 border-gray-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                <Check size={8} strokeWidth={4} />
                             </div>
                             <span className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Login Link - Enhanced Visibility */}
            <div className="mt-8 flex items-center justify-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">이미 계정이 있으신가요?</span>
                <button 
                    onClick={onSwitchToLogin}
                    className="text-xl font-black text-arata-green hover:text-green-400 border-b-2 border-arata-green hover:border-green-400 transition-all leading-none pb-0.5"
                >
                    로그인
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpModal;