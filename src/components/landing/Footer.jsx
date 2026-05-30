export default function Footer({ onAuth }) {
  const year = new Date().getFullYear();

  const scrollTo = (id) => () => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="lp-footer">
      <div className="lp__container lp-footer__inner">
        <button className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="lp-brand__mark">
            <img src="/favicon.svg" alt="FinTrack RD" />
          </span>
          FinTrack RD
        </button>

        <nav className="lp-footer__links" aria-label="Pie de página">
          <button className="lp-footer__link" onClick={scrollTo('funciones')}>Funciones</button>
          <button className="lp-footer__link" onClick={scrollTo('como-funciona')}>Cómo funciona</button>
          <button className="lp-footer__link" onClick={scrollTo('salud')}>Salud financiera</button>
          <button className="lp-footer__link" onClick={() => onAuth('login')}>Iniciar sesión</button>
        </nav>

        <div className="lp-footer__meta">
          <span>Hecho en RD 🇩🇴</span>
          <span>© {year} FinTrack RD</span>
        </div>
      </div>
    </footer>
  );
}
