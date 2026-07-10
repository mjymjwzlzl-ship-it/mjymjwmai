import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type AdultState = {
  adult: 'on' | 'off';
  setAdult: (adult: 'on' | 'off') => void;
  asked: boolean;
  setAsked: (asked: boolean) => void;
};

// 기존 localStorage 데이터를 새 형식으로 마이그레이션
const migrateAdultStorage = () => {
  if (typeof window === 'undefined') return { adult: 'off', asked: false };

  const oldAdult = localStorage.getItem('adult') as 'on' | 'off' | null;
  const oldAsked = localStorage.getItem('adult_asked');

  // 이미 새 형식이 있으면 마이그레이션 스킵
  if (localStorage.getItem('adult-storage')) {
    return undefined; // persist가 기존 값 사용
  }

  // 기존 데이터가 있으면 마이그레이션
  if (oldAdult || oldAsked) {
    const migrated = {
      adult: oldAdult || 'off',
      asked: oldAsked === '1',
    };

    // 기존 키 삭제
    localStorage.removeItem('adult');
    localStorage.removeItem('adult_asked');

    return migrated;
  }

  return undefined;
};

export const useAdultStore = create<AdultState>()(
  persist(
    (set) => ({
      adult: 'off',
      asked: false,
      setAdult: (adult) => set({ adult }),
      setAsked: (asked) => set({ asked }),
    }),
    {
      name: 'adult-storage',
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        const migrated = migrateAdultStorage();
        return migrated || persistedState;
      },
    }
  )
);


