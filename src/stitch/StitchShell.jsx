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
import { usePageTitle } from './usePageTitle';

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
//
// Importante (bug de carrera con login de Google): antes este effect dependía de
// `loading` y devolvía un cleanup que hacía clearTimeout. Con OAuth, fetchPrefs
// resuelve DESPUÉS del primer paint: loading hacía false→true→false, y el cambio
// a true ejecutaba el cleanup del render previo CANCELANDO el setTimeout ya
// programado; como `fired` ya estaba marcado, no se reprogramaba y el tour nunca
// aparecía. La corrección: solo programamos el timeout cuando loading ya es false
// y tutorialSeen es false, y NO lo cancelamos por cambios posteriores de estado
// (el guard `fired` garantiza que sea una sola vez). El timeout solo se limpia al
// desmontar el componente de verdad.
function TourAutoStart() {
  const { start } = useTour();
  const tutorialSeen = usePrefsStore((s) => s.tutorialSeen);
  const prefsLoaded = usePrefsStore((s) => s.prefsLoaded);
  const fired = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (fired.current) return;
    // Esperar a que fetchPrefs resuelva (prefsLoaded) para decidir con el valor
    // real de Supabase, no con el caché provisional. Así no parpadea para quien ya
    // lo vio en otro dispositivo ni se pierde el arranque por la carrera con OAuth.
    if (!prefsLoaded) return;
    if (!tutorialSeen) {
      fired.current = true;
      // Pequeño delay para que el shell pinte antes de medir anclas.
      timerRef.current = setTimeout(() => start(), 700);
    }
  }, [tutorialSeen, prefsLoaded, start]);

  // Limpia el timeout solo al desmontar (no en cada cambio de loading/seen), para
  // que un re-render intermedio no cancele un arranque ya programado.
  useEffect(() => () => clearTimeout(timerRef.current), []);

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
  usePageTitle();

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
