import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Navbar sticky de la landing. Translúcida arriba; al hacer scroll
 * (> 12px) toma fondo sólido + blur. Los enlaces ancla hacen scroll
 * suave a las secciones; los CTA disparan el flujo de auth.
 */
export default function Navbar({ onAuth }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.nav
      className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="lp__container lp-nav__inner">
        <button className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="lp-brand__mark">
            <img src="/favicon.svg" alt="FinTrack RD" />
          </span>
          FinTrack RD
        </button>

        <div className="lp-nav__links">
          <button className="lp-nav__link" onClick={() => goTo('funciones')}>Funciones</button>
          <button className="lp-nav__link" onClick={() => goTo('como-funciona')}>Cómo funciona</button>
          <button className="lp-nav__link" onClick={() => goTo('salud')}>Salud financiera</button>
        </div>

        <div className="lp-nav__actions">
          <button className="lp-nav__signin" onClick={() => onAuth('login')}>
            Iniciar sesión
          </button>
          <button className="lp__btn lp__btn--primary lp__btn--sm" onClick={() => onAuth('signup')}>
            Crear cuenta
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
