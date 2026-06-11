// Estilos de trigger compartidos por los dropdowns custom del tema
// (StitchCategorySelect, StitchSelect, StitchDatePicker). Centralizar esto
// garantiza que TODOS los desplegables tengan exactamente el mismo trigger.
// La animación y el panel flotante viven en DropdownPanel.jsx.

// ── Triggers ────────────────────────────────────────────────────────
// Look por defecto = igual que los inputs del formulario (alto cómodo).
export const TRIGGER_BASE =
  'w-full bg-surface-container-lowest border border-border-subtle rounded py-sm px-md ' +
  'font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary ' +
  'inner-glow flex items-center justify-between gap-sm text-left';

// Variante compacta = combina con la barra de filtros (h-[34px] como sus vecinos).
// En táctil (max-sm) sube a 44px: mínimo de touch target (WCAG 2.5.8).
export const TRIGGER_COMPACT =
  'w-full h-[34px] max-sm:h-11 bg-surface-container border border-border-subtle rounded py-0 px-sm ' +
  'font-label-sm text-label-sm text-on-surface focus:outline-none focus:border-primary ' +
  'hover:border-outline-variant inner-glow flex items-center justify-between gap-xs text-left cursor-pointer';
