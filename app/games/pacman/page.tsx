'use client';

import dynamic from 'next/dynamic';

const PacmanGame = dynamic(() => import('@/components/games/PacmanGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3E7A5A] mx-auto mb-4"></div>
        <p>게임 로딩중...</p>
      </div>
    </div>
  )
});

export default function PacmanPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-yellow-400">
          👻 팩맨
        </h1>
        <PacmanGame />
      </div>
    </div>
  );
}