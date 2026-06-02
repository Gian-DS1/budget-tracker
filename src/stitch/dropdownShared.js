// Estilos y animación compartidos por los dropdowns custom del tema
// (StitchCategorySelect, StitchSelect, StitchDatePicker). Centralizar esto
// garantiza que TODOS los desplegables de la página tengan exactamente el mismo
// trigger, panel y animación (consistencia de diseño + filosofía Emil).

import { EASE_OUT } from './StitchMotion';

// ── Triggers ────────────────────────────────────────────────────────
// Look por defecto = igual que los inputs del formulario (alto cómodo).
export const TRIGGER_BASE =
  'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md ' +
  'font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary ' +
  'inner-glow flex items-center justify-between gap-sm text-left';

// Variante compacta = combina con la barra de filtros (h-[34px] como sus vecinos).
export const TRIGGER_COMPACT =
  'w-full h-[34px] bg-surface-container border border-border-subtle rounded py-0 px-sm ' +
  'font-label-sm text-label-sm text-on-surface focus:outline-none focus:border-primary ' +
  'hover:border-outline-variant inner-glow flex items-center justify-between gap-xs text-left cursor-pointer';

// ── Panel animado (origin-aware, ease-out, <200ms) ──────────────────
// Pasar reduce (useReducedMotion) para conservar solo la opacidad sin movimiento.
export const panelMotion = (reduce) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 },
  animate: reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 },
  exit: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 },
  transition: { duration: 0.16, ease: EASE_OUT },
  style: { transformOrigin: 'top' },
});

export const PANEL_CLS =
  'absolute z-50 mt-xs bg-surface-card border border-border-subtle rounded-lg ' +
  'inner-glow shadow-xl overflow-hidden';
