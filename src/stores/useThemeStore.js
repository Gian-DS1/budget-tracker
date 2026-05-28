// FinTrack RD — Theme Store

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set) => ({
      theme: window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
      sidebarCollapsed: false,
      mobileMenuOpen: false,

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      setTheme: (theme) => set({ theme }),

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
