// FinTrack RD — Sidebar Component

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  CreditCard,
  Target,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import useThemeStore from '../../stores/useThemeStore';

const navItems = [
  { section: 'Principal' },
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transacciones', label: 'Transacciones', icon: ArrowLeftRight },
  { path: '/presupuesto', label: 'Presupuesto', icon: Wallet },

  { section: 'Patrimonio' },
  { path: '/ahorros', label: 'Ahorros', icon: PiggyBank },
  { path: '/deudas', label: 'Deudas', icon: CreditCard },
  { path: '/plan', label: 'Plan Financiero', icon: Target },

  { section: 'Herramientas' },
  { path: '/calendario', label: 'Calendario', icon: Calendar },
  { path: '/reportes', label: 'Reportes', icon: FileText },
  { path: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <TrendingUp size={20} />
        </div>
        <span className="sidebar-logo-text">FinTrack RD</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          if (item.section) {
            return (
              <div key={`section-${index}`} className="sidebar-section-label">
                {item.section}
              </div>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              end={item.path === '/'}
            >
              <Icon className="sidebar-link-icon" size={20} />
              <span className="sidebar-link-text">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer with collapse toggle */}
      <div className="sidebar-footer">
        <button
          className="sidebar-link"
          onClick={toggleSidebar}
          style={{ width: '100%' }}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="sidebar-link-icon" size={20} />
          ) : (
            <ChevronLeft className="sidebar-link-icon" size={20} />
          )}
          <span className="sidebar-link-text">Colapsar</span>
        </button>
      </div>
    </aside>
  );
}
