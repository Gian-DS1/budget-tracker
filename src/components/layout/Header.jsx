// FinTrack RD — Header Component

import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import useThemeStore from '../../stores/useThemeStore';

export default function Header() {
  const { theme, toggleTheme, sidebarCollapsed, toggleMobileMenu } = useThemeStore();

  return (
    <header className={`header ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="flex items-center gap-4">
        <button className="btn-icon mobile-menu-btn" onClick={toggleMobileMenu}>
          <Menu size={20} />
        </button>
        <div className="header-search">
          <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar transacciones, categorías..."
            aria-label="Buscar"
          />
        </div>
      </div>

      <div className="header-actions">
        <button className="btn-icon tooltip-container" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span className="tooltip">
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>
        <button className="btn-icon tooltip-container">
          <Bell size={20} />
          <span className="tooltip">Notificaciones</span>
        </button>
      </div>
    </header>
  );
}
