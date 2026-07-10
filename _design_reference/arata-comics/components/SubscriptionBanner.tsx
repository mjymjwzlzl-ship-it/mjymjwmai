import React from 'react';
import { Crown, ArrowRight } from 'lucide-react';

const SubscriptionBanner: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 px-4 md:px-0">
      
      {/* VIP Membership Banner - Takes 2/3 width */}
      <div className="md:col-span-2 bg-gradient-to-r from-green-50 via-white to-white dark:from-green-900/40 dark:to-arata-dark border border-green-100 dark:border-arata-green/20 text-gray-900 dark:text-white p-4 md:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-center min-h-[150px]">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-arata-green opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-500"></div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 h-full">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="bg-arata-green p-3 rounded-full text-black shadow-[0_0_15px_rgba(0,220,100,0.3)] flex-shrink-0 hidden sm:block">
              <Crown size={28} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">ARATA COMICS <span className="text-arata-green">VIP</span> 멤버십</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                월 2달러로 모든 웹툰을 <span className="text-gray-900 dark:text-white font-bold">무제한</span>으로 즐기세요!
              </p>
            </div>
          </div>
          
          <button className="w-full sm:w-auto bg-arata-green hover:bg-green-400 text-black px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,220,100,0.3)] hover:shadow-[0_0_30px_rgba(0,220,100,0.5)] whitespace-nowrap">
            지금 시작하기
            <ArrowRight size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* APK Download Banner - Replaced with Image Banner */}
      <a href="#" className="md:col-span-1 relative rounded-lg overflow-hidden shadow-lg group block h-full min-h-[150px]">
         {/* Background Image */}
         <img 
            src="https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop" 
            alt="App Download Background" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
         />
         
         {/* Gradient Overlay for Text Readability */}
         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-5">
             <div className="transform translate-y-0 transition-transform duration-300">
                <span className="inline-block bg-arata-green text-black text-[10px] font-black px-2 py-0.5 rounded mb-1">APP ONLY</span>
                <h3 className="text-white font-bold text-xl leading-tight drop-shadow-md">
                    ARATA 완전판<br/>
                    <span className="text-arata-green">앱 다운로드</span>
                </h3>
                <p className="text-gray-300 text-xs mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    광고/검열 없는 19+ 버전 설치
                </p>
             </div>
         </div>
      </a>

    </div>
  );
};

export default SubscriptionBanner;