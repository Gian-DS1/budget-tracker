// Sistema de motion del rebuild Stitch — filosofía Emil Kowalski.
//
// Personalidad: dashboard financiero "instrument-grade" → motion CRUJIENTE y
// rápido, sin bounce. Cada animación justifica su existencia (jerarquía, estado,
// feedback), nunca decora porque sí. Todo bajo 300ms. Respeta reduced-motion:
// con reduced se conserva la opacidad (ayuda a comprender) y se quita el movimiento.
//
// Solo exporta COMPONENTES (para fast-refresh). El easing vive en motionTokens.js.

import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from './motionTokens';

// ── Variantes (internas) ───────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

// ── Componentes ────────────────────────────────────────────────────

// Envuelve una pantalla: entrada sutil (fade + 6px), salida más rápida (Emil:
// el sistema responde rápido). Sin movimiento si reduced-motion.
export function Screen({ children, className = '', ...rest }) {
  const reduce = useReducedMotion();
  const variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.18 } },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      }
    : {
        ...pageVariants,
        exit: { opacity: 0, y: -4, transition: { duration: 0.14, ease: EASE_OUT } },
      };
  return (
    <motion.div className={className} variants={variants} initial="hidden" animate="show" exit="exit" {...rest}>
      {children}
    </motion.div>
  );
}

// Contenedor que escalona la entrada de sus hijos <Stagger.Item>. Una sola vez.
export function Stagger({ children, className = '', ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden" animate="show" {...rest}>
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = '', ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem} {...rest}>
      {children}
    </motion.div>
  );
}
Stagger.Item = StaggerItem;
