import { create } from 'zustand';

interface InteractionStore {
  hasInteracted: boolean;
  setHasInteracted: (value: boolean) => void;
}

export const useInteractionStore = create<InteractionStore>((set) => ({
  hasInteracted: false,
  setHasInteracted: (value: boolean) => set({ hasInteracted: value }),
}));
