import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA({ onAuth }) {
  return (
    <section className="lp-section" style={{ paddingTop: 0 }}>
      <div className="lp__container">
        <motion.div
          className="lp-finalcta"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <span className="lp__badge">
            <span className="lp__badge-dot" aria-hidden="true" />
            Gratis · En beta
          </span>
          <h2 className="lp-finalcta__title">
            Empieza hoy, <span className="lp__gradient-text">gratis</span>
          </h2>
          <p className="lp-finalcta__sub">
            Crea tu cuenta en menos de un minuto y dale a cada peso un trabajo.
            Tu yo del futuro te lo va a agradecer.
          </p>
          <button className="lp__btn lp__btn--primary lp__btn--lg" onClick={() => onAuth('signup')}>
            Crear cuenta gratis
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
