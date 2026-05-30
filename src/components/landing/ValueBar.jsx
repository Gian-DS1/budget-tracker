import { motion } from 'framer-motion';
import { Target, ArrowLeftRight, CreditCard, Cloud } from 'lucide-react';

const chips = [
  { icon: Target, label: 'Presupuesto base cero' },
  { icon: ArrowLeftRight, label: 'RD$ / US$' },
  { icon: CreditCard, label: 'Cashback de tarjetas' },
  { icon: Cloud, label: '100% en la nube' },
];

export default function ValueBar() {
  return (
    <section className="lp-valuebar" aria-label="Beneficios clave">
      <motion.div
        className="lp__container lp-valuebar__inner"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {chips.map(({ icon: Icon, label }) => (
          <span className="lp-chip" key={label}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
