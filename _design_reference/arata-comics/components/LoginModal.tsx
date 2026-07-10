import React, { useState } from 'react';
import { X, Eye, EyeOff, ChevronRight } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
  onLogin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToSignup, onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
    onClose();
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

        <div className="p-6 md:p-8 flex flex-col h-full justify-center min-h-[500px]">
            
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-arata-green font-black text-2xl tracking-tighter uppercase mb-2">ARATA</h1>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    로그인
                </h2>
                <p className="text-gray-500 text-sm mt-1">아이디와 비밀번호를 입력해 주세요.</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
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

                <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className="relative flex items-center">
                            <input type="checkbox" className="peer sr-only" />
                            <div className="w-4 h-4 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1e1e1e] peer-checked:bg-arata-green peer-checked:border-arata-green transition-colors"></div>
                            <svg className="absolute w-3 h-3 text-black pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">로그인 유지</span>
                    </label>
                    <button type="button" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline">
                        비밀번호를 잊으셨나요?
                    </button>
                </div>

                <button 
                    type="submit"
                    className="w-full bg-arata-green hover:bg-[#00c058] text-black font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 active:scale-98 transition-all text-base flex items-center justify-center gap-2 group mt-2"
                >
                    로그인하기
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                </button>
            </form>

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
            <div className="flex justify-center gap-4 mb-8">
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

            {/* Sign Up Link */}
            <div className="flex items-center justify-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">계정이 없으신가요?</span>
                <button 
                    onClick={onSwitchToSignup}
                    className="text-xl font-black text-arata-green hover:text-green-400 border-b-2 border-arata-green hover:border-green-400 transition-all leading-none pb-0.5"
                >
                    회원가입
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;