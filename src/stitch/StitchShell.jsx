// AppShell Stitch — sidebar + header glass, responsive.
// Desktop: sidebar fijo 256px. Móvil (<lg): sidebar off-canvas + hamburguesa + overlay.

import { useEffect, useRef, useState } from 'react';
import { NavLink, useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MS from './MS';
import Logo from './Logo';
import { Screen } from './StitchMotion';
import AccountMenu from './AccountMenu';
import TourProvider from './tour/TourProvider';
import { useTour } from './tour/useTour';
import { useAuth } from '../contexts/AuthContext';
import { isDemoActive, exitDemo } from './demoMode';
import usePrefsStore from '../stores/usePrefsStore';

const NAV = [
  { section: 'Principal' },
  { to: '/', icon: 'dashboard', label: 'Resumen', end: true },
  { to: '/transacciones', icon: 'list_alt', label: 'Transacciones' },
  { to: '/presupuesto', icon: 'account_balance', label: 'Presupuesto' },
  { section: 'Patrimonio' },
  { to: '/ahorros', icon: 'account_balance_wallet', label: 'Ahorros' },
  { to: '/deudas', icon: 'trending_down', label: 'Deudas' },
  { to: '/tarjetas', icon: 'credit_card', label: 'Tarjetas' },
  { section: 'Herramientas' },
  { to: '/calendario', icon: 'calendar_month', label: 'Calendario' },
  { to: '/reportes', icon: 'analytics', label: 'Reportes' },
  { to: '/categorias', icon: 'sell', label: 'Categorías' },
];

// Arranca el tutorial automáticamente la 1ª vez (cuando el usuario aún no lo ha
// visto). Vive dentro de TourProvider para usar start(). Una sola vez por sesión.
function TourAutoStart() {
  const { start } = useTour();
  const tutorialSeen = usePrefsStore((s) => s.tutorialSeen);
  const loading = usePrefsStore((s) => s.loading);
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    // Esperar a que fetchPrefs resuelva (evita parpadeo para quienes ya lo vieron
    // en otro dispositivo: el caché local arranca en false hasta traer Supabase).
    if (loading) return undefined;
    if (!tutorialSeen) {
      fired.current = true;
      // Pequeño delay para que el shell pinte antes de medir anclas.
      const t = setTimeout(() => start(), 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [tutorialSeen, loading, start]);
  return null;
}

export default function StitchShell() {
  return (
    <TourProvider>
      <TourAutoStart />
      <ShellInner />
    </TourProvider>
  );
}

function ShellInner() {
  const { signOut } = useAuth();
  const demo = isDemoActive();
  const [menuOpen, setMenuOpen] = useState(false);
  const outlet = useOutlet();
  const location = useLocation();

  const handleSignOut = () => {
    if (demo) { exitDemo(); window.location.reload(); return; }
    signOut();
  };

  return (
    <div className="stitch-root flex h-screen overflow-hidden grid-pattern bg-surface-background font-body-md text-body-md text-on-surface">
      {/* Overlay móvil */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      {/* ── SideNav ── */}
      <nav
        data-tour="nav"
        className={[
          'bg-surface-panel h-full w-64 border-r border-border-subtle flex flex-col py-lg px-md gap-xs shrink-0 overflow-y-auto',
          'fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:static lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="mb-lg px-sm flex items-center justify-between">
          <div>
            <Logo size={26} withText />
            <div className="text-text-muted font-label-sm text-label-sm pl-[34px] -mt-xs">Control financiero</div>
          </div>
          {/* Cerrar en móvil */}
          <button onClick={() => setMenuOpen(false)} className="lg:hidden text-text-muted hover:text-on-surface p-xs" aria-label="Cerrar menú">
            <MS name="close" className="text-[20px]" />
          </button>
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
                onClick={() => setMenuOpen(false)}
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
      <div className="flex flex-col flex-grow h-full overflow-hidden relative min-w-0">
        <header className="bg-surface-background sticky top-0 z-10 border-b border-border-subtle w-full h-16 flex justify-between items-center px-md sm:px-margin-safe inner-glow shrink-0 gap-sm">
          <div className="flex items-center gap-sm min-w-0">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-on-surface-variant hover:text-on-surface p-xs -ml-xs" aria-label="Abrir menú">
              <MS name="menu" className="text-[24px]" />
            </button>
            <div className="font-headline-md text-headline-md font-bold text-on-surface truncate">FinTrack</div>
            {demo && (
              <span className="font-mono-data text-mono-data text-accent-warning uppercase tracking-widest border border-accent-warning/40 rounded px-sm py-xs hidden sm:inline">
                Demo · QA
              </span>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center shrink-0">
            <AccountMenu />
          </div>
        </header>

        <main className="flex-grow overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <Screen key={location.pathname}>{outlet}</Screen>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
