// AppShell Stitch (Romer) — sidebar 256px + header glass + canvas.
// Reconstrucción 1:1 del "Romer Command Center / Ledger" de Stitch.
// La navegación usa react-router; el contenido lo pone <Outlet/>.
//
// NOTA: UI pura, sin lógica de negocio (se cablea después con docs/logic/).

import { NavLink, Outlet } from 'react-router-dom';
import MS from './MS';

const NAV = [
  { to: '/', icon: 'dashboard', label: 'Command', end: true },
  { to: '/ledger', icon: 'list_alt', label: 'Ledger' },
  { to: '/budget', icon: 'account_balance', label: 'Budget' },
  { to: '/cards', icon: 'credit_card', label: 'Cards' },
  { to: '/vaults', icon: 'account_balance_wallet', label: 'Vaults' },
  { to: '/plan', icon: 'flag', label: 'Strategy' },
  { to: '/reports', icon: 'analytics', label: 'Reports' },
  { to: '/calendar', icon: 'calendar_month', label: 'Calendar' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

export default function StitchShell() {
  return (
    <div className="stitch-root flex h-screen overflow-hidden grid-pattern bg-surface-background font-body-md text-body-md text-on-surface">
      {/* ── SideNav ── */}
      <nav className="bg-surface-panel docked h-full w-64 border-r border-border-subtle flex flex-col py-lg px-md gap-sm shrink-0 z-20">
        <div className="mb-xl px-sm">
          <div className="font-mono-data text-mono-data font-bold tracking-widest text-on-surface mb-xs">
            ROMER
          </div>
          <div className="text-text-muted font-label-sm text-label-sm">Mission Control</div>
        </div>

        <div className="flex flex-col gap-xs flex-grow">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-md px-md py-sm rounded transition-all duration-200',
                  isActive
                    ? 'bg-surface-container-highest text-primary border border-border-subtle font-bold translate-x-1 shadow-[0_0_15px_rgba(190,194,255,0.2)]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest',
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
          ))}
        </div>

        <button className="mt-md w-full py-sm bg-surface-container-high border border-border-subtle text-on-surface font-label-sm text-label-sm font-bold rounded hover:bg-surface-container-highest transition-colors inner-glow flex items-center justify-center gap-sm">
          <MS name="add" className="text-[16px]" />
          Quick Entry
        </button>
      </nav>

      {/* ── Main ── */}
      <div className="flex flex-col flex-grow h-full overflow-hidden relative">
        <header className="bg-surface-background sticky top-0 z-10 border-b border-border-subtle w-full h-16 flex justify-between items-center px-margin-safe inner-glow shrink-0">
          <div className="font-headline-md text-headline-md font-bold text-on-surface">
            Romer Finance
          </div>
          <div className="flex-1 max-w-md mx-lg hidden sm:flex">
            <div className="relative w-full">
              <MS
                name="search"
                className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]"
              />
              <input
                className="w-full bg-surface-container-lowest border border-border-subtle rounded text-body-md font-body-md text-on-surface pl-[32px] pr-sm py-xs focus:outline-none focus:border-primary transition-colors inner-glow placeholder:text-text-muted"
                placeholder="Search operations..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-xs rounded transition-all">
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
