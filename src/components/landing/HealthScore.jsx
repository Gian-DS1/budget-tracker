import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, animate, useInView } from 'framer-motion';

const SCORE = 82;
const R = 92;
const CIRC = 2 * Math.PI * R;

const metrics = [
  { label: 'Tasa de ahorro', value: 78 },
  { label: 'Control de deudas', value: 85 },
  { label: 'Presupuesto cumplido', value: 83 },
];

export default function HealthScore() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [count, setCount] = useState(reduce ? SCORE : 0);

  // Conteo animado del número central, sincronizado con el medidor.
  // Con reduce-motion el valor ya arranca en SCORE (estado inicial).
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, SCORE, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce]);

  const dashOffset = CIRC - (CIRC * (inView ? SCORE : 0)) / 100;

  return (
    <section className="lp-section" id="salud" style={{ paddingTop: 0 }} ref={ref}>
      <div className="lp__container">
        <motion.div
          className="lp-health"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="lp-health__grid">
            <div className="lp-gauge">
              <svg width="220" height="220" viewBox="0 0 220 220">
                <defs>
                  <linearGradient id="lpGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle className="lp-gauge__track" cx="110" cy="110" r={R} strokeWidth="16" />
                <motion.circle
                  className="lp-gauge__fill"
                  cx="110"
                  cy="110"
                  r={R}
                  strokeWidth="16"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: reduce ? 0 : 1.4, ease: 'easeOut' }}
                />
              </svg>
              <div className="lp-gauge__center">
                <span className="lp-gauge__num">{count}</span>
                <span className="lp-gauge__max">de 100</span>
                <span className="lp-gauge__label">Saludable</span>
              </div>
            </div>

            <div className="lp-health__content">
              <span className="lp__eyebrow">Salud financiera</span>
              <h2 className="lp-section__title" style={{ textAlign: 'left' }}>
                Tu salud financiera en un número
              </h2>
              <p className="lp-section__sub" style={{ textAlign: 'left' }}>
                FinTrack analiza tu ahorro, deudas y cumplimiento de presupuesto para darte
                un score del 0 al 100. Una brújula clara para mejorar mes a mes.
              </p>

              <div className="lp-health__metrics">
                {metrics.map((m) => (
                  <div className="lp-health__metric" key={m.label}>
                    <div className="lp-health__metric-top">
                      <span>{m.label}</span>
                      <span>{m.value}%</span>
                    </div>
                    <div className="lp-health__track">
                      <motion.div
                        className="lp-health__bar"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${m.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: reduce ? 0 : 1, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
