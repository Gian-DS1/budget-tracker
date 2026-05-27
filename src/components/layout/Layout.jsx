// FinTrack RD — Layout Component

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useThemeStore from '../../stores/useThemeStore';

export default function Layout() {
  const { sidebarCollapsed } = useThemeStore();

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
