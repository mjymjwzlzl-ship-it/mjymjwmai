import { create } from 'zustand';

const STORAGE_KEY = 'arata-adult-mode';

interface AdultModeState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  hydrate: () => void;
}

export const useAdultModeStore = create<AdultModeState>((set) => ({
  enabled: false,
  setEnabled: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    }
    set({ enabled });
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    set({ enabled: window.localStorage.getItem(STORAGE_KEY) === 'on' });
  },
}));
