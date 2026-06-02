// AppShell Stitch — sidebar + header glass. Marca FinTrack RD, nav en español,
// navegación real (react-router) y cierre de sesión real.

import { NavLink, Outlet } from 'react-router-dom';
import MS from './MS';
import { useAuth } from '../contexts/AuthContext';
import { isDemoActive, exitDemo } from './demoMode';

const NAV = [
  { section: 'Principal' },
  { to: '/', icon: 'dashboard', label: 'Resumen', end: true },
  { to: '/transacciones', icon: 'list_alt', label: 'Transacciones' },
  { to: '/presupuesto', icon: 'account_balance', label: 'Presupuesto' },
  { section: 'Patrimonio' },
  { to: '/ahorros', icon: 'account_balance_wallet', label: 'Ahorros' },
  { to: '/deudas', icon: 'trending_down', label: 'Deudas' },
  { to: '/tarjetas', icon: 'credit_card', label: 'Tarjetas' },
  { to: '/plan', icon: 'flag', label: 'Plan' },
  { section: 'Herramientas' },
  { to: '/calendario', icon: 'calendar_month', label: 'Calendario' },
  { to: '/reportes', icon: 'analytics', label: 'Reportes' },
  { to: '/ajustes', icon: 'settings', label: 'Ajustes' },
  { to: '/feedback', icon: 'forum', label: 'Feedback' },
];

export default function StitchShell() {
  const { signOut } = useAuth();
  const demo = isDemoActive();

  const handleSignOut = () => {
    if (demo) { exitDemo(); window.location.reload(); return; }
    signOut();
  };

  return (
    <div className="stitch-root flex h-screen overflow-hidden grid-pattern bg-surface-background font-body-md text-body-md text-on-surface">
      {/* ── SideNav ── */}
      <nav className="bg-surface-panel h-full w-64 border-r border-border-subtle flex flex-col py-lg px-md gap-xs shrink-0 z-20 overflow-y-auto">
        <div className="mb-lg px-sm">
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center inner-glow">
              <MS name="bolt" fill className="text-[14px] text-on-primary" />
            </div>
            <div className="font-headline-md text-[18px] font-bold tracking-tight text-on-surface">FinTrack RD</div>
          </div>
          <div className="text-text-muted font-label-sm text-label-sm pl-[2px]">Control financiero</div>
        </div>

        <div className="flex flex-col gap-xs flex-grow">
          {NAV.map((item, i) =>
            item.section ? (
              <div key={`s-${i}`} className="font-mono-data text-mono-data text-text-muted uppercase tracking-[0.18em] px-md pt-md pb-xs">
                {item.section}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-md px-md py-sm rounded transition-all duration-200 border',
                    isActive
                      ? 'bg-surface-container-highest text-primary border-border-subtle font-bold translate-x-1 shadow-[0_0_15px_rgba(190,194,255,0.2)]'
                      : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-highest',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <MS name={item.icon} fill={isActive} className="text-[20px]" />
                    <span className="font-label-sm text-label-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="mt-md w-full py-sm bg-transparent border border-border-subtle text-on-surface-variant font-label-sm text-label-sm rounded hover:bg-surface-container-high hover:text-accent-error transition-colors flex items-center justify-center gap-sm"
        >
          <MS name="logout" className="text-[16px]" /> {demo ? 'Salir del modo demo' : 'Cerrar sesión'}
        </button>
      </nav>

      {/* ── Main ── */}
      <div className="flex flex-col flex-grow h-full overflow-hidden relative">
        <header className="bg-surface-background sticky top-0 z-10 border-b border-border-subtle w-full h-16 flex justify-between items-center px-margin-safe inner-glow shrink-0">
          <div className="flex items-center gap-sm">
            <div className="font-headline-md text-headline-md font-bold text-on-surface">FinTrack RD</div>
            {demo && (
              <span className="font-mono-data text-mono-data text-accent-warning uppercase tracking-widest border border-accent-warning/40 rounded px-sm py-xs">
                Modo demo · QA
              </span>
            )}
          </div>
          <div className="flex-1 max-w-md mx-lg hidden sm:flex">
            <div className="relative w-full">
              <MS name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
              <input
                className="w-full bg-surface-container-lowest border border-border-subtle rounded text-body-md font-body-md text-on-surface pl-[32px] pr-sm py-xs focus:outline-none focus:border-primary transition-colors inner-glow placeholder:text-text-muted"
                placeholder="Buscar…"
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-xs rounded transition-all" aria-label="Notificaciones">
              <MS name="notifications" className="text-[24px]" />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border-subtle bg-surface-container-lowest flex items-center justify-center inner-glow">
              <MS name="person" className="text-[20px] text-on-surface" />
            </div>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
