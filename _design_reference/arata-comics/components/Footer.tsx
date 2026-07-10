import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 dark:bg-arata-black border-t border-gray-200 dark:border-arata-gray mt-auto py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h3 className="text-xl font-black text-gray-400 dark:text-gray-600 uppercase tracking-tighter mb-4">Arata Comics</h3>
        <div className="flex justify-center gap-6 mb-6 text-sm text-gray-500">
          <a href="#" className="hover:text-arata-green transition-colors">이용약관</a>
          <a href="#" className="hover:text-arata-green transition-colors">개인정보처리방침</a>
          <a href="#" className="hover:text-arata-green transition-colors">청소년보호정책</a>
          <Link to="/notice" className="hover:text-arata-green transition-colors">고객센터</Link>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-600 leading-relaxed">
          (주)아라타 코믹스 | 대표: 홍길동 | 사업자등록번호: 123-45-67890<br/>
          Copyright © Arata Comics. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;