import { create } from 'zustand';

type AdultState = {
  adult: 'on' | 'off';
  setAdult: (adult: 'on' | 'off') => void;
  asked: boolean;
  setAsked: (asked: boolean) => void;
};

const STORAGE_KEY = 'adult';
const ASKED_KEY = 'adult_asked';

export const useAdultStore = create<AdultState>((set) => ({
  adult: typeof window !== 'undefined' ? ((localStorage.getItem(STORAGE_KEY) as 'on' | 'off') || 'off') : 'off',
  asked: typeof window !== 'undefined' ? localStorage.getItem(ASKED_KEY) === '1' : false,
  setAdult: (adult) => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, adult);
    set({ adult });
  },
  setAsked: (asked) => {
    if (typeof window !== 'undefined') localStorage.setItem(ASKED_KEY, asked ? '1' : '0');
    set({ asked });
  },
}));


