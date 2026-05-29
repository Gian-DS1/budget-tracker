// FinTrack RD — Sidebar Component

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  CreditCard,
  Landmark,
  Target,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import useThemeStore from '../../stores/useThemeStore';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { section: 'Principal' },
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transacciones', label: 'Transacciones', icon: ArrowLeftRight },
  { path: '/presupuesto', label: 'Presupuesto', icon: Wallet },

  { section: 'Patrimonio' },
  { path: '/ahorros', label: 'Ahorros', icon: PiggyBank },
  { path: '/deudas', label: 'Deudas', icon: Landmark },
  { path: '/tarjetas', label: 'Tarjetas', icon: CreditCard },
  { path: '/plan', label: 'Plan Financiero', icon: Target },

  { section: 'Herramientas' },
  { path: '/calendario', label: 'Calendario', icon: Calendar },
  { path: '/reportes', label: 'Reportes', icon: FileText },
  { path: '/ajustes', label: 'Ajustes', icon: Settings },
  { path: '/feedback', label: 'Feedback / Beta', icon: MessageSquare },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, closeMobileMenu } = useThemeStore();
  const { signOut } = useAuth();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
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
              id={`tour-${item.path.replace('/', '') || 'dashboard'}-nav`}
              onClick={closeMobileMenu}
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
          onClick={signOut}
          style={{ width: '100%', marginBottom: 'var(--space-2)', color: 'var(--color-danger)' }}
          title="Cerrar sesión"
        >
          <LogOut className="sidebar-link-icon" size={20} />
          <span className="sidebar-link-text">Cerrar sesión</span>
        </button>
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
