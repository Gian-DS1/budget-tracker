import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const steps = [
  {
    n: '1',
    title: 'Registra',
    desc: 'Conecta tus ingresos y gastos. Soporta RD$ y US$ con la tasa del día y transacciones recurrentes.',
  },
  {
    n: '2',
    title: 'Asigna (base cero)',
    desc: 'Dale a cada peso un trabajo: gastos, deudas, metas. Cuando llegas a cero, tienes el control total.',
  },
  {
    n: '3',
    title: 'Crece',
    desc: 'Paga deudas más rápido, ahorra con intención y sube tu score de salud financiera mes a mes.',
  },
];

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const step = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function HowItWorks() {
  return (
    <section className="lp-section" id="como-funciona" style={{ paddingTop: 0 }}>
      <div className="lp__container">
        <div className="lp-section__head">
          <span className="lp__eyebrow">Cómo funciona</span>
          <h2 className="lp-section__title">Tres pasos para crecer</h2>
          <p className="lp-section__sub">
            Sin hojas de cálculo ni fórmulas. Un método claro que puedes empezar hoy mismo.
          </p>
        </div>

        <motion.div
          className="lp-steps"
          variants={grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {steps.map((s, i) => (
            <motion.div className="lp-step" key={s.n} variants={step}>
              <span className="lp-step__num" aria-hidden="true">{s.n}</span>
              <h3 className="lp-step__title">{s.title}</h3>
              <p className="lp-step__desc">{s.desc}</p>
              {i < steps.length - 1 && (
                <ChevronRight className="lp-step__arrow" size={22} aria-hidden="true" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
