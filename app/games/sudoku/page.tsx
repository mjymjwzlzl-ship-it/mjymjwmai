'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SudokuGame from '@/components/games/SudokuGame';

export default function SudokuPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            게임 센터로 돌아가기
          </Link>
          
          <h1 className="text-4xl font-bold flex items-center gap-3">
            🔢 스도쿠
          </h1>
        </div>

        <div className="flex justify-center">
          <SudokuGame />
        </div>
      </div>
    </div>
  );
}