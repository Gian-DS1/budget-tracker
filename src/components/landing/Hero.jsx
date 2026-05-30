import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowRight, PlayCircle } from 'lucide-react';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const bars = [38, 62, 45, 78, 56, 88, 70];

export default function Hero({ onAuth }) {
  const reduce = useReducedMotion();

  const float = reduce
    ? {}
    : {
        animate: { y: [0, -14, 0] },
        transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
      };

  const orb = (delay) =>
    reduce
      ? {}
      : {
          animate: { scale: [1, 1.15, 1], opacity: [0.45, 0.65, 0.45] },
          transition: { duration: 9, repeat: Infinity, ease: 'easeInOut', delay },
        };

  return (
    <header className="lp-hero">
      <motion.span className="lp-orb lp-orb--1" {...orb(0)} />
      <motion.span className="lp-orb lp-orb--2" {...orb(1.5)} />

      <div className="lp__container lp-hero__grid">
        {/* Columna texto */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.span className="lp__badge" variants={item}>
            <span className="lp__badge-dot" aria-hidden="true" />
            Gratis · En beta
          </motion.span>

          <motion.h1 className="lp-hero__title" variants={item}>
            Toma el control de tu dinero y{' '}
            <span className="lp__gradient-text">crece financieramente</span>
          </motion.h1>

          <motion.p className="lp-hero__subtitle" variants={item}>
            Presupuesto base cero, transacciones en RD$ y US$, tarjetas con cashback,
            deudas y metas — todo en un solo lugar, simple y bajo tu control.
          </motion.p>

          <motion.div className="lp-hero__cta" variants={item}>
            <button className="lp__btn lp__btn--primary lp__btn--lg" onClick={() => onAuth('signup')}>
              Crear cuenta gratis
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a
              className="lp__btn lp__btn--ghost lp__btn--lg"
              href="#como-funciona"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <PlayCircle size={18} aria-hidden="true" />
              Ver cómo funciona
            </a>
          </motion.div>

          <motion.div className="lp-hero__trust" variants={item}>
            <Sparkles size={15} aria-hidden="true" />
            Sin tarjeta de crédito · 100% en la nube · Tu data es tuya
          </motion.div>
        </motion.div>

        {/* Columna mockup */}
        <motion.div
          className="lp-hero__visual"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
        >
          <motion.div className="lp-mock" {...float}>
            <div className="lp-mock__bar" aria-hidden="true">
              <span className="lp-mock__dot" />
              <span className="lp-mock__dot" />
              <span className="lp-mock__dot" />
            </div>

            <div className="lp-mock__hero-card">
              <div className="lp-mock__label">Puedes gastar</div>
              <div className="lp-mock__amount">
                RD$ <span>24,850</span>
              </div>
            </div>

            <div className="lp-mock__kpis">
              <div className="lp-mock__kpi">
                <div className="lp-mock__kpi-label">Ingresos</div>
                <div className="lp-mock__kpi-val" style={{ color: '#10b981' }}>+78,500</div>
              </div>
              <div className="lp-mock__kpi">
                <div className="lp-mock__kpi-label">Gastos</div>
                <div className="lp-mock__kpi-val" style={{ color: '#f43f5e' }}>-53,650</div>
              </div>
              <div className="lp-mock__kpi">
                <div className="lp-mock__kpi-label">Ahorro</div>
                <div className="lp-mock__kpi-val" style={{ color: '#06b6d4' }}>32%</div>
              </div>
            </div>

            <div className="lp-mock__chart" aria-hidden="true">
              {bars.map((h, i) => (
                <motion.span
                  key={i}
                  style={{ height: `${h}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.07, ease: 'easeOut' }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}
