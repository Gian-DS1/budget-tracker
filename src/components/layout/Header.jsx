// FinTrack RD — Header Component

import { Moon, Sun, Menu } from 'lucide-react';
import useThemeStore from '../../stores/useThemeStore';

export default function Header() {
  const { theme, toggleTheme, sidebarCollapsed, toggleMobileMenu } = useThemeStore();

  return (
    <header className={`header ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="flex items-center gap-4">
        <button className="btn-icon mobile-menu-btn" onClick={toggleMobileMenu}>
          <Menu size={20} />
        </button>
      </div>

      <div className="header-actions">
        <button 
          className="btn-icon" 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}

