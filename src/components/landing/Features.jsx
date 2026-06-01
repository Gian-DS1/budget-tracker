import { motion } from 'framer-motion';
import {
  Target,
  Repeat,
  CreditCard,
  TrendingDown,
  PiggyBank,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Presupuesto base cero',
    desc: 'Cada peso tiene un destino. Asigna tus ingresos hasta llegar a cero y sabe exactamente cuánto puedes gastar.',
  },
  {
    icon: Repeat,
    title: 'Transacciones + recurrentes',
    desc: 'Registra ingresos y gastos en segundos. Las recurrentes se materializan solas cada mes.',
  },
  {
    icon: CreditCard,
    title: 'Tarjetas de crédito',
    desc: 'Ciclos de corte y pago, cashback por categoría y control de balance, sin sorpresas a fin de mes.',
  },
  {
    icon: TrendingDown,
    title: 'Deudas inteligentes',
    desc: 'Estrategias de avalancha y bola de nieve para salir de deudas más rápido y pagar menos intereses.',
  },
  {
    icon: PiggyBank,
    title: 'Metas de ahorro',
    desc: 'Define objetivos, aporta poco a poco y mira tu progreso crecer con sobres acumulativos.',
  },
  {
    icon: BarChart3,
    title: 'Reportes inteligentes',
    desc: 'Tendencias, categorías y tu score de salud financiera en gráficos claros que sí entiendes.',
  },
];

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Features() {
  return (
    <section className="lp-section" id="funciones">
      <div className="lp__container">
        <div className="lp-section__head">
          <h2 className="lp-section__title">Todo lo que necesitas para tu dinero</h2>
          <p className="lp-section__sub">
            Una sola app para presupuestar, controlar tarjetas, eliminar deudas y ahorrar
            con intención, todo desde una interfaz simple y clara.
          </p>
        </div>

        <motion.div
          className="lp-features__grid"
          variants={grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.article className="lp-feature" key={title} variants={card}>
              <span className="lp-feature__icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <h3 className="lp-feature__title">{title}</h3>
              <p className="lp-feature__desc">{desc}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
