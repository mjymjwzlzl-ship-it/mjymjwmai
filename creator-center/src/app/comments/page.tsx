'use client'

import React from 'react';
import Header from '@/components/Header';
import { MessageSquare } from 'lucide-react';

export default function CommentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">댓글 관리</h1>
            <p className="text-gray-600">작품에 달린 독자들의 댓글을 확인하고 관리하세요.</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">댓글 관리 기능 준비 중</h3>
            <p className="mt-1 text-sm text-gray-500">
              곧 이곳에서 모든 댓글을 확인하고 관리할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
