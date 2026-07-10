import { create } from 'zustand'
import { ScreenSize, SortOption } from '@/types'

interface UIState {
  screenSize: ScreenSize
  sidebarOpen: boolean
  darkMode: boolean
  currentSort: SortOption
  searchQuery: string
  selectedGenre: string | null
  setScreenSize: (size: ScreenSize) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setDarkMode: (dark: boolean) => void
  toggleDarkMode: () => void
  setSort: (sort: SortOption) => void
  setSearchQuery: (query: string) => void
  setSelectedGenre: (genre: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  screenSize: 'desktop',
  sidebarOpen: false,
  darkMode: false,
  currentSort: 'latest',
  searchQuery: '',
  selectedGenre: null,
  
  setScreenSize: (size: ScreenSize) => set({ screenSize: size }),
  
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setDarkMode: (dark: boolean) => set({ darkMode: dark }),
  
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  
  setSort: (sort: SortOption) => set({ currentSort: sort }),
  
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  setSelectedGenre: (genre: string | null) => set({ selectedGenre: genre })
})) 