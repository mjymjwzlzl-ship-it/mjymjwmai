"use client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5분간 데이터를 fresh 상태로 유지
        gcTime: 10 * 60 * 1000, // 10분간 캐시 보관 (구 cacheTime)
        refetchOnWindowFocus: false, // 탭 전환 시 재요청 방지
        refetchOnMount: false, // 컴포넌트 마운트 시 재요청 방지
        retry: 1, // 실패 시 1회만 재시도
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}


