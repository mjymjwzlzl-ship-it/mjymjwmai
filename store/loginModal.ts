import { create } from 'zustand';

interface LoginModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  open: false,
  setOpen: (open: boolean) => set({ open }),
}));
