// FinTrack RD — Header Component

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Moon, Sun, Menu } from 'lucide-react';
import useThemeStore from '../../stores/useThemeStore';

export default function Header() {
  const { theme, toggleTheme, sidebarCollapsed, toggleMobileMenu } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className={`header ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="flex items-center gap-4">
        <button className="btn-icon mobile-menu-btn" onClick={toggleMobileMenu}>
          <Menu size={20} />
        </button>
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
