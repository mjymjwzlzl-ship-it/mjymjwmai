import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { LikeProvider } from './components/LikeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Footer from './components/Footer';
import SubscriptionBanner from './components/SubscriptionBanner';
import WebtoonGrid from './components/WebtoonGrid';
import UnlimitedList from './components/UnlimitedList';
import NovelList from './components/NovelList';
import BoardList from './components/BoardList';
import WebtoonViewer from './components/WebtoonViewer';
import MobileBottomNav from './components/MobileBottomNav';
import GalleryPage from './components/GalleryPage';
import CharacterGallery from './components/CharacterGallery';
import ShortsPage from './components/ShortsPage';
import NoticePage from './components/NoticePage';
import LikedWebtoonsPage from './components/LikedWebtoonsPage';

// Home Page Component
const HomePage: React.FC = () => (
  <div className="space-y-6">
    <WebtoonGrid />
    
    <div className="bg-white dark:bg-arata-dark border border-gray-200 dark:border-arata-gray p-6 rounded-lg shadow-sm text-center py-16 flex flex-col items-center justify-center gap-3 transition-colors">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-arata-gray flex items-center justify-center mb-2">
           <span className="text-2xl">🚧</span>
        </div>
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">오늘의 추천 웹툰이 준비중입니다.</h3>
        <p className="text-sm text-gray-500">매일 새로운 재미, <span className="text-arata-green">아라타 코믹스</span>에서 만나보세요.</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LikeProvider>
          <HashRouter>
            {/* Added pb-16 for mobile bottom nav space, md:pb-0 for desktop */}
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-arata-black text-gray-900 dark:text-arata-text transition-colors duration-300 pb-16 md:pb-0">
              <Header />
              
              <main className="flex-grow w-full max-w-7xl mx-auto px-0 md:px-4 py-6">
                {/* Banner is shown on all pages for now, or could be restricted to Home */}
                <Routes>
                    <Route path="/webtoon/:id" element={null} /> {/* Hide banner on viewer if desired, but keeping layout simple */}
                    <Route path="/gallery/*" element={null} /> {/* Hide banner on gallery pages */}
                    <Route path="/shorts" element={null} /> {/* Hide banner on shorts page */}
                    <Route path="/notice" element={null} /> {/* Hide banner on notice page */}
                    <Route path="/liked" element={null} /> {/* Hide banner on liked page */}
                    <Route path="*" element={<SubscriptionBanner />} />
                </Routes>
                
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/unlimited" element={<UnlimitedList />} />
                  <Route path="/novel" element={<NovelList />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/gallery/:id" element={<CharacterGallery />} />
                  <Route path="/shorts" element={<ShortsPage />} />
                  <Route path="/board" element={<BoardList />} />
                  <Route path="/notice" element={<NoticePage />} />
                  <Route path="/liked" element={<LikedWebtoonsPage />} />
                  <Route path="/webtoon/:id" element={<WebtoonViewer />} />
                  {/* Fallback for other routes to Home or a 404 */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              <Footer />
              <MobileBottomNav />
            </div>
          </HashRouter>
        </LikeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;