import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { id: 'funciones', label: 'Funciones' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'salud', label: 'Salud financiera' },
];

/**
 * Navbar sticky de la landing. Translúcida arriba; al hacer scroll
 * (> 12px) toma fondo sólido + blur. Los enlaces ancla hacen scroll
 * suave a las secciones; los CTA disparan el flujo de auth. En móvil,
 * los enlaces/acciones se mueven a un drawer accesible (hamburguesa).
 */
export default function Navbar({ onAuth }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Bloquea el scroll del body y permite cerrar con Escape mientras el
  // drawer está abierto.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goTo = (id) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAuth = (mode) => {
    setOpen(false);
    onAuth(mode);
  };

  return (
    <motion.nav
      className={`lp-nav${scrolled || open ? ' lp-nav--scrolled' : ''}`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="lp__container lp-nav__inner">
        <button className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="lp-brand__mark">
            <img src="/favicon.svg" alt="FinTrack" />
          </span>
          FinTrack
        </button>

        <div className="lp-nav__links">
          {NAV_LINKS.map((link) => (
            <button key={link.id} className="lp-nav__link" onClick={() => goTo(link.id)}>
              {link.label}
            </button>
          ))}
        </div>

        <div className="lp-nav__actions">
          <button className="lp-nav__signin" onClick={() => handleAuth('login')}>
            Iniciar sesión
          </button>
          <button className="lp__btn lp__btn--primary lp__btn--sm" onClick={() => handleAuth('signup')}>
            Crear cuenta
          </button>
        </div>

        {/* Botón hamburguesa (solo móvil) */}
        <button
          type="button"
          className="lp-nav__toggle"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="lp-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Drawer móvil */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="lp-nav__overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id="lp-mobile-menu"
              className="lp-nav__drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <nav className="lp-nav__drawer-links">
                {NAV_LINKS.map((link) => (
                  <button key={link.id} className="lp-nav__drawer-link" onClick={() => goTo(link.id)}>
                    {link.label}
                  </button>
                ))}
              </nav>
              <div className="lp-nav__drawer-actions">
                <button
                  className="lp__btn lp__btn--ghost"
                  onClick={() => handleAuth('login')}
                >
                  Iniciar sesión
                </button>
                <button
                  className="lp__btn lp__btn--primary"
                  onClick={() => handleAuth('signup')}
                >
                  Crear cuenta gratis
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
