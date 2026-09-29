import { create } from 'zustand';
import { useAdultStore } from './adult';

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
    useAdultStore.getState().setAdult(enabled ? 'on' : 'off');
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    // Hydration is only a UI preference, never proof of adult verification.
    const hasSession = !!(localStorage.getItem('authToken') || localStorage.getItem('token'));
    const enabled = hasSession && window.localStorage.getItem(STORAGE_KEY) === 'on';
    set({ enabled });
    useAdultStore.getState().setAdult(enabled ? 'on' : 'off');
  },
}));
