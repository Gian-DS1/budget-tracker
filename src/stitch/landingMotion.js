// Tokens de motion EXCLUSIVOS de la landing pública (marketing).
//
// La app interna usa easing crujiente sin bounce (filosofía Emil, "instrument-
// grade" — ver StitchMotion.jsx). La landing es marketing: Emil permite más
// "delight" en superficies que el usuario ve rara vez / por primera vez. Aquí
// usamos FÍSICAS SPRING con bounce sutil para un carácter más vivo y premium,
// manteniéndolo bajo control (sin rebotes exagerados).
//
// Solo constantes → no rompe fast-refresh, importable desde cualquier .jsx.

// Spring suave para entradas (hero, secciones). Bounce sutil ~0.18.
// damping algo por debajo del crítico → un único asentamiento elegante.
export const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 26, mass: 1 };

// Spring crujiente para feedback de hover/press (rápido, interrumpible).
export const SPRING_SNAP = { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 };

// Spring para suavizar valores ligados al scroll (parallax). Más blando para que
// el parallax no "persiga" bruscamente al scroll.
export const SPRING_SCROLL = { stiffness: 90, damping: 22, mass: 0.6 };

// ── Variantes reutilizables ─────────────────────────────────────────────────

// Contenedor que escalona la entrada de sus hijos (stagger). 60ms entre items.
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

// Item de stagger: fade + sube 16px. NUNCA desde scale(0) (regla Emil: nada en
// el mundo real aparece de la nada).
export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

// Entrada al hacer scroll (whileInView). Mismo carácter spring que el stagger.
export const inViewItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

// Viewport compartido para whileInView: anima una sola vez, un poco antes de
// que el elemento esté totalmente visible.
export const inViewport = { once: true, margin: '-80px' };

// Variantes con reduced-motion: conservan opacidad (ayuda a comprender), quitan
// movimiento. Se eligen en runtime con useReducedMotion().
export const reducedContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};
export const reducedItem = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};
