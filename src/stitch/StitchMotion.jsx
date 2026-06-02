// Sistema de motion del rebuild Stitch — filosofía Emil Kowalski.
//
// Personalidad: dashboard financiero "instrument-grade" → motion CRUJIENTE y
// rápido, sin bounce. Cada animación justifica su existencia (jerarquía, estado,
// feedback), nunca decora porque sí. Todo bajo 300ms. Respeta reduced-motion:
// con reduced se conserva la opacidad (ayuda a comprender) y se quita el movimiento.

import { motion, useReducedMotion, useInView, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Easings fuertes (los built-in de CSS son débiles). cubic-bezier de Emil.
export const EASE_OUT = [0.23, 1, 0.32, 1]; // entradas/salidas, responsivo
export const EASE_IN_OUT = [0.77, 0, 0.175, 1]; // movimiento en pantalla

// ── Variantes ──────────────────────────────────────────────────────
export const pageVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

export const modalOverlay = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } },
};

export const modalPanel = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: EASE_OUT } },
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

// Conteo animado de un número (KPIs). Filosofía Emil: comunica el dato / un
// cambio de estado. Corre UNA vez al entrar en viewport; con reduced-motion (o
// fuera de viewport) muestra el valor final al instante.
export function useCountUp(target, { duration = 0.9 } = {}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(0, target, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, reduce, target, duration]);

  return { ref, value: reduce ? target : value };
}
