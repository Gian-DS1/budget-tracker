import { motion } from 'framer-motion';
import { CalendarDays, Eye, Bell } from 'lucide-react';

const benefits = [
  {
    icon: CalendarDays,
    title: 'Tu mes de un vistazo',
    desc: 'Ingresos, gastos y vencimientos en un calendario que cabe en una sola pantalla.',
  },
  {
    icon: Eye,
    title: 'Sin sorpresas',
    desc: 'Anticipa pagos de tarjetas y deudas antes de que lleguen. Planifica con claridad.',
  },
  {
    icon: Bell,
    title: 'Siempre al día',
    desc: 'Recurrentes y cierres de ciclo registrados automáticamente. Tú solo decides.',
  },
];

// Patrón de celdas del mini-calendario (in = ingreso, out = gasto)
const cells = [
  {}, {}, { t: 'in', v: '+5k' }, {}, {}, { t: 'out', v: '-1.2k' }, {},
  {}, { t: 'out', v: '-800' }, {}, {}, { t: 'in', v: '+12k' }, {}, {},
  {}, {}, {}, { t: 'out', v: '-3.5k' }, {}, {}, { t: 'in', v: '+5k' },
  { t: 'out', v: '-900' }, {}, {}, {}, {}, { t: 'out', v: '-2k' }, {},
];

export default function Showcase() {
  return (
    <section className="lp-section" style={{ paddingTop: 0 }}>
      <div className="lp__container">
        <div className="lp-showcase__grid">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="lp__eyebrow">Calendario y reportes</span>
            <h2 className="lp-section__title" style={{ textAlign: 'left' }}>
              Mira tu dinero moverse en el tiempo
            </h2>
            <p className="lp-section__sub" style={{ textAlign: 'left' }}>
              Visualiza cada entrada y salida día por día, y toma decisiones con
              reportes que conectan el pasado con tu próximo mes.
            </p>

            <ul className="lp-showcase__list">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <li className="lp-showcase__item" key={title}>
                  <span className="lp-showcase__item-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="lp-showcase__panel"
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="lp-cal" aria-hidden="true">
              {cells.map((c, i) => (
                <div
                  key={i}
                  className={`lp-cal__cell${c.t === 'in' ? ' lp-cal__cell--in' : c.t === 'out' ? ' lp-cal__cell--out' : ''}`}
                >
                  {i + 1}
                  {c.v && <span className="lp-cal__tag">{c.v}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
