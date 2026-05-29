// FinTrack RD — Theme Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      viewMode: 'simple', // 'simple' | 'advanced'

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      setTheme: (theme) => set({ theme }),

      setViewMode: (mode) => set({ viewMode: mode === 'advanced' ? 'advanced' : 'simple' }),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
        
      toggleMobileMenu: () =>
        set((state) => ({
          mobileMenuOpen: !state.mobileMenuOpen,
        })),
        
      closeMobileMenu: () =>
        set({ mobileMenuOpen: false }),
    }),
    {
      name: 'fintrack-theme',
    }
  )
);

export default useThemeStore;
