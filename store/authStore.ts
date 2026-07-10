import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  
  login: (user: User) => set({ 
    user, 
    isAuthenticated: true,
    isLoading: false 
  }),
  
  logout: () => set({ 
    user: null, 
    isAuthenticated: false,
    isLoading: false 
  }),
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  updateUser: (userData: Partial<User>) => set((state) => ({
    user: state.user ? { ...state.user, ...userData } : null
  }))
})) 