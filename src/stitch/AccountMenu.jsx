// Hub de cuenta: el avatar del topbar abre este menú (en portal, vía
// DropdownPanel, para que no lo recorte el header). Contiene info de sesión,
// acceso a Ajustes y cerrar sesión. En demo muestra el estado demo y "Salir".
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import MS from './MS';
import DropdownPanel from './DropdownPanel';
import { useAuth } from '../contexts/AuthContext';
import { isDemoActive, exitDemo } from './demoMode';

export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const demo = isDemoActive();

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // Cerrar al hacer clic fuera (trigger + panel) o con Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (to) => { setOpen(false); navigate(to); };
  const handleSignOut = () => {
    setOpen(false);
    if (demo) { exitDemo(); window.location.reload(); return; }
    signOut();
  };

  const label = demo ? 'Modo demo' : (user?.email || 'Mi cuenta');

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center inner-glow transition-colors ${open ? 'border-primary' : 'border-border-subtle'} bg-surface-container-lowest`}
      >
        <MS name="person" className="text-[20px] text-on-surface" />
      </button>

      <DropdownPanel triggerRef={triggerRef} panelRef={panelRef} open={open} reduce={reduce} matchTriggerWidth={false} className="min-w-[220px]">
        <div className="py-xs" role="menu">
          <div className="px-md py-sm border-b border-border-subtle flex items-center gap-sm">
            <div className="w-7 h-7 rounded-full bg-surface-container-high border border-border-subtle flex items-center justify-center shrink-0">
              <MS name="person" className="!text-[16px] text-on-surface" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-md text-body-md text-on-surface truncate">{label}</span>
              <span className="font-mono-data text-mono-data text-text-muted uppercase">{demo ? 'Sesión de prueba' : 'Sesión activa'}</span>
            </div>
          </div>

          <button role="menuitem" onClick={() => go('/ajustes')} className="w-full flex items-center gap-sm px-md py-sm text-left text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <MS name="settings" className="!text-[18px]" />
            <span className="font-body-md text-body-md">Ajustes</span>
          </button>
          <button role="menuitem" onClick={() => go('/feedback')} className="w-full flex items-center gap-sm px-md py-sm text-left text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <MS name="forum" className="!text-[18px]" />
            <span className="font-body-md text-body-md">Feedback</span>
          </button>

          <div className="border-t border-border-subtle mt-xs pt-xs">
            <button role="menuitem" onClick={handleSignOut} className="w-full flex items-center gap-sm px-md py-sm text-left text-accent-error hover:bg-accent-error/10 transition-colors">
              <MS name={demo ? 'logout' : 'logout'} className="!text-[18px]" />
              <span className="font-body-md text-body-md">{demo ? 'Salir del demo' : 'Cerrar sesión'}</span>
            </button>
          </div>
        </div>
      </DropdownPanel>
    </>
  );
}
