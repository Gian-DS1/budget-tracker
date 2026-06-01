// FinTrack RD — Layout Component

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useThemeStore from '../../stores/useThemeStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export default function Layout() {
  const { sidebarCollapsed } = useThemeStore();

  // Enable global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <main className={`app-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
